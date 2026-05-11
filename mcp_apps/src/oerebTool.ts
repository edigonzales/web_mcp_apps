import {
  OEREB_APP_RESOURCE_URI,
  OEREB_APP_TITLE,
  OEREB_BASE_URL
} from "./constants.js";
import { assertValidEgrid, buildOerebUrl } from "./egrid.js";
import { createOerebAppHtml } from "./appHtml.js";
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool
} from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

export const showOerebInputSchema = {
  egrid: z
    .string()
    .regex(/^CH\d{12}$/, "EGRID muss exakt aus CH plus 12 Ziffern bestehen, zum Beispiel CH807306583219.")
    .describe("EGRID des Grundstücks, exakt im Format CH plus 12 Ziffern.")
};

export const showOerebOutputSchema = {
  egrid: z.string().regex(/^CH\d{12}$/),
  url: z.string().url()
};

export function registerOerebApp(server: McpServer): void {
  registerAppTool(
    server,
    "show_oereb_cadastre",
    {
      title: OEREB_APP_TITLE,
      description:
        "Zeigt den ÖREB-Kataster des Kantons Solothurn für ein Grundstück anhand eines EGRID.",
      inputSchema: showOerebInputSchema,
      outputSchema: showOerebOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: {
        ui: {
          resourceUri: OEREB_APP_RESOURCE_URI,
          visibility: ["model"]
        }
      }
    },
    async ({ egrid }) => createShowOerebResult(egrid)
  );

  registerAppResource(
    server,
    OEREB_APP_TITLE,
    OEREB_APP_RESOURCE_URI,
    {
      title: OEREB_APP_TITLE,
      description: "Interaktive MCP-App für den ÖREB-Web-GIS-Client des Kantons Solothurn.",
      _meta: {
        ui: {
          csp: {
            frameDomains: ["https://geo.so.ch"],
            connectDomains: [],
            resourceDomains: [],
            baseUriDomains: []
          }
        }
      }
    },
    async () => ({
      contents: [
        {
          uri: OEREB_APP_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: createOerebAppHtml(),
          _meta: {
            ui: {
              csp: {
                frameDomains: ["https://geo.so.ch"],
                connectDomains: [],
                resourceDomains: [],
                baseUriDomains: []
              }
            }
          }
        }
      ]
    })
  );
}

export function createShowOerebResult(egrid: string) {
  const validEgrid = assertValidEgrid(egrid);
  const url = buildOerebUrl(validEgrid);

  return {
    content: [
      {
        type: "text" as const,
        text: `${OEREB_APP_TITLE} für Grundstück ${validEgrid}: ${url}`
      }
    ],
    structuredContent: {
      egrid: validEgrid,
      url
    },
    _meta: {
      ui: {
        resourceUri: OEREB_APP_RESOURCE_URI
      },
      oereb: {
        egrid: validEgrid,
        url,
        source: OEREB_BASE_URL
      }
    }
  };
}
