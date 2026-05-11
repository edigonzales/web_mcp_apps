import {
  SO_GDI_DATA_URL,
  SO_GDI_PARCEL_DATASET,
  SO_GDI_SEARCH_URL
} from "./constants.js";

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type ResolveFeatureStatus = "resolved" | "needs_disambiguation" | "not_found";

export type ResolveFeatureInput = {
  target_types: string[];
  identifiers: {
    parcel_no?: string;
    municipality?: string;
    [key: string]: unknown;
  };
  include_geometry?: boolean;
};

export type ResolveParcelInput = {
  parcel_no: string;
  municipality: string;
  include_geometry?: boolean;
};

export type ParcelFeature = {
  type: "parcel";
  feature_ref: {
    source: "so-gdi";
    dataset: typeof SO_GDI_PARCEL_DATASET;
    id_field_name: "t_id";
    feature_id: string;
    srid: "EPSG:2056";
  };
  source: {
    search_url: string;
    data_url: string;
  };
  identifiers: {
    egrid: string;
    parcel_no: string;
    municipality: string;
    nbident: string;
    bfs_nr?: number;
  };
  properties: {
    t_id: number | string;
    nummer: string;
    egrid: string;
    gemeinde: string;
    grundbuch?: string;
    nbident: string;
    bfs_nr?: number;
    art_txt?: string;
    flaechenmass?: number;
  };
  bbox: number[] | null;
  geometry?: unknown;
};

export type ResolveFeatureResult = {
  status: ResolveFeatureStatus;
  query: {
    target_types: string[];
    identifiers: {
      parcel_no?: string;
      municipality?: string;
    };
    include_geometry: boolean;
  };
  features: ParcelFeature[];
  message: string;
};

type SearchFeature = {
  dataproduct_id: string;
  feature_id: string;
  id_field_name: string;
  srid?: string;
  bbox?: number[];
  display?: string;
};

type SearchResponse = {
  results?: Array<{
    feature?: SearchFeature;
  }>;
};

type DataFeatureResponse = {
  id?: number | string;
  geometry?: unknown;
  bbox?: number[] | null;
  properties?: Record<string, unknown>;
};

export class GeoResolverError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "GeoResolverError";
  }
}

export async function resolveFeature(
  input: ResolveFeatureInput,
  fetchImpl: FetchLike = globalThis.fetch
): Promise<ResolveFeatureResult> {
  if (!input.target_types.includes("parcel")) {
    throw new GeoResolverError("UNSUPPORTED_TARGET_TYPE", "V1 unterstützt nur target_types mit parcel.", {
      target_types: input.target_types
    });
  }

  return resolveParcel(
    {
      parcel_no: requireNonBlank(input.identifiers.parcel_no, "identifiers.parcel_no"),
      municipality: requireNonBlank(input.identifiers.municipality, "identifiers.municipality"),
      include_geometry: input.include_geometry ?? false
    },
    fetchImpl
  );
}

export async function resolveParcel(
  input: ResolveParcelInput,
  fetchImpl: FetchLike = globalThis.fetch
): Promise<ResolveFeatureResult> {
  const parcelNo = requireNonBlank(input.parcel_no, "parcel_no");
  const municipality = requireNonBlank(input.municipality, "municipality");
  const includeGeometry = input.include_geometry ?? false;
  const exactSearchText = `Grundstück ${parcelNo} ${municipality}`;
  const exactSearchCandidates = await searchParcelCandidates(exactSearchText, 20, fetchImpl);
  let features = await fetchParcelFeatures(exactSearchCandidates, includeGeometry, fetchImpl);
  let exactMatches = filterExactParcelMatches(features, parcelNo, municipality);

  if (exactMatches.length === 0) {
    const fallbackSearchText = `Grundstück ${parcelNo}`;
    const fallbackCandidates = await searchParcelCandidates(fallbackSearchText, 50, fetchImpl);
    features = await fetchParcelFeatures(fallbackCandidates, includeGeometry, fetchImpl);
    exactMatches = filterExactParcelMatches(features, parcelNo, municipality);
  }

  const query = {
    target_types: ["parcel"],
    identifiers: {
      parcel_no: parcelNo,
      municipality
    },
    include_geometry: includeGeometry
  };

  if (exactMatches.length === 1) {
    const feature = exactMatches[0];
    return {
      status: "resolved",
      query,
      features: [feature],
      message: `Grundstück ${feature.identifiers.parcel_no} in ${feature.identifiers.municipality}: EGRID ${feature.identifiers.egrid}`
    };
  }

  if (exactMatches.length > 1) {
    return {
      status: "needs_disambiguation",
      query,
      features: exactMatches,
      message: `Mehrere Grundstücke für ${parcelNo} in ${municipality} gefunden. Bitte präzisieren.`
    };
  }

  return {
    status: "not_found",
    query,
    features: [],
    message: `Kein Grundstück ${parcelNo} in ${municipality} gefunden.`
  };
}

function requireNonBlank(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new GeoResolverError("INVALID_INPUT", `${fieldName} ist erforderlich.`, { field: fieldName });
  }

  return collapseWhitespace(value.trim());
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ");
}

export function municipalityMatches(input: string, officialName: string): boolean {
  const inputKeys = comparisonKeys(input);
  const officialKeys = comparisonKeys(officialName);
  return [...inputKeys].some((key) => officialKeys.has(key));
}

function comparisonKeys(value: string): Set<string> {
  const collapsed = collapseWhitespace(value.trim()).toLocaleLowerCase("de-CH");
  const swissTransliterated = collapsed
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue");
  const stripped = collapsed.normalize("NFD").replace(/\p{Diacritic}/gu, "");

  return new Set([collapsed, swissTransliterated, stripped].map((key) => key.normalize("NFC")));
}

async function searchParcelCandidates(
  searchText: string,
  limit: number,
  fetchImpl: FetchLike
): Promise<SearchFeature[]> {
  const url = new URL(SO_GDI_SEARCH_URL);
  url.searchParams.set("searchtext", searchText);
  url.searchParams.set("filter", SO_GDI_PARCEL_DATASET);
  url.searchParams.set("limit", String(limit));

  const response = await fetchJson<SearchResponse>(url, fetchImpl);
  const features = response.results
    ?.map((result) => result.feature)
    .filter((feature): feature is SearchFeature => feature !== undefined)
    .filter((feature) => feature.dataproduct_id === SO_GDI_PARCEL_DATASET) ?? [];

  const seen = new Set<string>();
  return features.filter((feature) => {
    if (seen.has(feature.feature_id)) {
      return false;
    }
    seen.add(feature.feature_id);
    return true;
  });
}

async function fetchParcelFeatures(
  candidates: SearchFeature[],
  includeGeometry: boolean,
  fetchImpl: FetchLike
): Promise<ParcelFeature[]> {
  return Promise.all(
    candidates.map((candidate) => fetchParcelFeature(candidate, includeGeometry, fetchImpl))
  );
}

async function fetchParcelFeature(
  candidate: SearchFeature,
  includeGeometry: boolean,
  fetchImpl: FetchLike
): Promise<ParcelFeature> {
  const url = new URL(`${SO_GDI_DATA_URL}${SO_GDI_PARCEL_DATASET}/${encodeURIComponent(candidate.feature_id)}`);
  url.searchParams.set("crs", "EPSG:2056");
  if (!includeGeometry) {
    url.searchParams.set(
      "fields",
      "t_id,nummer,egrid,bfs_nr,grundbuch,art_txt,gemeinde,nbident,flaechenmass"
    );
  }

  const response = await fetchJson<DataFeatureResponse>(url, fetchImpl);
  return toParcelFeature(candidate, response, url.toString(), includeGeometry);
}

async function fetchJson<T>(url: URL, fetchImpl: FetchLike): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch (error) {
    throw new GeoResolverError("SO_GDI_REQUEST_FAILED", "SO-GDI-Dienst konnte nicht erreicht werden.", {
      url: url.toString(),
      cause: error instanceof Error ? error.message : String(error)
    });
  }

  if (!response.ok) {
    throw new GeoResolverError(
      "SO_GDI_HTTP_ERROR",
      `SO-GDI-Dienst antwortete mit HTTP ${response.status}.`,
      { url: url.toString(), status: response.status }
    );
  }

  try {
    return await response.json() as T;
  } catch (error) {
    throw new GeoResolverError("SO_GDI_INVALID_JSON", "SO-GDI-Dienst lieferte kein gültiges JSON.", {
      url: url.toString(),
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

function toParcelFeature(
  candidate: SearchFeature,
  response: DataFeatureResponse,
  dataUrl: string,
  includeGeometry: boolean
): ParcelFeature {
  const properties = response.properties ?? {};
  const egrid = requiredStringProperty(properties, "egrid", candidate.feature_id);
  const parcelNo = requiredStringProperty(properties, "nummer", candidate.feature_id);
  const municipality = requiredStringProperty(properties, "gemeinde", candidate.feature_id);
  const nbident = requiredStringProperty(properties, "nbident", candidate.feature_id);
  const tId = properties.t_id ?? response.id ?? candidate.feature_id;
  const bfsNr = optionalNumberProperty(properties, "bfs_nr");

  return {
    type: "parcel",
    feature_ref: {
      source: "so-gdi",
      dataset: SO_GDI_PARCEL_DATASET,
      id_field_name: "t_id",
      feature_id: String(tId),
      srid: "EPSG:2056"
    },
    source: {
      search_url: SO_GDI_SEARCH_URL,
      data_url: dataUrl
    },
    identifiers: {
      egrid,
      parcel_no: parcelNo,
      municipality,
      nbident,
      ...(bfsNr !== undefined ? { bfs_nr: bfsNr } : {})
    },
    properties: {
      t_id: tId as number | string,
      nummer: parcelNo,
      egrid,
      gemeinde: municipality,
      nbident,
      ...(typeof properties.grundbuch === "string" ? { grundbuch: properties.grundbuch } : {}),
      ...(bfsNr !== undefined ? { bfs_nr: bfsNr } : {}),
      ...(typeof properties.art_txt === "string" ? { art_txt: properties.art_txt } : {}),
      ...(typeof properties.flaechenmass === "number" ? { flaechenmass: properties.flaechenmass } : {})
    },
    bbox: response.bbox ?? candidate.bbox ?? null,
    ...(includeGeometry ? { geometry: response.geometry ?? null } : {})
  };
}

function requiredStringProperty(
  properties: Record<string, unknown>,
  fieldName: string,
  featureId: string
): string {
  const value = properties[fieldName];
  if (typeof value !== "string" || value.trim() === "") {
    throw new GeoResolverError("MISSING_REQUIRED_PROPERTY", `Attribut ${fieldName} fehlt im Grundstück ${featureId}.`, {
      field: fieldName,
      feature_id: featureId
    });
  }
  return value;
}

function optionalNumberProperty(properties: Record<string, unknown>, fieldName: string): number | undefined {
  const value = properties[fieldName];
  return typeof value === "number" ? value : undefined;
}

function filterExactParcelMatches(
  features: ParcelFeature[],
  parcelNo: string,
  municipality: string
): ParcelFeature[] {
  return features.filter((feature) =>
    feature.identifiers.parcel_no === parcelNo &&
    municipalityMatches(municipality, feature.identifiers.municipality)
  );
}
