import { NextResponse } from "next/server";

export async function GET() {
  const formatDate = (d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const formatCurrency = (n: number) => `€ ${n.toFixed(2).replace(".", ",")}`;

  // Voorbeeld data
  const factuur = {
    factuur_nummer: "20240001",
    created_at: new Date().toISOString(),
    periode_start: "2024-12-01",
    periode_eind: "2024-12-14",
    subtotaal: 1250.00,
    btw_percentage: 21,
    btw_bedrag: 262.50,
    totaal: 1512.50,
    klant: {
      bedrijfsnaam: "Horeca Groep Amsterdam B.V.",
      contactpersoon: "Jan de Vries",
      email: "jan@horecagroep.nl"
    },
    regels: [
      { datum: "2024-12-02", omschrijving: "Restaurant De Jordaan - Ahmed Yilmaz", uren: 8, uurtarief: 18.50, bedrag: 148.00 },
      { datum: "2024-12-03", omschrijving: "Restaurant De Jordaan - Sophie Bakker", uren: 6, uurtarief: 18.50, bedrag: 111.00 },
      { datum: "2024-12-05", omschrijving: "Café Het Centrum - Ahmed Yilmaz", uren: 9, uurtarief: 18.50, bedrag: 166.50 },
      { datum: "2024-12-07", omschrijving: "Restaurant De Jordaan - Mike Peters", uren: 8.5, uurtarief: 18.50, bedrag: 157.25 },
      { datum: "2024-12-09", omschrijving: "Café Het Centrum - Sophie Bakker", uren: 7, uurtarief: 18.50, bedrag: 129.50 },
      { datum: "2024-12-10", omschrijving: "Restaurant De Jordaan - Ahmed Yilmaz", uren: 8, uurtarief: 18.50, bedrag: 148.00 },
      { datum: "2024-12-12", omschrijving: "Café Het Centrum - Mike Peters", uren: 10, uurtarief: 18.50, bedrag: 185.00 },
      { datum: "2024-12-14", omschrijving: "Restaurant De Jordaan - Sophie Bakker", uren: 11, uurtarief: 18.50, bedrag: 203.50 },
    ]
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Factuur ${factuur.factuur_nummer} - TopTalent Jobs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; background: #f5f5f5; }
    .page { background: white; padding: 50px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); border-radius: 8px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 3px solid #F27501; }
    .logo { font-size: 32px; font-weight: 800; color: #F27501; }
    .logo-sub { font-size: 14px; color: #666; margin-top: 4px; }
    .factuur-info { text-align: right; }
    .factuur-nummer { font-size: 28px; font-weight: 700; color: #F27501; }
    .factuur-datum { color: #666; margin-top: 8px; font-size: 14px; }
    .addresses { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .address { line-height: 1.8; }
    .address-title { font-weight: 600; margin-bottom: 12px; color: #F27501; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .periode { background: #fff7ed; border-left: 4px solid #F27501; padding: 15px 20px; margin-bottom: 30px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #F27501; color: white; text-align: left; padding: 14px 16px; font-size: 13px; font-weight: 600; }
    th:last-child { text-align: right; }
    td { padding: 14px 16px; border-bottom: 1px solid #eee; font-size: 14px; }
    td:last-child { text-align: right; }
    tr:nth-child(even) { background: #fafafa; }
    tr:hover { background: #fff7ed; }
    .totals { margin-left: auto; width: 300px; background: #fafafa; border-radius: 8px; padding: 20px; }
    .totals-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .totals-row:last-child { border-bottom: none; }
    .totals-row.total { font-weight: 700; font-size: 20px; color: #F27501; border-top: 2px solid #F27501; border-bottom: none; padding-top: 15px; margin-top: 5px; }
    .payment { background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 2px solid #F27501; border-radius: 12px; padding: 25px; margin-top: 40px; }
    .payment-title { font-weight: 700; color: #F27501; margin-bottom: 15px; font-size: 16px; }
    .payment-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .payment-item { font-size: 14px; }
    .payment-label { color: #666; }
    .payment-value { font-weight: 600; color: #1a1a1a; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center; }
    @media print {
      body { background: white; padding: 0; }
      .page { box-shadow: none; padding: 30px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="logo">TopTalent Jobs</div>
        <div class="logo-sub">Professionele horeca uitzendkrachten</div>
      </div>
      <div class="factuur-info">
        <div class="factuur-nummer">Factuur ${factuur.factuur_nummer}</div>
        <div class="factuur-datum">Datum: ${formatDate(factuur.created_at)}</div>
      </div>
    </div>

    <div class="addresses">
      <div class="address">
        <div class="address-title">Van</div>
        <strong>TopTalent Jobs B.V.</strong><br>
        Herengracht 100<br>
        1015 BS Amsterdam<br>
        <br>
        KVK: 12345678<br>
        BTW: NL123456789B01
      </div>
      <div class="address">
        <div class="address-title">Factuuradres</div>
        <strong>${factuur.klant.bedrijfsnaam}</strong><br>
        T.a.v. ${factuur.klant.contactpersoon}<br>
        ${factuur.klant.email}
      </div>
    </div>

    <div class="periode">
      <strong>Factuurperiode:</strong> ${formatDate(factuur.periode_start)} t/m ${formatDate(factuur.periode_eind)}
    </div>

    <table>
      <thead>
        <tr>
          <th>Datum</th>
          <th>Omschrijving</th>
          <th>Uren</th>
          <th>Tarief</th>
          <th>Bedrag</th>
        </tr>
      </thead>
      <tbody>
        ${factuur.regels.map((r) => `
          <tr>
            <td>${new Date(r.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</td>
            <td>${r.omschrijving}</td>
            <td>${r.uren}</td>
            <td>${formatCurrency(r.uurtarief)}</td>
            <td><strong>${formatCurrency(r.bedrag)}</strong></td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotaal</span>
        <span>${formatCurrency(factuur.subtotaal)}</span>
      </div>
      <div class="totals-row">
        <span>BTW (${factuur.btw_percentage}%)</span>
        <span>${formatCurrency(factuur.btw_bedrag)}</span>
      </div>
      <div class="totals-row total">
        <span>Totaal</span>
        <span>${formatCurrency(factuur.totaal)}</span>
      </div>
    </div>

    <div class="payment">
      <div class="payment-title">Betaalinformatie</div>
      <div class="payment-details">
        <div class="payment-item">
          <div class="payment-label">IBAN</div>
          <div class="payment-value">NL00 BANK 0000 0000 00</div>
        </div>
        <div class="payment-item">
          <div class="payment-label">T.n.v.</div>
          <div class="payment-value">TopTalent Jobs B.V.</div>
        </div>
        <div class="payment-item">
          <div class="payment-label">Referentie</div>
          <div class="payment-value">${factuur.factuur_nummer}</div>
        </div>
        <div class="payment-item">
          <div class="payment-label">Betaaltermijn</div>
          <div class="payment-value">14 dagen</div>
        </div>
      </div>
    </div>

    <div class="footer">
      TopTalent Jobs B.V. • Herengracht 100, 1015 BS Amsterdam • info@toptalentjobs.nl • www.toptalentjobs.nl<br>
      KVK: 12345678 • BTW: NL123456789B01 • IBAN: NL00 BANK 0000 0000 00
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
