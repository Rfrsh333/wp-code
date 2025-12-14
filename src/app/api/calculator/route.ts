import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

interface CalculatorInputs {
  functie: string;
  aantalMedewerkers: number;
  ervaring: string;
  urenPerDienst: number;
  dagenPerWeek: number[];
  inzetType: string;
  vergelijkingen: string[];
}

interface KostenResultaat {
  perDienst: number;
  perWeek: number;
  perMaand: number;
}

interface Resultaten {
  vast?: KostenResultaat;
  uitzend?: KostenResultaat;
  zzp?: KostenResultaat;
}

interface LeadFormData {
  naam: string;
  bedrijfsnaam: string;
  email: string;
}

interface RequestData {
  lead: LeadFormData;
  inputs: CalculatorInputs;
  resultaten: Resultaten;
}

const functieLabels: Record<string, string> = {
  bediening: "Bediening",
  bar: "Bar",
  keuken: "Keuken",
  afwas: "Afwas / Spoelkeuken",
  allround: "Allround horeca",
};

const ervaringLabels: Record<string, string> = {
  starter: "Starter",
  ervaren: "Ervaren",
  senior: "Senior",
};

const dagen = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: max 10 requests per hour per IP
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`calculator:${clientIP}`, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Te veel verzoeken. Probeer opnieuw over ${Math.ceil(rateLimit.resetIn / 60)} minuten.` },
        { status: 429 }
      );
    }

    const data: RequestData = await request.json();

    // Validate required fields
    if (!data.lead?.naam || !data.lead?.bedrijfsnaam || !data.lead?.email) {
      return NextResponse.json(
        { error: "Vul alle verplichte velden in" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.lead.email)) {
      return NextResponse.json(
        { error: "Ongeldig e-mailadres" },
        { status: 400 }
      );
    }

    const { lead, inputs, resultaten } = data;

    // Format days
    const dagenLabel = inputs.dagenPerWeek.map(d => dagen[d]).join(", ");

    // Build results table HTML
    const buildResultRow = (type: string, result?: KostenResultaat) => {
      if (!result) return "";
      const label = type === "vast" ? "Vast personeel" : type === "uitzend" ? "Uitzendkracht" : "ZZP'er";
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 600;">${label}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(result.perDienst)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(result.perWeek)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #F27501; font-weight: 600;">${formatCurrency(result.perMaand)}</td>
        </tr>
      `;
    };

    // Email to lead
    const leadEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #F27501 0%, #d96800 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Uw Kostenoverzicht</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Horecapersoneel berekening</p>
        </div>

        <div style="padding: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Beste ${lead.naam},
          </p>
          <p style="color: #666; font-size: 15px; line-height: 1.6;">
            Bedankt voor het gebruik van onze kosten calculator. Hieronder vindt u uw persoonlijke berekening.
          </p>

          <div style="background: #f9f9f9; border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">Uw ingevoerde gegevens</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 45%;">Functie:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${functieLabels[inputs.functie] || inputs.functie}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Aantal medewerkers:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${inputs.aantalMedewerkers}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Ervaringsniveau:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${ervaringLabels[inputs.ervaring] || inputs.ervaring}</td>
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

          <h3 style="color: #333; margin: 25px 0 15px 0; font-size: 18px;">Kostenvergelijking</h3>
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #eee;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #333;">Type</th>
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
            * Berekening op basis van gemiddelde tarieven 2024/2025. Exacte kosten kunnen afwijken per situatie.
          </p>

          <div style="background: #FFF7F1; border-radius: 12px; padding: 25px; margin: 30px 0; border-left: 4px solid #F27501;">
            <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">Tip: Combineer vast en flex</h3>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
              De meest succesvolle horecabedrijven werken met een vaste kern voor continuïteit,
              aangevuld met flexibele uitzendkrachten voor pieken en uitval.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666; font-size: 15px; margin-bottom: 20px;">
              Wilt u meer weten over onze personeelsoplossingen?
            </p>
            <a href="https://toptalentjobs.nl/contact" style="display: inline-block; background: #F27501; color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
              Neem contact op
            </a>
          </div>
        </div>

        <div style="background: #333; padding: 25px; text-align: center;">
          <p style="color: #999; margin: 0 0 10px 0; font-size: 14px;">
            TopTalent Jobs · Horecapersoneel dat past
          </p>
          <p style="color: #666; margin: 0; font-size: 12px;">
            <a href="https://toptalentjobs.nl" style="color: #F27501; text-decoration: none;">toptalentjobs.nl</a> ·
            <a href="tel:+31649200412" style="color: #999; text-decoration: none;">+31 6 49 20 04 12</a>
          </p>
        </div>
      </div>
    `;

    // Internal notification email
    const internalEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
            <h3 style="color: #333; margin: 0 0 15px 0;">Berekening details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 40%;">Functie:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${functieLabels[inputs.functie] || inputs.functie}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Aantal medewerkers:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${inputs.aantalMedewerkers}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Ervaring:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${ervaringLabels[inputs.ervaring] || inputs.ervaring}</td>
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
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${inputs.inzetType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Vergelijkingen:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${inputs.vergelijkingen.join(", ")}</td>
              </tr>
            </table>
          </div>

          <div style="background: white; border-radius: 8px; padding: 25px;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Berekende kosten (per maand)</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${resultaten.vast ? `<tr><td style="padding: 8px 0; color: #666;">Vast personeel:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${formatCurrency(resultaten.vast.perMaand)}</td></tr>` : ""}
              ${resultaten.uitzend ? `<tr><td style="padding: 8px 0; color: #666;">Uitzendkracht:</td><td style="padding: 8px 0; color: #F27501; font-weight: 600;">${formatCurrency(resultaten.uitzend.perMaand)}</td></tr>` : ""}
              ${resultaten.zzp ? `<tr><td style="padding: 8px 0; color: #666;">ZZP'er:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${formatCurrency(resultaten.zzp.perMaand)}</td></tr>` : ""}
            </table>
          </div>
        </div>

        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 12px;">
            Lead via Calculator op toptalentjobs.nl
          </p>
        </div>
      </div>
    `;

    // Send emails via Resend
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      // Send to lead
      await resend.emails.send({
        from: "TopTalent Jobs <onboarding@resend.dev>",
        to: [lead.email],
        subject: "Uw kostenoverzicht horecapersoneel - TopTalent Jobs",
        html: leadEmailHtml,
      });

      // Send internal notification
      await resend.emails.send({
        from: "TopTalent Jobs <onboarding@resend.dev>",
        to: ["info@toptalentjobs.nl"],
        replyTo: lead.email,
        subject: `Calculator Lead: ${lead.bedrijfsnaam} - ${lead.naam}`,
        html: internalEmailHtml,
      });
    }

    // Save to Supabase
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
    });

    if (dbError) {
      console.error("Supabase error:", dbError);
      // Don't fail the request if DB save fails, email was already sent
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    );
  }
}
