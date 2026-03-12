import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { generateOfferteVoorstel } from "@/lib/agents/offerte-generator";
import crypto from "crypto";

// POST /api/admin/ai/offerte-generator
// Generates AI offerte from personeel aanvraag
export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { aanvraag_id } = await request.json();

    if (!aanvraag_id) {
      return NextResponse.json({ error: "aanvraag_id is verplicht" }, { status: 400 });
    }

    // Fetch aanvraag
    const { data: aanvraag, error: dbError } = await supabaseAdmin
      .from("personeel_aanvragen")
      .select("*")
      .eq("id", aanvraag_id)
      .single();

    if (dbError || !aanvraag) {
      return NextResponse.json({ error: "Aanvraag niet gevonden" }, { status: 404 });
    }

    // Generate AI offerte voorstel
    const voorstel = await generateOfferteVoorstel({
      bedrijfsnaam: aanvraag.bedrijfsnaam,
      contactpersoon: aanvraag.contactpersoon,
      typePersoneel: aanvraag.type_personeel || [],
      aantalPersonen: aanvraag.aantal_personen || "1",
      werkdagen: aanvraag.werkdagen || [],
      werktijden: aanvraag.werktijden || "hele dag",
      locatie: aanvraag.locatie || "",
      startDatum: aanvraag.start_datum || new Date().toISOString(),
      eindDatum: aanvraag.eind_datum || undefined,
      contractType: aanvraag.contract_type || ["uitzendkracht"],
      gewenstUurtarief: aanvraag.gewenst_uurtarief || undefined,
    });

    // Generate offerte nummer & token
    const year = new Date().getFullYear();
    const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
    const offerteNummer = `OFF-${year}-${randomPart}`;
    const token = crypto.randomBytes(32).toString("hex");

    const geldigTot = new Date();
    geldigTot.setDate(geldigTot.getDate() + 14);

    // Store offerte in database
    const { data: offerte, error: insertError } = await supabaseAdmin
      .from("offertes")
      .insert({
        offerte_nummer: offerteNummer,
        aanvraag_id,
        bedrijfsnaam: aanvraag.bedrijfsnaam,
        contactpersoon: aanvraag.contactpersoon,
        email: aanvraag.email,
        telefoon: aanvraag.telefoon,
        locatie: aanvraag.locatie,
        geldig_tot: geldigTot.toISOString(),
        status: "concept",
        token,
        ai_generated: true,
        ai_introductie: voorstel.introductie,
        tarieven: voorstel.tarieven,
        korting_percentage: voorstel.korting_percentage,
        totaal_bedrag: voorstel.totaal_per_week,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert offerte error:", insertError);
      return NextResponse.json({ error: "Fout bij opslaan offerte" }, { status: 500 });
    }

    return NextResponse.json({
      offerte,
      voorstel,
      publicUrl: `/offerte/${token}`,
    });
  } catch (error) {
    console.error("AI offerte generator error:", error);
    return NextResponse.json({ error: "Fout bij genereren offerte" }, { status: 500 });
  }
}
