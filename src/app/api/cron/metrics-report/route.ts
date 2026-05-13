import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch metrics (simplified version)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { data: leads } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("id, pipeline_stage");

    const { data: factuurRegels } = await supabaseAdmin
      .from("factuur_regels")
      .select("bedrag, created_at");

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthRevenue = factuurRegels
      ?.filter(f => new Date(f.created_at) >= startOfMonth)
      .reduce((sum, f) => sum + (f.bedrag || 0), 0) || 0;

    const totalLeads = leads?.length || 0;
    const convertedLeads = leads?.filter(l => l.pipeline_stage === "klant").length || 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Send email to all admins
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);

    if (!adminEmails.length) {
      return NextResponse.json({ success: false, message: "Geen admin emails geconfigureerd" });
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #F27501 0%, #ff8c1a 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .metric { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #F27501; }
            .metric-label { font-size: 14px; color: #666; }
            .metric-value { font-size: 24px; font-weight: bold; color: #F27501; margin-top: 5px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 TopTalent Business Metrics</h1>
              <p>Wekelijkse Samenvatting</p>
            </div>

            <div style="padding: 20px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <p>Beste TopTalent team,</p>
              <p>Hier is je wekelijkse overzicht van de belangrijkste metrics:</p>

              <div class="metric">
                <div class="metric-label">💰 Omzet Deze Maand</div>
                <div class="metric-value">€${thisMonthRevenue.toLocaleString("nl-NL")}</div>
              </div>

              <div class="metric">
                <div class="metric-label">🎯 Totaal Leads in Pipeline</div>
                <div class="metric-value">${totalLeads}</div>
              </div>

              <div class="metric">
                <div class="metric-label">✨ Conversie Rate</div>
                <div class="metric-value">${conversionRate.toFixed(1)}%</div>
              </div>

              <div class="metric">
                <div class="metric-label">🏆 Klanten</div>
                <div class="metric-value">${convertedLeads}</div>
              </div>

              <p style="margin-top: 30px;">
                <a href="https://toptalentjobs.nl/admin" style="display: inline-block; padding: 12px 24px; background: #F27501; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Bekijk Volledig Dashboard →
                </a>
              </p>
            </div>

            <div class="footer">
              <p>TopTalent Jobs • Automatisch gegenereerd rapport</p>
              <p>Ontvang je dit niet meer? Contacteer je admin.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const results = await Promise.all(
      adminEmails.map(email =>
        resend.emails.send({
          from: "TopTalent Metrics <metrics@toptalentjobs.nl>",
          to: [email.trim()],
          subject: `📊 Wekelijkse Business Metrics - ${new Date().toLocaleDateString("nl-NL")}`,
          html: emailHtml,
        })
      )
    );

    return NextResponse.json({
      success: true,
      sent: results.filter(r => !r.error).length,
      total: adminEmails.length,
    });
  } catch (error) {
    console.error("[CRON metrics-report] Error:", error);
    return NextResponse.json({ error: "Cron job mislukt" }, { status: 500 });
  }
}
