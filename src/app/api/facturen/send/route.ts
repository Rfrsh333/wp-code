import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { factuur_id, email } = await request.json();

    // Haal factuur op
    const { data: factuur } = await supabase
      .from("facturen")
      .select("*, klant:klanten(bedrijfsnaam, contactpersoon)")
      .eq("id", factuur_id)
      .single();

    if (!factuur) {
      return NextResponse.json({ error: "Factuur niet gevonden" }, { status: 404 });
    }

    const pdfUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://toptalentjobs.nl"}/api/facturen/${factuur_id}/pdf`;

    await resend.emails.send({
      from: "TopTalent Jobs <facturen@toptalentjobs.nl>",
      to: email,
      subject: `Factuur ${factuur.factuur_nummer} - TopTalent Jobs`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #F27501; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">TopTalent Jobs</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <p style="color: #374151; font-size: 16px;">
              Beste ${factuur.klant?.contactpersoon || "klant"},
            </p>
            <p style="color: #374151; font-size: 16px;">
              Hierbij ontvangt u factuur <strong>${factuur.factuur_nummer}</strong> voor de geleverde diensten.
            </p>
            <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Factuurnummer</p>
              <p style="margin: 0 0 20px 0; font-weight: 600; font-size: 18px;">${factuur.factuur_nummer}</p>
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Totaalbedrag</p>
              <p style="margin: 0; font-weight: 700; font-size: 24px; color: #F27501;">€ ${factuur.totaal.toFixed(2).replace(".", ",")}</p>
            </div>
            <p style="color: #374151; font-size: 16px;">
              Gelieve het bedrag binnen 14 dagen over te maken.
            </p>
            <a href="${pdfUrl}" style="display: inline-block; background: #F27501; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px;">
              Bekijk Factuur
            </a>
          </div>
          <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            TopTalent Jobs • info@toptalentjobs.nl
          </div>
        </div>
      `,
    });

    // Update factuur status
    await supabase
      .from("facturen")
      .update({ status: "verzonden", verzonden_at: new Date().toISOString() })
      .eq("id", factuur_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send factuur error:", error);
    return NextResponse.json({ error: "Fout bij verzenden" }, { status: 500 });
  }
}
