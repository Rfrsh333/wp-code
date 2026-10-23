import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { createGoogleCalendarEvent, isGoogleCalendarConfigured } from "@/lib/google-calendar";
import { sendEmail } from "@/lib/email-service";
import {
  buildBookingConfirmationHtml,
  buildBookingNotificationHtml,
  buildKandidaatBookingBevestiging,
  buildKandidaatBookingNotificatie,
} from "@/lib/email-templates";
import { captureRouteError } from "@/lib/sentry-utils";
import {
  BEZETTENDE_STATUSSEN,
  DATUM_RE,
  TIJD_RE,
  berekenEindtijd,
  tijdNaarMinuten,
  vindOverlap,
  volledigeTijd,
  type BookingSource,
} from "@/lib/bookings/regels";

/**
 * Eén plek om een afspraak aan te maken, gebruikt door POST /api/bookings
 * (website + admin-agenda) en door het verplaatsen via /api/bookings/manage.
 *
 * Verplaatsen deed vroeger een fetch naar de eigen publieke route met
 * `source: "reschedule"` (buiten de CHECK → insert faalde altijd) en zonder
 * booking_type/kandidaatgegevens. Nu roept die route deze functie direct aan.
 */

export interface BoekingInvoer {
  slotId?: string | null;
  eventTypeId?: string | null;
  /** Alleen gebruikt als er geen event type is te bepalen (kandidaat zonder id). */
  gevraagdBookingType?: "client" | "kandidaat";
  datum?: string | null;
  startTijd?: string | null;
  /** Alleen gerespecteerd als `eigenEindtijdToegestaan` (admin-agenda). */
  eindTijd?: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  companyName?: string | null;
  notes?: string | null;
  inquiryId?: string | null;
  kandidaatNaam?: string | null;
  kandidaatEmail?: string | null;
  kandidaatTelefoon?: string | null;
  kandidaatNotities?: string | null;
  /** Opslagpad in bucket kandidaat-documenten (geen signed URL — die verloopt). */
  kandidaatCvPad?: string | null;
  inschrijvingId?: string | null;
}

export interface BoekingOpties {
  /** Door de server bepaald, nooit uit de request body. */
  source: BookingSource;
  /** Admin mag een afwijkende eindtijd kiezen; publiek krijgt altijd de duur van het type. */
  eigenEindtijdToegestaan: boolean;
  /** Bij verplaatsen: de oude boeking telt niet als conflict. */
  negeerBookingId?: string | null;
}

interface EventTypeRij {
  id: string;
  name: string;
  duration_minutes: number;
  booking_type: string | null;
  is_active: boolean;
}

export interface AangemaakteBoeking {
  id: string;
  datum: string;
  datum_formatted: string;
  start_time: string;
  end_time: string;
  client_name: string;
  cancellation_token: string;
  manage_url: string;
  booking_type: "client" | "kandidaat";
  meet_link?: string;
}

export type BoekingResultaat =
  | { ok: true; booking: AangemaakteBoeking; isKandidaat: boolean; context: MailContext }
  | { ok: false; status: number; error: string };

export interface MailContext {
  bookingId: string;
  isKandidaat: boolean;
  naam: string;
  email: string;
  telefoon: string | null;
  companyName: string | null;
  notes: string | null;
  inquiryId: string | null;
  inschrijvingId: string | null;
  heeftCv: boolean;
  datumFormatted: string;
  startFormatted: string;
  endFormatted: string;
  meetLink?: string;
  manageUrl: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function fout(status: number, error: string): BoekingResultaat {
  return { ok: false, status, error };
}

async function haalEventType(invoer: BoekingInvoer): Promise<EventTypeRij | null> {
  if (invoer.eventTypeId) {
    if (!UUID_RE.test(invoer.eventTypeId)) return null;
    const { data } = await supabaseAdmin
      .from("event_types")
      .select("id, name, duration_minutes, booking_type, is_active")
      .eq("id", invoer.eventTypeId)
      .maybeSingle();
    return (data as EventTypeRij | null) ?? null;
  }
  // Kennismaking-plannen stuurt geen event_type_id: zelfde keuze als GET ?booking_type=kandidaat.
  if (invoer.gevraagdBookingType === "kandidaat") {
    const { data } = await supabaseAdmin
      .from("event_types")
      .select("id, name, duration_minutes, booking_type, is_active")
      .eq("is_active", true)
      .eq("booking_type", "kandidaat")
      .order("sort_order")
      .order("slug")
      .limit(1)
      .maybeSingle();
    return (data as EventTypeRij | null) ?? null;
  }
  return null;
}

/** Bestaande, niet-geannuleerde boekingen op een datum als tijdvakken. */
export async function bezetteTijdvakken(
  datum: string,
  negeerBookingId?: string | null,
): Promise<{ bookingId: string; start: string; eind: string }[]> {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id, status, availability_slots!inner(date, start_time, end_time)")
    .in("status", [...BEZETTENDE_STATUSSEN])
    .eq("availability_slots.date", datum);

  if (error) throw error;

  return (data || [])
    .filter((b) => b.id !== negeerBookingId)
    .map((b) => {
      const slot = b.availability_slots as unknown as { start_time: string; end_time: string } | null;
      return slot ? { bookingId: b.id as string, start: slot.start_time, eind: slot.end_time } : null;
    })
    .filter((v): v is { bookingId: string; start: string; eind: string } => v !== null);
}

/**
 * Claimt het slot (date, start_time) atomair: insert als het nog niet bestaat,
 * anders alleen bijwerken als het vrij en beschikbaar is. Twee gelijktijdige
 * boekingen op dezelfde starttijd kunnen zo niet allebei slagen.
 */
async function claimSlot(datum: string, start: string, eind: string): Promise<{ id: string } | { conflict: true } | { error: unknown }> {
  const { data: nieuw, error: insertError } = await supabaseAdmin
    .from("availability_slots")
    .insert({ date: datum, start_time: start, end_time: eind, is_available: false, is_booked: true })
    .select("id")
    .single();

  if (!insertError && nieuw) return { id: nieuw.id };
  if (insertError && insertError.code !== "23505") return { error: insertError };

  // Slot bestaat al (bv. na een annulering vrijgegeven): alleen claimen als het vrij is.
  const { data: geclaimd, error: updateError } = await supabaseAdmin
    .from("availability_slots")
    .update({ end_time: eind, is_available: false, is_booked: true })
    .eq("date", datum)
    .eq("start_time", start)
    .eq("is_booked", false)
    .eq("is_available", true)
    .select("id");

  if (updateError) return { error: updateError };
  if (!geclaimd || geclaimd.length === 0) return { conflict: true };
  return { id: geclaimd[0].id };
}

async function geefSlotVrij(slotId: string) {
  await supabaseAdmin.from("availability_slots").update({ is_booked: false, is_available: true }).eq("id", slotId);
}

export async function maakBoeking(invoer: BoekingInvoer, opties: BoekingOpties): Promise<BoekingResultaat> {
  // 1. Datum + starttijd bepalen (bestaand slot, gegenereerd slot of los opgegeven)
  let datum = invoer.datum ?? null;
  let start = invoer.startTijd ?? null;

  if (invoer.slotId && invoer.slotId.startsWith("gen_")) {
    const [, d, s] = invoer.slotId.split("_");
    datum = d;
    start = s;
  } else if (invoer.slotId) {
    if (!UUID_RE.test(invoer.slotId)) return fout(404, "Tijdslot niet gevonden");
    const { data: slot } = await supabaseAdmin
      .from("availability_slots")
      .select("id, date, start_time, is_available, is_booked")
      .eq("id", invoer.slotId)
      .maybeSingle();
    if (!slot) return fout(404, "Tijdslot niet gevonden");
    if (!slot.is_available || slot.is_booked) {
      return fout(409, "Dit tijdslot is helaas niet meer beschikbaar. Kies een ander tijdstip.");
    }
    datum = slot.date;
    start = slot.start_time;
  }

  if (!datum || !start || !DATUM_RE.test(datum) || !TIJD_RE.test(start)) {
    return fout(400, "Tijdslot of datum/tijd zijn vereist");
  }
  start = volledigeTijd(start);

  // 2. Afspraaktype → duur en soort (klant/kandidaat) server-side bepalen
  const eventType = await haalEventType(invoer);
  if (invoer.eventTypeId && (!eventType || !eventType.is_active)) {
    return fout(400, "Afspraaktype niet gevonden");
  }
  if (!eventType && !opties.eigenEindtijdToegestaan) {
    return fout(400, "Kies een afspraaktype");
  }
  const isKandidaat = eventType ? eventType.booking_type === "kandidaat" : invoer.gevraagdBookingType === "kandidaat";

  let eind: string | null = null;
  if (opties.eigenEindtijdToegestaan && invoer.eindTijd && TIJD_RE.test(invoer.eindTijd)) {
    eind = volledigeTijd(invoer.eindTijd);
  } else {
    const eindKort = berekenEindtijd(start, eventType?.duration_minutes ?? 60);
    eind = eindKort ? volledigeTijd(eindKort) : null;
  }
  if (!eind || tijdNaarMinuten(eind) <= tijdNaarMinuten(start)) {
    return fout(400, "Ongeldige eindtijd");
  }

  // 3. Overlapcheck op alle niet-geannuleerde boekingen van die dag
  try {
    const bezet = await bezetteTijdvakken(datum, opties.negeerBookingId);
    if (vindOverlap({ start, eind }, bezet)) {
      return fout(409, "Dit tijdslot is helaas niet meer beschikbaar. Kies een ander tijdstip.");
    }
  } catch (err) {
    captureRouteError(err, { route: "/api/bookings", action: "overlapcheck" });
    return fout(500, "Kon beschikbaarheid niet controleren");
  }

  // 4. Slot claimen
  const claim = await claimSlot(datum, start, eind);
  if ("error" in claim) {
    captureRouteError(claim.error, { route: "/api/bookings", action: "claimSlot" });
    return fout(500, "Kon boeking niet aanmaken");
  }
  if ("conflict" in claim) {
    return fout(409, "Dit tijdslot is helaas niet meer beschikbaar. Kies een ander tijdstip.");
  }
  const slotId = claim.id;

  // 5. Boeking opslaan
  const cancellationToken = generateToken();
  const rescheduleToken = generateToken();
  const naam = isKandidaat ? (invoer.kandidaatNaam || invoer.clientName) : invoer.clientName;
  const email = isKandidaat ? (invoer.kandidaatEmail || invoer.clientEmail) : invoer.clientEmail;
  const telefoon = (isKandidaat ? invoer.kandidaatTelefoon || invoer.clientPhone : invoer.clientPhone) || null;
  const notes = (isKandidaat ? invoer.kandidaatNotities || invoer.notes : invoer.notes) || null;
  const inquiryId = invoer.inquiryId && UUID_RE.test(invoer.inquiryId) ? invoer.inquiryId : null;
  const inschrijvingId = invoer.inschrijvingId && UUID_RE.test(invoer.inschrijvingId) ? invoer.inschrijvingId : null;

  const bookingInsert: Record<string, unknown> = {
    slot_id: slotId,
    event_type_id: eventType?.id ?? null,
    inquiry_id: inquiryId,
    client_name: naam,
    client_email: email,
    client_phone: telefoon,
    company_name: invoer.companyName || null,
    notes,
    status: "confirmed",
    cancellation_token: cancellationToken,
    reschedule_token: rescheduleToken,
    source: opties.source,
    booking_type: isKandidaat ? "kandidaat" : "client",
  };

  if (isKandidaat) {
    bookingInsert.kandidaat_naam = naam;
    bookingInsert.kandidaat_email = email;
    bookingInsert.kandidaat_telefoon = telefoon;
    // Kolom heet _url maar bevat het opslagpad; de admin vraagt bij openen een
    // vers gesigneerde URL op (/api/admin/bookings/cv).
    bookingInsert.kandidaat_cv_url = invoer.kandidaatCvPad || null;
    bookingInsert.kandidaat_notities = notes;
    bookingInsert.inschrijving_id = inschrijvingId;
  }

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .insert(bookingInsert)
    .select("id")
    .single();

  if (bookingError || !booking) {
    await geefSlotVrij(slotId);
    captureRouteError(bookingError, { route: "/api/bookings", action: "POST" });
    return fout(500, "Kon boeking niet aanmaken");
  }

  if (inquiryId) {
    await supabaseAdmin.from("personeel_aanvragen").update({ booking_id: booking.id }).eq("id", inquiryId);
  }

  // 6. Google Calendar (fouten zijn niet fataal)
  let meetLink: string | undefined;
  if (isGoogleCalendarConfigured()) {
    try {
      const calResult = await createGoogleCalendarEvent({
        summary: isKandidaat
          ? `Kennismaking: ${naam}`
          : `Gesprek: ${naam}${invoer.companyName ? ` (${invoer.companyName})` : ""}`,
        description: isKandidaat
          ? [
              `Kandidaat: ${naam}`,
              `Email: ${email}`,
              telefoon ? `Telefoon: ${telefoon}` : "",
              notes ? `\nNotities: ${notes}` : "",
              invoer.kandidaatCvPad ? `\nCV: geüpload (te openen via de admin-agenda)` : "",
            ].filter(Boolean).join("\n")
          : [
              `Klant: ${naam}`,
              invoer.companyName ? `Bedrijf: ${invoer.companyName}` : "",
              `Email: ${email}`,
              telefoon ? `Telefoon: ${telefoon}` : "",
              notes ? `\nNotities: ${notes}` : "",
            ].filter(Boolean).join("\n"),
        startDateTime: `${datum}T${start}`,
        endDateTime: `${datum}T${eind}`,
        attendeeEmail: email,
        addMeetLink: true,
      });

      if (calResult.eventId) {
        const updateData: Record<string, unknown> = { google_calendar_event_id: calResult.eventId };
        if (calResult.meetLink) {
          updateData.google_meet_link = calResult.meetLink;
          meetLink = calResult.meetLink;
        }
        await supabaseAdmin.from("bookings").update(updateData).eq("id", booking.id);
      }
    } catch (calErr) {
      captureRouteError(calErr, { route: "/api/bookings", action: "google-calendar" });
    }
  }

  const datumFormatted = new Date(`${datum}T12:00:00`).toLocaleDateString("nl-NL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const startFormatted = start.slice(0, 5);
  const endFormatted = eind.slice(0, 5);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";
  const manageUrl = `${baseUrl}/afspraak/${cancellationToken}`;

  return {
    ok: true,
    isKandidaat,
    booking: {
      id: booking.id,
      datum,
      datum_formatted: datumFormatted,
      start_time: startFormatted,
      end_time: endFormatted,
      client_name: naam,
      cancellation_token: cancellationToken,
      manage_url: manageUrl,
      booking_type: isKandidaat ? "kandidaat" : "client",
      ...(meetLink ? { meet_link: meetLink } : {}),
    },
    context: {
      bookingId: booking.id,
      isKandidaat,
      naam,
      email,
      telefoon,
      companyName: invoer.companyName || null,
      notes,
      inquiryId,
      inschrijvingId,
      heeftCv: Boolean(invoer.kandidaatCvPad),
      datumFormatted,
      startFormatted,
      endFormatted,
      meetLink,
      manageUrl,
    },
  };
}

/**
 * Bevestiging naar klant/kandidaat en melding naar TopTalent.
 * Bij verplaatsen alleen de admin-melding (de klant krijgt een verplaatsmail).
 */
export async function stuurBoekingMails(ctx: MailContext, wie: { klant: boolean; admin: boolean }) {
  const { data: senderSettings } = await supabaseAdmin
    .from("admin_settings")
    .select("key, value")
    .in("key", ["sender_email", "sender_name"]);
  const sMap = Object.fromEntries((senderSettings || []).map((s) => [s.key, s.value]));
  const senderEmail = sMap.sender_email || "info@toptalentjobs.nl";
  const senderName = sMap.sender_name || "TopTalent Jobs";
  const tijd = `${ctx.startFormatted} - ${ctx.endFormatted}`;

  if (wie.klant) {
    try {
      const { error } = await sendEmail({
        from: `${senderName} <${senderEmail}>`,
        to: [ctx.email],
        subject: ctx.isKandidaat ? "Je kennismakingsgesprek is bevestigd" : `Je afspraak met ${senderName} is bevestigd`,
        html: ctx.isKandidaat
          ? buildKandidaatBookingBevestiging({
              naam: ctx.naam,
              datum: ctx.datumFormatted,
              tijd,
              meetLink: ctx.meetLink,
              annuleringsLink: ctx.manageUrl,
            })
          : buildBookingConfirmationHtml({
              clientName: ctx.naam,
              datumFormatted: ctx.datumFormatted,
              startTime: ctx.startFormatted,
              endTime: ctx.endFormatted,
              senderName,
              notes: ctx.notes ?? undefined,
              manageUrl: ctx.manageUrl,
            }),
      });
      if (error) {
        captureRouteError(error, { route: "/api/bookings", action: "bevestigingsmail" });
      } else {
        await supabaseAdmin.from("bookings").update({ confirmation_email_sent: true }).eq("id", ctx.bookingId);
      }
    } catch (emailErr) {
      captureRouteError(emailErr, { route: "/api/bookings", action: "bevestigingsmail" });
    }
  }

  if (wie.admin) {
    try {
      await sendEmail({
        from: `${senderName} <${senderEmail}>`,
        to: [senderEmail],
        subject: ctx.isKandidaat
          ? `Nieuw kennismakingsgesprek: ${ctx.naam} op ${ctx.datumFormatted}`
          : `Nieuwe afspraak: ${ctx.naam} op ${ctx.datumFormatted}`,
        html: ctx.isKandidaat
          ? buildKandidaatBookingNotificatie({
              kandidaatNaam: ctx.naam,
              email: ctx.email,
              telefoon: ctx.telefoon ?? undefined,
              cvGeupload: ctx.heeftCv,
              inschrijvingId: ctx.inschrijvingId ?? undefined,
              meetLink: ctx.meetLink,
              datum: ctx.datumFormatted,
              tijd,
            })
          : buildBookingNotificationHtml({
              clientName: ctx.naam,
              clientEmail: ctx.email,
              clientPhone: ctx.telefoon ?? undefined,
              companyName: ctx.companyName ?? undefined,
              datumFormatted: ctx.datumFormatted,
              startTime: ctx.startFormatted,
              endTime: ctx.endFormatted,
              notes: ctx.notes ?? undefined,
              inquiryId: ctx.inquiryId ?? undefined,
            }),
      });
    } catch (emailErr) {
      captureRouteError(emailErr, { route: "/api/bookings", action: "adminmelding" });
    }
  }
}
