import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { regenerateBodyBlocks } from "@/lib/content/services/draft-generation-service";
import { logAuditEvent } from "@/lib/audit-log";
import { captureRouteError } from "@/lib/sentry-utils";

export async function POST(request: NextRequest) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Fetch all drafts
    const { data: drafts, error } = await supabaseAdmin
      .from("editorial_drafts")
      .select("id, title")
      .order("created_at", { ascending: false });

    if (error) {
      captureRouteError(error, { route: "/api/admin/news/drafts/regenerate-all", action: "POST" });
      // console.error("[regenerate-all] Failed to fetch drafts:", error);
      return NextResponse.json({ error: "Kon drafts niet ophalen" }, { status: 500 });
    }

    if (!drafts || drafts.length === 0) {
      return NextResponse.json({ message: "Geen drafts gevonden", success: 0, failed: 0 });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ id: string; title: string; error: string }> = [];

    // Regenerate all drafts
    for (const draft of drafts) {
      try {
        await regenerateBodyBlocks(draft.id);
        successCount++;
      } catch (err) {
        errorCount++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        errors.push({
          id: draft.id,
          title: draft.title || "Untitled",
          error: errorMessage,
        });
        captureRouteError(err, { route: "/api/admin/news/drafts/regenerate-all", action: "POST" });
        // console.error(`[regenerate-all] Failed for ${draft.title}:`, errorMessage);
      }
    }

    // Log audit event
    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "content_drafts_regenerate_all",
      targetTable: "editorial_drafts",
      summary: `Regenerated ${successCount} drafts (${errorCount} failed)`,
      metadata: { total: drafts.length, success: successCount, failed: errorCount, errors },
    });

    return NextResponse.json({
      message: `Regeneratie voltooid: ${successCount} succesvol, ${errorCount} mislukt`,
      total: drafts.length,
      success: successCount,
      failed: errorCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/news/drafts/regenerate-all", action: "POST" });
    // console.error("[regenerate-all] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Er is een fout opgetreden" },
      { status: 500 }
    );
  }
}
