import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email-service";
import { buildDocumentVerlooptHtml } from "@/lib/email-templates";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dertigDagenVoorruit = new Date();
    dertigDagenVoorruit.setDate(dertigDagenVoorruit.getDate() + 30);
    const targetDate = dertigDagenVoorruit.toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    const { data: documenten } = await supabaseAdmin
      .from("medewerker_documenten")
      .select("id, document_type, expiry_date, medewerker_id, medewerkers(naam, email)")
      .not("expiry_date", "is", null)
      .gte("expiry_date", today)
      .lte("expiry_date", targetDate);

    let sent = 0;
    for (const doc of documenten || []) {
      const medewerker = Array.isArray(doc.medewerkers) ? doc.medewerkers[0] : doc.medewerkers;
      if (!medewerker?.email) continue;

      try {
        await sendEmail({
          from: "TopTalent <info@toptalentjobs.nl>",
          to: [medewerker.email],
          subject: `Document verloopt binnenkort: ${doc.document_type}`,
          html: buildDocumentVerlooptHtml({
            naam: medewerker.naam,
            documentType: doc.document_type,
            verloopDatum: new Date(doc.expiry_date).toLocaleDateString("nl-NL", {
              day: "numeric", month: "long", year: "numeric",
            }),
          }),
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send expiry email for doc ${doc.id}:`, err);
      }
    }

    return NextResponse.json({ success: true, checked: documenten?.length || 0, sent });
  } catch (error) {
    console.error("Document expiry cron error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
