export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type ValidationProfile = {
  id: string;
  label: string;
  description: string | null;
  raw: unknown;
};

export type ValidationProfilesResult = {
  profiles: ValidationProfile[];
  source: string;
  raw: unknown;
};

export type ValidationFileInput = {
  name: string;
  mimeType?: string;
  dataBase64: string;
};

export type StartValidationJobInput = {
  files?: ValidationFileInput[];
  /**
   * Serverseitig aufloesbare Datei-Referenzen:
   * absolute lokale Pfade, file:// URLs oder erlaubte https:// URLs.
   */
  fileRefs?: string[];
  profile?: string;
};

export type ValidationJobStart = {
  jobId: string;
  operationLocation: string;
  profile?: string;
  files: Array<{ name: string }>;
  raw: unknown;
};

export type ValidationJobStatus =
  | "ENQUEUED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "UNKNOWN"
  | string;

export type ValidationLogKind = "text" | "xtf" | "csv";

export type ValidationJobLogs = Partial<Record<ValidationLogKind, string>>;

export type ValidationJob = {
  jobId: string;
  createdAt: string | null;
  updatedAt: string | null;
  jobStatus: ValidationJobStatus;
  validationResult: string | null;
  retryAfterSeconds: number | null;
  logs: ValidationJobLogs;
  raw: unknown;
};

export type CsvLogRow = {
  line: number | null;
  severity: string | null;
  message: string;
  object: string | null;
  raw: Record<string, string> | string[];
};

export type ParsedCsvLog = {
  rows: CsvLogRow[];
  headers: string[];
};

export type ValidationLog = {
  jobId: string;
  kind: ValidationLogKind;
  contentType: string | null;
  content: string;
  truncated: boolean;
  sourceUrl: string;
  rows?: CsvLogRow[];
};

export type ValidationSummary = {
  jobId: string;
  summary: string;
  counts: {
    errors: number;
    warnings: number;
  };
  examples: Array<{
    severity: string | null;
    message: string;
    row?: CsvLogRow;
  }>;
  ui: {
    resource: string;
    params: {
      jobId: string;
    };
  };
};
