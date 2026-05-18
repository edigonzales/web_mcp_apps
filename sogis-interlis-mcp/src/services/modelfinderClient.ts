import { MODELFINDER_MODEL_VIEWER_RESOURCE_URI } from "../constants.js";
import type { FetchLike } from "../types/ilivalidator.js";
import type {
  ModelfinderContext,
  ModelfinderContextInput,
  ModelfinderModel,
  ModelfinderModelGroup,
  ModelfinderSearchPayload,
  ModelfinderUrlInput,
  SearchInterlisModelsResult
} from "../types/modelfinder.js";
import { SogisMcpError, toErrorMessage } from "../util/errors.js";
import { ensureTrailingSlash, joinUrl } from "../util/urls.js";

export type ModelfinderClientOptions = {
  baseUrl: string;
  timeoutMs: number;
  fetch?: FetchLike;
};

type RawModelfinderGroup = {
  serverDisplayName?: unknown;
  modelCount?: unknown;
  models?: unknown;
};

type RawModelfinderModel = {
  serverUrl?: unknown;
  name?: unknown;
  dispName?: unknown;
  shortDescription?: unknown;
  version?: unknown;
  file?: unknown;
  schemaLanguage?: unknown;
  issuer?: unknown;
  precursorVersion?: unknown;
  technicalContact?: unknown;
  furtherInformation?: unknown;
  md5?: unknown;
  tags?: unknown;
  organisationName?: unknown;
  organisationAbbreviation?: unknown;
};

export class ModelfinderClient {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: ModelfinderClientOptions) {
    this.baseUrl = ensureTrailingSlash(options.baseUrl);
    this.timeoutMs = options.timeoutMs;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  buildUrl(input: ModelfinderUrlInput = {}): string {
    const url = new URL(joinUrl(this.baseUrl, "/models"));
    const query = normalizeOptional(input.query);

    if (query !== null) {
      url.searchParams.set("query", query);
    }

    return url.toString();
  }

  async getContext(input: ModelfinderContextInput = {}): Promise<ModelfinderContext> {
    const query = normalizeOptional(input.query);
    const ilisite = normalizeOptional(input.ilisite);
    const expanded = input.expanded ?? true;

    if (query === null) {
      return {
        mode: "search-results",
        url: this.buildUrl(),
        query: null,
        ilisite,
        expanded,
        groups: [],
        totalModelCount: 0,
        selectedModel: null
      };
    }

    const payload = await this.loadSearchPayload(query, ilisite, expanded);
    return {
      mode: "search-results",
      ...payload
    };
  }

  async search(input: {
    query: string;
    ilisite?: string | null;
    expanded?: boolean | null;
  }): Promise<SearchInterlisModelsResult> {
    const query = requireNonBlank(input.query, "query");
    const ilisite = normalizeOptional(input.ilisite);
    const expanded = input.expanded ?? true;
    const payload = await this.loadSearchPayload(query, ilisite, expanded);

    return {
      ...payload,
      query,
      ui: {
        resource: MODELFINDER_MODEL_VIEWER_RESOURCE_URI,
        params: {
          query,
          ...(ilisite !== null ? { ilisite } : {}),
          expanded,
          nologo: true
        }
      },
      note: "Die Demo verwendet eine eigene Trefferliste mit Detailansicht und externer UML-Vorschau."
    };
  }

  private async loadSearchPayload(
    query: string,
    ilisite: string | null,
    expanded: boolean
  ): Promise<ModelfinderSearchPayload> {
    const url = this.buildUrl({ query });
    const response = await this.fetchWithTimeout(url, {
      headers: {
        accept: "application/json"
      }
    });

    if (!response.ok) {
      throw await responseToHttpError(
        response,
        "MODELFINDER_SEARCH_HTTP_ERROR",
        "Die Modelfinder-Suche konnte nicht geladen werden.",
        url
      );
    }

    const raw = await readJson(response, url);
    const groups = normalizeSearchGroups(raw, this.baseUrl, ilisite);
    const selectedModel = groups.flatMap((group) => group.models)[0] ?? null;

    return {
      url,
      query,
      ilisite,
      expanded,
      groups,
      totalModelCount: groups.reduce((sum, group) => sum + group.models.length, 0),
      selectedModel
    };
  }

  private async fetchWithTimeout(input: string | URL, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await this.fetchImpl(input, {
        ...init,
        signal: init.signal ?? controller.signal
      });
    } catch (error) {
      throw new SogisMcpError("SOGIS_HTTP_REQUEST_FAILED", "SOGIS-Dienst konnte nicht erreicht werden.", {
        url: input.toString(),
        cause: toErrorMessage(error)
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizeSearchGroups(
  raw: unknown,
  baseUrl: string,
  ilisite: string | null
): ModelfinderModelGroup[] {
  if (!Array.isArray(raw)) {
    throw new SogisMcpError(
      "MODELFINDER_SEARCH_NOT_RECOGNIZED",
      "Die Modelfinder-Suche hat kein erkennbares Trefferformat geliefert."
    );
  }

  const groups = raw.map((entry, index) => normalizeSearchGroup(entry, index, baseUrl));
  return filterGroups(groups, ilisite);
}

function normalizeSearchGroup(raw: unknown, index: number, baseUrl: string): ModelfinderModelGroup {
  if (!isRecord(raw)) {
    throw new SogisMcpError(
      "MODELFINDER_SEARCH_NOT_RECOGNIZED",
      "Eine Treffergruppe der Modelfinder-Suche konnte nicht gelesen werden.",
      { index }
    );
  }

  const group = raw as RawModelfinderGroup;
  const serverDisplayName = normalizeString(group.serverDisplayName) ?? `Repository ${index + 1}`;
  const modelsRaw = Array.isArray(group.models) ? group.models : [];
  const models = modelsRaw.map((entry, modelIndex) =>
    normalizeModel(entry, { baseUrl, groupIndex: index, modelIndex, serverDisplayName })
  );

  return {
    serverDisplayName,
    modelCount: models.length,
    models
  };
}

function normalizeModel(
  raw: unknown,
  options: {
    baseUrl: string;
    groupIndex: number;
    modelIndex: number;
    serverDisplayName: string;
  }
): ModelfinderModel {
  if (!isRecord(raw)) {
    throw new SogisMcpError(
      "MODELFINDER_SEARCH_NOT_RECOGNIZED",
      "Ein Modelfinder-Treffer konnte nicht gelesen werden.",
      { groupIndex: options.groupIndex, modelIndex: options.modelIndex }
    );
  }

  const model = raw as RawModelfinderModel;
  const serverUrl = requireField(model.serverUrl, "serverUrl", options);
  const name = requireField(model.name, "name", options);
  const version = requireField(model.version, "version", options);
  const file = requireField(model.file, "file", options);
  const schemaLanguage = normalizeSchemaLanguage(normalizeString(model.schemaLanguage));
  const displayName = normalizeString(model.dispName) ?? `${name} (${version})`;
  const detailUrl = buildModelfinderTargetUrl(options.baseUrl, "modelmetadata", serverUrl, file);
  const umlUrl = buildModelfinderTargetUrl(options.baseUrl, "uml", serverUrl, file);
  const fileUrl = new URL(file, ensureTrailingSlash(serverUrl)).toString();

  return {
    key: `${serverUrl}|${file}`,
    serverDisplayName: options.serverDisplayName,
    serverUrl,
    name,
    displayName,
    shortDescription: normalizeString(model.shortDescription) ?? "",
    version,
    file,
    schemaLanguage,
    issuer: normalizeString(model.issuer) ?? "",
    precursorVersion: normalizeString(model.precursorVersion) ?? "",
    technicalContact: normalizeString(model.technicalContact) ?? "",
    furtherInformation: normalizeString(model.furtherInformation) ?? "",
    md5: normalizeString(model.md5) ?? "",
    tags: normalizeString(model.tags) ?? "",
    organisationName: normalizeString(model.organisationName) ?? "",
    organisationAbbreviation: normalizeString(model.organisationAbbreviation) ?? "",
    detailUrl,
    umlUrl,
    fileUrl
  };
}

function filterGroups(groups: ModelfinderModelGroup[], ilisite: string | null): ModelfinderModelGroup[] {
  if (ilisite === null) {
    return groups;
  }

  const normalizedFilter = normalizeSite(ilisite);
  return groups
    .map((group) => {
      const models = group.models.filter((model) =>
        matchesIliSite(normalizedFilter, group.serverDisplayName, model.serverUrl)
      );

      return {
        ...group,
        modelCount: models.length,
        models
      };
    })
    .filter((group) => group.models.length > 0);
}

function matchesIliSite(filter: string, serverDisplayName: string, serverUrl: string): boolean {
  const candidates = new Set<string>();
  candidates.add(normalizeSite(serverDisplayName));
  candidates.add(normalizeSite(serverUrl));

  try {
    const url = new URL(serverUrl);
    candidates.add(url.host.toLowerCase());
    candidates.add(normalizeSite(`${url.host}${url.pathname}`));
  } catch {
    // Ignore malformed URLs here. The normalized raw serverUrl is still available.
  }

  return [...candidates].some((candidate) => candidate === filter);
}

function buildModelfinderTargetUrl(
  baseUrl: string,
  path: "modelmetadata" | "uml",
  serverUrl: string,
  file: string
): string {
  const url = new URL(joinUrl(baseUrl, `/${path}`));
  url.searchParams.set("serverUrl", serverUrl);
  url.searchParams.set("file", file);
  return url.toString();
}

async function readJson(response: Response, source: string): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new SogisMcpError(
      "MODELFINDER_SEARCH_INVALID_JSON",
      "Die Modelfinder-Suche hat kein gueltiges JSON geliefert.",
      {
        source,
        cause: toErrorMessage(error),
        contentType: response.headers.get("content-type")
      }
    );
  }
}

async function responseToHttpError(
  response: Response,
  code: string,
  message: string,
  source: string
): Promise<SogisMcpError> {
  return new SogisMcpError(code, message, {
    source,
    status: response.status,
    statusText: response.statusText,
    responseBody: await safeReadText(response)
  });
}

async function safeReadText(response: Response): Promise<string | undefined> {
  try {
    const text = await response.text();
    if (text.trim() === "") {
      return undefined;
    }
    return text.slice(0, 2000);
  } catch {
    return undefined;
  }
}

function requireNonBlank(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new SogisMcpError(
      "MODELFINDER_INVALID_QUERY",
      "Der Suchbegriff fuer den Modelfinder darf nicht leer sein.",
      { field: fieldName }
    );
  }
  return trimmed;
}

function requireField(
  value: unknown,
  fieldName: string,
  context: Record<string, unknown>
): string {
  const normalized = normalizeString(value);
  if (normalized === null) {
    throw new SogisMcpError(
      "MODELFINDER_SEARCH_NOT_RECOGNIZED",
      `Ein Pflichtfeld im Modelfinder-Treffer fehlt: ${fieldName}.`,
      context
    );
  }
  return normalized;
}

function normalizeSchemaLanguage(value: string | null): string {
  if (value === null) {
    return "";
  }

  const match = value.match(/^ili(\d+)_(\d+)$/i);
  if (match) {
    return `${match[1]}.${match[2]}`;
  }

  return value;
}

function normalizeOptional(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeSite(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
