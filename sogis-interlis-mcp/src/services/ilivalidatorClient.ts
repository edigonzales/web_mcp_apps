import type {
  FetchLike,
  ParsedCsvLog,
  StartValidationJobInput,
  ValidationJob,
  ValidationJobStart,
  ValidationLog,
  ValidationLogKind,
  ValidationProfile,
  ValidationProfilesResult
} from "../types/ilivalidator.js";
import { SogisMcpError, toErrorMessage } from "../util/errors.js";
import { countValidationMessages, parseCsvLog } from "../util/logParsing.js";
import { extractJobIdFromUrl, joinUrl, makeAbsoluteUrl, parseRetryAfter } from "../util/urls.js";

export type IlivalidatorClientOptions = {
  baseUrl: string;
  timeoutMs: number;
  maxLogBytes: number;
  fetch?: FetchLike;
};

export class IlivalidatorClient {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxLogBytes: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: IlivalidatorClientOptions) {
    this.baseUrl = options.baseUrl;
    this.timeoutMs = options.timeoutMs;
    this.maxLogBytes = options.maxLogBytes;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  async listProfiles(): Promise<ValidationProfilesResult> {
    const source = joinUrl(this.baseUrl, "/api/profiles");
    const response = await this.fetchWithTimeout(source);
    await assertOk(response, "VALIDATION_PROFILES_HTTP_ERROR", "Validierungsprofile konnten nicht geladen werden.", source);
    const raw = await readJson(response, source);

    return {
      profiles: normalizeProfiles(raw),
      source,
      raw
    };
  }

  async startJob(input: StartValidationJobInput): Promise<ValidationJobStart> {
    if (input.fileRefs !== undefined && input.fileRefs.length > 0 && (input.files === undefined || input.files.length === 0)) {
      throw new SogisMcpError(
        "FILE_REFS_UNSUPPORTED",
        "Datei-Referenzen werden in diesem Prototyp noch nicht unterstützt. Bitte files[].dataBase64 übergeben.",
        { fileRefs: input.fileRefs }
      );
    }

    if (input.files === undefined || input.files.length === 0) {
      throw new SogisMcpError("NO_VALIDATION_FILE", "Es wurde keine INTERLIS-Transferdatei übergeben.");
    }

    const formData = new FormData();
    for (const file of input.files) {
      if (file.name.trim() === "") {
        throw new SogisMcpError("INVALID_FILE_NAME", "Eine übergebene Datei hat keinen Namen.");
      }
      const bytes = decodeBase64(file.dataBase64, file.name);
      if (bytes.byteLength === 0) {
        throw new SogisMcpError("EMPTY_VALIDATION_FILE", `Die Datei ${file.name} ist leer.`);
      }

      const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: file.mimeType ?? "application/octet-stream" });
      formData.append("files", blob, file.name);
    }

    if (input.profile !== undefined && input.profile.trim() !== "") {
      formData.append("profile", input.profile.trim());
    }

    const source = joinUrl(this.baseUrl, "/api/jobs");
    const response = await this.fetchWithTimeout(source, {
      method: "POST",
      body: formData
    });

    if (![200, 201, 202].includes(response.status)) {
      throw await responseToHttpError(
        response,
        "VALIDATION_JOB_START_HTTP_ERROR",
        "Der ilivalidator-Service hat den Upload abgelehnt.",
        source
      );
    }

    const raw = await readOptionalJson(response, source);
    const operationLocationHeader = response.headers.get("operation-location") ?? response.headers.get("location");
    const extracted = extractJobStart(raw, operationLocationHeader, this.baseUrl);

    if (extracted.jobId === undefined || extracted.operationLocation === undefined) {
      throw new SogisMcpError(
        "VALIDATION_JOB_NOT_RECOGNIZED",
        "Der ilivalidator-Service hat keinen erkennbaren Validierungsjob zurückgegeben.",
        { status: response.status, raw }
      );
    }

    return {
      jobId: extracted.jobId,
      operationLocation: extracted.operationLocation,
      ...(input.profile !== undefined ? { profile: input.profile } : {}),
      files: input.files.map((file) => ({ name: file.name })),
      raw
    };
  }

  async getJob(jobId: string): Promise<ValidationJob> {
    const normalizedJobId = requireNonBlank(jobId, "jobId");
    const source = joinUrl(this.baseUrl, `/api/jobs/${encodeURIComponent(normalizedJobId)}`);
    const response = await this.fetchWithTimeout(source);
    await assertOk(response, "VALIDATION_JOB_HTTP_ERROR", "Validierungsjob konnte nicht geladen werden.", source);
    const raw = await readJson(response, source);
    return normalizeJob(raw, normalizedJobId, response.headers, this.baseUrl);
  }

  async getLog(jobId: string, kind: ValidationLogKind): Promise<ValidationLog> {
    const job = await this.getJob(jobId);
    const sourceUrl = job.logs[kind];
    if (sourceUrl === undefined) {
      throw new SogisMcpError(
        "VALIDATION_LOG_NOT_AVAILABLE",
        `Für den Job ${job.jobId} ist kein ${kind}-Log verfügbar.`,
        { jobId: job.jobId, kind, logs: job.logs }
      );
    }

    const response = await this.fetchWithTimeout(sourceUrl);
    await assertOk(response, "VALIDATION_LOG_HTTP_ERROR", `${kind}-Log konnte nicht geladen werden.`, sourceUrl);
    const limited = await readLimitedText(response, this.maxLogBytes);
    const contentType = response.headers.get("content-type");
    const parsed = kind === "csv" ? safeParseCsv(limited.content) : undefined;

    return {
      jobId: job.jobId,
      kind,
      contentType,
      content: limited.content,
      truncated: limited.truncated,
      sourceUrl,
      ...(parsed !== undefined ? { rows: parsed.rows } : {})
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

export function normalizeProfiles(raw: unknown): ValidationProfile[] {
  const profileSource = isRecord(raw) && "profiles" in raw ? raw.profiles : raw;

  if (Array.isArray(profileSource)) {
    return profileSource.map((entry) => normalizeProfileEntry(entry));
  }

  if (isRecord(profileSource)) {
    return Object.entries(profileSource).map(([key, value]) => normalizeProfileEntry(value, key));
  }

  return [];
}

export function normalizeJob(raw: unknown, fallbackJobId: string, headers: Headers, baseUrl: string): ValidationJob {
  const record = isRecord(raw) ? raw : {};
  const jobStatus = readString(record, ["jobStatus", "status"]) ?? "UNKNOWN";
  const validationResult = readString(record, ["validationResult", "result", "validationStatus"]);

  return {
    jobId: readString(record, ["jobId", "id", "key"]) ?? fallbackJobId,
    createdAt: readString(record, ["createdAt", "created", "createdTime", "startedAt"]),
    updatedAt: readString(record, ["updatedAt", "updated", "updatedTime", "finishedAt"]),
    jobStatus,
    validationResult,
    retryAfterSeconds: parseRetryAfter(headers.get("retry-after")),
    logs: {
      ...(extractLogUrl(record, ["logFileLocation", "logLocation", "textLogLocation", "logFile"], baseUrl) !== undefined
        ? { text: extractLogUrl(record, ["logFileLocation", "logLocation", "textLogLocation", "logFile"], baseUrl) }
        : {}),
      ...(extractLogUrl(record, ["xtfLogFileLocation", "xtfLogLocation", "xtfLogFile"], baseUrl) !== undefined
        ? { xtf: extractLogUrl(record, ["xtfLogFileLocation", "xtfLogLocation", "xtfLogFile"], baseUrl) }
        : {}),
      ...(extractLogUrl(record, ["csvLogFileLocation", "csvLogLocation", "csvLogFile"], baseUrl) !== undefined
        ? { csv: extractLogUrl(record, ["csvLogFileLocation", "csvLogLocation", "csvLogFile"], baseUrl) }
        : {})
    },
    raw
  };
}

export function extractJobStart(
  raw: unknown,
  operationLocationHeader: string | null,
  baseUrl: string
): { jobId?: string; operationLocation?: string } {
  const headerLocation = makeAbsoluteUrl(operationLocationHeader, baseUrl);
  const record = isRecord(raw) ? raw : {};
  const bodyLocation = makeAbsoluteUrl(
    readString(record, ["operationLocation", "operation-location", "location", "url", "href"]),
    baseUrl
  );
  const operationLocation = headerLocation ?? bodyLocation;
  const bodyJobId = readString(record, ["jobId", "id", "key", "uuid"]) ?? undefined;
  const jobId = extractJobIdFromUrl(operationLocation) ?? bodyJobId;

  return {
    ...(jobId !== undefined ? { jobId } : {}),
    ...(operationLocation !== undefined
      ? { operationLocation }
      : jobId !== undefined
        ? { operationLocation: joinUrl(baseUrl, `/api/jobs/${encodeURIComponent(jobId)}`) }
        : {})
  };
}

export function summarizeRows(rows: ParsedCsvLog["rows"], includeWarnings: boolean, maxExamples: number) {
  const counts = countValidationMessages(rows);
  const examples = rows
    .filter((row) => row.severity === "ERROR" || (includeWarnings && row.severity === "WARNING"))
    .slice(0, maxExamples)
    .map((row) => ({
      severity: row.severity,
      message: row.message,
      row
    }));

  return { counts, examples };
}

function normalizeProfileEntry(entry: unknown, fallbackId?: string): ValidationProfile {
  if (typeof entry === "string") {
    const id = fallbackId ?? entry;
    return {
      id,
      label: id,
      description: null,
      raw: entry
    };
  }

  if (isRecord(entry)) {
    const id = readString(entry, ["id", "name", "key", "label", "title"]) ?? fallbackId ?? "unknown";
    return {
      id,
      label: readString(entry, ["label", "title", "name", "id"]) ?? id,
      description: readString(entry, ["description", "desc", "summary"]),
      raw: entry
    };
  }

  const id = fallbackId ?? String(entry);
  return {
    id,
    label: id,
    description: null,
    raw: entry
  };
}

function extractLogUrl(record: Record<string, unknown>, keys: string[], baseUrl: string): string | undefined {
  for (const key of keys) {
    const direct = makeAbsoluteUrl(readString(record, [key]), baseUrl);
    if (direct !== undefined) {
      return direct;
    }

    const links = record.links;
    if (isRecord(links)) {
      const nested = makeAbsoluteUrl(readString(links, [key]), baseUrl);
      if (nested !== undefined) {
        return nested;
      }
    }
  }

  return undefined;
}

async function assertOk(response: Response, code: string, message: string, url: string): Promise<void> {
  if (response.ok) {
    return;
  }
  throw await responseToHttpError(response, code, message, url);
}

async function responseToHttpError(response: Response, code: string, message: string, url: string): Promise<SogisMcpError> {
  const body = await readSafeText(response);
  return new SogisMcpError(code, `${message} HTTP ${response.status}.`, {
    status: response.status,
    url,
    body: body.slice(0, 2000)
  });
}

async function readJson(response: Response, url: string): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new SogisMcpError("SOGIS_INVALID_JSON", "SOGIS-Dienst lieferte kein gültiges JSON.", {
      url,
      cause: toErrorMessage(error)
    });
  }
}

async function readOptionalJson(response: Response, url: string): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new SogisMcpError("SOGIS_INVALID_JSON", "SOGIS-Dienst lieferte kein gültiges JSON.", {
      url,
      body: text.slice(0, 2000)
    });
  }
}

async function readSafeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function readLimitedText(response: Response, maxBytes: number): Promise<{ content: string; truncated: boolean }> {
  const reader = response.body?.getReader();
  if (reader === undefined) {
    const buffer = Buffer.from(await response.arrayBuffer());
    const truncated = buffer.byteLength > maxBytes;
    return {
      content: buffer.subarray(0, maxBytes).toString("utf8"),
      truncated
    };
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value === undefined) {
      continue;
    }

    const remaining = maxBytes - total;
    if (remaining <= 0) {
      truncated = true;
      break;
    }

    if (value.byteLength > remaining) {
      chunks.push(value.subarray(0, remaining));
      total += remaining;
      truncated = true;
      break;
    }

    chunks.push(value);
    total += value.byteLength;
  }

  try {
    reader.releaseLock();
  } catch {
    // Ignore release errors for already-closed streams.
  }

  return {
    content: Buffer.concat(chunks, total).toString("utf8"),
    truncated
  };
}

function safeParseCsv(content: string): ParsedCsvLog | undefined {
  try {
    return parseCsvLog(content);
  } catch {
    return undefined;
  }
}

function decodeBase64(value: string, fileName: string): Uint8Array {
  try {
    return Buffer.from(value, "base64");
  } catch (error) {
    throw new SogisMcpError("INVALID_BASE64_FILE", `Die Datei ${fileName} ist nicht gültig Base64-kodiert.`, {
      fileName,
      cause: toErrorMessage(error)
    });
  }
}

function requireNonBlank(value: string, fieldName: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new SogisMcpError("INVALID_INPUT", `${fieldName} ist erforderlich.`, { field: fieldName });
  }
  return value.trim();
}

function readString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
