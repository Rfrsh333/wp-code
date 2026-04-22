import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMedewerkerSession } from "@/lib/session";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("medewerker_documenten")
      .select("id, medewerker_id, document_type, file_name, file_path, file_url, file_size, uploaded_at, expiry_date")
      .eq("medewerker_id", medewerker.id)
      .order("uploaded_at", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });

    return NextResponse.json({ documenten: data });
  } catch (error) {
    console.error("Documenten fetch error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("document_type") as string;
    const expiryDate = formData.get("expiry_date") as string | null;

    if (!file) return NextResponse.json({ error: "Geen bestand geüpload" }, { status: 400 });
    if (!documentType) return NextResponse.json({ error: "Document type ontbreekt" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Bestand mag maximaal 10MB zijn" }, { status: 400 });

    const ext = file.name.split(".").pop() || "pdf";
    const timestamp = Date.now();
    const filePath = `${medewerker.id}/${documentType}_${timestamp}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("medewerker-documenten")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: "Upload mislukt: " + uploadError.message }, { status: 500 });
    }

    const { error: dbError } = await supabaseAdmin
      .from("medewerker_documenten")
      .insert({
        medewerker_id: medewerker.id,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
        file_url: null,
        file_size: file.size,
        expiry_date: expiryDate || null,
      });

    if (dbError) {
      await supabaseAdmin.storage.from("medewerker-documenten").remove([filePath]);
      return NextResponse.json({ error: "Database fout" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID ontbreekt" }, { status: 400 });

    // Get file path first
    const { data: doc } = await supabaseAdmin
      .from("medewerker_documenten")
      .select("file_path")
      .eq("id", id)
      .eq("medewerker_id", medewerker.id)
      .single();

    if (!doc) return NextResponse.json({ error: "Document niet gevonden" }, { status: 404 });

    // Delete from storage
    await supabaseAdmin.storage.from("medewerker-documenten").remove([doc.file_path]);

    // Delete from database
    const { error } = await supabaseAdmin
      .from("medewerker_documenten")
      .delete()
      .eq("id", id)
      .eq("medewerker_id", medewerker.id);

    if (error) return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Document delete error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
