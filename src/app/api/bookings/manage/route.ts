import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  deleteGoogleCalendarEvent,
  isGoogleCalendarConfigured,
  createGoogleCalendarEvent,
} from "@/lib/google-calendar";
import { sendEmail } from "@/lib/email-service";
import {
  buildCancellationEmailHtml,
  buildRescheduleEmailHtml,
} from "@/lib/email-templates";
import { captureRouteError } from "@/lib/sentry-utils";

// GET: Ophalen van booking details via token
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token vereist" }, { status: 400 });
  }

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, client_name, client_email, client_phone, company_name, notes, status, cancellation_token, reschedule_token, event_type_id, availability_slots(id, date, start_time, end_time), event_types(name, duration_minutes, color)")
    .or(`cancellation_token.eq.${token},reschedule_token.eq.${token}`)
    .single();

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
  const body = await request.json();
  const { token, action, new_slot_id, new_date, new_start_time, new_end_time } = body;

  if (!token || !action) {
    return NextResponse.json({ error: "Token en actie vereist" }, { status: 400 });
  }

  // Zoek de booking
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("*, availability_slots(id, date, start_time, end_time)")
    .or(`cancellation_token.eq.${token},reschedule_token.eq.${token}`)
    .single();

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
    // Annuleer de boeking
    await supabaseAdmin
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: body.reason || null,
      })
      .eq("id", booking.id);

    // Maak het slot weer beschikbaar
    if (slot) {
      await supabaseAdmin
        .from("availability_slots")
        .update({ is_booked: false, is_available: true })
        .eq("id", slot.id);
    }

    // Verwijder Google Calendar event
    if (booking.google_calendar_event_id && isGoogleCalendarConfigured()) {
      await deleteGoogleCalendarEvent(booking.google_calendar_event_id);
    }

    // Stuur annuleringsmail
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
        // console.error("Cancellation email error:", err);
      }

      // Notificatie naar admin
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
        // console.error("Admin cancellation notification error:", err);
      }

    return NextResponse.json({ success: true, action: "cancelled" });
  }

  if (action === "reschedule") {
    if (!new_slot_id && (!new_date || !new_start_time)) {
      return NextResponse.json({ error: "Nieuw tijdslot vereist" }, { status: 400 });
    }

    // Maak het oude slot weer beschikbaar
    if (slot) {
      await supabaseAdmin
        .from("availability_slots")
        .update({ is_booked: false, is_available: true })
        .eq("id", slot.id);
    }

    // Verwijder oud Google Calendar event
    if (booking.google_calendar_event_id && isGoogleCalendarConfigured()) {
      await deleteGoogleCalendarEvent(booking.google_calendar_event_id);
    }

    // Markeer oude booking als cancelled (met verwijzing)
    await supabaseAdmin
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: "Verplaatst naar nieuw tijdstip",
      })
      .eq("id", booking.id);

    // Maak nieuwe booking aan via dezelfde flow
    const bookRes = await fetch(new URL("/api/bookings", request.url).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slot_id: new_slot_id,
        event_type_id: booking.event_type_id,
        date: new_date,
        start_time: new_start_time,
        end_time: new_end_time,
        client_name: booking.client_name,
        client_email: booking.client_email,
        client_phone: booking.client_phone,
        company_name: booking.company_name,
        notes: booking.notes,
        inquiry_id: booking.inquiry_id,
        source: "reschedule",
      }),
    });

    const bookData = await bookRes.json();

    if (!bookData.success) {
      // Rollback: herstel de originele booking
      await supabaseAdmin
        .from("bookings")
        .update({ status: "confirmed", cancelled_at: null, cancel_reason: null })
        .eq("id", booking.id);
      if (slot) {
        await supabaseAdmin
          .from("availability_slots")
          .update({ is_booked: true, is_available: false })
          .eq("id", slot.id);
      }
      return NextResponse.json({ error: bookData.error || "Kon niet verplaatsen" }, { status: 500 });
    }

    // Update de nieuwe booking met rescheduled_from
    if (bookData.booking?.id) {
      await supabaseAdmin
        .from("bookings")
        .update({ rescheduled_from: booking.id })
        .eq("id", bookData.booking.id);
    }

    // Stuur reschedule bevestigingsmail
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
        // console.error("Reschedule email error:", err);
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
