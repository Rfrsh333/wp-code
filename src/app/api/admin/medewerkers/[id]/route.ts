import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { decryptField } from "@/lib/encryption";
import { documentOpslagPad, MEDEWERKER_DOCUMENTEN_BUCKET } from "@/lib/medewerker/documenten";
import { klantUurtariefVoorAanmelding } from "@/lib/medewerker/reactie-regels";
import { verdienstenVanRegel } from "@/lib/medewerker/uren-regels";
import { haalVoorwaarden } from "@/lib/medewerker/reactie-voorwaarden";

/** Signed URL's voor documenten (privé bucket) zijn 10 minuten geldig. */
const DOCUMENT_URL_SECONDEN = 10 * 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  // Parallel fetch all data for this medewerker
  const [
    profielRes,
    werkervaringRes,
    vaardighedenRes,
    documentenRes,
    dienstenRes,
    urenRes,
    beoordelingenRes,
  ] = await Promise.all([
    // Profiel
    supabaseAdmin
      .from("medewerkers")
      .select("id, naam, email, telefoon, functie, uurtarief, status, notities, created_at, profile_photo_url, geboortedatum, stad, adres, postcode, bsn_geverifieerd, factuur_adres, factuur_postcode, factuur_stad, btw_nummer, iban, kor_actief, admin_score_aanwezigheid, admin_score_vaardigheden")
      .eq("id", id)
      .single(),
    // Werkervaring
    supabaseAdmin
      .from("medewerker_werkervaring")
      .select("*")
      .eq("medewerker_id", id)
      .order("start_datum", { ascending: false }),
    // Vaardigheden
    supabaseAdmin
      .from("medewerker_vaardigheden")
      .select("*")
      .eq("medewerker_id", id)
      .order("categorie"),
    // Documenten
    supabaseAdmin
      .from("medewerker_documenten")
      .select("*")
      .eq("medewerker_id", id)
      .order("uploaded_at", { ascending: false }),
    // Diensten (via aanmeldingen)
    supabaseAdmin
      .from("dienst_aanmeldingen")
      .select(`
        id, status, aangemeld_at,
        diensten (
          id, klant_naam, locatie, datum, start_tijd, eind_tijd, functie, uurtarief
        )
      `)
      .eq("medewerker_id", id)
      // De kolom heet aangemeld_at; met aangemeld_op faalde deze query en bleef de lijst leeg.
      .order("aangemeld_at", { ascending: false })
      .limit(50),
    // Uren registraties
    supabaseAdmin
      .from("uren_registraties")
      .select(`
        id, aanmelding_id, gewerkte_uren, start_tijd, eind_tijd, status, created_at,
        dienst_aanmeldingen!inner (
          medewerker_id,
          diensten!inner (
            datum, klant_naam, locatie, uurtarief
          )
        )
      `)
      // uren_registraties.medewerker_id wordt nooit gevuld (zie lib/medewerker/uren.ts): filter via de aanmelding.
      .eq("dienst_aanmeldingen.medewerker_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    // Beoordelingen van klanten
    supabaseAdmin
      .from("beoordelingen")
      .select(`
        id, score, opmerking, created_at,
        score_punctualiteit, score_professionaliteit, score_vaardigheden, score_communicatie,
        zou_opnieuw_boeken,
        klanten (id, bedrijfsnaam),
        diensten (id, datum, locatie, functie)
      `)
      .eq("medewerker_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (profielRes.error || !profielRes.data) {
    return NextResponse.json({ error: "Medewerker niet gevonden" }, { status: 404 });
  }

  // Ontsleutel gevoelige PII-velden voor weergave (zie src/lib/encryption.ts).
  const profiel = { ...(profielRes.data as Record<string, unknown>) };
  profiel.iban = decryptField(profiel.iban as string | null);
  profiel.btw_nummer = decryptField(profiel.btw_nummer as string | null);

  // Calculate stats
  const totalAanmeldingen = dienstenRes.data?.filter((d) => d.status === "geaccepteerd").length || 0;
  const goedgekeurdeUren = urenRes.data?.filter((u) => u.status === "goedgekeurd") || [];
  const totalUren = goedgekeurdeUren.reduce((sum, u) => sum + (u.gewerkte_uren || 0), 0);
  const opkomstPct = totalAanmeldingen > 0 ? Math.round((goedgekeurdeUren.length / totalAanmeldingen) * 100) : 0;

  // Monthly financials. "Verdiensten" = wat de medewerker verdiende, met dezelfde formule als zijn
  // eigen dashboard (verdienstenVanRegel: uren × (klanttarief − € 4) + toeslag), over het tarief van
  // de aanmelding (tegenbod + € 4, anders de dienst). Voorheen uren × klanttarief, dus mét marge;
  // dat was nooit zichtbaar omdat de lijst door het medewerker_id-filter altijd leeg bleef.
  const voorwaarden = await haalVoorwaarden(goedgekeurdeUren.map((u) => u.aanmelding_id as string));
  const maandMap = new Map<string, { uren: number; verdiensten: number; diensten: number }>();
  for (const u of goedgekeurdeUren) {
    const aanmelding = (Array.isArray(u.dienst_aanmeldingen) ? u.dienst_aanmeldingen[0] : u.dienst_aanmeldingen) as
      | { diensten?: { datum: string; uurtarief?: number } | { datum: string; uurtarief?: number }[] }
      | null;
    const dienst = Array.isArray(aanmelding?.diensten) ? aanmelding?.diensten[0] : aanmelding?.diensten;
    if (!dienst) continue;
    const d = new Date(dienst.datum);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = maandMap.get(key) || { uren: 0, verdiensten: 0, diensten: 0 };
    existing.uren += u.gewerkte_uren || 0;
    existing.verdiensten += verdienstenVanRegel({
      status: u.status,
      gewerkte_uren: u.gewerkte_uren,
      start_tijd: u.start_tijd,
      eind_tijd: u.eind_tijd,
      datum: dienst.datum,
      klant_uurtarief: klantUurtariefVoorAanmelding(dienst.uurtarief, voorwaarden.get(u.aanmelding_id as string)?.voorgesteld_uurtarief),
    });
    existing.diensten += 1;
    maandMap.set(key, existing);
  }

  const financieel = Array.from(maandMap.entries())
    .map(([maand, data]) => ({ maand, ...data }))
    .sort((a, b) => b.maand.localeCompare(a.maand));

  const totalVerdiensten = financieel.reduce((sum, m) => sum + m.verdiensten, 0);

  // De bucket is privé: file_url opent niets. Per document een kortlevende signed URL.
  const documentRijen = (documentenRes.data ?? []) as Record<string, unknown>[];
  const padPerDoc = documentRijen.map((d) =>
    documentOpslagPad({ file_path: d.file_path as string | null, file_url: d.file_url as string | null }),
  );
  const paden = [...new Set(padPerDoc.filter((p): p is string => !!p))];
  const urlPerPad = new Map<string, string>();
  if (paden.length > 0) {
    const { data: signed } = await supabaseAdmin.storage
      .from(MEDEWERKER_DOCUMENTEN_BUCKET)
      .createSignedUrls(paden, DOCUMENT_URL_SECONDEN);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlPerPad.set(s.path, s.signedUrl);
    }
  }
  const documenten = documentRijen.map((d, i) => ({
    ...d,
    signed_url: padPerDoc[i] ? (urlPerPad.get(padPerDoc[i]!) ?? null) : null,
  }));

  return NextResponse.json({
    profiel,
    werkervaring: werkervaringRes.data || [],
    vaardigheden: vaardighedenRes.data || [],
    documenten,
    // `aangemeld_op` blijft in het antwoord voor de bestaande weergave (MedewerkerDetailView).
    diensten: (dienstenRes.data || []).map((d) => ({ ...d, aangemeld_op: d.aangemeld_at })),
    financieel,
    beoordelingen: beoordelingenRes.data || [],
    stats: {
      opkomst_percentage: opkomstPct,
      totaal_uren: totalUren,
      totaal_verdiensten: totalVerdiensten,
      totaal_diensten: totalAanmeldingen,
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
