import { vi } from "vitest";

export type SearchFixture = {
  id: string;
  display: string;
  bbox?: number[];
};

export type ParcelFixture = {
  id: string;
  nummer: string;
  egrid?: string;
  gemeinde: string;
  nbident: string;
  bfs_nr?: number;
  grundbuch?: string;
  art_txt?: string;
  flaechenmass?: number;
  bbox?: number[];
  geometry?: unknown;
};

export function createSearchResponse(features: SearchFixture[]) {
  return {
    result_counts: [
      {
        count: features.length,
        dataproduct_id: "ch.so.agi.av.grundstuecke.rechtskraeftig",
        filterword: "Grundstück"
      }
    ],
    results: features.map((feature) => ({
      feature: {
        bbox: feature.bbox ?? [0, 0, 1, 1],
        dataproduct_id: "ch.so.agi.av.grundstuecke.rechtskraeftig",
        display: feature.display,
        feature_id: feature.id,
        id_field_name: "t_id",
        id_field_type: false,
        srid: "EPSG:2056"
      }
    }))
  };
}

export function createParcelResponse(feature: ParcelFixture) {
  return {
    type: "Feature",
    id: Number(feature.id),
    geometry: feature.geometry ?? null,
    bbox: feature.bbox ?? [0, 0, 1, 1],
    properties: {
      t_id: Number(feature.id),
      nummer: feature.nummer,
      ...(feature.egrid !== undefined ? { egrid: feature.egrid } : {}),
      bfs_nr: feature.bfs_nr,
      grundbuch: feature.grundbuch ?? feature.gemeinde,
      art_txt: feature.art_txt ?? "Liegenschaft",
      gemeinde: feature.gemeinde,
      nbident: feature.nbident,
      flaechenmass: feature.flaechenmass ?? 1000
    }
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

export function createSoFetchMock(options: {
  searches: Record<string, unknown | Response>;
  parcels: Record<string, unknown | Response>;
}) {
  return vi.fn(async (input: string | URL) => {
    const url = new URL(input.toString());

    if (url.pathname === "/api/search/v2/") {
      const searchText = url.searchParams.get("searchtext") ?? "";
      const fixture = options.searches[searchText];
      if (fixture instanceof Response) {
        return fixture;
      }
      return jsonResponse(fixture ?? createSearchResponse([]));
    }

    if (url.pathname.startsWith("/api/data/v1/ch.so.agi.av.grundstuecke.rechtskraeftig/")) {
      const id = url.pathname.split("/").pop() ?? "";
      const fixture = options.parcels[id];
      if (fixture instanceof Response) {
        return fixture;
      }
      return jsonResponse(fixture ?? { type: "Feature", id, properties: {} });
    }

    return jsonResponse({ message: "Unexpected URL" }, 404);
  });
}
