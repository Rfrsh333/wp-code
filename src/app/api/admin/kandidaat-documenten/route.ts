import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { kandidaatDocumentenPatchSchema, validateAdminBody } from "@/lib/validations-admin";

const DOCUMENT_BUCKET = process.env.SUPABASE_DOCUMENTS_BUCKET || "kandidaat-documenten";

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized kandidaat-documenten access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const inschrijvingId = searchParams.get("inschrijvingId");

  if (!inschrijvingId) {
    return NextResponse.json({ error: "inschrijvingId is verplicht" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("kandidaat_documenten")
    .select("id, inschrijving_id, type, bestandsnaam, bestand_pad, file_path, mime_type, bestand_grootte, status, notitie, reviewed_at, uploaded_at")
    .eq("inschrijving_id", inschrijvingId)
    .order("uploaded_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Kandidaat documenten ophalen mislukt:", error);
    return NextResponse.json({ error: "Documenten konden niet worden opgehaald" }, { status: 500 });
  }

  // Generate signed URLs for all documents
  const enrichedDocuments = await Promise.all(
    (data || []).map(async (document) => {
      // Support both old and new column names during migration
      const filePath = document.file_path || document.bestand_pad;

      const { data: signedData } = await supabaseAdmin.storage
        .from(DOCUMENT_BUCKET)
        .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

      return {
        ...document,
        download_url: signedData?.signedUrl || null,
      };
    })
  );

  return NextResponse.json({ data: enrichedDocuments });
}

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized kandidaat-documenten mutation by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const formData = await request.formData();
  const inschrijvingId = String(formData.get("inschrijvingId") || "");
  const type = String(formData.get("type") || "");
  const notitie = String(formData.get("notitie") || "");
  const file = formData.get("file");

  if (!inschrijvingId || !type || !(file instanceof File)) {
    return NextResponse.json({ error: "inschrijvingId, type en file zijn verplicht" }, { status: 400 });
  }

  const safeFilename = sanitizeFilename(file.name);
  const path = `${inschrijvingId}/${Date.now()}-${safeFilename}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(DOCUMENT_BUCKET)
    .upload(path, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("Document upload mislukt:", uploadError);
    return NextResponse.json(
      {
        error:
          uploadError.message?.includes("Bucket not found")
            ? `Supabase Storage bucket '${DOCUMENT_BUCKET}' bestaat nog niet`
            : "Document upload mislukt",
      },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("kandidaat_documenten")
    .insert({
      inschrijving_id: inschrijvingId,
      type,
      bestandsnaam: file.name,
      bestand_pad: path,
      mime_type: file.type || null,
      bestand_grootte: file.size,
      status: "ontvangen",
      notitie: notitie || null,
    })
    .select("id, inschrijving_id, type, bestandsnaam, bestand_pad, mime_type, bestand_grootte, status, notitie, uploaded_at")
    .single();

  if (error) {
    console.error("Document metadata opslaan mislukt:", error);
    return NextResponse.json({ error: "Document metadata kon niet worden opgeslagen" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized kandidaat-documenten update by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const rawBody = await request.json();
  const validation = validateAdminBody(kandidaatDocumentenPatchSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { id, status, notitie } = validation.data;

  const updateData: Record<string, string | null> = {
    notitie: typeof notitie === "string" ? notitie : null,
  };

  if (status) {
    updateData.status = status;
    updateData.reviewed_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from("kandidaat_documenten")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Document update mislukt:", error);
    return NextResponse.json({ error: "Document kon niet worden bijgewerkt" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
