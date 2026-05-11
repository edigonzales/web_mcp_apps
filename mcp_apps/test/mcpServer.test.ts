import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OEREB_APP_RESOURCE_URI } from "../src/constants.js";
import { createMcpServer } from "../src/server.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createParcelResponse,
  createSearchResponse,
  createSoFetchMock
} from "./geoTestHelpers.js";

describe("MCP-Server", () => {
  let server: McpServer;
  let client: Client;

  beforeEach(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const fetchMock = createSoFetchMock({
      searches: {
        "Grundstück 1597 Gunzgen": createSearchResponse([
          { id: "153715956", display: "GB-Nr: 1597 - Gunzgen (Liegenschaft)" }
        ])
      },
      parcels: {
        "153715956": createParcelResponse({
          id: "153715956",
          nummer: "1597",
          egrid: "CH293280730613",
          gemeinde: "Gunzgen",
          nbident: "SO0200002578",
          bfs_nr: 2578
        })
      }
    });
    server = createMcpServer({ fetch: fetchMock });
    client = new Client(
      { name: "oereb-mcp-apps-test-client", version: "0.1.0" },
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
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it("listet das App-Tool mit UI-Ressource", async () => {
    const tools = await client.listTools();
    const tool = tools.tools.find((entry) => entry.name === "show_oereb_cadastre");

    expect(tool).toBeDefined();
    expect(tool?.title).toBe("ÖREB-Kataster SO");
    expect(tool?._meta?.ui).toEqual({ resourceUri: OEREB_APP_RESOURCE_URI, visibility: ["model"] });
    expect(tool?._meta?.["ui/resourceUri"]).toBe(OEREB_APP_RESOURCE_URI);
    expect(tools.tools.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(["resolve_feature", "resolve_parcel_egrid", "show_oereb_cadastre"])
    );
  });

  it("ruft resolve_feature für ein Grundstück auf", async () => {
    const result = await client.callTool({
      name: "resolve_feature",
      arguments: {
        target_types: ["parcel"],
        identifiers: {
          parcel_no: "1597",
          municipality: "Gunzgen"
        }
      }
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      status: "resolved",
      features: [
        {
          type: "parcel",
          identifiers: {
            egrid: "CH293280730613",
            parcel_no: "1597",
            municipality: "Gunzgen"
          }
        }
      ]
    });
  });

  it("ruft resolve_parcel_egrid als Alias auf", async () => {
    const result = await client.callTool({
      name: "resolve_parcel_egrid",
      arguments: {
        parcel_no: "1597",
        municipality: "Gunzgen"
      }
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      status: "resolved",
      egrid: "CH293280730613"
    });
  });

  it("ruft das Tool mit Beispiel-EGRID auf", async () => {
    const result = await client.callTool({
      name: "show_oereb_cadastre",
      arguments: { egrid: "CH807306583219" }
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({
      egrid: "CH807306583219",
      url: "https://geo.so.ch/map/?oereb_egrid=CH807306583219"
    });
    expect(result._meta?.ui).toEqual({ resourceUri: OEREB_APP_RESOURCE_URI });
  });

  it("gibt bei ungültigem EGRID einen klaren Tool-Fehler zurück", async () => {
    const result = await client.callTool({
      name: "show_oereb_cadastre",
      arguments: { egrid: "ch807306583219" }
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("EGRID muss exakt")
    });
  });

  it("liefert die App-Ressource mit MCP-App-MIME-Typ und CSP", async () => {
    const resource = await client.readResource({ uri: OEREB_APP_RESOURCE_URI });
    const content = resource.contents[0];

    expect(content?.uri).toBe(OEREB_APP_RESOURCE_URI);
    expect(content?.mimeType).toBe("text/html;profile=mcp-app");
    expect("text" in content ? content.text : "").toContain("ui/notifications/tool-result");
    expect(content?._meta?.ui).toEqual({
      csp: {
        frameDomains: ["https://geo.so.ch"],
        connectDomains: [],
        resourceDomains: [],
        baseUriDomains: []
      }
    });
  });
});
