import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { sendEmail } from "@/lib/email-service";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { OffertePDF } from "@/lib/pdf/offerte-pdf";
import { verifyAdmin } from "@/lib/admin-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import { offerteMailHtml, offerteOnlineUrl } from "@/lib/offerte-mail";

// ============================================================================
// Send Offerte via Email API
// ============================================================================
//
// POST /api/offerte/send
// Body: { aanvraagId: string, offerteId?: string }
//
// Generates a PDF offerte and sends it to the customer via email, with a link to the online
// offerte (/offerte/<token>) to view and accept it.
// Uses the given offerteId, or else the latest open offerte (concept/verzonden) of the aanvraag.
// Without any offerte record it refuses (409): every sent offerte exists in `offertes`.

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronAuthorized = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const { isAdmin, email } = await verifyAdmin(request);
    if (!isAdmin && !cronAuthorized) {
      console.warn(`[SECURITY] Unauthorized offerte send attempt by: ${email || "unknown"}`);
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    const { aanvraagId, offerteId } = await request.json();

    if (!aanvraagId) {
      return NextResponse.json(
        { error: "Aanvraag ID ontbreekt" },
        { status: 400 }
      );
    }

    // Fetch the personeel aanvraag from database
    const { data: aanvraag, error: dbError } = await supabase
      .from("personeel_aanvragen")
      .select("bedrijfsnaam, contactpersoon, email, telefoon, locatie, type_personeel, aantal_personen, contract_type, gewenst_uurtarief, start_datum, eind_datum, werkdagen, werktijden")
      .eq("id", aanvraagId)
      .single();

    if (dbError || !aanvraag) {
      return NextResponse.json(
        { error: "Aanvraag niet gevonden" },
        { status: 404 }
      );
    }

    // Welke offerte gaat de deur uit: de opgegeven, of anders het meest recente open concept
    // van deze aanvraag (zo stuurt de automatische modus "send" het AI-concept). Voorheen kreeg
    // een aanroep zonder offerteId een nieuw offertenummer zonder record in `offertes`, dus een
    // tweede offerte die niet online te bekijken of te accepteren was.
    const OFFERTE_VELDEN = "id, offerte_nummer, ai_introductie, geldig_tot, token, status, aanvraag_id, tarieven";
    type OfferteRij = {
      id: string;
      offerte_nummer: string;
      ai_introductie: string | null;
      geldig_tot: string | null;
      token: string | null;
      status: string | null;
      aanvraag_id: string | null;
      tarieven: { functie: string; uurtarief: number }[] | null;
    };
    let offerte: OfferteRij | null = null;
    if (offerteId) {
      const { data } = await supabase.from("offertes").select(OFFERTE_VELDEN).eq("id", offerteId).maybeSingle();
      if (!data) {
        return NextResponse.json({ error: "Offerte niet gevonden" }, { status: 404 });
      }
      if (data.aanvraag_id && data.aanvraag_id !== aanvraagId) {
        return NextResponse.json({ error: "Deze offerte hoort niet bij deze aanvraag" }, { status: 400 });
      }
      offerte = data as OfferteRij;
    } else {
      const { data } = await supabase
        .from("offertes")
        .select(OFFERTE_VELDEN)
        .eq("aanvraag_id", aanvraagId)
        .in("status", ["concept", "verzonden"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) {
        return NextResponse.json(
          { error: "Er is nog geen offerte voor deze aanvraag. Genereer eerst een offerte." },
          { status: 409 },
        );
      }
      offerte = data as OfferteRij;
    }

    if (offerte.status === "geaccepteerd" || offerte.status === "afgewezen") {
      return NextResponse.json(
        { error: `Deze offerte is al ${offerte.status} en wordt niet opnieuw verstuurd.` },
        { status: 409 },
      );
    }

    const offerteNummer = offerte.offerte_nummer;

    // Geldigheid uit de offerte (14 dagen bij het genereren), anders 14 dagen vanaf nu
    const offerteDatum = new Date();
    const geldigTot = offerte.geldig_tot ? new Date(offerte.geldig_tot) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // AI introductie for email
    const aiIntroductie = offerte.ai_introductie || null;

    // Prepare data for PDF
    const offerteData = {
      bedrijfsnaam: aanvraag.bedrijfsnaam,
      contactpersoon: aanvraag.contactpersoon,
      email: aanvraag.email,
      telefoon: aanvraag.telefoon,
      locatie: aanvraag.locatie,
      typePersoneel: aanvraag.type_personeel || [],
      aantalPersonen: aanvraag.aantal_personen,
      contractType: aanvraag.contract_type || ["uitzendkracht"],
      gewenstUurtarief: aanvraag.gewenst_uurtarief || undefined,
      startDatum: aanvraag.start_datum,
      eindDatum: aanvraag.eind_datum || undefined,
      werkdagen: aanvraag.werkdagen || [],
      werktijden: aanvraag.werktijden,
      // Zelfde tarieven als de online offerte
      tarieven: Array.isArray(offerte.tarieven) ? offerte.tarieven : null,
      offerteNummer,
      offerteDatum,
      geldigTot,
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      OffertePDF({ data: offerteData })
    );

    // Create filename
    const filename = `offerte-${aanvraag.bedrijfsnaam
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")}-${offerteNummer}.pdf`;

    // Format geldig tot date
    const geldigTotFormatted = new Intl.DateTimeFormat("nl-NL", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(geldigTot);

    const phoneNumber = process.env.CONTACT_PHONE_NUMBER || '+31617889189';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.toptalentjobs.nl";

    // Mail met link naar de online offerte (bekijken + accepteren); alle invoer ge-escaped.
    const emailHtml = offerteMailHtml({
      contactpersoon: aanvraag.contactpersoon,
      introductie: aiIntroductie,
      offerteNummer,
      geldigTot: geldigTotFormatted,
      onlineUrl: offerte.token ? offerteOnlineUrl(baseUrl, offerte.token) : null,
      telefoon: phoneNumber,
    });

    const { error: emailError } = await sendEmail({
      from: "TopTalent Jobs <info@toptalentjobs.nl>",
      to: [aanvraag.email],
      subject: `Uw offerte van TopTalent Jobs - ${offerteNummer}`,
      html: emailHtml,
      attachments: [
        {
          filename,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

    if (emailError) {
      captureRouteError(emailError, { route: "/api/offerte/send", action: "POST" });
      // console.error("Email error:", emailError);
      return NextResponse.json(
        { error: "Fout bij verzenden email" },
        { status: 500 }
      );
    }

    // Update aanvraag to mark offerte as sent
    await supabase
      .from("personeel_aanvragen")
      .update({
        offerte_verzonden: true,
        offerte_nummer: offerteNummer,
        offerte_verzonden_at: new Date().toISOString(),
      })
      .eq("id", aanvraagId);

    // Concept → verzonden (een al verzonden offerte blijft verzonden)
    await supabase
      .from("offertes")
      .update({ status: "verzonden" })
      .eq("id", offerte.id)
      .in("status", ["concept", "verzonden"]);

    return NextResponse.json({
      success: true,
      offerteNummer,
      offerteId: offerte.id,
      message: "Offerte verzonden naar " + aanvraag.email,
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/offerte/send", action: "POST" });
    // console.error("Offerte send error:", error);
    return NextResponse.json(
      { error: "Fout bij genereren/verzenden van offerte" },
      { status: 500 }
    );
  }
}
