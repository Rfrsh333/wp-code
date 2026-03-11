import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface ShiftConfirmationInput {
  medewerkerNaam: string;
  medewerkerEmail: string;
  functie: string;
  datum: string;
  startTijd: string;
  eindTijd: string;
  locatie: string;
  klantNaam: string;
  kledingvoorschrift?: string | null;
}

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
        </div>
      </body>
    </html>
  `;
}

export async function sendMedewerkerShiftConfirmationEmail(input: ShiftConfirmationInput) {
  const portalUrl = `${getBaseUrl()}/medewerker/diensten`;
  const firstName = input.medewerkerNaam.split(" ")[0] || input.medewerkerNaam;
  const kledingvoorschrift = input.kledingvoorschrift?.trim()
    ? input.kledingvoorschrift.trim()
    : "Geen extra kledingvoorschriften meegegeven. Neem bij twijfel even contact op.";

  return resend.emails.send({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [input.medewerkerEmail],
    replyTo: "info@toptalentjobs.nl",
    subject: `Je bent ingepland voor ${input.klantNaam} op ${formatDutchDate(input.datum)}`,
    html: renderLayout(`
      <p style="font-size:32px;margin:0 0 16px;">✅</p>
      <h1 style="margin:0 0 16px;color:#F27501;font-size:28px;">Hey ${firstName}, je bent bevestigd voor een dienst</h1>
      <p>Nice, je bent ingepland. Hieronder vind je direct alle belangrijke info voor deze dienst.</p>

      <div style="background:#fff7f1;border:1px solid #f8d4b4;border-radius:12px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 8px;"><strong>Dienstinformatie</strong></p>
        <ul style="margin:0;padding-left:20px;">
          <li><strong>Klant:</strong> ${input.klantNaam}</li>
          <li><strong>Functie:</strong> ${input.functie}</li>
          <li><strong>Datum:</strong> ${formatDutchDate(input.datum)}</li>
          <li><strong>Tijd:</strong> ${input.startTijd.substring(0, 5)} - ${input.eindTijd.substring(0, 5)}</li>
          <li><strong>Locatie:</strong> ${input.locatie}</li>
        </ul>
      </div>

      <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 8px;"><strong>Kledingvoorschrift</strong></p>
        <p style="margin:0;">${kledingvoorschrift}</p>
      </div>

      <p style="text-align:center;margin:32px 0;">
        <a href="${portalUrl}" style="display:inline-block;background:#0B2447;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;">
          Bekijk mijn diensten
        </a>
      </p>

      <p style="font-size:14px;color:#666;">Zorg dat je op tijd bent en check je portaal als er nog iets wijzigt.</p>
    `),
  });
}
