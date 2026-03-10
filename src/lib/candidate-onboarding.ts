import crypto from "crypto";
import { Resend } from "resend";

const FROM_EMAIL = "TopTalent Jobs <info@toptalentjobs.nl>";
const BRAND_ORANGE = "#F27501";
const BRAND_ORANGE_DARK = "#d96800";
const TEXT_DARK = "#1F1F1F";
const TEXT_MUTED = "#666666";
const BG_SOFT = "#FFF7F1";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.toptalentjobs.nl";
}

function getLogoUrl() {
  return `${getBaseUrl()}/logo.png`;
}

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  return new Resend(process.env.RESEND_API_KEY);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderParagraphs(paragraphs: string[]) {
  return paragraphs
    .map(
      (paragraph) =>
        `<p style="margin: 0 0 16px; color: ${TEXT_MUTED}; font-size: 16px; line-height: 1.7;">${paragraph}</p>`
    )
    .join("");
}

function renderChecklist(items: string[]) {
  if (items.length === 0) return "";

  return `
    <div style="margin: 24px 0; background: ${BG_SOFT}; border-radius: 16px; padding: 20px;">
      ${items
        .map(
          (item) => `
            <div style="margin-bottom: 12px; color: ${TEXT_DARK}; font-size: 15px; line-height: 1.6;">
              <span style="display: inline-block; width: 22px; height: 22px; line-height: 22px; text-align: center; border-radius: 999px; background: ${BRAND_ORANGE}; color: #ffffff; font-weight: 700; margin-right: 10px;">+</span>
              ${item}
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderEmailLayout({
  eyebrow,
  title,
  intro,
  body,
  ctaLabel,
  ctaHref,
  note,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  note?: string;
}) {
  const cta = ctaLabel && ctaHref
    ? `
      <div style="margin: 28px 0 24px;">
        <a
          href="${ctaHref}"
          style="
            display: inline-block;
            background: linear-gradient(135deg, ${BRAND_ORANGE} 0%, ${BRAND_ORANGE_DARK} 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 15px 22px;
            border-radius: 14px;
            font-weight: 700;
            font-size: 15px;
          "
        >
          ${ctaLabel}
        </a>
      </div>
    `
    : "";

  const noteBlock = note
    ? `<p style="margin: 20px 0 0; color: #8a8a8a; font-size: 12px; line-height: 1.6;">${note}</p>`
    : "";

  return `
    <div style="margin: 0; padding: 24px 12px; background: linear-gradient(180deg, #ffffff 0%, ${BG_SOFT} 100%);">
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="overflow: hidden; border-radius: 28px; box-shadow: 0 18px 40px rgba(0,0,0,0.08);">
          <div style="padding: 28px 28px 24px; background: linear-gradient(135deg, ${BRAND_ORANGE} 0%, ${BRAND_ORANGE_DARK} 100%); text-align: center;">
            <img
              src="${getLogoUrl()}"
              alt="TopTalent Jobs"
              style="height: 38px; width: auto; display: inline-block; margin-bottom: 18px;"
            />
            <div style="color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px;">
              ${eyebrow}
            </div>
            <h1 style="margin: 0; color: #ffffff; font-size: 30px; line-height: 1.2;">
              ${title}
            </h1>
            <p style="margin: 14px 0 0; color: rgba(255,255,255,0.92); font-size: 16px; line-height: 1.6;">
              ${intro}
            </p>
          </div>

          <div style="background: #ffffff; padding: 30px 28px;">
            ${body}
            ${cta}
            ${noteBlock}
          </div>

          <div style="background: ${TEXT_DARK}; padding: 20px 28px; color: rgba(255,255,255,0.72); font-size: 13px; line-height: 1.6;">
            TopTalent Jobs · info@toptalentjobs.nl · www.toptalentjobs.nl
          </div>
        </div>
      </div>
    </div>
  `;
}

export function buildCandidateFullName(candidate: {
  voornaam: string;
  tussenvoegsel?: string | null;
  achternaam: string;
}) {
  return candidate.tussenvoegsel
    ? `${candidate.voornaam} ${candidate.tussenvoegsel} ${candidate.achternaam}`
    : `${candidate.voornaam} ${candidate.achternaam}`;
}

export function generateOnboardingPortalToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function createOnboardingPortalLink(token: string) {
  return `${getBaseUrl()}/kandidaat/documenten?token=${token}`;
}

export async function sendCandidateIntakeConfirmation(candidate: {
  voornaam: string;
  email: string;
}) {
  const resend = getResendClient();
  if (!resend) return;

  const firstName = escapeHtml(candidate.voornaam);

  await resend.emails.send({
    from: FROM_EMAIL,
    to: [candidate.email],
    subject: "Lekker, je inschrijving is binnen",
    html: renderEmailLayout({
      eyebrow: "TopTalent Intake",
      title: "Je staat op onze radar",
      intro: `Hi ${firstName}, je inschrijving is goed binnengekomen.`,
      body: `
        ${renderParagraphs([
          "Nice. We gaan je intake nu even rustig bekijken om te checken waar jij het best tot je recht komt.",
          "Je hoeft nu nog niets extra's te doen. Documenten vragen we pas later op als we doorpakken.",
          "Zodra we een goede match zien, hoor je van ons.",
        ])}
        ${renderChecklist([
          "Wij checken je profiel en beschikbaarheid",
          "Als het matcht, nemen we contact met je op",
          "Documenten komen pas later in de flow",
        ])}
      `,
      ctaLabel: "Check TopTalent Jobs",
      ctaHref: getBaseUrl(),
      note: "Geen stress als je niet direct iets hoort. We willen eerst even goed kijken waar je het best past.",
    }),
  });
}

export async function sendCandidateDocumentsRequest(candidate: {
  voornaam: string;
  email: string;
  portalToken: string;
}) {
  const resend = getResendClient();
  if (!resend) return;

  const portalLink = createOnboardingPortalLink(candidate.portalToken);
  const firstName = escapeHtml(candidate.voornaam);

  await resend.emails.send({
    from: FROM_EMAIL,
    to: [candidate.email],
    subject: "Tijd voor de volgende stap: upload je documenten",
    html: renderEmailLayout({
      eyebrow: "Onboarding",
      title: "Nog even dit regelen",
      intro: `Hi ${firstName}, we willen door met je profiel. Daarvoor hebben we nog wat documenten van je nodig.`,
      body: `
        ${renderParagraphs([
          "Goed nieuws: je intake ziet er interessant uit.",
          "Om je onboarding netjes af te ronden, kun je via de knop hieronder veilig je documenten uploaden.",
        ])}
        ${renderChecklist([
          "ID",
          "CV",
          "KvK / btw-gegevens als je als ZZP werkt",
          "Eventuele certificaten als je die hebt",
        ])}
      `,
      ctaLabel: "Documenten uploaden",
      ctaHref: portalLink,
      note: `Werkt de knop niet? Gebruik dan deze link: ${portalLink}`,
    }),
  });
}

export async function sendCandidateWelcomeEmail(candidate: {
  voornaam: string;
  email: string;
}) {
  const resend = getResendClient();
  if (!resend) return;

  const firstName = escapeHtml(candidate.voornaam);

  await resend.emails.send({
    from: FROM_EMAIL,
    to: [candidate.email],
    subject: "Yes, je bent klaar voor inzet",
    html: renderEmailLayout({
      eyebrow: "Welkom bij TopTalent",
      title: "Je onboarding is rond",
      intro: `Hi ${firstName}, nice. Je profiel staat nu klaar voor inzet.`,
      body: `
        ${renderParagraphs([
          "Alles staat goed aan onze kant en je bent nu officieel door de onboarding heen.",
          "Dat betekent dat we je kunnen meenemen zodra er een passende dienst of opdracht voor je langskomt.",
          "Kort gezegd: jij staat klaar, wij gaan voor je aan.",
        ])}
        ${renderChecklist([
          "Je profiel is goedgekeurd",
          "Je documenten zijn binnen",
          "Je bent klaar om ingepland te worden zodra er een match is",
        ])}
      `,
      ctaLabel: "Naar de website",
      ctaHref: getBaseUrl(),
      note: "Zodra we iets hebben dat goed past bij jouw profiel en beschikbaarheid, hoor je van ons.",
    }),
  });
}
