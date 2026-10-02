import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { verifyFactuurToken } from "@/lib/session";
import { getFactuurConfig } from "@/lib/factuur-config";
import { escapeHtml } from "@/lib/sanitize";
import { factuurKlantNaw } from "@/lib/factuur-klant-snapshot";

type FactuurRegel = {
  datum: string;
  omschrijving: string;
  uren: number;
  uurtarief: number;
  reiskosten: number;
  bedrag: number;
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const factuurConfig = getFactuurConfig();
  const addressLines = [factuurConfig.adres, factuurConfig.postcodeStad].filter(Boolean);
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
    .maybeSingle();

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

  const e = (v: unknown) => escapeHtml(v == null ? "" : String(v));
  // NAW zoals vastgelegd bij het factureren; per veld terugvallen op de live klant (oude facturen).
  const naw = factuurKlantNaw(factuur, factuur.klant);

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
      <div class="factuur-nummer">Factuur ${e(factuur.factuur_nummer)}</div>
      <div style="color: #666; margin-top: 4px;">Datum: ${formatDate(factuur.created_at)}</div>
    </div>
  </div>

  <div class="addresses">
    <div class="address">
      <div class="address-title">Van</div>
      <strong>${e(factuurConfig.bedrijfsnaam)}</strong><br>
      ${addressLines.length > 0 ? `${addressLines.map(e).join("<br>")}<br>` : ""}
      KVK: ${e(factuurConfig.kvk)}<br>
      BTW: ${e(factuurConfig.btw)}
      ${factuurConfig.waadi ? `<br>WAADI: ${e(factuurConfig.waadi)}` : ""}
      ${factuurConfig.loonbelastingnummer ? `<br>Loonheffingen: ${e(factuurConfig.loonbelastingnummer)}` : ""}
    </div>
    <div class="address">
      <div class="address-title">Aan</div>
      <strong>${e(naw.bedrijfsnaam)}</strong><br>
      ${e(naw.contactpersoon)}<br>
      ${naw.adres ? `${e(naw.adres)}<br>` : ""}${naw.postcode ? `${e(naw.postcode)} ` : ""}${e(naw.stad)}<br>
      ${naw.kvk_nummer ? `KVK: ${e(naw.kvk_nummer)}<br>` : ""}${naw.btw_nummer ? `BTW: ${e(naw.btw_nummer)}<br>` : ""}${e(naw.email)}
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
        <th>Reiskosten</th>
        <th style="text-align: right;">Bedrag</th>
      </tr>
    </thead>
    <tbody>
      ${(factuur.regels as FactuurRegel[]).map((r) => `
        <tr>
          <td>${new Date(r.datum).toLocaleDateString("nl-NL")}</td>
          <td>${e(r.omschrijving)}</td>
          <td>${e(r.uren)}</td>
          <td>${formatCurrency(r.uurtarief)}</td>
          <td>${formatCurrency(r.reiskosten || 0)}</td>
          <td style="text-align: right;">${formatCurrency(r.bedrag)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotaal</span><span>${formatCurrency(factuur.subtotaal)}</span></div>
    <div class="totals-row"><span>BTW (${e(factuur.btw_percentage)}%)</span><span>${formatCurrency(factuur.btw_bedrag)}</span></div>
    <div class="totals-row total"><span>Totaal</span><span>${formatCurrency(factuur.totaal)}</span></div>
  </div>

  <div class="payment">
    <div class="payment-title">Betaalinformatie</div>
    Gelieve het bedrag binnen ${e(factuurConfig.paymentTermDays)} dagen over te maken naar:<br>
    <strong>${e(factuurConfig.iban)}</strong> t.n.v. ${e(factuurConfig.tenaamstelling)}<br>
    o.v.v. factuurnummer ${e(factuur.factuur_nummer)}
  </div>

  <div class="footer">
    ${e(factuurConfig.bedrijfsnaam)} &bull; ${e(factuurConfig.adres)}, ${e(factuurConfig.postcodeStad)} &bull; ${e(factuurConfig.email)} &bull; www.toptalentjobs.nl<br>
    KVK: ${e(factuurConfig.kvk)} &bull; BTW: ${e(factuurConfig.btw)}${factuurConfig.waadi ? ` &bull; WAADI: ${e(factuurConfig.waadi)}` : ""}
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Geen scripts op deze pagina: ook als er ooit iets onge-escaped doorglipt, draait het niet.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "Cache-Control": "private, no-store",
    },
  });
}
