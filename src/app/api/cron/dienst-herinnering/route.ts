import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const morgen = new Date();
  morgen.setDate(morgen.getDate() + 1);
  const morgenStr = morgen.toISOString().split("T")[0];

  // Haal geaccepteerde aanmeldingen op voor morgen
  const { data } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select(`
      medewerker:medewerkers(naam, email),
      dienst:diensten!inner(klant_naam, locatie, datum, start_tijd, eind_tijd)
    `)
    .eq("status", "geaccepteerd")
    .eq("dienst.datum", morgenStr);

  const results: any[] = [];

  for (const aanmelding of data || []) {
    const m = aanmelding.medewerker as any;
    const d = aanmelding.dienst as any;
    if (!m?.email) continue;

    try {
      await resend.emails.send({
        from: "TopTalent Jobs <info@toptalentjobs.nl>",
        to: m.email,
        subject: `Herinnering: Morgen dienst bij ${d.klant_naam}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #F27501;">Dienst Herinnering</h2>
            <p>Hoi ${m.naam},</p>
            <p>Even een herinnering dat je morgen een dienst hebt:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <p style="margin: 0 0 8px;"><strong style="color: #F27501;">${d.klant_naam}</strong></p>
              <p style="margin: 0 0 8px;">📍 ${d.locatie}</p>
              <p style="margin: 0 0 8px;">📅 ${new Date(d.datum).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}</p>
              <p style="margin: 0;">🕐 ${d.start_tijd.slice(0,5)} - ${d.eind_tijd.slice(0,5)}</p>
            </div>
            <p>Succes morgen!</p>
            <p style="margin-top: 30px;">Groet,<br><strong style="color: #F27501;">TopTalent Jobs</strong></p>
          </div>
        `,
      });
      results.push({ medewerker: m.naam, klant: d.klant_naam, status: "verzonden" });
    } catch (error) {
      results.push({ medewerker: m.naam, status: "error", error: String(error) });
    }
  }

  return NextResponse.json({ success: true, datum: morgenStr, results });
}
