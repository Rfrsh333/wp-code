import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import { encryptField, decryptField } from "@/lib/encryption";
import { INGEPLAND_STATUSSEN } from "@/lib/dienst-status";
import { nlVandaag } from "@/lib/nl-tijd";
import { isGeldigIban, normaliseerIban } from "@/lib/medewerker/iban";

const ALLOWED_TYPES = ["image/jpeg", "image/png"];
// Vercel weigert bodies boven ~4,5 MB al vóór de route; 4 MB is de eerlijke grens.
const MAX_SIZE = 4 * 1024 * 1024;

const TEKSTVELDEN = ["stad", "adres", "postcode", "geboortedatum", "telefoon", "factuur_adres", "factuur_postcode", "factuur_stad", "btw_nummer"] as const;

export async function GET(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const vandaag = nlVandaag();
    const [{ data: profiel }, { data: ingepland }, { data: beoordelingen }] = await Promise.all([
      supabaseAdmin
        .from("medewerkers")
        .select("naam, email, functie, stad, adres, postcode, geboortedatum, bsn_geverifieerd, factuur_adres, factuur_postcode, factuur_stad, btw_nummer, iban, kor_actief, telefoon, badge, gemiddelde_score, aantal_beoordelingen, totaal_diensten, streak_count, profile_photo_path")
        .eq("id", medewerker.id)
        .single(),
      // Ingeplande diensten met check-in of uren = daadwerkelijk gewerkt (filter via de aanmelding;
      // uren_registraties.medewerker_id wordt niet gevuld).
      supabaseAdmin
        .from("dienst_aanmeldingen")
        .select("id, check_in_at, dienst:diensten!dienst_id(datum), uren:uren_registraties!aanmelding_id(id)")
        .eq("medewerker_id", medewerker.id)
        .in("status", [...INGEPLAND_STATUSSEN])
        .limit(1000),
      supabaseAdmin
        .from("beoordelingen")
        .select("score")
        .eq("medewerker_id", medewerker.id),
    ]);

    // Ontsleutel gevoelige PII-velden voor weergave (zie src/lib/encryption.ts).
    if (profiel) {
      const p = profiel as Record<string, unknown>;
      p.iban = decryptField(p.iban as string | null);
      p.btw_nummer = decryptField(p.btw_nummer as string | null);
    }

    // Opkomst = van de ingeplande diensten in het verleden, het deel waarbij is ingecheckt of
    // uren zijn ingediend. null als er nog geen afgelopen diensten zijn (dan tonen we niets).
    // Het oude "op tijd %" (opkomst + 2) was verzonnen en is weg.
    let gepland = 0;
    let gewerkt = 0;
    for (const a of ingepland || []) {
      const dienst = (a as { dienst?: { datum?: string } | { datum?: string }[] | null }).dienst;
      const datum = Array.isArray(dienst) ? dienst[0]?.datum : dienst?.datum;
      if (!datum || datum >= vandaag) continue;
      gepland += 1;
      const uren = (a as { uren?: unknown[] | null }).uren ?? [];
      if ((a as { check_in_at?: string | null }).check_in_at || uren.length > 0) gewerkt += 1;
    }
    const opkomst = gepland > 0 ? Math.round((gewerkt / gepland) * 100) : null;

    const scores = (beoordelingen || []).map((b) => Number(b.score)).filter((x) => x > 0);
    const avgRating = scores.length > 0
      ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10
      : 0;

    // Get public URL if photo exists (bucket is public)
    let profilePhotoUrl: string | null = null;
    if (profiel?.profile_photo_path) {
      const { data: publicUrlData } = supabaseAdmin.storage
        .from("medewerker-photos")
        .getPublicUrl(profiel.profile_photo_path as string);

      if (publicUrlData?.publicUrl) {
        profilePhotoUrl = publicUrlData.publicUrl;
      }
    }

    return NextResponse.json({
      profiel: profiel || {},
      stats: {
        opkomst_percentage: opkomst,
        rating: avgRating,
        aantal_beoordelingen: scores.length,
        gewerkte_diensten: gewerkt,
      },
      profile_photo_url: profilePhotoUrl,
      // Top-level id/naam/email: gebruikt voor de check-in-QR (Documenten las `data.id`, dat bestond niet).
      id: medewerker.id,
      naam: profiel?.naam || medewerker.naam,
      email: profiel?.email || medewerker.email,
      profile: {
        id: medewerker.id,
        naam: profiel?.naam || medewerker.naam,
        email: profiel?.email || medewerker.email,
        functie: profiel?.functie,
        profile_photo_url: profilePhotoUrl,
        rating: avgRating,
        aantal_beoordelingen: scores.length,
        totaal_diensten: gewerkt,
        badge: (profiel as Record<string, unknown> | null)?.badge ?? null,
        beoordeelde_diensten: (profiel as Record<string, unknown> | null)?.totaal_diensten ?? 0,
        gemiddelde_score: (profiel as Record<string, unknown> | null)?.gemiddelde_score ?? null,
      },
    }, {
      // Bevat IBAN/BTW: niet cachen (ook niet door de browser na een wijziging).
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/profile", action: "GET" });
    // console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const updateData: Record<string, string | boolean | null> = {};

    for (const field of TEKSTVELDEN) {
      if (field in body) {
        const waarde = typeof body[field] === "string" ? body[field].trim().slice(0, 200) : "";
        updateData[field] = waarde || null;
      }
    }

    // KOR: `body[field] || null` maakte van false een null. De medewerker kan de KOR alleen
    // AANzetten; uitzetten loopt via support (zo staat het ook in de app). false = geen wijziging.
    if (body.kor_actief === true) updateData.kor_actief = true;

    if ("iban" in body) {
      const iban = typeof body.iban === "string" ? normaliseerIban(body.iban) : "";
      if (iban && !isGeldigIban(iban)) {
        return NextResponse.json({ error: "Dit IBAN klopt niet. Controleer het nummer." }, { status: 400 });
      }
      updateData.iban = iban || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true });
    }

    // Versleutel gevoelige PII-velden bij opslag (zie src/lib/encryption.ts).
    if ("iban" in updateData) updateData.iban = encryptField(updateData.iban as string | null);
    if ("btw_nummer" in updateData) updateData.btw_nummer = encryptField(updateData.btw_nummer as string | null);

    const { error } = await supabaseAdmin
      .from("medewerkers")
      .update(updateData)
      .eq("id", medewerker.id);

    if (error) {
      return NextResponse.json({ error: "Update mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/profile", action: "PUT" });
    // console.error("Profile update error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Geen bestand geüpload" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Alleen JPG en PNG bestanden zijn toegestaan" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Foto mag maximaal 4 MB zijn" }, { status: 400 });
    }

    // Check for existing photo and remove it
    const { data: existing } = await supabaseAdmin
      .from("medewerkers")
      .select("profile_photo_path")
      .eq("id", medewerker.id)
      .single();

    if (existing?.profile_photo_path) {
      await supabaseAdmin.storage
        .from("medewerker-photos")
        .remove([existing.profile_photo_path]);
    }

    // Upload new photo
    const ext = file.type === "image/png" ? "png" : "jpg";
    const filePath = `${medewerker.id}/profile.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("medewerker-photos")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: "Upload mislukt: " + uploadError.message }, { status: 500 });
    }

    // Get public URL (bucket is public)
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("medewerker-photos")
      .getPublicUrl(filePath);

    // Update medewerker record
    const { error: updateError } = await supabaseAdmin
      .from("medewerkers")
      .update({
        profile_photo_url: publicUrlData.publicUrl,
        profile_photo_path: filePath,
      })
      .eq("id", medewerker.id);

    if (updateError) {
      return NextResponse.json({ error: "Database update mislukt" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile_photo_url: publicUrlData.publicUrl,
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/profile", action: "POST" });
    // console.error("Profile photo upload error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get current photo path
    const { data: existing } = await supabaseAdmin
      .from("medewerkers")
      .select("profile_photo_path")
      .eq("id", medewerker.id)
      .single();

    if (existing?.profile_photo_path) {
      await supabaseAdmin.storage
        .from("medewerker-photos")
        .remove([existing.profile_photo_path]);
    }

    // Clear fields
    const { error } = await supabaseAdmin
      .from("medewerkers")
      .update({
        profile_photo_url: null,
        profile_photo_path: null,
      })
      .eq("id", medewerker.id);

    if (error) {
      return NextResponse.json({ error: "Database update mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/profile", action: "DELETE" });
    // console.error("Profile photo delete error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
