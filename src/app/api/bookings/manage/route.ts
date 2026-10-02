import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  deleteGoogleCalendarEvent,
  isGoogleCalendarConfigured,
} from "@/lib/google-calendar";
import { sendEmail } from "@/lib/email-service";
import {
  buildCancellationEmailHtml,
  buildRescheduleEmailHtml,
} from "@/lib/email-templates";
import { captureRouteError } from "@/lib/sentry-utils";
import { maakBoeking, stuurBoekingMails } from "@/lib/bookings/aanmaken";
import { geldigeSource } from "@/lib/bookings/regels";

// Tokens are crypto.randomBytes(32).toString('hex') = exactly 64 hex chars.
// Strict validation prevents PostgREST .or() filter injection.
const TOKEN_RE = /^[0-9a-f]{64}$/i;

const BOOKING_SELECT =
  "id, client_name, client_email, client_phone, company_name, notes, status, " +
  "cancellation_token, reschedule_token, event_type_id, google_calendar_event_id, inquiry_id, " +
  "source, booking_type, kandidaat_naam, kandidaat_email, kandidaat_telefoon, kandidaat_cv_url, " +
  "kandidaat_notities, inschrijving_id, " +
  "availability_slots(id, date, start_time, end_time), event_types(name, duration_minutes, color)";

async function findBookingByToken(token: string) {
  // Two separate parameterised .eq() calls instead of .or() string interpolation.
  // maybeSingle() returns null (not an error) when no row is found.
  const [byCancelToken, byRescheduleToken] = await Promise.all([
    supabaseAdmin.from("bookings").select(BOOKING_SELECT).eq("cancellation_token", token).maybeSingle(),
    supabaseAdmin.from("bookings").select(BOOKING_SELECT).eq("reschedule_token", token).maybeSingle(),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (byCancelToken.data ?? byRescheduleToken.data ?? null) as any;
}

// GET: Ophalen van booking details via token
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token || !TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Token vereist" }, { status: 400 });
  }

  const booking = await findBookingByToken(token);

  if (!booking) {
    return NextResponse.json({ error: "Boeking niet gevonden" }, { status: 404 });
  }

  const slot = booking.availability_slots as unknown as { id: string; date: string; start_time: string; end_time: string } | null;
  const eventType = booking.event_types as unknown as { name: string; duration_minutes: number; color: string } | null;

  return NextResponse.json({
    booking: {
      id: booking.id,
      client_name: booking.client_name,
      status: booking.status,
      date: slot?.date,
      start_time: slot?.start_time?.slice(0, 5),
      end_time: slot?.end_time?.slice(0, 5),
      event_type_name: eventType?.name || "Afspraak",
      can_cancel: booking.status === "confirmed",
      can_reschedule: booking.status === "confirmed",
    },
  });
}

// POST: Cancel or reschedule
export async function POST(request: NextRequest) {
  let body: Record<string, string | undefined>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }
  const { token, action, new_slot_id, new_date, new_start_time, new_end_time } = body;

  if (!token || !TOKEN_RE.test(String(token)) || !action) {
    return NextResponse.json({ error: "Token en actie vereist" }, { status: 400 });
  }

  const booking = await findBookingByToken(token);

  if (!booking) {
    return NextResponse.json({ error: "Boeking niet gevonden" }, { status: 404 });
  }

  if (booking.status !== "confirmed") {
    return NextResponse.json({ error: "Deze afspraak kan niet meer gewijzigd worden" }, { status: 400 });
  }

  const slot = booking.availability_slots as unknown as { id: string; date: string; start_time: string; end_time: string } | null;

  // Haal afzender instellingen op
  const { data: senderSettings } = await supabaseAdmin
    .from("admin_settings")
    .select("key, value")
    .in("key", ["sender_email", "sender_name"]);
  const sMap = Object.fromEntries((senderSettings || []).map((s: { key: string; value: string }) => [s.key, s.value]));
  const senderEmail = sMap.sender_email || "info@toptalentjobs.nl";
  const senderName = sMap.sender_name || "TopTalent Jobs";

  if (action === "cancel") {
    await supabaseAdmin
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: body.reason || null,
      })
      .eq("id", booking.id);

    if (slot) {
      await supabaseAdmin
        .from("availability_slots")
        .update({ is_booked: false, is_available: true })
        .eq("id", slot.id);
    }

    if (booking.google_calendar_event_id && isGoogleCalendarConfigured()) {
      await deleteGoogleCalendarEvent(booking.google_calendar_event_id);
    }

    const datumFormatted = slot ? new Date(slot.date).toLocaleDateString("nl-NL", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    }) : "";

    try {
      await sendEmail({
        from: `${senderName} <${senderEmail}>`,
        to: [booking.client_email],
        subject: `Afspraak geannuleerd — ${senderName}`,
        html: buildCancellationEmailHtml({
          clientName: booking.client_name,
          datumFormatted,
          startTime: slot?.start_time?.slice(0, 5) || "",
          endTime: slot?.end_time?.slice(0, 5) || "",
          senderName,
        }),
      });
    } catch (err) {
      captureRouteError(err, { route: "/api/bookings/manage", action: "POST" });
    }

    try {
      await sendEmail({
        from: `${senderName} <${senderEmail}>`,
        to: [senderEmail],
        subject: `Afspraak geannuleerd: ${booking.client_name}`,
        html: buildCancellationEmailHtml({
          clientName: booking.client_name,
          datumFormatted,
          startTime: slot?.start_time?.slice(0, 5) || "",
          endTime: slot?.end_time?.slice(0, 5) || "",
          senderName,
          isAdmin: true,
          reason: body.reason,
        }),
      });
    } catch (err) {
      captureRouteError(err, { route: "/api/bookings/manage", action: "POST" });
    }

    return NextResponse.json({ success: true, action: "cancelled" });
  }

  if (action === "reschedule") {
    if (!new_slot_id && (!new_date || !new_start_time)) {
      return NextResponse.json({ error: "Nieuw tijdslot vereist" }, { status: 400 });
    }

    // Eerst de nieuwe afspraak maken (met overlapcheck, waarbij de huidige
    // afspraak niet als conflict telt) en pas daarna de oude annuleren. Zo
    // hoeft er niets teruggedraaid te worden als het nieuwe tijdstip bezet is.
    // Source en kandidaatgegevens komen van de originele boeking; vroeger werd
    // `source: "reschedule"` gestuurd (buiten de CHECK) en faalde elke verplaatsing.
    const isKandidaat = booking.booking_type === "kandidaat";
    const resultaat = await maakBoeking(
      {
        slotId: new_slot_id || null,
        eventTypeId: booking.event_type_id || null,
        gevraagdBookingType: isKandidaat ? "kandidaat" : "client",
        datum: new_date || null,
        startTijd: new_start_time || null,
        eindTijd: new_end_time || null,
        clientName: booking.client_name,
        clientEmail: booking.client_email,
        clientPhone: booking.client_phone,
        companyName: booking.company_name,
        notes: booking.notes,
        inquiryId: booking.inquiry_id,
        kandidaatNaam: booking.kandidaat_naam,
        kandidaatEmail: booking.kandidaat_email,
        kandidaatTelefoon: booking.kandidaat_telefoon,
        kandidaatNotities: booking.kandidaat_notities,
        kandidaatCvPad: booking.kandidaat_cv_url,
        inschrijvingId: booking.inschrijving_id,
      },
      {
        source: geldigeSource(booking.source),
        // Een afspraak zonder afspraaktype (door admin gemaakt) houdt zijn eigen duur.
        eigenEindtijdToegestaan: !booking.event_type_id,
        negeerBookingId: booking.id,
      },
    );

    if (!resultaat.ok) {
      return NextResponse.json({ error: resultaat.error || "Kon niet verplaatsen" }, { status: resultaat.status });
    }

    await supabaseAdmin
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: "Verplaatst naar nieuw tijdstip",
      })
      .eq("id", booking.id);

    if (slot) {
      await supabaseAdmin
        .from("availability_slots")
        .update({ is_booked: false, is_available: true })
        .eq("id", slot.id);
    }

    if (booking.google_calendar_event_id && isGoogleCalendarConfigured()) {
      await deleteGoogleCalendarEvent(booking.google_calendar_event_id);
    }

    await supabaseAdmin
      .from("bookings")
      .update({ rescheduled_from: booking.id })
      .eq("id", resultaat.booking.id);

    // Melding naar TopTalent; de klant krijgt hieronder de verplaatsmail.
    await stuurBoekingMails(resultaat.context, { klant: false, admin: true });

    const bookData = { booking: resultaat.booking };

    if (bookData.booking) {
      try {
        await sendEmail({
          from: `${senderName} <${senderEmail}>`,
          to: [booking.client_email],
          subject: `Afspraak verplaatst — ${senderName}`,
          html: buildRescheduleEmailHtml({
            clientName: booking.client_name,
            oldDatum: slot ? new Date(slot.date).toLocaleDateString("nl-NL", {
              weekday: "long", day: "numeric", month: "long",
            }) : "",
            oldTijd: slot ? `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}` : "",
            newDatum: bookData.booking.datum_formatted,
            newTijd: `${bookData.booking.start_time} - ${bookData.booking.end_time}`,
            senderName,
            manageUrl: bookData.booking.manage_url,
          }),
        });
      } catch (err) {
        captureRouteError(err, { route: "/api/bookings/manage", action: "POST" });
      }
    }

    return NextResponse.json({
      success: true,
      action: "rescheduled",
      new_booking: bookData.booking,
    });
  }

  return NextResponse.json({ error: "Ongeldige actie" }, { status: 400 });
}
