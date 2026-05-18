import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import {
  ILIVALIDATOR_JOB_VIEWER_RESOURCE_URI,
  ILIVALIDATOR_JOB_VIEWER_TITLE,
  MODELFINDER_MODEL_VIEWER_RESOURCE_URI,
  MODELFINDER_MODEL_VIEWER_TITLE
} from "../constants.js";
import type { IlivalidatorClient } from "../services/ilivalidatorClient.js";
import { summarizeRows } from "../services/ilivalidatorClient.js";
import type { ModelfinderClient } from "../services/modelfinderClient.js";
import type { StartValidationJobInput, ValidationLogKind } from "../types/ilivalidator.js";
import { toErrorDetails } from "../util/errors.js";
import { countValidationMessages, normalizeSeverity, parseCsvLog } from "../util/logParsing.js";

export type RegisterToolsOptions = {
  ilivalidatorClient: IlivalidatorClient;
  modelfinderClient: ModelfinderClient;
};

const validationFileSchema = z.object({
  name: z.string().min(1).describe("Dateiname, zum Beispiel example.xtf."),
  mimeType: z.string().optional().describe("MIME-Type der Datei, zum Beispiel application/xml."),
  dataBase64: z.string().min(1).describe("Base64-kodierter Dateiinhalt. Fallback fuer Hosts ohne Datei-Referenzen.")
});

const validateTransferInputSchema = {
  files: z.array(validationFileSchema).optional().describe("INTERLIS-Transferdateien als Base64-Inhalte. Nicht per Shell-Ausgabe in den Chat-Kontext laden."),
  fileRefs: z.array(z.string().min(1)).optional().describe("Serverseitig aufloesbare Datei-Referenzen: absolute lokale Pfade, file:// URLs oder erlaubte https:// URLs. Fuer Goose bevorzugen."),
  profile: z.string().optional().describe("Optionales ilivalidator-Profil, zum Beispiel Nutzungsplanung.")
};

const jobIdInputSchema = {
  jobId: z.string().min(1).describe("ID des ilivalidator-Jobs.")
};

const logKindSchema = z.enum(["text", "xtf", "csv"]);

export function registerTools(server: McpServer, options: RegisterToolsOptions): void {
  const { ilivalidatorClient, modelfinderClient } = options;

  server.registerTool(
    "list_validation_profiles",
    {
      title: "Validierungsprofile auflisten",
      description: "Liest die serverseitig verfuegbaren ilivalidator-Profile.",
      inputSchema: {},
      annotations: readOnlyOpenWorld()
    },
    async () => toolResult(async () => {
      const result = await ilivalidatorClient.listProfiles();
      return {
        text: `${result.profiles.length} Validierungsprofile von ${result.source} geladen.`,
        structuredContent: result
      };
    })
  );

  registerAppTool(
    server,
    "validate_interlis_transfer",
    {
      title: "INTERLIS-Transfer validieren",
      description: "Startet eine Validierung beim SOGIS ilivalidator. Bei lokalen Dateien fileRefs verwenden und grosse Base64-Inhalte nicht mit cat/base64 in den Chat-Kontext ausgeben.",
      inputSchema: validateTransferInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      },
      _meta: {
        ui: {
          resourceUri: ILIVALIDATOR_JOB_VIEWER_RESOURCE_URI,
          visibility: ["model", "app"]
        }
      }
    },
    async (input) => toolResult(async () => {
      const started = await ilivalidatorClient.startJob(input as StartValidationJobInput);
      const structuredContent = {
        jobId: started.jobId,
        operationLocation: started.operationLocation,
        ...(started.profile !== undefined ? { profile: started.profile } : {}),
        files: started.files,
        ui: {
          resource: ILIVALIDATOR_JOB_VIEWER_RESOURCE_URI,
          params: {
            jobId: started.jobId,
            ...(started.profile !== undefined ? { profile: started.profile } : {})
          }
        }
      };

      return {
        text: `Validierungsjob ${started.jobId} gestartet: ${started.operationLocation}`,
        structuredContent,
        meta: {
          ui: {
            resourceUri: ILIVALIDATOR_JOB_VIEWER_RESOURCE_URI
          },
          ilivalidator: structuredContent
        }
      };
    })
  );

  server.registerTool(
    "get_validation_job",
    {
      title: "Validierungsjob laden",
      description: "Liest Status, Resultat und Log-Links eines ilivalidator-Jobs.",
      inputSchema: jobIdInputSchema,
      annotations: readOnlyOpenWorld()
    },
    async ({ jobId }) => toolResult(async () => {
      const job = await ilivalidatorClient.getJob(jobId);
      return {
        text: `Validierungsjob ${job.jobId}: Status ${job.jobStatus}${job.validationResult !== null ? `, Resultat ${job.validationResult}` : ""}.`,
        structuredContent: job
      };
    })
  );

  server.registerTool(
    "get_validation_log",
    {
      title: "Validierungslog laden",
      description: "Laedt ein Text-, XTF- oder CSV-Log eines ilivalidator-Jobs.",
      inputSchema: {
        ...jobIdInputSchema,
        kind: logKindSchema.describe("Log-Art: text, xtf oder csv.")
      },
      annotations: readOnlyOpenWorld()
    },
    async ({ jobId, kind }) => toolResult(async () => {
      const log = await ilivalidatorClient.getLog(jobId, kind as ValidationLogKind);
      return {
        text: `${kind}-Log fuer Job ${jobId} geladen${log.truncated ? " (gekuerzt)" : ""}.`,
        structuredContent: log
      };
    })
  );

  registerAppTool(
    server,
    "summarize_validation_result",
    {
      title: "Validierungsresultat zusammenfassen",
      description: "Fasst einen Validierungsjob agentenfreundlich zusammen und liefert Beispiele aus dem Log.",
      inputSchema: {
        ...jobIdInputSchema,
        includeWarnings: z.boolean().optional().describe("Wenn true, Warnungen in Beispielen beruecksichtigen."),
        maxExamples: z.number().int().min(1).max(20).optional().describe("Maximale Anzahl Beispielmeldungen.")
      },
      annotations: readOnlyOpenWorld(),
      _meta: {
        ui: {
          resourceUri: ILIVALIDATOR_JOB_VIEWER_RESOURCE_URI,
          visibility: ["model", "app"]
        }
      }
    },
    async ({ jobId, includeWarnings, maxExamples }) => toolResult(async () => {
      const job = await ilivalidatorClient.getJob(jobId);
      const summary = await summarizeValidationJob(ilivalidatorClient, job.jobId, includeWarnings ?? true, maxExamples ?? 5);
      const structuredContent = {
        ...summary,
        ui: {
          resource: ILIVALIDATOR_JOB_VIEWER_RESOURCE_URI,
          params: {
            jobId: job.jobId
          }
        }
      };

      return {
        text: summary.summary,
        structuredContent,
        meta: {
          ui: {
            resourceUri: ILIVALIDATOR_JOB_VIEWER_RESOURCE_URI
          },
          ilivalidator: structuredContent
        }
      };
    })
  );

  registerAppTool(
    server,
    "search_interlis_models",
    {
      title: "INTERLIS-Modelle suchen",
      description: "Oeffnet eine Suche im bestehenden SOGIS Modelfinder-Kontext.",
      inputSchema: {
        query: z.string().min(1).describe("Suchbegriff, Modell-, Topic-, Klassen- oder Attributname."),
        ilisite: z.string().optional().describe("Optionale Repository-Domain, zum Beispiel models.geo.admin.ch."),
        expanded: z.boolean().optional().describe("Wenn true, Resultate im Modelfinder aufgeklappt anzeigen.")
      },
      annotations: readOnlyOpenWorld(),
      _meta: {
        ui: {
          resourceUri: MODELFINDER_MODEL_VIEWER_RESOURCE_URI,
          visibility: ["model", "app"]
        }
      }
    },
    async ({ query, ilisite, expanded }) => toolResult(async () => {
      const result = await modelfinderClient.search({ query, ilisite, expanded });
      return {
        text: `Modelfinder-Suche fuer "${result.query}": ${result.totalModelCount} Treffer.`,
        structuredContent: result,
        meta: {
          ui: {
            resourceUri: MODELFINDER_MODEL_VIEWER_RESOURCE_URI
          },
          modelfinder: result
        }
      };
    })
  );

  server.registerTool(
    "build_modelfinder_url",
    {
      title: "Modelfinder-URL bauen",
      description: "Baut einen stabilen Deep Link fuer den bestehenden SOGIS Modelfinder.",
      inputSchema: {
        query: z.string().optional().describe("Suchbegriff."),
        ilisite: z.string().optional().describe("Optionale Repository-Domain."),
        expanded: z.boolean().optional().describe("Wenn true, Resultate aufgeklappt anzeigen."),
        nologo: z.boolean().optional().describe("Wenn true, Logo im Modelfinder ausblenden.")
      },
      annotations: readOnlyOpenWorld()
    },
    async (input) => toolResult(async () => {
      const url = modelfinderClient.buildUrl(input);
      return {
        text: url,
        structuredContent: { url }
      };
    })
  );

  registerAppTool(
    server,
    "get_modelfinder_context",
    {
      title: "Modelfinder-Kontext laden",
      description: "Liefert den URL-Embed-Kontext fuer die Modelfinder MCP-App.",
      inputSchema: {
        query: z.string().optional().describe("Suchbegriff."),
        ilisite: z.string().nullable().optional().describe("Optionale Repository-Domain."),
        expanded: z.boolean().optional().describe("Wenn true, Resultate aufgeklappt anzeigen.")
      },
      annotations: readOnlyOpenWorld(),
      _meta: {
        ui: {
          resourceUri: MODELFINDER_MODEL_VIEWER_RESOURCE_URI,
          visibility: ["model", "app"]
        }
      }
    },
    async (input) => toolResult(async () => {
      const context = await modelfinderClient.getContext(input);
      return {
        text: context.query === null
          ? "Modelfinder-Kontext ohne Suchbegriff geladen."
          : `Modelfinder-Kontext fuer "${context.query}": ${context.totalModelCount} Treffer.`,
        structuredContent: context,
        meta: {
          ui: {
            resourceUri: MODELFINDER_MODEL_VIEWER_RESOURCE_URI
          },
          modelfinder: context
        }
      };
    })
  );
}

async function summarizeValidationJob(
  ilivalidatorClient: IlivalidatorClient,
  jobId: string,
  includeWarnings: boolean,
  maxExamples: number
) {
  const job = await ilivalidatorClient.getJob(jobId);
  let counts = { errors: 0, warnings: 0 };
  let examples: Array<{ severity: string | null; message: string; row?: unknown }> = [];

  try {
    const csvLog = await ilivalidatorClient.getLog(job.jobId, "csv");
    if (csvLog.rows !== undefined) {
      const summarized = summarizeRows(csvLog.rows, includeWarnings, maxExamples);
      counts = summarized.counts;
      examples = summarized.examples;
    } else {
      const parsed = parseCsvLog(csvLog.content);
      const summarized = summarizeRows(parsed.rows, includeWarnings, maxExamples);
      counts = summarized.counts;
      examples = summarized.examples;
    }
  } catch {
    try {
      const textLog = await ilivalidatorClient.getLog(job.jobId, "text");
      const fallback = summarizeTextLog(textLog.content, includeWarnings, maxExamples);
      counts = fallback.counts;
      examples = fallback.examples;
    } catch {
      // Job status alone is still useful when logs are not yet available.
    }
  }

  return {
    jobId: job.jobId,
    summary: buildSummaryText(job.jobStatus, job.validationResult, counts),
    counts,
    examples
  };
}

function summarizeTextLog(content: string, includeWarnings: boolean, maxExamples: number) {
  const rows = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => {
      const severity = normalizeSeverity(line.match(/\b(ERROR|ERR|FEHLER|WARNING|WARN|WARNUNG|INFO)\b/i)?.[1] ?? null);
      return {
        line: null,
        severity,
        message: line,
        object: null,
        raw: [line]
      };
    });
  const counts = countValidationMessages(rows);
  const examples = rows
    .filter((row) => row.severity === "ERROR" || (includeWarnings && row.severity === "WARNING"))
    .slice(0, maxExamples)
    .map((row) => ({
      severity: row.severity,
      message: row.message,
      row
    }));
  return { counts, examples };
}

function buildSummaryText(
  jobStatus: string,
  validationResult: string | null,
  counts: { errors: number; warnings: number }
): string {
  if (jobStatus !== "SUCCEEDED") {
    return `Die Validierung ist noch nicht abgeschlossen. Aktueller Jobstatus: ${jobStatus}.`;
  }

  const result = validationResult?.toUpperCase() ?? "";
  if (counts.errors > 0 || result.includes("FAIL") || result.includes("ERROR")) {
    return `Die Validierung ist fehlgeschlagen. Es wurden ${formatCount(counts.errors, "Fehler", "Fehler")} und ${formatCount(counts.warnings, "Warnung", "Warnungen")} gefunden.`;
  }

  if (counts.warnings > 0) {
    return `Die Validierung ist erfolgreich abgeschlossen. Es wurden keine Fehler und ${formatCount(counts.warnings, "Warnung", "Warnungen")} gefunden.`;
  }

  return "Die Validierung ist erfolgreich abgeschlossen. Es wurden keine Fehler gefunden.";
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function readOnlyOpenWorld() {
  return {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  };
}

async function toolResult(
  run: () => Promise<{ text: string; structuredContent: Record<string, unknown>; meta?: Record<string, unknown> }>
) {
  try {
    const result = await run();
    return {
      content: [{ type: "text" as const, text: result.text }],
      structuredContent: result.structuredContent,
      ...(result.meta !== undefined ? { _meta: result.meta } : {}),
      isError: false
    };
  } catch (error) {
    const details = toErrorDetails(error);
    return {
      content: [
        {
          type: "text" as const,
          text: String(details.message)
        }
      ],
      structuredContent: details,
      isError: true
    };
  }
}
