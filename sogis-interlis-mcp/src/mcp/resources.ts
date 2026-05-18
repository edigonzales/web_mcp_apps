import {
  RESOURCE_MIME_TYPE,
  registerAppResource
} from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SogisInterlisConfig } from "../config.js";
import {
  ILIVALIDATOR_JOB_VIEWER_RESOURCE_URI,
  ILIVALIDATOR_JOB_VIEWER_TITLE,
  MODELFINDER_MODEL_VIEWER_RESOURCE_URI,
  MODELFINDER_MODEL_VIEWER_TITLE
} from "../constants.js";
import { createIlivalidatorJobViewerHtml } from "../ui/ilivalidatorJobViewer.js";
import { createModelfinderModelViewerHtml } from "../ui/modelfinderModelViewer.js";
import { originFromUrl } from "../util/urls.js";

export function registerResources(server: McpServer, config: SogisInterlisConfig): void {
  const modelfinderOrigin = originFromUrl(config.modelfinderBaseUrl);

  registerAppResource(
    server,
    ILIVALIDATOR_JOB_VIEWER_TITLE,
    ILIVALIDATOR_JOB_VIEWER_RESOURCE_URI,
    {
      title: ILIVALIDATOR_JOB_VIEWER_TITLE,
      description: "MCP-App zum Anzeigen von ilivalidator-Jobstatus, Resultat und Logs.",
      _meta: {
        ui: {
          csp: {
            frameDomains: [],
            connectDomains: [],
            resourceDomains: [],
            baseUriDomains: []
          },
          permissions: {
            clipboardWrite: {}
          }
        }
      }
    },
    async () => ({
      contents: [
        {
          uri: ILIVALIDATOR_JOB_VIEWER_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: createIlivalidatorJobViewerHtml(),
          _meta: {
            ui: {
              csp: {
                frameDomains: [],
                connectDomains: [],
                resourceDomains: [],
                baseUriDomains: []
              },
              permissions: {
                clipboardWrite: {}
              }
            }
          }
        }
      ]
    })
  );

  registerAppResource(
    server,
    MODELFINDER_MODEL_VIEWER_TITLE,
    MODELFINDER_MODEL_VIEWER_RESOURCE_URI,
    {
      title: MODELFINDER_MODEL_VIEWER_TITLE,
      description: "MCP-App mit eigener Modelfinder-Trefferliste, Detailansicht und UML-Vorschau.",
      _meta: {
        ui: {
          csp: {
            frameDomains: [modelfinderOrigin],
            connectDomains: [],
            resourceDomains: [],
            baseUriDomains: []
          },
          permissions: {
            clipboardWrite: {}
          }
        }
      }
    },
    async () => ({
      contents: [
        {
          uri: MODELFINDER_MODEL_VIEWER_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: createModelfinderModelViewerHtml(config.modelfinderBaseUrl),
          _meta: {
            ui: {
              csp: {
                frameDomains: [modelfinderOrigin],
                connectDomains: [],
                resourceDomains: [],
                baseUriDomains: []
              },
              permissions: {
                clipboardWrite: {}
              }
            }
          }
        }
      ]
    })
  );
}
