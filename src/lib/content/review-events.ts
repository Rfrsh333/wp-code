import "server-only";

import { supabaseAdmin } from "@/lib/supabase";

export async function recordReviewEvent(input: {
  entityType: "article" | "cluster" | "draft" | "image";
  entityId: string;
  eventType: "approved" | "rejected" | "requested_changes" | "published" | "queued";
  actorEmail?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from("review_events").insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    event_type: input.eventType,
    actor_email: input.actorEmail ?? null,
    note: input.note ?? null,
    metadata: input.metadata ?? {},
  });

  if (error && error.code !== "42P01") {
    console.error("[content] Failed to write review event", error);
  }
}
