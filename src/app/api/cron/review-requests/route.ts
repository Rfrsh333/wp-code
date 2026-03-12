import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Cron: dagelijks review requests versturen
// Zoekt diensten van gisteren waar uren goedgekeurd zijn en stuurt review email
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Zoek diensten van gisteren waar uren goedgekeurd zijn
    const gisteren = new Date();
    gisteren.setDate(gisteren.getDate() - 1);
    const gisterenStr = gisteren.toISOString().split("T")[0];

    const { data: diensten } = await supabaseAdmin
      .from("diensten")
      .select("id, klant_id, medewerker_id, functie, datum")
      .eq("datum", gisterenStr)
      .eq("review_request_sent", false)
      .eq("status", "afgerond")
      .limit(50);

    if (!diensten || diensten.length === 0) {
      return NextResponse.json({ message: "Geen diensten voor review requests", count: 0 });
    }

    // Haal unieke klant IDs op
    const klantIds = [...new Set(diensten.map(d => d.klant_id).filter(Boolean))];

    const { data: klanten } = await supabaseAdmin
      .from("klanten")
      .select("id, bedrijfsnaam, contactpersoon, email")
      .in("id", klantIds);

    const klantMap = new Map((klanten || []).map(k => [k.id, k]));

    let verzonden = 0;

    for (const dienst of diensten) {
      const klant = klantMap.get(dienst.klant_id);
      if (!klant?.email) continue;

      // Stuur review request email via Resend
      try {
        if (process.env.RESEND_API_KEY) {
          const googleReviewUrl = process.env.GOOGLE_REVIEW_URL || "https://g.page/r/toptalentjobs/review";

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM || "TopTalent Jobs <noreply@toptalentjobs.nl>",
              to: klant.email,
              subject: "Hoe was onze service? Laat een review achter!",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1B2E4A; font-size: 24px;">TopTalent Jobs</h1>
                  </div>
                  <p>Beste ${klant.contactpersoon || klant.bedrijfsnaam},</p>
                  <p>Bedankt dat u gebruik heeft gemaakt van onze diensten! Wij hopen dat u tevreden bent over het geleverde personeel.</p>
                  <p>Zou u een paar seconden willen nemen om een review achter te laten? Uw feedback helpt ons om onze service te verbeteren en andere bedrijven te laten zien wat wij te bieden hebben.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${googleReviewUrl}" style="display: inline-block; background-color: #F27501; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Laat een review achter
                    </a>
                  </div>
                  <p style="color: #666; font-size: 14px;">Het kost slechts 30 seconden en helpt ons enorm!</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                  <p style="color: #999; font-size: 12px;">TopTalent Jobs - Uw partner in horeca personeel</p>
                </div>
              `,
            }),
          });
        }

        // Markeer als verzonden
        await supabaseAdmin
          .from("diensten")
          .update({
            review_request_sent: true,
            review_request_sent_at: new Date().toISOString(),
          })
          .eq("id", dienst.id);

        verzonden++;
      } catch (emailErr) {
        console.error(`Review email fout voor dienst ${dienst.id}:`, emailErr);
      }
    }

    return NextResponse.json({
      message: `${verzonden} review requests verzonden`,
      count: verzonden,
    });
  } catch (error) {
    console.error("Review requests cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
