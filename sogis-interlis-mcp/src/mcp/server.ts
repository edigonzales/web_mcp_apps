import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, type SogisInterlisConfig } from "../config.js";
import { SERVER_NAME, SERVER_VERSION } from "../constants.js";
import { IlivalidatorClient } from "../services/ilivalidatorClient.js";
import { ModelfinderClient } from "../services/modelfinderClient.js";
import type { FetchLike } from "../types/ilivalidator.js";
import { registerResources } from "./resources.js";
import { registerTools } from "./tools.js";

export type CreateMcpServerOptions = {
  config?: SogisInterlisConfig;
  fetch?: FetchLike;
};

export function createMcpServer(options: CreateMcpServerOptions = {}): McpServer {
  const serverConfig = options.config ?? loadConfig();
  const ilivalidatorClient = new IlivalidatorClient({
    baseUrl: serverConfig.ilivalidatorBaseUrl,
    timeoutMs: serverConfig.httpTimeoutMs,
    maxLogBytes: serverConfig.maxLogBytes,
    allowedFileRefOrigins: serverConfig.allowedFileRefOrigins,
    fetch: options.fetch
  });
  const modelfinderClient = new ModelfinderClient({
    baseUrl: serverConfig.modelfinderBaseUrl
  });

  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION
    },
    {
      instructions:
        "Dieser Server kapselt SOGIS ilivalidator und Modelfinder als MCP Tools und MCP Apps fuer INTERLIS-Workflows."
    }
  );

  registerTools(server, { ilivalidatorClient, modelfinderClient });
  registerResources(server, serverConfig);
  return server;
}

export async function runStdioServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
