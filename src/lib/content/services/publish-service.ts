import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import { buildEditorialDraftPath } from "@/lib/content/publishing";
import { recordReviewEvent } from "@/lib/content/review-events";

export async function queueDraftForPublish(input: {
  draftId: string;
  scheduledFor?: string | null;
  notes?: string | null;
}) {
  const { error: draftError } = await supabaseAdmin
    .from("editorial_drafts")
    .update({
      review_status: "approved",
    })
    .eq("id", input.draftId);

  if (draftError) {
    throw draftError;
  }

  const { error } = await supabaseAdmin.from("publish_queue").upsert(
    {
      draft_id: input.draftId,
      scheduled_for: input.scheduledFor ?? null,
      status: "approved",
      notes: input.notes ?? null,
    },
    { onConflict: "draft_id" },
  );

  if (error) {
    throw error;
  }

  await recordReviewEvent({
    entityType: "draft",
    entityId: input.draftId,
    eventType: "queued",
    metadata: { scheduledFor: input.scheduledFor ?? null },
  });
}

export async function publishApprovedDraft(draftId: string) {
  const publishedAt = new Date().toISOString();
  const { data: draft, error: fetchError } = await supabaseAdmin
    .from("editorial_drafts")
    .select("slug")
    .eq("id", draftId)
    .single();

  if (fetchError || !draft?.slug) {
    throw fetchError ?? new Error("Draft slug missing");
  }

  const { error } = await supabaseAdmin
    .from("editorial_drafts")
    .update({
      review_status: "published",
      published_at: publishedAt,
    })
    .eq("id", draftId)
    .eq("review_status", "approved");

  if (error) {
    throw error;
  }

  const publishedUrl = `https://www.toptalentjobs.nl${buildEditorialDraftPath(draft.slug)}`;

  await supabaseAdmin
    .from("publish_queue")
    .update({
      status: "published",
      published_url: publishedUrl,
    })
    .eq("draft_id", draftId);

  await recordReviewEvent({
    entityType: "draft",
    entityId: draftId,
    eventType: "published",
    metadata: { publishedAt, publishedUrl },
  });
}

export async function runPublishQueue(limit = 10) {
  const now = new Date().toISOString();
  const { data: queueItems, error } = await supabaseAdmin
    .from("publish_queue")
    .select("draft_id")
    .eq("status", "approved")
    .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
    .limit(limit);

  if (error) {
    if (error.code === "42P01") {
      return {
        attempted: 0,
        published: 0,
        failed: 0,
        results: [],
      };
    }

    throw error;
  }

  const results: Array<{ draftId: string; status: "published" | "failed"; error?: string }> = [];

  for (const item of queueItems ?? []) {
    const draftId = String(item.draft_id);
    try {
      await publishApprovedDraft(draftId);
      results.push({ draftId, status: "published" });
    } catch (error) {
      results.push({
        draftId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown publish error",
      });
    }
  }

  return {
    attempted: (queueItems ?? []).length,
    published: results.filter((result) => result.status === "published").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  };
}
