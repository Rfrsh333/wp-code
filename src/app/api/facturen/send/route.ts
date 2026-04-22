import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { signFactuurToken } from "@/lib/session";
import { getFactuurConfig } from "@/lib/factuur-config";
import { sendEmail } from "@/lib/email-service";

export async function POST(request: NextRequest) {
  // KRITIEK: Dit endpoint was publiek toegankelijk - alleen admins mogen facturen verzenden
  const { isAdmin, email: adminEmail } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized factuur send attempt by: ${adminEmail || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  try {
    const { factuur_id, email } = await request.json();
    const factuurConfig = getFactuurConfig();

    // Haal factuur op
    const { data: factuur } = await supabase
      .from("facturen")
      .select("*, klant:klanten(bedrijfsnaam, contactpersoon, email)")
      .eq("id", factuur_id)
      .single();

    if (!factuur) {
      return NextResponse.json({ error: "Factuur niet gevonden" }, { status: 404 });
    }

    // Genereer een signed token voor veilige PDF toegang (geldig 30 dagen)
    const pdfToken = await signFactuurToken(factuur_id, factuur.klant_id);
    const pdfUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.toptalentjobs.nl"}/api/facturen/${factuur_id}/pdf?token=${pdfToken}`;
    const recipient = email || factuur.klant?.email;

    if (!recipient) {
      return NextResponse.json({ error: "Geen e-mailadres beschikbaar voor deze klant" }, { status: 400 });
    }

    const resendResult = await sendEmail({
      from: `${factuurConfig.bedrijfsnaam} <${factuurConfig.email}>`,
      to: [recipient],
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
              Gelieve het bedrag binnen ${factuurConfig.paymentTermDays} dagen over te maken.
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

    if ("error" in resendResult && resendResult.error) {
      return NextResponse.json({ error: "Verzenden via e-mailprovider mislukt" }, { status: 502 });
    }

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
