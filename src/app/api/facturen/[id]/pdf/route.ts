import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { verifyFactuurToken } from "@/lib/session";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  // Twee toegangspaden: admin auth OF klant met signed token
  const { isAdmin } = await verifyAdmin(request);

  let authorizedKlantId: string | null = null;

  if (!isAdmin) {
    // Niet admin - check of er een geldige klant token is
    if (!token) {
      console.warn(`[SECURITY] Unauthorized factuur PDF access - no token provided`);
      return NextResponse.json({ error: "Unauthorized - Token required" }, { status: 403 });
    }

    const verified = await verifyFactuurToken(token);
    if (!verified || verified.factuurId !== id) {
      console.warn(`[SECURITY] Invalid factuur token for factuur ${id}`);
      return NextResponse.json({ error: "Unauthorized - Invalid token" }, { status: 403 });
    }

    // Token is geldig - klant mag alleen ZIJN eigen factuur zien
    authorizedKlantId = verified.klantId;
  }

  // Haal factuur met klant en regels op
  const { data: factuur } = await supabase
    .from("facturen")
    .select(`*, klant:klanten(*), regels:factuur_regels(*)`)
    .eq("id", id)
    .single();

  if (!factuur) {
    return NextResponse.json({ error: "Factuur niet gevonden" }, { status: 404 });
  }

  // Extra check: als klant token gebruikt, check of factuur daadwerkelijk van die klant is
  if (authorizedKlantId && factuur.klant_id !== authorizedKlantId) {
    console.warn(`[SECURITY] Klant ${authorizedKlantId} probeerde factuur ${id} van andere klant te bekijken`);
    return NextResponse.json({ error: "Unauthorized - Factuur hoort niet bij deze klant" }, { status: 403 });
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const formatCurrency = (n: number) => `€ ${n.toFixed(2).replace(".", ",")}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 28px; font-weight: 800; color: #F27501; }
    .factuur-info { text-align: right; }
    .factuur-nummer { font-size: 24px; font-weight: 700; color: #F27501; }
    .addresses { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .address { line-height: 1.6; }
    .address-title { font-weight: 600; margin-bottom: 8px; color: #666; font-size: 12px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #F27501; color: white; text-align: left; padding: 12px; font-size: 13px; }
    td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
    tr:nth-child(even) { background: #fafafa; }
    .totals { margin-left: auto; width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .totals-row.total { font-weight: 700; font-size: 18px; color: #F27501; border-top: 2px solid #F27501; border-bottom: none; padding-top: 12px; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
    .payment { background: #fff7ed; border: 1px solid #F27501; border-radius: 8px; padding: 20px; margin-top: 30px; }
    .payment-title { font-weight: 600; color: #F27501; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">TopTalent Jobs</div>
    <div class="factuur-info">
      <div class="factuur-nummer">Factuur ${factuur.factuur_nummer}</div>
      <div style="color: #666; margin-top: 4px;">Datum: ${formatDate(factuur.created_at)}</div>
    </div>
  </div>

  <div class="addresses">
    <div class="address">
      <div class="address-title">Van</div>
      <strong>TopTalent Jobs</strong><br>
      Uw Straat 123<br>
      1234 AB Amsterdam<br>
      KVK: 12345678<br>
      BTW: NL123456789B01
    </div>
    <div class="address">
      <div class="address-title">Aan</div>
      <strong>${factuur.klant?.bedrijfsnaam}</strong><br>
      ${factuur.klant?.contactpersoon}<br>
      ${factuur.klant?.email}
    </div>
  </div>

  <div style="margin-bottom: 20px; color: #666;">
    Periode: ${formatDate(factuur.periode_start)} t/m ${formatDate(factuur.periode_eind)}
  </div>

  <table>
    <thead>
      <tr>
        <th>Datum</th>
        <th>Omschrijving</th>
        <th>Uren</th>
        <th>Tarief</th>
        <th style="text-align: right;">Bedrag</th>
      </tr>
    </thead>
    <tbody>
      ${factuur.regels.map((r: any) => `
        <tr>
          <td>${new Date(r.datum).toLocaleDateString("nl-NL")}</td>
          <td>${r.omschrijving}</td>
          <td>${r.uren}</td>
          <td>${formatCurrency(r.uurtarief)}</td>
          <td style="text-align: right;">${formatCurrency(r.bedrag)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotaal</span><span>${formatCurrency(factuur.subtotaal)}</span></div>
    <div class="totals-row"><span>BTW (${factuur.btw_percentage}%)</span><span>${formatCurrency(factuur.btw_bedrag)}</span></div>
    <div class="totals-row total"><span>Totaal</span><span>${formatCurrency(factuur.totaal)}</span></div>
  </div>

  <div class="payment">
    <div class="payment-title">Betaalinformatie</div>
    Gelieve het bedrag binnen 14 dagen over te maken naar:<br>
    <strong>NL00 BANK 0000 0000 00</strong> t.n.v. TopTalent Jobs<br>
    o.v.v. factuurnummer ${factuur.factuur_nummer}
  </div>

  <div class="footer">
    TopTalent Jobs • info@toptalentjobs.nl • www.toptalentjobs.nl
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
