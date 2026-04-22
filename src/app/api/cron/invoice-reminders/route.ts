import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email-service";
import { buildFactuurHerinneringHtml } from "@/lib/email-templates";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find unpaid invoices older than 30 days
    const dertigDagenGeleden = new Date();
    dertigDagenGeleden.setDate(dertigDagenGeleden.getDate() - 30);

    const { data: facturen } = await supabaseAdmin
      .from("facturen")
      .select("id, factuur_nummer, totaal, created_at, klant:klanten(bedrijfsnaam, email)")
      .eq("status", "verstuurd")
      .lte("created_at", dertigDagenGeleden.toISOString());

    let sent = 0;
    for (const factuur of facturen || []) {
      const klant = Array.isArray(factuur.klant) ? factuur.klant[0] : factuur.klant;
      if (!klant?.email) continue;

      const vervalDatum = new Date(factuur.created_at);
      vervalDatum.setDate(vervalDatum.getDate() + 30);

      try {
        await sendEmail({
          from: "TopTalent <info@toptalentjobs.nl>",
          to: [klant.email],
          subject: `Herinnering: Factuur ${factuur.factuur_nummer} nog niet betaald`,
          html: buildFactuurHerinneringHtml({
            bedrijfsnaam: klant.bedrijfsnaam,
            factuurNummer: factuur.factuur_nummer,
            totaal: factuur.totaal,
            vervalDatum: vervalDatum.toLocaleDateString("nl-NL", {
              day: "numeric", month: "long", year: "numeric",
            }),
          }),
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send invoice reminder for ${factuur.factuur_nummer}:`, err);
      }
    }

    return NextResponse.json({ success: true, checked: facturen?.length || 0, sent });
  } catch (error) {
    console.error("Invoice reminder cron error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
