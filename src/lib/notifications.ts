import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";
}

function formatDutchDate(date: string) {
  return new Date(date).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function renderLayout(content: string) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;background:#f8f8f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#333;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;">
          <div style="background:linear-gradient(135deg,#F27501 0%,#d96800 100%);padding:36px 28px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#fff;">TopTalent</div>
          </div>
          <div style="padding:36px 28px;line-height:1.6;">
            ${content}
          </div>
          <div style="padding:20px 28px;border-top:1px solid #eee;text-align:center;">
            <p style="font-size:12px;color:#999;margin:0;">TopTalent Jobs · info@toptalentjobs.nl</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function portalButton(text: string, path: string) {
  const url = `${getBaseUrl()}${path}`;
  return `
    <p style="text-align:center;margin:32px 0;">
      <a href="${url}" style="display:inline-block;background:#0B2447;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;">
        ${text}
      </a>
    </p>
  `;
}

// ===== BERICHTEN =====

export async function sendNieuwBerichtEmail(input: {
  ontvangerNaam: string;
  ontvangerEmail: string;
  afzender: string;
  onderwerp: string | null;
  inhoud: string;
}) {
  const firstName = input.ontvangerNaam.split(" ")[0] || input.ontvangerNaam;

  return resend.emails.send({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [input.ontvangerEmail],
    replyTo: "info@toptalentjobs.nl",
    subject: `Nieuw bericht${input.onderwerp ? `: ${input.onderwerp}` : ""} - TopTalent`,
    html: renderLayout(`
      <h1 style="margin:0 0 16px;color:#F27501;font-size:24px;">Hey ${firstName}, je hebt een nieuw bericht</h1>
      <p>Je hebt een nieuw bericht ontvangen van <strong>${input.afzender}</strong>.</p>
      ${input.onderwerp ? `<p><strong>Onderwerp:</strong> ${input.onderwerp}</p>` : ""}
      <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:24px 0;">
        <p style="margin:0;white-space:pre-wrap;">${input.inhoud.substring(0, 500)}${input.inhoud.length > 500 ? "..." : ""}</p>
      </div>
      ${portalButton("Bekijk bericht", "/medewerker/dashboard")}
    `),
  });
}

// ===== SHIFT AANBIEDINGEN =====

export async function sendShiftAanbiedingEmail(input: {
  medewerkerNaam: string;
  medewerkerEmail: string;
  functie: string;
  klantNaam: string;
  datum: string;
  startTijd: string;
  eindTijd: string;
  locatie: string;
  notitie?: string | null;
}) {
  const firstName = input.medewerkerNaam.split(" ")[0] || input.medewerkerNaam;

  return resend.emails.send({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [input.medewerkerEmail],
    replyTo: "info@toptalentjobs.nl",
    subject: `Nieuwe dienst beschikbaar: ${input.functie} bij ${input.klantNaam} - TopTalent`,
    html: renderLayout(`
      <p style="font-size:32px;margin:0 0 16px;">📋</p>
      <h1 style="margin:0 0 16px;color:#F27501;font-size:24px;">Hey ${firstName}, er is een dienst voor jou!</h1>
      <p>TopTalent biedt je een nieuwe dienst aan. Bekijk de details en reageer zo snel mogelijk.</p>

      <div style="background:#fff7f1;border:1px solid #f8d4b4;border-radius:12px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 8px;"><strong>Dienstdetails</strong></p>
        <ul style="margin:0;padding-left:20px;">
          <li><strong>Functie:</strong> ${input.functie}</li>
          <li><strong>Klant:</strong> ${input.klantNaam}</li>
          <li><strong>Datum:</strong> ${formatDutchDate(input.datum)}</li>
          <li><strong>Tijd:</strong> ${input.startTijd.substring(0, 5)} - ${input.eindTijd.substring(0, 5)}</li>
          <li><strong>Locatie:</strong> ${input.locatie}</li>
        </ul>
      </div>

      ${input.notitie ? `
        <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:24px 0;">
          <p style="margin:0 0 4px;"><strong>Opmerking van admin:</strong></p>
          <p style="margin:0;">${input.notitie}</p>
        </div>
      ` : ""}

      ${portalButton("Bekijk & reageer", "/medewerker/dashboard")}
      <p style="font-size:14px;color:#666;">Reageer zo snel mogelijk — deze aanbieding kan verlopen.</p>
    `),
  });
}

// ===== SHIFT REACTIE (naar admin) =====

export async function sendShiftReactieEmail(input: {
  medewerkerNaam: string;
  functie: string;
  klantNaam: string;
  datum: string;
  status: "geaccepteerd" | "afgewezen";
}) {
  const emoji = input.status === "geaccepteerd" ? "✅" : "❌";
  const statusLabel = input.status === "geaccepteerd" ? "Geaccepteerd" : "Afgewezen";

  return resend.emails.send({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: ["info@toptalentjobs.nl"],
    subject: `${emoji} Shift ${statusLabel}: ${input.medewerkerNaam} - ${input.klantNaam}`,
    html: renderLayout(`
      <h1 style="margin:0 0 16px;color:${input.status === "geaccepteerd" ? "#16a34a" : "#dc2626"};font-size:24px;">
        ${emoji} Shift Aanbieding ${statusLabel}
      </h1>
      <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:24px 0;">
        <ul style="margin:0;padding-left:20px;">
          <li><strong>Medewerker:</strong> ${input.medewerkerNaam}</li>
          <li><strong>Functie:</strong> ${input.functie}</li>
          <li><strong>Klant:</strong> ${input.klantNaam}</li>
          <li><strong>Datum:</strong> ${formatDutchDate(input.datum)}</li>
          <li><strong>Status:</strong> ${statusLabel}</li>
        </ul>
      </div>
    `),
  });
}

// ===== DOCUMENT REVIEW =====

export async function sendDocumentReviewEmail(input: {
  medewerkerNaam: string;
  medewerkerEmail: string;
  documentType: string;
  reviewStatus: "goedgekeurd" | "afgekeurd";
  opmerking?: string | null;
}) {
  const firstName = input.medewerkerNaam.split(" ")[0] || input.medewerkerNaam;
  const emoji = input.reviewStatus === "goedgekeurd" ? "✅" : "⚠️";
  const statusLabel = input.reviewStatus === "goedgekeurd" ? "goedgekeurd" : "afgekeurd";

  return resend.emails.send({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [input.medewerkerEmail],
    replyTo: "info@toptalentjobs.nl",
    subject: `${emoji} Document ${statusLabel}: ${input.documentType} - TopTalent`,
    html: renderLayout(`
      <h1 style="margin:0 0 16px;color:${input.reviewStatus === "goedgekeurd" ? "#16a34a" : "#dc2626"};font-size:24px;">
        ${emoji} Document ${statusLabel}
      </h1>
      <p>Hey ${firstName}, je document <strong>${input.documentType}</strong> is beoordeeld.</p>

      <div style="background:${input.reviewStatus === "goedgekeurd" ? "#f0fdf4" : "#fef2f2"};border:1px solid ${input.reviewStatus === "goedgekeurd" ? "#bbf7d0" : "#fecaca"};border-radius:12px;padding:20px;margin:24px 0;">
        <p style="margin:0;font-weight:bold;">Status: ${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}</p>
        ${input.opmerking ? `<p style="margin:8px 0 0;">Opmerking: ${input.opmerking}</p>` : ""}
      </div>

      ${input.reviewStatus === "afgekeurd" ? `<p>Upload een nieuw document via je portaal.</p>` : ""}
      ${portalButton("Ga naar documenten", "/medewerker/dashboard")}
    `),
  });
}

// ===== UREN GOEDGEKEURD =====

export async function sendUrenGoedgekeurdEmail(input: {
  medewerkerNaam: string;
  medewerkerEmail: string;
  klantNaam: string;
  datum: string;
  gewerkte_uren: number;
}) {
  const firstName = input.medewerkerNaam.split(" ")[0] || input.medewerkerNaam;

  return resend.emails.send({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [input.medewerkerEmail],
    replyTo: "info@toptalentjobs.nl",
    subject: `✅ Uren goedgekeurd: ${input.klantNaam} - TopTalent`,
    html: renderLayout(`
      <h1 style="margin:0 0 16px;color:#16a34a;font-size:24px;">✅ Uren goedgekeurd</h1>
      <p>Hey ${firstName}, je uren voor <strong>${input.klantNaam}</strong> zijn goedgekeurd.</p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:24px 0;">
        <ul style="margin:0;padding-left:20px;">
          <li><strong>Klant:</strong> ${input.klantNaam}</li>
          <li><strong>Datum:</strong> ${formatDutchDate(input.datum)}</li>
          <li><strong>Gewerkte uren:</strong> ${input.gewerkte_uren}</li>
        </ul>
      </div>

      ${portalButton("Bekijk financieel overzicht", "/medewerker/dashboard")}
    `),
  });
}
