import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { ensureKlantForDienst } from "@/lib/klanten-sync";
import { sendMedewerkerShiftConfirmationEmail } from "@/lib/medewerker-shift-email";

export async function GET(request: NextRequest) {
  // KRITIEK: Verify admin with proper email check
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized diensten access attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }
  const { data } = await supabaseAdmin.from("diensten").select("*").order("datum", { ascending: true });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  // KRITIEK: Verify admin with proper email check
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized diensten mutation attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { action, id, dienst_id, data } = await request.json();

  if (action === "create") {
    const payload = { ...data };
    if (payload.klant_naam) {
      payload.klant_id = await ensureKlantForDienst(payload);
    }
    // Genereer spoeddienst token als het een spoeddienst is
    if (payload.is_spoeddienst) {
      payload.spoeddienst_token = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
      payload.spoeddienst_whatsapp_tekst = generateWhatsAppTekst(payload);
    }
    await supabaseAdmin.from("diensten").insert(payload);
  }
  if (action === "update") {
    const payload = { ...data };
    if (payload.klant_naam) {
      payload.klant_id = await ensureKlantForDienst(payload);
    }
    // Als spoeddienst wordt geactiveerd en er nog geen token is
    if (payload.is_spoeddienst && !payload.spoeddienst_token) {
      const { data: existing } = await supabaseAdmin
        .from("diensten")
        .select("spoeddienst_token")
        .eq("id", id)
        .single();
      if (!existing?.spoeddienst_token) {
        payload.spoeddienst_token = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
      }
      payload.spoeddienst_whatsapp_tekst = generateWhatsAppTekst(payload);
    }
    if (payload.is_spoeddienst === false) {
      payload.spoeddienst_token = null;
      payload.spoeddienst_whatsapp_tekst = null;
    }
    await supabaseAdmin.from("diensten").update(payload).eq("id", id);
  }
  if (action === "delete") {
    await supabaseAdmin.from("diensten").delete().eq("id", id);
  }
  if (action === "get_aanmeldingen") {
    const { data: aanmeldingen } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("*, medewerker:medewerkers(naam, email, telefoon)")
      .eq("dienst_id", dienst_id)
      .order("aangemeld_at", { ascending: true });
    return NextResponse.json({ data: aanmeldingen });
  }
  if (action === "update_aanmelding") {
    await supabaseAdmin
      .from("dienst_aanmeldingen")
      .update({ status: data.status, beoordeeld_at: new Date().toISOString() })
      .eq("id", id);

    if (data.status === "geaccepteerd") {
      const { data: aanmelding } = await supabaseAdmin
        .from("dienst_aanmeldingen")
        .select(`
          id,
          medewerker:medewerkers(naam, email),
          dienst:diensten(klant_naam, locatie, datum, start_tijd, eind_tijd, functie, notities)
        `)
        .eq("id", id)
        .single();

      const medewerker = Array.isArray(aanmelding?.medewerker) ? aanmelding?.medewerker[0] : aanmelding?.medewerker;
      const dienst = Array.isArray(aanmelding?.dienst) ? aanmelding?.dienst[0] : aanmelding?.dienst;

      if (medewerker?.email && dienst) {
        await sendMedewerkerShiftConfirmationEmail({
          medewerkerNaam: medewerker.naam,
          medewerkerEmail: medewerker.email,
          functie: dienst.functie,
          datum: dienst.datum,
          startTijd: dienst.start_tijd,
          eindTijd: dienst.eind_tijd,
          locatie: dienst.locatie,
          klantNaam: dienst.klant_naam,
          kledingvoorschrift: dienst.notities,
        });
      }
    }
  }

  // Spoeddienst: haal responses op
  if (action === "get_spoeddienst_responses") {
    const { data: responses } = await supabaseAdmin
      .from("spoeddienst_responses")
      .select("*")
      .eq("dienst_id", dienst_id)
      .order("created_at", { ascending: true });
    return NextResponse.json({ data: responses });
  }

  // Spoeddienst: update response status (bevestig/afwijs)
  if (action === "update_spoeddienst_response") {
    await supabaseAdmin
      .from("spoeddienst_responses")
      .update({ status: data.status })
      .eq("id", id);

    // Bij bevestiging: maak ook een dienst_aanmelding aan als er een medewerker_id is
    if (data.status === "bevestigd") {
      const { data: response } = await supabaseAdmin
        .from("spoeddienst_responses")
        .select("medewerker_id, dienst_id")
        .eq("id", id)
        .single();

      if (response?.medewerker_id) {
        // Check of er al een aanmelding bestaat
        const { data: existing } = await supabaseAdmin
          .from("dienst_aanmeldingen")
          .select("id")
          .eq("dienst_id", response.dienst_id)
          .eq("medewerker_id", response.medewerker_id)
          .maybeSingle();

        if (!existing) {
          await supabaseAdmin.from("dienst_aanmeldingen").insert({
            dienst_id: response.dienst_id,
            medewerker_id: response.medewerker_id,
            status: "geaccepteerd",
            aangemeld_at: new Date().toISOString(),
            beoordeeld_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  // Spoeddienst: regenereer WhatsApp tekst (na bewerking)
  if (action === "regenerate_whatsapp") {
    const { data: dienst } = await supabaseAdmin
      .from("diensten")
      .select("*")
      .eq("id", id)
      .single();

    if (dienst) {
      const tekst = generateWhatsAppTekst(dienst);
      await supabaseAdmin
        .from("diensten")
        .update({ spoeddienst_whatsapp_tekst: tekst })
        .eq("id", id);
      return NextResponse.json({ data: { whatsapp_tekst: tekst } });
    }
  }

  return NextResponse.json({ success: true });
}

function generateWhatsAppTekst(dienst: {
  klant_naam?: string;
  locatie?: string;
  datum?: string;
  start_tijd?: string;
  eind_tijd?: string;
  functie?: string;
  aantal_nodig?: number;
  uurtarief?: number | null;
  spoeddienst_token?: string;
}): string {
  const functieLabels: Record<string, string> = {
    bediening: "Bediening",
    bar: "Bar",
    keuken: "Keuken",
    afwas: "Afwas",
    gastheer: "Gastheer/vrouw",
  };

  const date = dienst.datum
    ? new Date(dienst.datum + "T00:00:00").toLocaleDateString("nl-NL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dienstDate = dienst.datum ? new Date(dienst.datum + "T00:00:00") : null;
  let dagLabel = date;
  if (dienstDate) {
    if (dienstDate.getTime() === today.getTime()) dagLabel = `Vandaag (${date})`;
    else {
      const morgen = new Date(today);
      morgen.setDate(morgen.getDate() + 1);
      if (dienstDate.getTime() === morgen.getTime()) dagLabel = `Morgen (${date})`;
    }
  }

  const functie = functieLabels[dienst.functie || ""] || dienst.functie || "";
  const startTijd = dienst.start_tijd?.substring(0, 5) || "";
  const eindTijd = dienst.eind_tijd?.substring(0, 5) || "";
  const tarief = dienst.uurtarief ? `\n💰 €${dienst.uurtarief.toFixed(2)}/uur` : "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";

  return `🚨 SPOEDDIENST 🚨

📍 ${dienst.klant_naam || ""}, ${dienst.locatie || ""}
📅 ${dagLabel}
⏰ ${startTijd} - ${eindTijd}
👤 ${dienst.aantal_nodig || 1}x ${functie}${tarief}

Beschikbaar? Klik hier:
${baseUrl}/spoeddienst/${dienst.spoeddienst_token || ""}`;
}
