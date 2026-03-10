import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const DOCUMENT_BUCKET = process.env.SUPABASE_DOCUMENTS_BUCKET || "kandidaat-documenten";

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function getCandidateByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from("inschrijvingen")
    .select("id, voornaam, achternaam, email, onboarding_portal_token_expires_at")
    .eq("onboarding_portal_token", token)
    .gt("onboarding_portal_token_expires_at", new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token ontbreekt" }, { status: 400 });
  }

  const kandidaat = await getCandidateByToken(token);
  if (!kandidaat) {
    return NextResponse.json({ error: "Uploadlink is ongeldig of verlopen" }, { status: 403 });
  }

  const { data: documenten, error } = await supabaseAdmin
    .from("kandidaat_documenten")
    .select("id, type, bestandsnaam, status, uploaded_at")
    .eq("inschrijving_id", kandidaat.id)
    .order("uploaded_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Documenten konden niet worden opgehaald" }, { status: 500 });
  }

  return NextResponse.json({
    kandidaat: {
      voornaam: kandidaat.voornaam,
      achternaam: kandidaat.achternaam,
      email: kandidaat.email,
    },
    documenten: documenten || [],
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const token = String(formData.get("token") || "");
  const type = String(formData.get("type") || "");
  const file = formData.get("file");

  if (!token || !type || !(file instanceof File)) {
    return NextResponse.json({ error: "Token, type en bestand zijn verplicht" }, { status: 400 });
  }

  const kandidaat = await getCandidateByToken(token);
  if (!kandidaat) {
    return NextResponse.json({ error: "Uploadlink is ongeldig of verlopen" }, { status: 403 });
  }

  const safeFilename = sanitizeFilename(file.name);
  const path = `${kandidaat.id}/${Date.now()}-${safeFilename}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(DOCUMENT_BUCKET)
    .upload(path, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("Kandidaat document upload mislukt:", uploadError);
    return NextResponse.json({ error: "Upload mislukt" }, { status: 500 });
  }

  const { error: insertError } = await supabaseAdmin.from("kandidaat_documenten").insert({
    inschrijving_id: kandidaat.id,
    type,
    bestandsnaam: file.name,
    bestand_pad: path,
    mime_type: file.type || null,
    bestand_grootte: file.size,
    status: "ontvangen",
  });

  if (insertError) {
    console.error("Kandidaat document metadata insert mislukt:", insertError);
    return NextResponse.json({ error: "Upload metadata kon niet worden opgeslagen" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
