import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { captureRouteError } from "@/lib/sentry-utils";
import { naarAdminDocument, reviewNaarStatus, type KandidaatDocumentRij } from "@/lib/kandidaat-documenten";

interface ReviewRequest {
  document_id: string;
  review_status: "approved" | "rejected";
  review_notes?: string;
}

/**
 * POST: Review (approve/reject) uploaded kandidaat document
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const { isAdmin, email, role } = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body: ReviewRequest = await request.json();
    const { document_id, review_status, review_notes } = body;

    if (!document_id || !review_status) {
      return NextResponse.json(
        { error: "document_id en review_status zijn verplicht" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(review_status)) {
      return NextResponse.json(
        { error: "review_status moet 'approved' of 'rejected' zijn" },
        { status: 400 }
      );
    }

    // Update document review status
    const { data: document, error } = await supabaseAdmin
      .from("kandidaat_documenten")
      // Live tabel: status (ontvangen|goedgekeurd|afgekeurd) + notitie. De
      // kolommen review_status/reviewed_by/review_notes bestaan niet; wie
      // reviewde staat in de audit-log hieronder.
      .update({
        status: reviewNaarStatus(review_status),
        reviewed_at: new Date().toISOString(),
        notitie: review_notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", document_id)
      .select("id, inschrijving_id, type, bestandsnaam, bestand_pad, mime_type, bestand_grootte, status, notitie, reviewed_at, uploaded_at")
      .single<KandidaatDocumentRij>();

    if (error || !document) {
      captureRouteError(error, { route: "/api/admin/kandidaat-documenten/review", action: "POST" });
      // console.error("Document review error:", error);
      return NextResponse.json({ error: "Document niet gevonden" }, { status: 404 });
    }

    // Check if all required documents are approved
    const { data: inschrijving } = await supabaseAdmin
      .from("inschrijvingen")
      .select("uitbetalingswijze")
      .eq("id", document.inschrijving_id)
      .single();

    if (inschrijving) {
      const { data: allDocs } = await supabaseAdmin
        .from("kandidaat_documenten")
        .select("type, status")
        .eq("inschrijving_id", document.inschrijving_id);

      // Required docs: ID + CV (+ KVK for ZZP)
      const requiredTypes = inschrijving.uitbetalingswijze === "zzp"
        ? ["id", "cv", "kvk"]
        : ["id", "cv"];

      const allRequiredApproved = requiredTypes.every(type =>
        allDocs?.some(doc => doc.type === type && doc.status === "goedgekeurd")
      );

      // Auto-update kandidaat status if all docs approved
      if (allRequiredApproved) {
        await supabaseAdmin
          .from("inschrijvingen")
          .update({
            onboarding_status: "goedgekeurd",
            laatste_contact_op: new Date().toISOString(),
          })
          .eq("id", document.inschrijving_id);

      }
    }

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "review_candidate_document",
      targetTable: "kandidaat_documenten",
      targetId: document_id,
      summary: `Document ${document_id} ${review_status === "approved" ? "goedgekeurd" : "afgekeurd"}`,
      metadata: {
        inschrijvingId: document.inschrijving_id,
        reviewStatus: review_status,
        reviewNotes: review_notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      document: naarAdminDocument(document),
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/kandidaat-documenten/review", action: "POST" });
    // console.error("Document review error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
