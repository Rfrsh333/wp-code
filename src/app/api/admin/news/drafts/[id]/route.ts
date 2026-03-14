import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { getDraftById, getGeneratedImageById } from "@/lib/content/repository";
import { createEditorialImageSignedUrl } from "@/lib/images/storage";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const draft = await getDraftById(id);

  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  const heroImage = draft.heroImageId ? await getGeneratedImageById(draft.heroImageId) : null;
  const heroImageUrl =
    heroImage?.storagePathBranded
      ? await createEditorialImageSignedUrl(heroImage.storagePathBranded)
      : null;

  return NextResponse.json({
    draft,
    heroImageUrl,
  });
}

const patchSchema = z.object({
  title: z.string().min(5).optional(),
  excerpt: z.string().min(10).optional(),
  bodyMarkdown: z.string().min(50).optional(),
  seoTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  keyTakeaways: z.array(z.string()).optional(),
  actionSteps: z.array(z.string()).optional(),
  reviewNotes: z.string().optional(),
  scheduledFor: z.string().datetime().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige data", details: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.excerpt !== undefined) updates.excerpt = parsed.data.excerpt;
  if (parsed.data.bodyMarkdown !== undefined) updates.body_markdown = parsed.data.bodyMarkdown;
  if (parsed.data.seoTitle !== undefined) updates.seo_title = parsed.data.seoTitle;
  if (parsed.data.metaDescription !== undefined) updates.meta_description = parsed.data.metaDescription;
  if (parsed.data.keyTakeaways !== undefined) updates.key_takeaways = parsed.data.keyTakeaways;
  if (parsed.data.actionSteps !== undefined) updates.action_steps = parsed.data.actionSteps;
  if (parsed.data.reviewNotes !== undefined) updates.review_notes = parsed.data.reviewNotes;

  if (Object.keys(updates).length === 0 && !parsed.data.scheduledFor) {
    return NextResponse.json({ error: "Geen wijzigingen ontvangen" }, { status: 400 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("editorial_drafts")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    console.error("[drafts] PATCH error:", updateError);
    return NextResponse.json({ error: "Draft kon niet bijgewerkt worden" }, { status: 500 });
  }

  // Handle scheduled publishing
  if (parsed.data.scheduledFor) {
    await supabaseAdmin
      .from("publish_queue")
      .upsert(
        {
          draft_id: id,
          scheduled_for: parsed.data.scheduledFor,
          status: "approved",
          notes: `Ingepland door ${email ?? "admin"}`,
        },
        { onConflict: "draft_id" },
      );
  }

  await logAuditEvent({
    actorEmail: email,
    actorRole: role,
    action: "content_draft_edit",
    targetTable: "editorial_drafts",
    targetId: id,
    summary: `Draft inline bewerkt: ${Object.keys(updates).join(", ")}`,
    metadata: { fields: Object.keys(updates) },
  });

  const draft = await getDraftById(id);
  return NextResponse.json({ draft });
}
