export class SogisMcpError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "SogisMcpError";
  }
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function toErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof SogisMcpError) {
    return {
      errorCode: error.code,
      message: error.message,
      ...error.details
    };
  }

  return {
    errorCode: "UNEXPECTED_ERROR",
    message: toErrorMessage(error)
  };
}
