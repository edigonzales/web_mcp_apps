import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import {
  FetchLike,
  GeoResolverError,
  ResolveFeatureInput,
  ResolveParcelInput,
  resolveFeature,
  resolveParcel
} from "./geoResolver.js";

const targetTypesSchema = z
  .array(z.string())
  .min(1)
  .describe("Zieltypen nach gdi-mcp-tools-Blueprint. In v1 wird nur parcel unterstützt.");

const identifiersSchema = z
  .object({
    parcel_no: z.string().optional().describe("Grundbuch- oder Grundstücknummer, nicht EGRID."),
    municipality: z.string().optional().describe("Gemeindename oder Grundbuchname.")
  })
  .passthrough()
  .describe("Generische Objektidentifikatoren.");

const featureRefSchema = z.object({
  source: z.literal("so-gdi"),
  dataset: z.string(),
  id_field_name: z.literal("t_id"),
  feature_id: z.string(),
  srid: z.literal("EPSG:2056")
});

const sourceSchema = z.object({
  search_url: z.string().url(),
  data_url: z.string().url()
});

const parcelIdentifiersSchema = z.object({
  egrid: z.string(),
  parcel_no: z.string(),
  municipality: z.string(),
  nbident: z.string(),
  bfs_nr: z.number().optional()
});

const parcelPropertiesSchema = z.object({
  t_id: z.union([z.string(), z.number()]),
  nummer: z.string(),
  egrid: z.string(),
  gemeinde: z.string(),
  grundbuch: z.string().optional(),
  nbident: z.string(),
  bfs_nr: z.number().optional(),
  art_txt: z.string().optional(),
  flaechenmass: z.number().optional()
});

const parcelFeatureSchema = z.object({
  type: z.literal("parcel"),
  feature_ref: featureRefSchema,
  source: sourceSchema,
  identifiers: parcelIdentifiersSchema,
  properties: parcelPropertiesSchema,
  bbox: z.array(z.number()).nullable(),
  geometry: z.unknown().optional()
});

const resolveFeatureOutputSchema = {
  status: z.enum(["resolved", "needs_disambiguation", "not_found"]),
  query: z.object({
    target_types: z.array(z.string()),
    identifiers: z.object({
      parcel_no: z.string().optional(),
      municipality: z.string().optional()
    }),
    include_geometry: z.boolean()
  }),
  features: z.array(parcelFeatureSchema),
  message: z.string(),
  errorCode: z.string().optional()
};

const resolveParcelEgridOutputSchema = {
  ...resolveFeatureOutputSchema,
  egrid: z.string().optional()
};

export function registerGeoTools(server: McpServer, fetchImpl: FetchLike = globalThis.fetch): void {
  server.registerTool(
    "resolve_feature",
    {
      title: "Geo-Feature auflösen",
      description:
        "Löst generisch Geo-Bezugsobjekte auf. V1 unterstützt Grundstücke anhand von parcel_no und municipality und liefert unter anderem den EGRID.",
      inputSchema: {
        target_types: targetTypesSchema,
        identifiers: identifiersSchema,
        include_geometry: z.boolean().optional().describe("Wenn true, wird die Grundstückgeometrie als GeoJSON mitgeliefert.")
      },
      outputSchema: resolveFeatureOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (args) => createResolveFeatureToolResult(args as ResolveFeatureInput, fetchImpl)
  );

  server.registerTool(
    "resolve_parcel_egrid",
    {
      title: "Grundstück zu EGRID auflösen",
      description:
        "Ermittelt den EGRID eines Grundstücks anhand von Gemeinde und Grundbuch- oder Grundstücknummer. Alias für resolve_feature mit target_types=[parcel].",
      inputSchema: {
        parcel_no: z.string().min(1).describe("Grundbuch- oder Grundstücknummer, nicht EGRID."),
        municipality: z.string().min(1).describe("Gemeindename oder Grundbuchname."),
        include_geometry: z.boolean().optional().describe("Wenn true, wird die Grundstückgeometrie als GeoJSON mitgeliefert.")
      },
      outputSchema: resolveParcelEgridOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (args) => createResolveParcelEgridToolResult(args as ResolveParcelInput, fetchImpl)
  );
}

export async function createResolveFeatureToolResult(input: ResolveFeatureInput, fetchImpl: FetchLike) {
  try {
    const result = await resolveFeature(input, fetchImpl);
    return {
      content: [{ type: "text" as const, text: result.message }],
      structuredContent: result,
      isError: false
    };
  } catch (error) {
    return toErrorToolResult(error, "Geo-Feature konnte nicht aufgelöst werden.");
  }
}

export async function createResolveParcelEgridToolResult(input: ResolveParcelInput, fetchImpl: FetchLike) {
  try {
    const result = await resolveParcel(input, fetchImpl);
    const egrid = result.status === "resolved" ? result.features[0]?.identifiers.egrid : undefined;
    return {
      content: [{ type: "text" as const, text: result.message }],
      structuredContent: {
        ...result,
        ...(egrid !== undefined ? { egrid } : {})
      },
      isError: false
    };
  } catch (error) {
    return toErrorToolResult(error, "EGRID konnte nicht ermittelt werden.");
  }
}

function toErrorToolResult(error: unknown, summary: string) {
  const resolverError = error instanceof GeoResolverError
    ? error
    : new GeoResolverError("UNEXPECTED_ERROR", error instanceof Error ? error.message : String(error));

  return {
    content: [
      {
        type: "text" as const,
        text: `${summary}: ${resolverError.message}`
      }
    ],
    structuredContent: {
      status: "not_found" as const,
      query: {
        target_types: [],
        identifiers: {},
        include_geometry: false
      },
      features: [],
      message: resolverError.message,
      errorCode: resolverError.code,
      ...resolverError.details
    },
    isError: true
  };
}
