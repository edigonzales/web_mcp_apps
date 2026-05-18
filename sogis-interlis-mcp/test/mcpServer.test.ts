import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import type { SogisInterlisConfig } from "../src/config.js";
import { createMcpServer } from "../src/mcp/server.js";
import {
  ILIVALIDATOR_JOB_VIEWER_RESOURCE_URI,
  MODELFINDER_MODEL_VIEWER_RESOURCE_URI
} from "../src/constants.js";
import type { FetchLike } from "../src/types/ilivalidator.js";

describe("sogis-interlis-mcp MCP-Server", () => {
  it("registriert Tools und UI Resources", async () => {
    const { client, server } = await createConnectedClient(createFetchMock());
    try {
      const tools = await client.listTools();
      const toolNames = tools.tools.map((tool) => tool.name);

      assert.ok(toolNames.includes("list_validation_profiles"));
      assert.ok(toolNames.includes("validate_interlis_transfer"));
      assert.ok(toolNames.includes("summarize_validation_result"));
      assert.ok(toolNames.includes("search_interlis_models"));

      const validateTool = tools.tools.find((tool) => tool.name === "validate_interlis_transfer");
      assert.equal(validateTool?._meta?.ui?.resourceUri, ILIVALIDATOR_JOB_VIEWER_RESOURCE_URI);
      assert.equal(validateTool?._meta?.["ui/resourceUri"], ILIVALIDATOR_JOB_VIEWER_RESOURCE_URI);

      const modelTool = tools.tools.find((tool) => tool.name === "search_interlis_models");
      assert.equal(modelTool?._meta?.ui?.resourceUri, MODELFINDER_MODEL_VIEWER_RESOURCE_URI);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("liefert App-Ressourcen mit MCP-App-MIME-Type", async () => {
    const { client, server } = await createConnectedClient(createFetchMock());
    try {
      const jobViewer = await client.readResource({ uri: ILIVALIDATOR_JOB_VIEWER_RESOURCE_URI });
      const modelViewer = await client.readResource({ uri: MODELFINDER_MODEL_VIEWER_RESOURCE_URI });

      assert.equal(jobViewer.contents[0]?.mimeType, RESOURCE_MIME_TYPE);
      assert.equal(modelViewer.contents[0]?.mimeType, RESOURCE_MIME_TYPE);
      assert.match("text" in jobViewer.contents[0] ? jobViewer.contents[0].text : "", /tools\/call/);
      assert.match("text" in modelViewer.contents[0] ? modelViewer.contents[0].text : "", /iframe/);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("listet Profile ueber das Tool", async () => {
    const { client, server } = await createConnectedClient(createFetchMock());
    try {
      const result = await client.callTool({
        name: "list_validation_profiles",
        arguments: {}
      });

      assert.equal(result.isError, false);
      assert.equal(result.structuredContent?.profiles?.[0]?.id, "Nutzungsplanung");
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("startet Validierungsjob mit Base64-Datei und UI-Metadaten", async () => {
    const { client, server } = await createConnectedClient(createFetchMock());
    try {
      const result = await client.callTool({
        name: "validate_interlis_transfer",
        arguments: {
          files: [
            {
              name: "example.xtf",
              mimeType: "application/xml",
              dataBase64: Buffer.from("<TRANSFER/>", "utf8").toString("base64")
            }
          ],
          profile: "Nutzungsplanung"
        }
      });

      assert.equal(result.isError, false);
      assert.equal(result.structuredContent?.jobId, "job-123");
      assert.equal(result.structuredContent?.ui?.resource, ILIVALIDATOR_JOB_VIEWER_RESOURCE_URI);
      assert.equal(result._meta?.ui?.resourceUri, ILIVALIDATOR_JOB_VIEWER_RESOURCE_URI);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("startet Validierungsjob mit lokaler Datei-Referenz", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "sogis-interlis-mcp-"));
    const filePath = join(tempDir, "local.xtf");
    await writeFile(filePath, "<TRANSFER/>", "utf8");

    const { client, server } = await createConnectedClient(createFetchMock());
    try {
      const result = await client.callTool({
        name: "validate_interlis_transfer",
        arguments: {
          fileRefs: [filePath]
        }
      });

      assert.equal(result.isError, false);
      assert.equal(result.structuredContent?.jobId, "job-123");
      assert.deepEqual(result.structuredContent?.files, [{ name: "local.xtf" }]);
    } finally {
      await client.close();
      await server.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("startet Validierungsjob mit file-URL-Referenz", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "sogis-interlis-mcp-"));
    const filePath = join(tempDir, "file-url.xtf");
    await writeFile(filePath, "<TRANSFER/>", "utf8");

    const { client, server } = await createConnectedClient(createFetchMock());
    try {
      const result = await client.callTool({
        name: "validate_interlis_transfer",
        arguments: {
          fileRefs: [pathToFileURL(filePath).toString()]
        }
      });

      assert.equal(result.isError, false);
      assert.deepEqual(result.structuredContent?.files, [{ name: "file-url.xtf" }]);
    } finally {
      await client.close();
      await server.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("liefert strukturierten Fehler fuer fehlende lokale Datei-Referenz", async () => {
    const { client, server } = await createConnectedClient(createFetchMock());
    try {
      const result = await client.callTool({
        name: "validate_interlis_transfer",
        arguments: {
          fileRefs: ["/tmp/sogis-interlis-mcp-fehlt.xtf"]
        }
      });

      assert.equal(result.isError, true);
      assert.equal(result.structuredContent?.errorCode, "FILE_REF_READ_FAILED");
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("lehnt https-Datei-Referenzen ohne erlaubte Origin ab", async () => {
    const { client, server } = await createConnectedClient(createFetchMock());
    try {
      const result = await client.callTool({
        name: "validate_interlis_transfer",
        arguments: {
          fileRefs: ["https://uploads.example.test/remote.xtf"]
        }
      });

      assert.equal(result.isError, true);
      assert.equal(result.structuredContent?.errorCode, "FILE_REF_ORIGIN_NOT_ALLOWED");
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("laedt https-Datei-Referenzen von erlaubten Origins", async () => {
    const { client, server } = await createConnectedClient(
      createFetchMock({
        remoteFiles: {
          "https://uploads.example.test/remote.xtf": "<TRANSFER/>"
        }
      }),
      {
        allowedFileRefOrigins: ["https://uploads.example.test"]
      }
    );
    try {
      const result = await client.callTool({
        name: "validate_interlis_transfer",
        arguments: {
          fileRefs: ["https://uploads.example.test/remote.xtf"]
        }
      });

      assert.equal(result.isError, false);
      assert.equal(result.structuredContent?.jobId, "job-123");
      assert.deepEqual(result.structuredContent?.files, [{ name: "remote.xtf" }]);
    } finally {
      await client.close();
      await server.close();
    }
  });
});

async function createConnectedClient(fetch: FetchLike, configOverrides: Partial<SogisInterlisConfig> = {}) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer({
    fetch,
    config: {
      ilivalidatorBaseUrl: "https://geo.so.ch/ilivalidator",
      modelfinderBaseUrl: "https://geo.so.ch/modelfinder",
      httpTimeoutMs: 30000,
      maxLogBytes: 2000000,
      allowedOrigins: [],
      allowedFileRefOrigins: [],
      sampleXtfPath: "/Users/stefan/Downloads/ch.so.afu.abbaustellen.xtf",
      ...configOverrides
    }
  });
  const client = new Client(
    { name: "sogis-interlis-mcp-test-client", version: "0.1.0" },
    {
      capabilities: {
        extensions: {
          "io.modelcontextprotocol/ui": {
            mimeTypes: [RESOURCE_MIME_TYPE]
          }
        }
      } as never
    }
  );

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}

function createFetchMock(options: { remoteFiles?: Record<string, string> } = {}): FetchLike {
  return async (input: string | URL, init?: RequestInit) => {
    const url = new URL(input.toString());

    if (options.remoteFiles?.[url.toString()] !== undefined) {
      return new Response(options.remoteFiles[url.toString()], {
        status: 200,
        headers: { "content-type": "application/xml" }
      });
    }

    if (url.pathname === "/ilivalidator/api/profiles") {
      return jsonResponse({
        profiles: {
          Nutzungsplanung: "ilidata:SO_Nutzungsplanung_20171118_20231101-meta"
        }
      });
    }

    if (url.pathname === "/ilivalidator/api/jobs" && init?.method === "POST") {
      return new Response(JSON.stringify({}), {
        status: 202,
        headers: {
          "content-type": "application/json",
          "operation-location": "https://geo.so.ch/ilivalidator/api/jobs/job-123"
        }
      });
    }

    if (url.pathname === "/ilivalidator/api/jobs/job-123") {
      return jsonResponse({
        jobStatus: "SUCCEEDED",
        validationResult: "SUCCEEDED",
        logFileLocation: "api/logs/key/log.txt",
        csvLogFileLocation: "api/logs/key/log.csv"
      });
    }

    if (url.pathname === "/ilivalidator/api/logs/key/log.csv") {
      return new Response("severity;message\nINFO;Ok", {
        status: 200,
        headers: { "content-type": "text/csv" }
      });
    }

    if (url.pathname === "/ilivalidator/api/logs/key/log.txt") {
      return new Response("Ok", {
        status: 200,
        headers: { "content-type": "text/plain" }
      });
    }

    return jsonResponse({ message: `Unexpected URL ${url.toString()}` }, 404);
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
