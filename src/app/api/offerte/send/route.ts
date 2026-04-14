import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Resend } from "resend";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { OffertePDF } from "@/lib/pdf/offerte-pdf";
import { verifyAdmin } from "@/lib/admin-auth";
import crypto from "crypto";

// ============================================================================
// Send Offerte via Email API
// ============================================================================
//
// POST /api/offerte/send
// Body: { aanvraagId: string, offerteId?: string }
//
// Generates a PDF offerte and sends it to the customer via email.
// If offerteId is provided, uses the existing offerte record (concept review flow).

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

    // If offerteId provided, fetch existing offerte (concept review flow)
    let existingOfferte: { offerte_nummer: string; ai_introductie: string | null; geldig_tot: string } | null = null;
    if (offerteId) {
      const { data } = await supabase
        .from("offertes")
        .select("offerte_nummer, ai_introductie, geldig_tot")
        .eq("id", offerteId)
        .single();
      existingOfferte = data;
    }

    // Use existing offerte nummer or generate new one
    const offerteNummer = existingOfferte?.offerte_nummer || `OFF-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // Set validity period (14 days) or use existing
    const offerteDatum = new Date();
    const geldigTot = existingOfferte?.geldig_tot ? new Date(existingOfferte.geldig_tot) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // AI introductie for email
    const aiIntroductie = existingOfferte?.ai_introductie || null;

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

    // Send email with PDF attachment
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        success: true,
        offerteNummer,
        message: "Email not sent (no API key)",
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Build email intro: use AI introductie if available, otherwise default
    const introText = aiIntroductie
      ? aiIntroductie.replace(/\n/g, "<br>")
      : `Bedankt voor uw interesse in onze horecapersoneel diensten. Hierbij ontvangt u de offerte voor uw aanvraag.`;

    const phoneNumber = process.env.CONTACT_PHONE_NUMBER || '+31 6 49 71 37 66';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F27501 0%, #d96800 100%); padding: 30px; text-align: center;">
          <img src="https://www.toptalentjobs.nl/logo-white.png" alt="TopTalent Jobs" style="height: 40px; margin-bottom: 12px;" />
          <h1 style="color: white; margin: 0; font-size: 24px;">Uw Personeelsofferte</h1>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <p style="color: #333; font-size: 16px; margin-top: 0;">
              Beste ${aanvraag.contactpersoon},
            </p>

            <p style="color: #666; line-height: 1.6;">
              ${introText}
            </p>

            <div style="background: #FFF7ED; border-left: 4px solid #F27501; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #333;">
                <strong>Offertenummer:</strong> ${offerteNummer}<br>
                <strong>Geldig tot:</strong> ${geldigTotFormatted}
              </p>
            </div>

            <p style="color: #666; line-height: 1.6;">
              In de bijlage vindt u de offerte met alle details over de tarieven en voorwaarden.
              Heeft u vragen of wilt u de offerte bespreken? Neem gerust contact met ons op.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="tel:${phoneNumber}"
                 style="display: inline-block; background: #F27501; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 6px; font-weight: bold;">
                Bel ons: ${phoneNumber}
              </a>
            </div>

            <p style="color: #666; line-height: 1.6;">
              Met vriendelijke groet,<br><br>
              <strong>Rachid</strong><br>
              TopTalent Jobs<br>
              <a href="https://www.toptalentjobs.nl" style="color: #F27501;">toptalentjobs.nl</a>
            </p>
          </div>
        </div>

        <div style="background: #1B2E4A; padding: 20px; text-align: center;">
          <p style="color: #94a3b8; margin: 0 0 8px; font-size: 12px;">
            TopTalent Jobs | Utrecht | KvK: 73401161
          </p>
          <p style="margin: 0;">
            <a href="https://www.toptalentjobs.nl" style="color: #F27501; font-size: 12px; text-decoration: none;">toptalentjobs.nl</a>
          </p>
        </div>
      </div>
    `;

    const { error: emailError } = await resend.emails.send({
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
      console.error("Email error:", emailError);
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

    // If existing offerte (concept review), update status to verzonden
    if (offerteId) {
      await supabase
        .from("offertes")
        .update({ status: "verzonden" })
        .eq("id", offerteId);
    }

    return NextResponse.json({
      success: true,
      offerteNummer,
      message: "Offerte verzonden naar " + aanvraag.email,
    });
  } catch (error) {
    console.error("Offerte send error:", error);
    return NextResponse.json(
      { error: "Fout bij genereren/verzenden van offerte" },
      { status: 500 }
    );
  }
}
