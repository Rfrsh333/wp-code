import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import type { CalculatorInputs, Resultaten, LeadFormData } from "@/lib/calculator/types";
import { berekenKosten, validateInputs } from "@/lib/calculator/calculate";
import { functieLabels, ervaringLabels, dagen } from "@/lib/calculator/tarieven";

// ============================================================================
// Types
// ============================================================================

interface LeadRequest {
  lead: LeadFormData;
  inputs: CalculatorInputs;
  resultaten: Resultaten;
}

// ============================================================================
// Email Template
// ============================================================================

function generateLeadEmail(lead: LeadFormData, inputs: CalculatorInputs, resultaten: Resultaten, pdfToken: string): string {
  const dagenLabel = inputs.dagenPerWeek.map((d) => dagen[d]).join(", ");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://toptalentjobs.nl";

  // Build results table
  const buildResultRow = (type: string, result?: { uurtarief: number; perDienst: number; perWeek: number; perMaand: number }) => {
    if (!result) return "";
    const labels: Record<string, string> = {
      vast: "Vast personeel",
      uitzend: "Uitzendkracht",
      zzp: "ZZP'er",
    };
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 600;">${labels[type]}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">€ ${result.uurtarief.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">€ ${result.perDienst.toLocaleString("nl-NL")}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">€ ${result.perWeek.toLocaleString("nl-NL")}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #F27501; font-weight: 600;">€ ${result.perMaand.toLocaleString("nl-NL")}</td>
      </tr>
    `;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #F27501 0%, #d96800 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Uw Kostenoverzicht</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Horecapersoneel berekening</p>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <p style="color: #333; font-size: 16px; line-height: 1.6;">
        Beste ${lead.naam},
      </p>
      <p style="color: #666; font-size: 15px; line-height: 1.6;">
        Bedankt voor het gebruik van onze kosten calculator. Hieronder vindt u een samenvatting van uw berekening.
      </p>

      <!-- Input Summary -->
      <div style="background: #f9f9f9; border-radius: 12px; padding: 25px; margin: 25px 0;">
        <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">Uw ingevoerde gegevens</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 45%;">Functie:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${functieLabels[inputs.functie]}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Aantal medewerkers:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${inputs.aantalMedewerkers}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Ervaringsniveau:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${ervaringLabels[inputs.ervaring]}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Uren per dienst:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${inputs.urenPerDienst}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Dagen per week:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${inputs.dagenPerWeek.length} (${dagenLabel})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Type inzet:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${inputs.inzetType === "regulier" ? "Regulier" : "Spoed (+15%)"}</td>
          </tr>
        </table>
      </div>

      <!-- Results Table -->
      <h3 style="color: #333; margin: 25px 0 15px 0; font-size: 18px;">Kostenvergelijking</h3>
      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #eee;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #333;">Type</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #333;">Per uur</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #333;">Per dienst</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #333;">Per week</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #333;">Per maand</th>
          </tr>
        </thead>
        <tbody>
          ${buildResultRow("vast", resultaten.vast)}
          ${buildResultRow("uitzend", resultaten.uitzend)}
          ${buildResultRow("zzp", resultaten.zzp)}
        </tbody>
      </table>

      <p style="color: #999; font-size: 12px; margin-top: 15px;">
        * Berekening op basis van gemiddelde tarieven 2024/2025. Exacte kosten kunnen afwijken.
      </p>

      <!-- Download Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}/api/calculator/pdf?token=${pdfToken}"
           style="display: inline-block; background: #F27501; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Download volledige PDF
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 10px;">
          Link geldig tot 24 uur na ontvangst
        </p>
      </div>

      <!-- Tip -->
      <div style="background: #FFF7F1; border-radius: 12px; padding: 25px; margin: 30px 0; border-left: 4px solid #F27501;">
        <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">Tip: Combineer vast en flex</h3>
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
          De meest succesvolle horecabedrijven werken met een vaste kern voor continuïteit,
          aangevuld met flexibele uitzendkrachten voor pieken en uitval.
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #666; font-size: 15px; margin-bottom: 20px;">
          Wilt u meer weten over onze personeelsoplossingen?
        </p>
        <a href="${baseUrl}/contact"
           style="display: inline-block; background: #333; color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Neem contact op
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #333; padding: 25px; text-align: center;">
      <p style="color: #999; margin: 0 0 10px 0; font-size: 14px;">
        TopTalent Jobs · Horecapersoneel dat past
      </p>
      <p style="color: #666; margin: 0; font-size: 12px;">
        <a href="${baseUrl}" style="color: #F27501; text-decoration: none;">toptalentjobs.nl</a> ·
        <a href="tel:+31649200412" style="color: #999; text-decoration: none;">+31 6 49 20 04 12</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================================================
// Internal Notification Email
// ============================================================================

function generateInternalEmail(lead: LeadFormData, inputs: CalculatorInputs, resultaten: Resultaten): string {
  const dagenLabel = inputs.dagenPerWeek.map((d) => dagen[d]).join(", ");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #F27501 0%, #d96800 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Nieuwe Calculator Lead</h1>
    </div>

    <div style="padding: 30px; background: #f9f9f9;">
      <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
        <h3 style="color: #333; margin: 0 0 15px 0;">Contactgegevens</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 30%;">Naam:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${lead.naam}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Bedrijf:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${lead.bedrijfsnaam}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">E-mail:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">
              <a href="mailto:${lead.email}" style="color: #F27501;">${lead.email}</a>
            </td>
          </tr>
        </table>
      </div>

      <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
        <h3 style="color: #333; margin: 0 0 15px 0;">Berekening</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Functie:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${functieLabels[inputs.functie]}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Medewerkers:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${inputs.aantalMedewerkers}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Ervaring:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${ervaringLabels[inputs.ervaring]}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Uren/dienst:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${inputs.urenPerDienst}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Dagen:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${inputs.dagenPerWeek.length} (${dagenLabel})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Inzet:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${inputs.inzetType}</td>
          </tr>
        </table>
      </div>

      <div style="background: white; border-radius: 8px; padding: 25px;">
        <h3 style="color: #333; margin: 0 0 15px 0;">Maandkosten</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${resultaten.vast ? `<tr><td style="padding: 8px 0; color: #666;">Vast:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">€ ${resultaten.vast.perMaand.toLocaleString("nl-NL")}</td></tr>` : ""}
          ${resultaten.uitzend ? `<tr><td style="padding: 8px 0; color: #666;">Uitzend:</td><td style="padding: 8px 0; color: #F27501; font-weight: 600;">€ ${resultaten.uitzend.perMaand.toLocaleString("nl-NL")}</td></tr>` : ""}
          ${resultaten.zzp ? `<tr><td style="padding: 8px 0; color: #666;">ZZP:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">€ ${resultaten.zzp.perMaand.toLocaleString("nl-NL")}</td></tr>` : ""}
        </table>
      </div>
    </div>

    <div style="background: #333; padding: 20px; text-align: center;">
      <p style="color: #999; margin: 0; font-size: 12px;">
        Lead via Kosten Calculator op toptalentjobs.nl
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 requests per hour per IP
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`calculator-lead:${clientIP}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Te veel verzoeken. Probeer opnieuw over ${Math.ceil(rateLimit.resetIn / 60)} minuten.` },
        { status: 429 }
      );
    }

    const data: LeadRequest = await request.json();
    const { lead, inputs } = data;

    // Validate lead form
    if (!lead?.naam?.trim() || !lead?.bedrijfsnaam?.trim() || !lead?.email?.trim()) {
      return NextResponse.json(
        { error: "Vul alle verplichte velden in" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lead.email)) {
      return NextResponse.json(
        { error: "Ongeldig e-mailadres" },
        { status: 400 }
      );
    }

    // Validate calculator inputs
    const validation = validateInputs(inputs);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    // Recalculate server-side (never trust client calculations)
    const resultaten = berekenKosten(inputs);

    // Generate secure PDF token (64 character hex string)
    const pdfToken = crypto.randomBytes(32).toString("hex");

    // Token expires in 24 hours
    const pdfTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Save to database
    const { error: dbError } = await supabase.from("calculator_leads").insert({
      naam: lead.naam,
      bedrijfsnaam: lead.bedrijfsnaam,
      email: lead.email,
      functie: inputs.functie,
      aantal_medewerkers: inputs.aantalMedewerkers,
      ervaring: inputs.ervaring,
      uren_per_dienst: inputs.urenPerDienst,
      dagen_per_week: inputs.dagenPerWeek,
      inzet_type: inputs.inzetType,
      vergelijkingen: inputs.vergelijkingen,
      resultaten: resultaten,
      pdf_token: pdfToken,
      pdf_token_expires_at: pdfTokenExpiresAt.toISOString(),
    });

    if (dbError) {
      console.error("Database error:", dbError);
      // Continue anyway - email is more important
    }

    // Send emails via Resend
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      // Email to lead
      const leadEmailPromise = resend.emails.send({
        from: "TopTalent Jobs <noreply@toptalentjobs.nl>",
        to: [lead.email],
        subject: "Uw kostenoverzicht horecapersoneel - TopTalent Jobs",
        html: generateLeadEmail(lead, inputs, resultaten, pdfToken),
      });

      // Internal notification
      const internalEmailPromise = resend.emails.send({
        from: "TopTalent Jobs <noreply@toptalentjobs.nl>",
        to: ["info@toptalentjobs.nl"],
        replyTo: lead.email,
        subject: `Calculator Lead: ${lead.bedrijfsnaam} - ${lead.naam}`,
        html: generateInternalEmail(lead, inputs, resultaten),
      });

      // Send both emails in parallel
      await Promise.all([leadEmailPromise, internalEmailPromise]);

      // Update email_sent status
      await supabase
        .from("calculator_leads")
        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
        .eq("pdf_token", pdfToken);
    }

    return NextResponse.json({
      success: true,
      pdfToken,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    );
  }
}
