import { OEREB_BASE_URL } from "./constants.js";

export const EGRID_PATTERN = /^CH\d{12}$/;

export function isValidEgrid(value: unknown): value is string {
  return typeof value === "string" && EGRID_PATTERN.test(value);
}

export function assertValidEgrid(value: unknown): string {
  if (!isValidEgrid(value)) {
    throw new Error("EGRID muss exakt aus CH plus 12 Ziffern bestehen, zum Beispiel CH807306583219.");
  }

  return value;
}

export function buildOerebUrl(egrid: string): string {
  const validEgrid = assertValidEgrid(egrid);
  const url = new URL(OEREB_BASE_URL);
  url.search = new URLSearchParams({ oereb_egrid: validEgrid }).toString();
  return url.toString();
}
