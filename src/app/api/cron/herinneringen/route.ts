import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type ReminderResult = {
  factuur_nummer: string;
  status: string;
  dagen?: number;
  error?: string;
};

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: ReminderResult[] = [];

  // Haal facturen op die > 14 dagen geleden verzonden zijn en nog niet betaald
  const veertienDagenGeleden = new Date();
  veertienDagenGeleden.setDate(veertienDagenGeleden.getDate() - 14);

  const { data: facturen } = await supabaseAdmin
    .from("facturen")
    .select("*, klant:klanten(bedrijfsnaam, email)")
    .eq("status", "verzonden")
    .lt("verzonden_at", veertienDagenGeleden.toISOString());

  for (const factuur of facturen || []) {
    if (!factuur.klant?.email) continue;

    // Check of al een herinnering is gestuurd (via notitie veld of aparte kolom)
    // Voor nu: stuur elke 14 dagen een herinnering
    const dagenSindsVerzonden = Math.floor(
      (Date.now() - new Date(factuur.verzonden_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Stuur alleen herinnering op dag 14, 28, 42, etc.
    if (dagenSindsVerzonden % 14 !== 0) continue;

    try {
      await resend.emails.send({
        from: "TopTalent Jobs <facturen@toptalentjobs.nl>",
        to: factuur.klant.email,
        subject: `Herinnering: Factuur ${factuur.factuur_nummer} staat nog open`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #F27501;">Betalingsherinnering</h2>
            <p>Beste ${factuur.klant.bedrijfsnaam},</p>
            <p>Wij willen u vriendelijk herinneren dat factuur <strong>${factuur.factuur_nummer}</strong> nog openstaat.</p>
            <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;">Factuurnummer:</td><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>${factuur.factuur_nummer}</strong></td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;">Bedrag:</td><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>€${factuur.totaal.toFixed(2)}</strong></td></tr>
              <tr><td style="padding: 8px 0;">Verzonden op:</td><td style="padding: 8px 0;">${new Date(factuur.verzonden_at).toLocaleDateString("nl-NL")}</td></tr>
            </table>
            <p>Wij verzoeken u vriendelijk het openstaande bedrag zo spoedig mogelijk te voldoen.</p>
            <p>Heeft u vragen of heeft u reeds betaald? Neem dan contact met ons op.</p>
            <p style="margin-top: 30px;">Met vriendelijke groet,<br><strong style="color: #F27501;">TopTalent Jobs</strong></p>
          </div>
        `,
      });

      results.push({ factuur_nummer: factuur.factuur_nummer, status: "herinnering_verzonden", dagen: dagenSindsVerzonden });
    } catch (error) {
      results.push({ factuur_nummer: factuur.factuur_nummer, status: "error", error: String(error) });
    }
  }

  return NextResponse.json({ success: true, results });
}
