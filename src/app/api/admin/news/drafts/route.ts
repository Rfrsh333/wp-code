import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { listDraftsByStatus } from "@/lib/content/repository";
import { recordReviewEvent } from "@/lib/content/review-events";
import { logAuditEvent } from "@/lib/audit-log";
import { queueDraftForPublish, publishApprovedDraft } from "@/lib/content/services/publish-service";
import { generateHeroImageForDraft, findBestSourceImageUrl, downloadBrandAndUpload } from "@/lib/content/services/hero-image-orchestrator";
import { regenerateBodyBlocks } from "@/lib/content/services/draft-generation-service";
import { captureRouteError } from "@/lib/sentry-utils";

const draftActionSchema = z.object({
  draftId: z.string().uuid(),
  action: z.enum(["approve", "reject", "queue_publish", "publish_now", "generate_image", "find_source_image", "brand_and_upload_image", "regenerate_blocks", "delete"]),
  imageUrl: z.string().url().optional(),
});

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const drafts = await listDraftsByStatus(undefined, 40);
    return NextResponse.json({ drafts });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/news/drafts", action: "GET" });
    // console.error("[news/drafts] GET error:", error);
    return NextResponse.json({ drafts: [], error: "Drafts konden niet geladen worden" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const parsed = draftActionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const statusMap = {
      approve: "approved",
      reject: "rejected",
    } as const;
    let nextStatus: string | null = null;

    if (parsed.data.action === "approve" || parsed.data.action === "reject") {
      nextStatus = statusMap[parsed.data.action];
      const { error } = await supabaseAdmin
        .from("editorial_drafts")
        .update({
          review_status: nextStatus,
        })
        .eq("id", parsed.data.draftId);

      if (error) {
        captureRouteError(error, { route: "/api/admin/news/drafts", action: "POST" });
        // console.error("[content] Failed to update draft status", error);
        return NextResponse.json({ error: "Draft kon niet worden bijgewerkt" }, { status: 500 });
      }

      await recordReviewEvent({
        entityType: "draft",
        entityId: parsed.data.draftId,
        eventType: parsed.data.action === "approve" ? "approved" : "rejected",
        actorEmail: email,
        metadata: { nextStatus },
      });
    } else if (parsed.data.action === "queue_publish") {
      await queueDraftForPublish({
        draftId: parsed.data.draftId,
        notes: `Queued by ${email ?? "unknown"}`,
      });
      nextStatus = "approved";
    } else if (parsed.data.action === "publish_now") {
      await queueDraftForPublish({
        draftId: parsed.data.draftId,
        notes: `Immediate publish requested by ${email ?? "unknown"}`,
      });
      await publishApprovedDraft(parsed.data.draftId);
      nextStatus = "published";
    } else if (parsed.data.action === "generate_image") {
      try {
        await generateHeroImageForDraft(parsed.data.draftId);
        nextStatus = "image_generated";
      } catch (imageError) {
        captureRouteError(imageError, { route: "/api/admin/news/drafts", action: "POST" });
        // console.error("[drafts] Hero image generation failed:", imageError);
        return NextResponse.json(
          {
            error: imageError instanceof Error
              ? `Afbeelding genereren mislukt: ${imageError.message}`
              : "Afbeelding genereren mislukt",
          },
          { status: 500 }
        );
      }
    } else if (parsed.data.action === "find_source_image") {
      const result = await findBestSourceImageUrl(parsed.data.draftId);
      await logAuditEvent({
        actorEmail: email,
        actorRole: role,
        action: "content_draft_find_source_image",
        targetTable: "editorial_drafts",
        targetId: parsed.data.draftId,
        summary: result ? `Found source image: ${result.imageUrl}` : "No source image found",
        metadata: { imageUrl: result?.imageUrl ?? null },
      });
      return NextResponse.json({ imageUrl: result?.imageUrl ?? null, sourceArticleUrl: result?.sourceArticleUrl ?? null });
    } else if (parsed.data.action === "brand_and_upload_image") {
      if (!parsed.data.imageUrl) {
        return NextResponse.json({ error: "imageUrl is vereist voor brand_and_upload_image" }, { status: 400 });
      }
      try {
        const result = await downloadBrandAndUpload(parsed.data.draftId, parsed.data.imageUrl);
        nextStatus = "image_generated";
        await logAuditEvent({
          actorEmail: email,
          actorRole: role,
          action: "content_draft_brand_and_upload_image",
          targetTable: "editorial_drafts",
          targetId: parsed.data.draftId,
          summary: `Branded and uploaded image`,
          metadata: { generatedImageId: result.generatedImageId, brandedPath: result.brandedPath },
        });
        const drafts = await listDraftsByStatus(undefined, 40);
        return NextResponse.json({ drafts, generatedImageId: result.generatedImageId });
      } catch (brandError) {
        captureRouteError(brandError, { route: "/api/admin/news/drafts", action: "POST" });
        // console.error("[drafts] Brand and upload failed:", brandError);
        return NextResponse.json(
          {
            error: brandError instanceof Error
              ? `Afbeelding branden/uploaden mislukt: ${brandError.message}`
              : "Afbeelding branden/uploaden mislukt",
          },
          { status: 500 }
        );
      }
    } else if (parsed.data.action === "regenerate_blocks") {
      await regenerateBodyBlocks(parsed.data.draftId);
      nextStatus = "blocks_regenerated";
    } else if (parsed.data.action === "delete") {
      await supabaseAdmin.from("editorial_draft_sources").delete().eq("draft_id", parsed.data.draftId);
      await supabaseAdmin.from("generated_images").delete().eq("draft_id", parsed.data.draftId);
      const { error: deleteError } = await supabaseAdmin.from("editorial_drafts").delete().eq("id", parsed.data.draftId);
      if (deleteError) {
        return NextResponse.json({ error: "Draft kon niet verwijderd worden." }, { status: 500 });
      }
      nextStatus = "deleted";
    }

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: `content_draft_${parsed.data.action}`,
      targetTable: "editorial_drafts",
      targetId: parsed.data.draftId,
      summary: `Editorial draft ${parsed.data.action}`,
      metadata: { nextStatus },
    });

    const drafts = await listDraftsByStatus(undefined, 40);
    return NextResponse.json({ drafts });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/news/drafts", action: "POST" });
    // console.error("[drafts] POST handler error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Er is een fout opgetreden" },
      { status: 500 },
    );
  }
}
