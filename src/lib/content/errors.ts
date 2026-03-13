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

  return "Unknown content pipeline error";
}
