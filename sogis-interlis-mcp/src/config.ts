import {
  DEFAULT_HTTP_TIMEOUT_MS,
  DEFAULT_ILIVALIDATOR_BASE_URL,
  DEFAULT_MAX_LOG_BYTES,
  DEFAULT_MODELFINDER_BASE_URL,
  DEFAULT_SAMPLE_XTF_PATH
} from "./constants.js";

export type SogisInterlisConfig = {
  ilivalidatorBaseUrl: string;
  modelfinderBaseUrl: string;
  httpTimeoutMs: number;
  maxLogBytes: number;
  allowedOrigins: string[];
  sampleXtfPath: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SogisInterlisConfig {
  return {
    ilivalidatorBaseUrl: env.SOGIS_ILIVALIDATOR_BASE_URL ?? DEFAULT_ILIVALIDATOR_BASE_URL,
    modelfinderBaseUrl: env.SOGIS_MODELFINDER_BASE_URL ?? DEFAULT_MODELFINDER_BASE_URL,
    httpTimeoutMs: parsePositiveInteger(env.SOGIS_HTTP_TIMEOUT_MS, DEFAULT_HTTP_TIMEOUT_MS),
    maxLogBytes: parsePositiveInteger(env.SOGIS_MAX_LOG_BYTES, DEFAULT_MAX_LOG_BYTES),
    allowedOrigins: parseCsv(env.SOGIS_ALLOWED_ORIGINS),
    sampleXtfPath: env.SOGIS_SAMPLE_XTF_PATH ?? DEFAULT_SAMPLE_XTF_PATH
  };
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseCsv(value: string | undefined): string[] {
  if (value === undefined || value.trim() === "") {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

export const config = loadConfig();
