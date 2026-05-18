export function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

export function joinUrl(baseUrl: string, path: string): string {
  return new URL(path.replace(/^\//, ""), ensureTrailingSlash(baseUrl)).toString();
}

export function makeAbsoluteUrl(value: string | null | undefined, baseUrl: string): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const trimmed = value.trim();
  try {
    return new URL(trimmed).toString();
  } catch {
    if (trimmed.startsWith("/api/")) {
      return new URL(trimmed.slice(1), ensureTrailingSlash(baseUrl)).toString();
    }
    return new URL(trimmed, ensureTrailingSlash(baseUrl)).toString();
  }
}

export function extractJobIdFromUrl(value: string | null | undefined): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  try {
    const url = new URL(value, "https://example.invalid/");
    const segments = url.pathname.split("/").filter(Boolean);
    return segments.at(-1);
  } catch {
    const segments = value.split(/[/?#]/)[0]?.split("/").filter(Boolean) ?? [];
    return segments.at(-1);
  }
}

export function parseRetryAfter(value: string | null): number | null {
  if (value === null || value.trim() === "") {
    return null;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.floor(seconds);
  }

  const date = Date.parse(value);
  if (Number.isNaN(date)) {
    return null;
  }

  const diffMs = date - Date.now();
  return Math.max(0, Math.ceil(diffMs / 1000));
}

export function originFromUrl(value: string): string {
  return new URL(value).origin;
}
