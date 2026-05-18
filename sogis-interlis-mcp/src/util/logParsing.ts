import type { CsvLogRow, ParsedCsvLog } from "../types/ilivalidator.js";

const severityKeys = new Set(["severity", "level", "type", "kind", "category", "status"]);
const messageKeys = new Set(["message", "msg", "meldung", "text", "description", "error"]);
const lineKeys = new Set(["line", "zeile", "linenumber", "line_no", "lineNumber"]);
const objectKeys = new Set(["object", "objekt", "tid", "t_id", "class", "klasse", "attribute", "attribut"]);

export function parseCsvLog(content: string): ParsedCsvLog {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return { rows: [], headers: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const firstRecord = parseCsvLine(lines[0], delimiter);
  const hasHeader = firstRecord.some((cell) => looksLikeHeader(cell));
  const headers = hasHeader ? firstRecord.map((cell) => cell.trim()) : firstRecord.map((_, index) => `column_${index + 1}`);
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return {
    headers,
    rows: dataLines.map((line) => toCsvLogRow(parseCsvLine(line, delimiter), headers))
  };
}

export function countValidationMessages(rows: CsvLogRow[]): { errors: number; warnings: number } {
  return rows.reduce(
    (counts, row) => {
      const severity = normalizeSeverity(row.severity);
      if (severity === "ERROR") {
        counts.errors += 1;
      }
      if (severity === "WARNING") {
        counts.warnings += 1;
      }
      return counts;
    },
    { errors: 0, warnings: 0 }
  );
}

export function normalizeSeverity(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (["ERROR", "ERR", "FEHLER", "FAIL", "FAILED"].includes(normalized)) {
    return "ERROR";
  }
  if (["WARNING", "WARN", "WARNUNG"].includes(normalized)) {
    return "WARNING";
  }
  if (["INFO", "INFORMATION"].includes(normalized)) {
    return "INFO";
  }
  return normalized === "" ? null : normalized;
}

function detectDelimiter(line: string): string {
  const candidates = [",", ";", "\t"];
  return candidates
    .map((delimiter) => ({ delimiter, count: parseCsvLine(line, delimiter).length }))
    .sort((left, right) => right.count - left.count)[0]?.delimiter ?? ",";
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function looksLikeHeader(cell: string): boolean {
  const key = normalizeKey(cell);
  return severityKeys.has(key) || messageKeys.has(key) || lineKeys.has(key) || objectKeys.has(key);
}

function toCsvLogRow(cells: string[], headers: string[]): CsvLogRow {
  const raw = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  const normalizedEntries = new Map(headers.map((header, index) => [normalizeKey(header), cells[index] ?? ""]));
  const message = getFirst(normalizedEntries, messageKeys) ?? cells.find((cell) => cell !== "") ?? "";
  const line = parseOptionalLine(getFirst(normalizedEntries, lineKeys));
  const severity = normalizeSeverity(getFirst(normalizedEntries, severityKeys) ?? null);
  const object = getFirst(normalizedEntries, objectKeys) ?? null;

  return {
    line,
    severity,
    message,
    object,
    raw
  };
}

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, "").replace(/-/g, "_").toLowerCase();
}

function getFirst(entries: Map<string, string>, keys: Set<string>): string | undefined {
  for (const key of keys) {
    const value = entries.get(normalizeKey(key));
    if (value !== undefined && value.trim() !== "") {
      return value;
    }
  }
  return undefined;
}

function parseOptionalLine(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
