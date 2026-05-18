#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { createMcpServer, runStdioServer } from "./mcp/server.js";

function isMainModule(): boolean {
  return process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const usesStdio = args.length === 0 || (args.length === 1 && args[0] === "--stdio");

  if (!usesStdio) {
    throw new Error("Unbekannter Startmodus. Verwende node dist/index.js --stdio.");
  }

  await runStdioServer();
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}

export { createMcpServer, runStdioServer } from "./mcp/server.js";
export { IlivalidatorClient } from "./services/ilivalidatorClient.js";
export { ModelfinderClient } from "./services/modelfinderClient.js";
export { loadConfig } from "./config.js";
export * from "./types/ilivalidator.js";
export * from "./types/modelfinder.js";
