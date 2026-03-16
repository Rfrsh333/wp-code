/**
 * Herbruikbare HTML email templates voor TopTalent Jobs
 */

const BRAND_COLOR = "#F27501";
const BRAND_GRADIENT = "linear-gradient(135deg, #F27501 0%, #d96800 100%)";
const KANDIDAAT_COLOR = "#8B5CF6";
const KANDIDAAT_GRADIENT = "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)";

function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: Arial, Helvetica, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: ${BRAND_GRADIENT}; padding: 28px 32px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">TopTalent Jobs</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 14px;">Specialist in horeca personeel</p>
    </div>
    <!-- Body -->
    <div style="background: #ffffff; padding: 32px; border-left: 1px solid #e5e5e5; border-right: 1px solid #e5e5e5;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="background: #fafafa; padding: 24px 32px; text-align: center; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
      <p style="color: #999; font-size: 12px; margin: 0; line-height: 1.6;">
        TopTalent Jobs &mdash; Specialist in horeca personeel<br>
        <a href="https://www.toptalentjobs.nl" style="color: ${BRAND_COLOR}; text-decoration: none;">www.toptalentjobs.nl</a>
        &nbsp;|&nbsp; +31 6 49 71 37 66
      </p>
    </div>
  </div>
</body>
</html>`;
}

function bookingButton(url: string, text: string = "Plan een gesprek in"): string {
  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${url}" style="display: inline-block; background: ${BRAND_COLOR}; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
        ${text}
      </a>
    </div>`;
}

function infoBlock(items: { label: string; value: string }[]): string {
  return `
    <div style="background: #FEF3E7; border-radius: 8px; padding: 20px; margin: 20px 0;">
      ${items.map((item) => `<p style="margin: 0 0 6px 0; font-size: 14px;"><strong>${item.label}:</strong> ${item.value}</p>`).join("")}
    </div>`;
}

// ============================================
// 1. Auto-reply op aanvraag
// ============================================

export function buildAutoReplyEmailHtml(bodyText: string, bookingUrl: string): string {
  let htmlBody = bodyText
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "<br>";
      if (trimmed.startsWith("http") && trimmed.includes("afspraak-plannen")) {
        return bookingButton(trimmed);
      }
      return `<p style="margin: 0 0 8px 0; font-size: 15px; line-height: 1.6; color: #333;">${trimmed}</p>`;
    })
    .join("");

  if (!htmlBody.includes("afspraak-plannen")) {
    htmlBody += bookingButton(bookingUrl);
  }

  return emailWrapper(htmlBody);
}

// ============================================
// 2. Booking bevestiging (naar klant)
// ============================================

export function buildBookingConfirmationHtml(params: {
  clientName: string;
  datumFormatted: string;
  startTime: string;
  endTime: string;
  senderName: string;
  notes?: string;
  manageUrl?: string;
}): string {
  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Beste ${params.clientName},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Je afspraak met ${params.senderName} is bevestigd!</p>
    ${infoBlock([
      { label: "Datum", value: params.datumFormatted },
      { label: "Tijd", value: `${params.startTime} - ${params.endTime}` },
      ...(params.notes ? [{ label: "Notities", value: params.notes }] : []),
    ])}
    ${params.manageUrl ? `
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Wil je je afspraak wijzigen of annuleren? Dat kan eenvoudig via onderstaande link:
    </p>
    ${bookingButton(params.manageUrl, "Afspraak beheren")}
    ` : `
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      We kijken ernaar uit je te spreken! Als je de afspraak wilt wijzigen, neem dan contact met ons op via
      <a href="mailto:info@toptalentjobs.nl" style="color: ${BRAND_COLOR}; text-decoration: none;">info@toptalentjobs.nl</a>.
    </p>
    `}
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Met vriendelijke groet,<br>
      ${params.senderName}
    </p>`;

  return emailWrapper(content);
}

// ============================================
// 3. Admin notificatie bij nieuwe boeking
// ============================================

export function buildBookingNotificationHtml(params: {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  companyName?: string;
  datumFormatted: string;
  startTime: string;
  endTime: string;
  notes?: string;
  inquiryId?: string;
}): string {
  const items = [
    { label: "Klant", value: params.clientName },
    { label: "Email", value: params.clientEmail },
    ...(params.clientPhone ? [{ label: "Telefoon", value: params.clientPhone }] : []),
    ...(params.companyName ? [{ label: "Bedrijf", value: params.companyName }] : []),
    { label: "Datum", value: params.datumFormatted },
    { label: "Tijd", value: `${params.startTime} - ${params.endTime}` },
    ...(params.notes ? [{ label: "Notities", value: params.notes }] : []),
  ];

  const content = `
    <h2 style="color: #333; margin: 0 0 16px 0; font-size: 18px;">Nieuwe afspraak geboekt</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Er is een nieuwe afspraak geboekt via het booking systeem.</p>
    ${infoBlock(items)}
    ${params.inquiryId ? `<p style="font-size: 13px; color: #999;">Gekoppeld aan aanvraag: ${params.inquiryId}</p>` : ""}`;

  return emailWrapper(content);
}

// ============================================
// 4. Reminder (24u voor afspraak)
// ============================================

export function buildReminderEmailHtml(params: {
  clientName: string;
  datumFormatted: string;
  startTime: string;
  endTime: string;
  manageUrl?: string;
  meetLink?: string;
}): string {
  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Beste ${params.clientName},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Graag herinneren we je aan je afspraak met TopTalent Jobs morgen.</p>
    ${infoBlock([
      { label: "Datum", value: params.datumFormatted },
      { label: "Tijd", value: `${params.startTime} - ${params.endTime}` },
    ])}
    ${params.meetLink ? `
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Je ontvangt 1 uur van tevoren nog een herinnering met de link naar het videogesprek.
    </p>
    ` : ""}
    ${params.manageUrl ? `
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Kun je onverhoopt niet komen? Wijzig of annuleer je afspraak:
    </p>
    ${bookingButton(params.manageUrl, "Afspraak wijzigen")}
    ` : `
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Kun je onverhoopt niet komen? Laat het ons dan zo snel mogelijk weten via
      <a href="mailto:info@toptalentjobs.nl" style="color: ${BRAND_COLOR}; text-decoration: none;">info@toptalentjobs.nl</a>.
    </p>
    `}
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Tot morgen!<br>TopTalent Jobs</p>`;

  return emailWrapper(content);
}

// ============================================
// 4b. Meet Reminder (30 min voor afspraak)
// ============================================

export function buildMeetReminderEmailHtml(params: {
  clientName: string;
  datumFormatted: string;
  startTime: string;
  endTime: string;
  meetLink: string;
  manageUrl?: string;
}): string {
  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Beste ${params.clientName},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Je afspraak met TopTalent Jobs begint over <strong>1 uur</strong>.
    </p>
    ${infoBlock([
      { label: "Datum", value: params.datumFormatted },
      { label: "Tijd", value: `${params.startTime} - ${params.endTime}` },
    ])}
    <div style="text-align: center; margin: 24px 0;">
      <a href="${params.meetLink}" style="display: inline-block; background: #1a73e8; color: white; text-decoration: none; padding: 16px 36px; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Deelnemen aan videogesprek
      </a>
    </div>
    <p style="font-size: 13px; color: #999; text-align: center;">
      Of kopieer deze link: <a href="${params.meetLink}" style="color: ${BRAND_COLOR}; text-decoration: none;">${params.meetLink}</a>
    </p>
    ${params.manageUrl ? `
    <p style="font-size: 13px; color: #999; text-align: center; margin-top: 20px;">
      Kun je niet? <a href="${params.manageUrl}" style="color: ${BRAND_COLOR}; text-decoration: none;">Annuleer of wijzig je afspraak</a>
    </p>` : ""}
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Tot zo!<br>TopTalent Jobs</p>`;

  return emailWrapper(content);
}

// ============================================
// 5. Annuleringsbevestiging
// ============================================

export function buildCancellationEmailHtml(params: {
  clientName: string;
  datumFormatted: string;
  startTime: string;
  endTime: string;
  senderName: string;
  isAdmin?: boolean;
  reason?: string;
}): string {
  const content = params.isAdmin
    ? `
    <h2 style="color: #333; margin: 0 0 16px 0; font-size: 18px;">Afspraak geannuleerd</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      ${params.clientName} heeft de afspraak geannuleerd.
    </p>
    ${infoBlock([
      { label: "Klant", value: params.clientName },
      { label: "Datum", value: params.datumFormatted },
      { label: "Tijd", value: `${params.startTime} - ${params.endTime}` },
      ...(params.reason ? [{ label: "Reden", value: params.reason }] : []),
    ])}
    <p style="font-size: 13px; color: #999;">Het tijdslot is weer beschikbaar gemaakt.</p>`
    : `
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Beste ${params.clientName},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Je afspraak met ${params.senderName} is geannuleerd.
    </p>
    ${infoBlock([
      { label: "Datum", value: params.datumFormatted },
      { label: "Tijd", value: `${params.startTime} - ${params.endTime}` },
    ])}
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Wil je toch een afspraak inplannen? Dat kan altijd via onze website.
    </p>
    ${bookingButton("https://www.toptalentjobs.nl/afspraak-plannen", "Nieuwe afspraak plannen")}
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Met vriendelijke groet,<br>
      ${params.senderName}
    </p>`;

  return emailWrapper(content);
}

// ============================================
// 6. Verplaatsingsbevestiging
// ============================================

export function buildRescheduleEmailHtml(params: {
  clientName: string;
  oldDatum: string;
  oldTijd: string;
  newDatum: string;
  newTijd: string;
  senderName: string;
  manageUrl?: string;
}): string {
  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Beste ${params.clientName},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Je afspraak met ${params.senderName} is verplaatst.
    </p>
    <div style="background: #fee2e2; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: #991b1b; text-decoration: line-through;">
        <strong>Was:</strong> ${params.oldDatum} om ${params.oldTijd}
      </p>
    </div>
    <div style="background: #dcfce7; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: #166534;">
        <strong>Nieuw:</strong> ${params.newDatum} om ${params.newTijd}
      </p>
    </div>
    ${params.manageUrl ? bookingButton(params.manageUrl, "Afspraak beheren") : ""}
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Met vriendelijke groet,<br>
      ${params.senderName}
    </p>`;

  return emailWrapper(content);
}

// ============================================
// 7. Follow-up email (na afspraak)
// ============================================

export function buildFollowUpEmailHtml(params: {
  clientName: string;
  senderName: string;
}): string {
  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Beste ${params.clientName},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Bedankt voor het prettige gesprek! We hopen dat het nuttig voor je was.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Heb je nog vragen of wil je verdere stappen bespreken? Aarzel niet om contact op te nemen.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      We kijken ernaar uit om samen te werken!
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Met vriendelijke groet,<br>
      ${params.senderName}
    </p>`;

  return emailWrapper(content);
}

// ============================================
// 8. No-show notificatie (naar admin)
// ============================================

export function buildNoShowEmailHtml(params: {
  clientName: string;
  clientEmail: string;
  datumFormatted: string;
  startTime: string;
  endTime: string;
}): string {
  const content = `
    <h2 style="color: #b91c1c; margin: 0 0 16px 0; font-size: 18px;">No-show gedetecteerd</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      De volgende klant is niet op de afspraak verschenen:
    </p>
    ${infoBlock([
      { label: "Klant", value: params.clientName },
      { label: "Email", value: params.clientEmail },
      { label: "Datum", value: params.datumFormatted },
      { label: "Tijd", value: `${params.startTime} - ${params.endTime}` },
    ])}
    <p style="font-size: 13px; color: #999;">De afspraak is automatisch gemarkeerd als no-show.</p>`;

  return emailWrapper(content);
}

// ============================================
// Kandidaat email helpers
// ============================================

function kandidaatEmailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: Arial, Helvetica, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: ${KANDIDAAT_GRADIENT}; padding: 28px 32px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">TopTalent Jobs</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 14px;">Kennismakingsgesprek</p>
    </div>
    <!-- Body -->
    <div style="background: #ffffff; padding: 32px; border-left: 1px solid #e5e5e5; border-right: 1px solid #e5e5e5;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="background: #fafafa; padding: 24px 32px; text-align: center; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
      <p style="color: #999; font-size: 12px; margin: 0; line-height: 1.6;">
        TopTalent Jobs &mdash; Specialist in horeca personeel<br>
        <a href="https://www.toptalentjobs.nl" style="color: ${KANDIDAAT_COLOR}; text-decoration: none;">www.toptalentjobs.nl</a>
        &nbsp;|&nbsp; +31 6 49 71 37 66
      </p>
    </div>
  </div>
</body>
</html>`;
}

function kandidaatButton(url: string, text: string): string {
  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${url}" style="display: inline-block; background: ${KANDIDAAT_COLOR}; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
        ${text}
      </a>
    </div>`;
}

function kandidaatInfoBlock(items: { label: string; value: string }[]): string {
  return `
    <div style="background: #F3F0FF; border-radius: 8px; padding: 20px; margin: 20px 0;">
      ${items.map((item) => `<p style="margin: 0 0 6px 0; font-size: 14px;"><strong>${item.label}:</strong> ${item.value}</p>`).join("")}
    </div>`;
}

// ============================================
// 9. Kandidaat booking bevestiging
// ============================================

export function buildKandidaatBookingBevestiging(params: {
  naam: string;
  datum: string;
  tijd: string;
  meetLink?: string;
  annuleringsLink?: string;
}): string {
  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Beste ${params.naam},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Bedankt voor je inschrijving! Je kennismakingsgesprek is bevestigd.
    </p>
    ${kandidaatInfoBlock([
      { label: "Datum", value: params.datum },
      { label: "Tijd", value: params.tijd },
      { label: "Type", value: "Video call (Google Meet)" },
    ])}
    ${params.meetLink ? kandidaatButton(params.meetLink, "Deelnemen via Google Meet") : ""}
    <div style="background: #F9FAFB; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${KANDIDAAT_COLOR};">
      <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #333;">Wat kun je verwachten?</h3>
      <ul style="margin: 0; padding: 0 0 0 20px; font-size: 14px; line-height: 1.8; color: #555;">
        <li>Een kort kennismakingsgesprek van 15 minuten</li>
        <li>We bespreken je ervaring en beschikbaarheid</li>
        <li>Je kunt vragen stellen over werken via TopTalent</li>
        <li>Na het gesprek hoor je snel van ons</li>
      </ul>
    </div>
    ${params.annuleringsLink ? `
    <p style="font-size: 13px; color: #999; text-align: center;">
      Kun je niet? <a href="${params.annuleringsLink}" style="color: ${KANDIDAAT_COLOR}; text-decoration: none;">Annuleer of wijzig je afspraak</a>
    </p>` : ""}
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      We kijken ernaar uit je te spreken!<br>
      Team TopTalent Jobs
    </p>`;

  return kandidaatEmailWrapper(content);
}

// ============================================
// 10. Kandidaat booking admin notificatie
// ============================================

export function buildKandidaatBookingNotificatie(params: {
  kandidaatNaam: string;
  email: string;
  telefoon?: string;
  cvUrl?: string;
  inschrijvingId?: string;
  meetLink?: string;
  datum: string;
  tijd: string;
}): string {
  const items = [
    { label: "Kandidaat", value: params.kandidaatNaam },
    { label: "Email", value: params.email },
    ...(params.telefoon ? [{ label: "Telefoon", value: params.telefoon }] : []),
    { label: "Datum", value: params.datum },
    { label: "Tijd", value: params.tijd },
  ];

  const content = `
    <h2 style="color: #333; margin: 0 0 16px 0; font-size: 18px;">Nieuw kennismakingsgesprek ingepland</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Er is een nieuw kennismakingsgesprek ingepland met een kandidaat.</p>
    ${kandidaatInfoBlock(items)}
    ${params.cvUrl ? `<p style="font-size: 14px; margin: 12px 0;"><strong>CV:</strong> <a href="${params.cvUrl}" style="color: ${KANDIDAAT_COLOR}; text-decoration: none;">Download CV</a></p>` : ""}
    ${params.meetLink ? `<p style="font-size: 14px; margin: 12px 0;"><strong>Google Meet:</strong> <a href="${params.meetLink}" style="color: ${KANDIDAAT_COLOR}; text-decoration: none;">${params.meetLink}</a></p>` : ""}
    ${params.inschrijvingId ? `<p style="font-size: 13px; color: #999;">Inschrijving ID: ${params.inschrijvingId}</p>` : ""}`;

  return kandidaatEmailWrapper(content);
}

// ============================================
// 11. Kandidaat booking annulering
// ============================================

// ============================================
// PORTAAL NOTIFICATIE TEMPLATES
// ============================================

// N1. Shift aangeboden aan medewerker
export function buildShiftAangebodenHtml(params: {
  naam: string; klantNaam: string; functie: string;
  datum: string; startTijd: string; eindTijd: string; locatie: string;
}): string {
  const firstName = params.naam.split(" ")[0];
  return emailWrapper(`
    <p style="font-size: 32px; margin: 0 0 16px;">📋</p>
    <h2 style="color: ${BRAND_COLOR}; margin: 0 0 16px; font-size: 22px;">Hey ${firstName}, er is een shift voor je!</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Er is een nieuwe dienst die bij je past. Bekijk de details en meld je aan als je beschikbaar bent.</p>
    ${infoBlock([
      { label: "Klant", value: params.klantNaam },
      { label: "Functie", value: params.functie },
      { label: "Datum", value: params.datum },
      { label: "Tijd", value: `${params.startTijd.substring(0, 5)} - ${params.eindTijd.substring(0, 5)}` },
      { label: "Locatie", value: params.locatie },
    ])}
    ${bookingButton("https://www.toptalentjobs.nl/medewerker/dashboard", "Bekijk & Reageer")}
  `);
}

// N2. Uren goedgekeurd
export function buildUrenGoedgekeurdHtml(params: {
  naam: string; klantNaam: string; datum: string; uren: number;
}): string {
  const firstName = params.naam.split(" ")[0];
  return emailWrapper(`
    <p style="font-size: 32px; margin: 0 0 16px;">✅</p>
    <h2 style="color: ${BRAND_COLOR}; margin: 0 0 16px; font-size: 22px;">Uren goedgekeurd!</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Hey ${firstName}, je uren voor onderstaande dienst zijn goedgekeurd.</p>
    ${infoBlock([
      { label: "Klant", value: params.klantNaam },
      { label: "Datum", value: params.datum },
      { label: "Uren", value: String(params.uren) },
    ])}
    ${bookingButton("https://www.toptalentjobs.nl/medewerker/dashboard", "Bekijk financieel overzicht")}
  `);
}

// N3. Document afgewezen
export function buildDocumentAfgewezen(params: {
  naam: string; documentType: string; opmerking?: string;
}): string {
  const firstName = params.naam.split(" ")[0];
  return emailWrapper(`
    <p style="font-size: 32px; margin: 0 0 16px;">📄</p>
    <h2 style="color: ${BRAND_COLOR}; margin: 0 0 16px; font-size: 22px;">Document afgekeurd</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Hey ${firstName}, je document "${params.documentType}" is helaas afgekeurd.</p>
    ${params.opmerking ? `<div style="background: #fee2e2; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: #991b1b;"><strong>Reden:</strong> ${params.opmerking}</p>
    </div>` : ""}
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Upload een nieuw document via je portaal.</p>
    ${bookingButton("https://www.toptalentjobs.nl/medewerker/dashboard", "Upload nieuw document")}
  `);
}

// N4. Document verloopt binnenkort
export function buildDocumentVerlooptHtml(params: {
  naam: string; documentType: string; verloopDatum: string;
}): string {
  const firstName = params.naam.split(" ")[0];
  return emailWrapper(`
    <p style="font-size: 32px; margin: 0 0 16px;">⚠️</p>
    <h2 style="color: ${BRAND_COLOR}; margin: 0 0 16px; font-size: 22px;">Document verloopt binnenkort</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Hey ${firstName}, je ${params.documentType} verloopt op <strong>${params.verloopDatum}</strong>.</p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Upload zo snel mogelijk een nieuw document om onderbrekingen te voorkomen.</p>
    ${bookingButton("https://www.toptalentjobs.nl/medewerker/dashboard", "Document vernieuwen")}
  `);
}

// N5. Medewerker accepteert/weigert shift — notify admin
export function buildAanbiedingReactieHtml(params: {
  medewerkerNaam: string; klantNaam: string; datum: string; actie: "geaccepteerd" | "geweigerd";
}): string {
  const emoji = params.actie === "geaccepteerd" ? "✅" : "❌";
  return emailWrapper(`
    <p style="font-size: 32px; margin: 0 0 16px;">${emoji}</p>
    <h2 style="color: ${BRAND_COLOR}; margin: 0 0 16px; font-size: 22px;">Aanbieding ${params.actie}</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #333;"><strong>${params.medewerkerNaam}</strong> heeft de dienst bij ${params.klantNaam} op ${params.datum} <strong>${params.actie}</strong>.</p>
    ${bookingButton("https://www.toptalentjobs.nl/admin?tab=planning", "Bekijk planning")}
  `);
}

// N6. Uren ingediend — notify admin
export function buildUrenIngediendHtml(params: {
  medewerkerNaam: string; klantNaam: string; datum: string; uren: number;
}): string {
  return emailWrapper(`
    <p style="font-size: 32px; margin: 0 0 16px;">🕐</p>
    <h2 style="color: ${BRAND_COLOR}; margin: 0 0 16px; font-size: 22px;">Nieuwe uren ter goedkeuring</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #333;"><strong>${params.medewerkerNaam}</strong> heeft ${params.uren} uur ingediend voor ${params.klantNaam} op ${params.datum}.</p>
    ${bookingButton("https://www.toptalentjobs.nl/admin?tab=uren", "Uren beoordelen")}
  `);
}

// N7. Factuur onbetaald herinnering
export function buildFactuurHerinneringHtml(params: {
  bedrijfsnaam: string; factuurNummer: string; totaal: number; vervalDatum: string;
}): string {
  return emailWrapper(`
    <p style="font-size: 32px; margin: 0 0 16px;">💰</p>
    <h2 style="color: ${BRAND_COLOR}; margin: 0 0 16px; font-size: 22px;">Betalingsherinnering</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Beste ${params.bedrijfsnaam},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Wij hebben nog geen betaling ontvangen voor onderstaande factuur.</p>
    ${infoBlock([
      { label: "Factuurnummer", value: params.factuurNummer },
      { label: "Bedrag", value: `€${params.totaal.toFixed(2)}` },
      { label: "Vervaldatum", value: params.vervalDatum },
    ])}
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Wij verzoeken u vriendelijk het openstaande bedrag zo spoedig mogelijk over te maken.</p>
  `);
}

export function buildKandidaatBookingAnnulering(params: {
  naam: string;
  herboekenLink?: string;
}): string {
  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Beste ${params.naam},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Je kennismakingsgesprek is geannuleerd.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Wil je toch een gesprek inplannen? Dat kan altijd via onderstaande link.
    </p>
    ${params.herboekenLink ? kandidaatButton(params.herboekenLink, "Opnieuw inplannen") : kandidaatButton("https://www.toptalentjobs.nl/kennismaking-plannen", "Opnieuw inplannen")}
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Met vriendelijke groet,<br>
      Team TopTalent Jobs
    </p>`;

  return kandidaatEmailWrapper(content);
}

// ============================================
// CONTRACT EMAILS
// ============================================

export function buildContractOndertekeningEmailHtml(params: {
  medewerkerNaam: string;
  contractTitel: string;
  contractNummer: string;
  ondertekeningUrl: string;
}): string {
  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Beste ${params.medewerkerNaam},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Er staat een nieuw contract voor je klaar ter ondertekening.
    </p>
    ${infoBlock([
      { label: "Contract", value: params.contractTitel },
      { label: "Contractnummer", value: params.contractNummer },
    ])}
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Klik op onderstaande knop om het contract te bekijken en digitaal te ondertekenen.
      De link is 7 dagen geldig.
    </p>
    ${bookingButton(params.ondertekeningUrl, "Contract bekijken & ondertekenen")}
    <p style="font-size: 13px; color: #999; margin-top: 20px;">
      Vragen? Neem contact op via info@toptalentjobs.nl of +31 6 49 71 37 66.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Met vriendelijke groet,<br>
      Team TopTalent Jobs
    </p>`;

  return emailWrapper(content);
}

export function buildContractGetekendEmailHtml(params: {
  medewerkerNaam: string;
  contractTitel: string;
  contractNummer: string;
}): string {
  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Beste ${params.medewerkerNaam},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Goed nieuws! Je contract is door beide partijen ondertekend en nu actief.
    </p>
    ${infoBlock([
      { label: "Contract", value: params.contractTitel },
      { label: "Contractnummer", value: params.contractNummer },
      { label: "Status", value: "Actief" },
    ])}
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Je kunt je contract altijd terugvinden in je medewerkerportaal.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">
      Met vriendelijke groet,<br>
      Team TopTalent Jobs
    </p>`;

  return emailWrapper(content);
}
