import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import type { FetchLike } from "./geoResolver.js";
import { registerGeoTools } from "./geoTools.js";
import { registerOerebApp } from "./oerebTool.js";

export type CreateMcpServerOptions = {
  fetch?: FetchLike;
};

export function createMcpServer(options: CreateMcpServerOptions = {}): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION
    },
    {
      instructions:
        "Dieser Server stellt eine MCP App bereit, die den ÖREB-Kataster SO für ein EGRID öffnet."
    }
  );

  registerGeoTools(server, options.fetch);
  registerOerebApp(server);
  return server;
}

export async function runStdioServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
