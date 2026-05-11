import { describe, expect, it } from "vitest";
import {
  createResolveParcelEgridToolResult
} from "../src/geoTools.js";
import {
  municipalityMatches,
  resolveParcel
} from "../src/geoResolver.js";
import {
  createParcelResponse,
  createSearchResponse,
  createSoFetchMock
} from "./geoTestHelpers.js";

describe("Geo-Resolver", () => {
  it("ermittelt den EGRID für Grundstück 1597 in Gunzgen", async () => {
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

    const result = await resolveParcel({ parcel_no: "1597", municipality: "Gunzgen" }, fetchMock);

    expect(result.status).toBe("resolved");
    expect(result.features[0]?.identifiers).toMatchObject({
      egrid: "CH293280730613",
      parcel_no: "1597",
      municipality: "Gunzgen",
      nbident: "SO0200002578",
      bfs_nr: 2578
    });
    expect(result.features[0]).not.toHaveProperty("geometry");
  });

  it("ermittelt den EGRID für Grundstück 1490 in Hägendorf", async () => {
    const fetchMock = createSoFetchMock({
      searches: {
        "Grundstück 1490 Hägendorf": createSearchResponse([
          { id: "153736399", display: "GB-Nr: 1490 - Hägendorf (Liegenschaft)" }
        ])
      },
      parcels: {
        "153736399": createParcelResponse({
          id: "153736399",
          nummer: "1490",
          egrid: "CH333287066361",
          gemeinde: "Hägendorf",
          nbident: "SO0200002579",
          bfs_nr: 2579
        })
      }
    });

    const result = await resolveParcel({ parcel_no: "1490", municipality: "Hägendorf" }, fetchMock);

    expect(result.status).toBe("resolved");
    expect(result.features[0]?.identifiers.egrid).toBe("CH333287066361");
  });

  it("matcht Gemeindenamen mit Schreibvarianten nach Fallback-Suche", async () => {
    const fetchMock = createSoFetchMock({
      searches: {
        "Grundstück 1490 haegendorf": createSearchResponse([]),
        "Grundstück 1490": createSearchResponse([
          { id: "153736399", display: "GB-Nr: 1490 - Hägendorf (Liegenschaft)" }
        ])
      },
      parcels: {
        "153736399": createParcelResponse({
          id: "153736399",
          nummer: "1490",
          egrid: "CH333287066361",
          gemeinde: "Hägendorf",
          nbident: "SO0200002579"
        })
      }
    });

    const result = await resolveParcel({ parcel_no: "1490", municipality: " haegendorf " }, fetchMock);

    expect(result.status).toBe("resolved");
    expect(result.features[0]?.identifiers.municipality).toBe("Hägendorf");
    expect(municipalityMatches("haegendorf", "Hägendorf")).toBe(true);
  });

  it("gibt bei mehreren exakten Treffern Kandidaten zurück", async () => {
    const fetchMock = createSoFetchMock({
      searches: {
        "Grundstück 42 Testingen": createSearchResponse([
          { id: "1", display: "GB-Nr: 42 - Testingen (Liegenschaft)" },
          { id: "2", display: "GB-Nr: 42 - Testingen (Liegenschaft)" }
        ])
      },
      parcels: {
        "1": createParcelResponse({
          id: "1",
          nummer: "42",
          egrid: "CH000000000001",
          gemeinde: "Testingen",
          nbident: "SO0000000001"
        }),
        "2": createParcelResponse({
          id: "2",
          nummer: "42",
          egrid: "CH000000000002",
          gemeinde: "Testingen",
          nbident: "SO0000000002"
        })
      }
    });

    const result = await resolveParcel({ parcel_no: "42", municipality: "Testingen" }, fetchMock);

    expect(result.status).toBe("needs_disambiguation");
    expect(result.features.map((feature) => feature.identifiers.egrid)).toEqual([
      "CH000000000001",
      "CH000000000002"
    ]);
  });

  it("liefert not_found, wenn kein exakter Kandidat gefunden wird", async () => {
    const fetchMock = createSoFetchMock({
      searches: {
        "Grundstück 9999 Nirgends": createSearchResponse([]),
        "Grundstück 9999": createSearchResponse([])
      },
      parcels: {}
    });

    const result = await resolveParcel({ parcel_no: "9999", municipality: "Nirgends" }, fetchMock);

    expect(result).toMatchObject({
      status: "not_found",
      features: [],
      message: "Kein Grundstück 9999 in Nirgends gefunden."
    });
  });

  it("gibt SO-HTTP-Fehler als klaren Tool-Fehler zurück", async () => {
    const fetchMock = createSoFetchMock({
      searches: {
        "Grundstück 1 Test": new Response("Service unavailable", { status: 503 })
      },
      parcels: {}
    });

    const result = await createResolveParcelEgridToolResult(
      { parcel_no: "1", municipality: "Test" },
      fetchMock
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent.errorCode).toBe("SO_GDI_HTTP_ERROR");
    expect(result.content[0].text).toContain("HTTP 503");
  });

  it("gibt ungültiges JSON als klaren Tool-Fehler zurück", async () => {
    const fetchMock = createSoFetchMock({
      searches: {
        "Grundstück 1 Test": new Response("kein json", { status: 200 })
      },
      parcels: {}
    });

    const result = await createResolveParcelEgridToolResult(
      { parcel_no: "1", municipality: "Test" },
      fetchMock
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent.errorCode).toBe("SO_GDI_INVALID_JSON");
  });

  it("gibt fehlendes EGRID als klaren Tool-Fehler zurück", async () => {
    const fetchMock = createSoFetchMock({
      searches: {
        "Grundstück 1 Test": createSearchResponse([
          { id: "1", display: "GB-Nr: 1 - Test (Liegenschaft)" }
        ])
      },
      parcels: {
        "1": createParcelResponse({
          id: "1",
          nummer: "1",
          gemeinde: "Test",
          nbident: "SO0000000001"
        })
      }
    });

    const result = await createResolveParcelEgridToolResult(
      { parcel_no: "1", municipality: "Test" },
      fetchMock
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent.errorCode).toBe("MISSING_REQUIRED_PROPERTY");
    expect(result.content[0].text).toContain("Attribut egrid fehlt");
  });
});
