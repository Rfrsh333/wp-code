/**
 * Herbruikbare HTML email templates voor TopTalent Jobs
 */

const BRAND_COLOR = "#F27501";
const BRAND_GRADIENT = "linear-gradient(135deg, #F27501 0%, #d96800 100%)";

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
}): string {
  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Beste ${params.clientName},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #333;">Graag herinneren we je aan je afspraak met TopTalent Jobs morgen.</p>
    ${infoBlock([
      { label: "Datum", value: params.datumFormatted },
      { label: "Tijd", value: `${params.startTime} - ${params.endTime}` },
    ])}
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
