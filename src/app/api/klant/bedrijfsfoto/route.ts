import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import { leesAfbeeldingUitVerzoek } from "@/lib/afbeelding-upload";
import { fotoUitUrl, sfeerfotoIdUitUrl, sfeerfotoOpId } from "@/lib/sfeerfotos";
import { BEDRIJFSFOTO_BUCKET, leesBedrijfsfoto, verwijderBedrijfsfotoBestand } from "@/lib/sfeerfotos-opslag";

/**
 * Bedrijfsfoto van de werkgever (klanten.foto_url): één vaste sfeerfoto van de zaak die bij al zijn
 * diensten zonder eigen foto komt (lib/sfeerfotos.ts, voorrang dienst → bedrijf → standaard).
 *
 * GET    → { foto_url, sfeerfoto_id, foto, beschikbaar }
 * PUT    → multipart met `file` (eigen foto, zelfde regels als /api/klant/dienst-afbeelding; opslag
 *          in dienst-afbeeldingen/bedrijven/<klantId>/) óf JSON { sfeerfoto_id } (standaardfoto)
 *          → { foto_url, ... }
 * DELETE → { foto_url: null, ... }
 *
 * Zonder migratie 20261023_bedrijfsfoto.sql: GET geeft beschikbaar: false, PUT 503 (er wordt dan
 * niets geüpload).
 */

const ROUTE = "/api/klant/bedrijfsfoto";
const NIET_BESCHIKBAAR = "Een bedrijfsfoto instellen kan nog niet. Probeer het later opnieuw.";

function antwoord(fotoUrl: string | null, beschikbaar = true) {
  return {
    success: true,
    beschikbaar,
    foto_url: fotoUrl,
    sfeerfoto_id: sfeerfotoIdUitUrl(fotoUrl),
    foto: fotoUitUrl(fotoUrl, "bedrijf"),
  };
}

async function zetFotoUrl(klantId: string, fotoUrl: string | null) {
  return supabaseAdmin.from("klanten").update({ foto_url: fotoUrl }).eq("id", klantId);
}

export async function GET(request: NextRequest) {
  try {
    const klant = await getKlantSession(request);
    if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { beschikbaar, fotoUrl } = await leesBedrijfsfoto(klant.id);
    return NextResponse.json(antwoord(fotoUrl, beschikbaar));
  } catch (error) {
    captureRouteError(error, { route: ROUTE, action: "GET" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const klant = await getKlantSession(request);
    if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const huidig = await leesBedrijfsfoto(klant.id);
    if (!huidig.beschikbaar) {
      return NextResponse.json({ error: NIET_BESCHIKBAAR, code: "bedrijfsfoto_niet_beschikbaar" }, { status: 503 });
    }

    const isUpload = (request.headers.get("content-type") || "").toLowerCase().includes("multipart/form-data");
    let nieuweUrl: string;
    let geupload: string | null = null;

    if (isUpload) {
      const bestand = await leesAfbeeldingUitVerzoek(request);
      if (!bestand.ok) return NextResponse.json({ error: bestand.error }, { status: bestand.status });

      geupload = `bedrijven/${klant.id}/${crypto.randomBytes(8).toString("hex")}.${bestand.ext}`;
      const { error: uploadFout } = await supabaseAdmin.storage
        .from(BEDRIJFSFOTO_BUCKET)
        .upload(geupload, bestand.buffer, { contentType: bestand.type, cacheControl: "3600", upsert: false });
      if (uploadFout) {
        captureRouteError(uploadFout, { route: ROUTE, action: "UPLOAD" });
        return NextResponse.json({ error: "Upload mislukt" }, { status: 500 });
      }
      nieuweUrl = supabaseAdmin.storage.from(BEDRIJFSFOTO_BUCKET).getPublicUrl(geupload).data.publicUrl;
    } else {
      const body = await request.json().catch(() => null);
      const id = body && typeof body === "object" ? (body as Record<string, unknown>).sfeerfoto_id : undefined;
      const foto = sfeerfotoOpId(id);
      if (!foto) {
        return NextResponse.json({ error: "Kies een standaardfoto (sfeerfoto_id) of upload een foto" }, { status: 400 });
      }
      nieuweUrl = foto.groot;
    }

    const { error } = await zetFotoUrl(klant.id, nieuweUrl);
    if (error) {
      captureRouteError(error, { route: ROUTE, action: "OPSLAAN" });
      if (geupload) await verwijderBedrijfsfotoBestand(klant.id, nieuweUrl);
      return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
    }

    // De vorige eigen upload is niet meer in gebruik (diensten verwijzen naar de bedrijfsfoto via
    // de klant, niet via een kopie van de URL).
    if (huidig.fotoUrl && huidig.fotoUrl !== nieuweUrl) await verwijderBedrijfsfotoBestand(klant.id, huidig.fotoUrl);

    return NextResponse.json(antwoord(nieuweUrl));
  } catch (error) {
    captureRouteError(error, { route: ROUTE, action: "PUT" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const klant = await getKlantSession(request);
    if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const huidig = await leesBedrijfsfoto(klant.id);
    if (!huidig.beschikbaar) return NextResponse.json(antwoord(null, false));
    if (!huidig.fotoUrl) return NextResponse.json(antwoord(null));

    const { error } = await zetFotoUrl(klant.id, null);
    if (error) {
      captureRouteError(error, { route: ROUTE, action: "DELETE" });
      return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
    }
    await verwijderBedrijfsfotoBestand(klant.id, huidig.fotoUrl);
    return NextResponse.json(antwoord(null));
  } catch (error) {
    captureRouteError(error, { route: ROUTE, action: "DELETE" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
