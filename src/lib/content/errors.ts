export class ContentPipelineError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = "ContentPipelineError";
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const pgError = error as { message: string; code?: string; details?: string };
    return [pgError.message, pgError.code, pgError.details].filter(Boolean).join(" | ");
  }

  return String(error ?? "Unknown content pipeline error");
}
