import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ModelfinderClient } from "../src/services/modelfinderClient.js";
import type { FetchLike } from "../src/types/ilivalidator.js";

describe("ModelfinderClient", () => {
  it("baut Fallback-Suchlinks fuer den neuen /models-Endpunkt", () => {
    const client = new ModelfinderClient({
      baseUrl: "https://geo.so.ch/modelfinder",
      timeoutMs: 30000,
      fetch: createFetchMock()
    });

    assert.equal(
      client.buildUrl({
        query: "wald",
        ilisite: "models.geo.admin.ch",
        expanded: true,
        nologo: true
      }),
      "https://geo.so.ch/modelfinder/models?query=wald"
    );
  });

  it("liefert gruppierte Treffer mit Detail-, UML- und Datei-Links", async () => {
    const client = new ModelfinderClient({
      baseUrl: "https://geo.so.ch/modelfinder",
      timeoutMs: 30000,
      fetch: createFetchMock()
    });

    const result = await client.search({ query: "abbaustellen", expanded: true });

    assert.equal(result.totalModelCount, 2);
    assert.equal(result.groups.length, 1);
    assert.equal(result.selectedModel?.name, "SO_AFU_ABBAUSTELLEN_20210630");
    assert.equal(
      result.selectedModel?.detailUrl,
      "https://geo.so.ch/modelfinder/modelmetadata?serverUrl=https%3A%2F%2Fgeo.so.ch%2Fmodels&file=AFU%2FSO_AFU_ABBAUSTELLEN_20210630.ili"
    );
    assert.equal(
      result.selectedModel?.umlUrl,
      "https://geo.so.ch/modelfinder/uml?serverUrl=https%3A%2F%2Fgeo.so.ch%2Fmodels&file=AFU%2FSO_AFU_ABBAUSTELLEN_20210630.ili"
    );
    assert.equal(
      result.selectedModel?.fileUrl,
      "https://geo.so.ch/models/AFU/SO_AFU_ABBAUSTELLEN_20210630.ili"
    );
    assert.equal(result.url, "https://geo.so.ch/modelfinder/models?query=abbaustellen");
  });

  it("filtert ilisite lokal auf die Treffergruppen", async () => {
    const client = new ModelfinderClient({
      baseUrl: "https://geo.so.ch/modelfinder",
      timeoutMs: 30000,
      fetch: createFetchMock()
    });

    const result = await client.search({
      query: "abbau",
      ilisite: "models.geo.bl.ch",
      expanded: true
    });

    assert.equal(result.totalModelCount, 1);
    assert.equal(result.groups.length, 1);
    assert.equal(result.groups[0]?.serverDisplayName, "models.geo.bl.ch");
    assert.equal(result.selectedModel?.name, "ch_bl_afk_augusta_raurica_rohstoffabbau_v1_0");
  });

  it("liefert Suchkontext fuer die App", async () => {
    const client = new ModelfinderClient({
      baseUrl: "https://geo.so.ch/modelfinder",
      timeoutMs: 30000,
      fetch: createFetchMock()
    });

    const context = await client.getContext({ query: "abbaustellen", expanded: false });

    assert.equal(context.mode, "search-results");
    assert.equal(context.query, "abbaustellen");
    assert.equal(context.expanded, false);
    assert.equal(context.totalModelCount, 2);
    assert.equal(context.selectedModel?.name, "SO_AFU_ABBAUSTELLEN_20210630");
  });
});

function createFetchMock(): FetchLike {
  return async (input: string | URL) => {
    const url = new URL(input.toString());

    if (url.pathname === "/modelfinder/models") {
      const query = url.searchParams.get("query");
      if (query === "abbaustellen") {
        return jsonResponse(abbaustellenResponse);
      }
      if (query === "abbau") {
        return jsonResponse(abbauResponse);
      }
      return jsonResponse([]);
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

const abbaustellenResponse = [
  {
    serverDisplayName: "geo.so.ch/models",
    modelCount: 2,
    models: [
      {
        serverUrl: "https://geo.so.ch/models",
        name: "SO_AFU_ABBAUSTELLEN_20210630",
        dispName: "SO_AFU_ABBAUSTELLEN_20210630 (2021-06-30)",
        shortDescription: "",
        version: "2021-06-30",
        file: "AFU/SO_AFU_ABBAUSTELLEN_20210630.ili",
        schemaLanguage: "ili2_3",
        issuer: "http://geo.so.ch/models/AFU/",
        precursorVersion: "",
        technicalContact: "mailto:agi@so.ch",
        furtherInformation: "",
        md5: "57c77d80b853da132ef49a7e2db4c724",
        tags: "",
        organisationName: "Solothurn",
        organisationAbbreviation: "SO"
      },
      {
        serverUrl: "https://geo.so.ch/models",
        name: "SO_AFU_ABBAUSTELLEN_Publikation_20221103",
        dispName: "SO_AFU_ABBAUSTELLEN_Publikation_20221103 (2022-11-03)",
        shortDescription: "",
        version: "2022-11-03",
        file: "AFU/SO_AFU_ABBAUSTELLEN_Publikation_20221103.ili",
        schemaLanguage: "ili2_3",
        issuer: "http://geo.so.ch/models/AFU/",
        precursorVersion: "",
        technicalContact: "mailto:agi@so.ch",
        furtherInformation: "",
        md5: "7a1ad9130204fb1f7804258ab3f52bf0",
        tags: "",
        organisationName: "Solothurn",
        organisationAbbreviation: "SO"
      }
    ]
  }
];

const abbauResponse = [
  ...abbaustellenResponse,
  {
    serverDisplayName: "models.geo.bl.ch",
    modelCount: 1,
    models: [
      {
        serverUrl: "https://models.geo.bl.ch",
        name: "ch_bl_afk_augusta_raurica_rohstoffabbau_v1_0",
        dispName: "ch_bl_afk_augusta_raurica_rohstoffabbau_v1_0 (2024-02-16)",
        shortDescription: "",
        version: "2024-02-16",
        file: "afk/ch_bl_afk_augusta_raurica_rohstoffabbau_v1_0.ili",
        schemaLanguage: "ili2_3",
        issuer: "http://models.geo.bl.ch/AFK/",
        precursorVersion: "",
        technicalContact: "mailto:support.gis@bl.ch",
        furtherInformation: "https://geo.bl.ch",
        md5: "297f91cd29a6fc534cd27272cb76781c",
        tags: "",
        organisationName: "Basel-Landschaft",
        organisationAbbreviation: "BL"
      }
    ]
  },
  {
    serverDisplayName: "models.geo.sh.ch",
    modelCount: 1,
    models: [
      {
        serverUrl: "http://models.geo.sh.ch",
        name: "SH_ThermischeNutzungen_V1_1_AddChecks",
        dispName: "SH_ThermischeNutzungen_V1_1_AddChecks (2023-12-06)",
        shortDescription: "",
        version: "2023-12-06",
        file: "TSH/SH_ThermischeNutzungen_V1_1_AddChecks.ili",
        schemaLanguage: "ili2_3",
        issuer: "https://sh.ch/CMS/Webseite/Kanton-Schaffhausen/Beh-rde/Verwaltung/Baudepartement/Tiefbau-Schaffhausen/Abteilung-Gew-sser-und-Materialabbau-403883-DE.html",
        precursorVersion: "",
        technicalContact: "",
        furtherInformation: "",
        md5: "4269e34533f0b89e4a5d290809e91536",
        tags: "",
        organisationName: "Schaffhausen",
        organisationAbbreviation: "SH"
      }
    ]
  }
];
