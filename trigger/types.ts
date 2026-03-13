export type TriggerJobId =
  | "content.fetchSources"
  | "content.ingestFeed"
  | "content.extractArticle"
  | "content.classifyArticle"
  | "content.dedupe"
  | "content.cluster"
  | "content.generateDraft"
  | "content.generateWeeklyDigest"
  | "content.generateImagePrompt"
  | "content.generateHeroImage"
  | "content.brandHeroImage"
  | "content.notifyAdmins";

export interface TriggerJobDefinition<TPayload = Record<string, unknown>> {
  id: TriggerJobId;
  name: string;
  schedule?: string;
  queue: string;
  retryLimit: number;
  idempotencyKey?: (payload: TPayload) => string;
  payloadSchema: Record<string, string>;
  description: string;
}
