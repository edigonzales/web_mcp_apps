import { MODELFINDER_MODEL_VIEWER_RESOURCE_URI } from "../constants.js";
import type {
  ModelfinderContext,
  ModelfinderContextInput,
  ModelfinderUrlInput,
  SearchInterlisModelsResult
} from "../types/modelfinder.js";
import { ensureTrailingSlash } from "../util/urls.js";

export type ModelfinderClientOptions = {
  baseUrl: string;
};

export class ModelfinderClient {
  readonly baseUrl: string;

  constructor(options: ModelfinderClientOptions) {
    this.baseUrl = ensureTrailingSlash(options.baseUrl);
  }

  buildUrl(input: ModelfinderUrlInput = {}): string {
    const url = new URL(this.baseUrl);
    const query = normalizeOptional(input.query);
    const ilisite = normalizeOptional(input.ilisite);

    if (query !== null) {
      url.searchParams.set("query", query);
    }
    if (ilisite !== null) {
      url.searchParams.set("ilisite", ilisite);
    }
    if (input.expanded === true) {
      url.searchParams.set("expanded", "true");
    }
    if (input.nologo === true) {
      url.searchParams.set("nologo", "true");
    }

    return url.toString();
  }

  getContext(input: ModelfinderContextInput = {}): ModelfinderContext {
    const query = normalizeOptional(input.query);
    const ilisite = normalizeOptional(input.ilisite);
    const expanded = input.expanded ?? true;

    return {
      mode: "url-embed",
      url: this.buildUrl({ query, ilisite, expanded, nologo: true }),
      query,
      ilisite,
      expanded
    };
  }

  search(input: { query: string; ilisite?: string | null; expanded?: boolean | null }): SearchInterlisModelsResult {
    const query = input.query.trim();
    const ilisite = normalizeOptional(input.ilisite);
    const expanded = input.expanded ?? true;
    const url = this.buildUrl({ query, ilisite, expanded, nologo: true });

    return {
      query,
      ilisite,
      expanded,
      url,
      ui: {
        resource: MODELFINDER_MODEL_VIEWER_RESOURCE_URI,
        params: {
          query,
          ...(ilisite !== null ? { ilisite } : {}),
          expanded,
          nologo: true
        }
      },
      note: "Version 1 verwendet den bestehenden Modelfinder als URL-/Frontend-Integration."
    };
  }
}

function normalizeOptional(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
