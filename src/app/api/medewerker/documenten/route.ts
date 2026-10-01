import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import {
  bepaalDocumentFormaat,
  isDocumentType,
  valideerDocument,
  type MedewerkerDocument,
} from "@/lib/medewerker/documenten";

const BUCKET = "medewerker-documenten";
/** Signed URL's zijn kort geldig; de pagina haalt ze opnieuw op bij elk bezoek. */
const SIGNED_URL_SECONDEN = 10 * 60;

export async function GET(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // "*": review_status/expiry_date zijn later toegevoegd; zo breekt de lijst niet als een kolom ontbreekt.
    const { data, error } = await supabaseAdmin
      .from("medewerker_documenten")
      .select("*")
      .eq("medewerker_id", medewerker.id)
      .order("uploaded_at", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });

    const rijen = (data ?? []) as Record<string, unknown>[];
    const paden = rijen.map((r) => r.file_path as string | null).filter((p): p is string => !!p);
    const urlPerPad = new Map<string, string>();
    if (paden.length > 0) {
      const { data: signed } = await supabaseAdmin.storage.from(BUCKET).createSignedUrls(paden, SIGNED_URL_SECONDEN);
      for (const s of signed ?? []) {
        if (s.path && s.signedUrl) urlPerPad.set(s.path, s.signedUrl);
      }
    }

    const documenten: MedewerkerDocument[] = rijen.map((r) => ({
      id: r.id as string,
      document_type: (r.document_type as string) ?? "overig",
      file_name: (r.file_name as string) ?? "document",
      file_size: (r.file_size as number | null) ?? null,
      uploaded_at: (r.uploaded_at as string) ?? (r.created_at as string) ?? "",
      expiry_date: (r.expiry_date as string | null) ?? null,
      review_status: (r.review_status as string | null) ?? null,
      url: r.file_path ? (urlPerPad.get(r.file_path as string) ?? null) : null,
    }));

    return NextResponse.json({ documenten }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/documenten", action: "GET" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    const documentType = formData.get("document_type");
    const expiryRaw = formData.get("expiry_date");

    if (!(file instanceof File)) return NextResponse.json({ error: "Geen bestand geüpload" }, { status: 400 });
    if (!isDocumentType(documentType)) {
      return NextResponse.json({ error: "Kies een geldig documenttype" }, { status: 400 });
    }
    const fout = valideerDocument(file);
    if (fout) return NextResponse.json({ error: fout }, { status: 400 });

    const expiryDate = typeof expiryRaw === "string" && expiryRaw ? expiryRaw : null;
    if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      return NextResponse.json({ error: "Ongeldige vervaldatum" }, { status: 400 });
    }

    const formaat = bepaalDocumentFormaat(file)!;
    const filePath = `${medewerker.id}/${documentType}_${Date.now()}.${formaat.ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, buffer, { contentType: formaat.mime, upsert: false });

    if (uploadError) {
      captureRouteError(uploadError, { route: "/api/medewerker/documenten", action: "UPLOAD" });
      return NextResponse.json({ error: "Upload mislukt" }, { status: 500 });
    }

    const rij = {
      medewerker_id: medewerker.id,
      document_type: documentType,
      file_name: file.name.slice(0, 200),
      file_path: filePath,
      file_url: null as string | null,
      file_size: file.size,
      expiry_date: expiryDate,
    };

    // file_url was NOT NULL in de oorspronkelijke tabel (supabase-migration-portaal-redesign.sql);
    // de bucket is privé, dus een vaste URL heeft geen zin. Migratie 20261001_medewerker_portaal
    // maakt de kolom nullable; tot die gedraaid is valt de insert terug op het opslagpad.
    let { error: dbError } = await supabaseAdmin.from("medewerker_documenten").insert(rij);
    if (dbError?.code === "23502") {
      ({ error: dbError } = await supabaseAdmin.from("medewerker_documenten").insert({ ...rij, file_url: filePath }));
    }

    if (dbError) {
      await supabaseAdmin.storage.from(BUCKET).remove([filePath]);
      captureRouteError(dbError, { route: "/api/medewerker/documenten", action: "INSERT" });
      return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/documenten", action: "POST" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID ontbreekt" }, { status: 400 });

    const { data: doc } = await supabaseAdmin
      .from("medewerker_documenten")
      .select("file_path")
      .eq("id", id)
      .eq("medewerker_id", medewerker.id)
      .maybeSingle();

    if (!doc) return NextResponse.json({ error: "Document niet gevonden" }, { status: 404 });

    const { error } = await supabaseAdmin
      .from("medewerker_documenten")
      .delete()
      .eq("id", id)
      .eq("medewerker_id", medewerker.id);

    if (error) return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });

    if (doc.file_path) {
      await supabaseAdmin.storage.from(BUCKET).remove([doc.file_path]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/documenten", action: "DELETE" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
