import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { captureRouteError } from "@/lib/sentry-utils";

/**
 * GET: Generate signed URL for document download
 * Query params: ?document_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { isAdmin } = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("document_id");

    if (!documentId) {
      return NextResponse.json({ error: "document_id is verplicht" }, { status: 400 });
    }

    // Get document info
    const { data: document, error: docError } = await supabaseAdmin
      .from("kandidaat_documenten")
      .select("id, bestand_pad, bestandsnaam, bestand_grootte, mime_type")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: "Document niet gevonden" }, { status: 404 });
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from(process.env.SUPABASE_DOCUMENTS_BUCKET || "kandidaat-documenten")
      .createSignedUrl(document.bestand_pad, 3600); // 1 hour

    if (urlError || !signedUrlData) {
      captureRouteError(urlError ?? new Error("Signed URL leeg"), { route: "/api/admin/kandidaat-documenten/download", action: "GET" });
      // console.error("Signed URL error:", urlError);
      return NextResponse.json({ error: "Kon signed URL niet genereren" }, { status: 500 });
    }

    return NextResponse.json({
      document_id: document.id,
      file_name: document.bestandsnaam,
      file_size: document.bestand_grootte,
      mime_type: document.mime_type,
      signed_url: signedUrlData.signedUrl,
      expires_in: 3600, // seconds
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/kandidaat-documenten/download", action: "GET" });
    // console.error("Download URL error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
