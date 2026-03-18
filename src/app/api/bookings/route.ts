import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  createGoogleCalendarEvent,
  isGoogleCalendarConfigured,
} from "@/lib/google-calendar";
import { Resend } from "resend";
import {
  buildBookingConfirmationHtml,
  buildBookingNotificationHtml,
  buildKandidaatBookingBevestiging,
  buildKandidaatBookingNotificatie,
} from "@/lib/email-templates";
import { randomBytes } from "crypto";
import { checkRedisRateLimit, getClientIP, formRateLimit } from "@/lib/rate-limit-redis";

interface EventType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  color: string;
  is_active: boolean;
  max_bookings_per_day: number | null;
  confirmation_message: string | null;
  booking_type?: "client" | "kandidaat";
}

interface ScheduleRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface OverrideRow {
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_blocked: boolean;
}

interface SlotRow {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_booked: boolean;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// GET: Beschikbare slots ophalen voor de booking pagina
export async function GET(request: NextRequest) {
  const eventTypeSlug = request.nextUrl.searchParams.get("type");
  const inquiryId = request.nextUrl.searchParams.get("ref");
  const bookingType = request.nextUrl.searchParams.get("booking_type");

  try {
    // Haal event types op
    const { data: eventTypes } = await supabaseAdmin
      .from("event_types")
      .select("id, name, slug, description, duration_minutes, buffer_before_minutes, buffer_after_minutes, color, is_active, max_bookings_per_day, confirmation_message, booking_type, sort_order")
      .eq("is_active", true)
      .order("sort_order");

    // Kandidaat booking type: zoek het kandidaat event type
    if (bookingType === "kandidaat") {
      const kandidaatEventType = (eventTypes as EventType[] || []).find(
        (et) => et.booking_type === "kandidaat",
      );

      if (!kandidaatEventType) {
        return NextResponse.json({ error: "Kandidaat afspraaktype niet gevonden" }, { status: 404 });
      }

      // Redirect to slots fetch with the kandidaat event type slug
      const redirect = new URL(request.url);
      redirect.searchParams.set("type", kandidaatEventType.slug);
      redirect.searchParams.delete("booking_type");
      // Instead of redirect, just set eventTypeSlug and continue
      return GET(new NextRequest(redirect));
    }

    // Als geen specifiek type, geef event types lijst
    if (!eventTypeSlug) {
      // Haal instellingen op voor intro text
      const { data: settings } = await supabaseAdmin
        .from("admin_settings")
        .select("key, value")
        .in("key", ["booking_page_intro_text", "sender_name"]);

      const settingsMap = Object.fromEntries(
        (settings || []).map((s) => [s.key, s.value]),
      );

      let inquiry = null;
      if (inquiryId) {
        const { data } = await supabaseAdmin
          .from("personeel_aanvragen")
          .select("id, contactpersoon, email, telefoon, bedrijfsnaam")
          .eq("id", inquiryId)
          .single();
        inquiry = data;
      }

      return NextResponse.json({
        event_types: eventTypes || [],
        inquiry,
        intro_text: settingsMap.booking_page_intro_text || "",
        sender_name: settingsMap.sender_name || "TopTalent Jobs",
      });
    }

    // Zoek het event type
    const eventType = (eventTypes as EventType[] || []).find(
      (et) => et.slug === eventTypeSlug,
    );
    if (!eventType) {
      return NextResponse.json({ error: "Afspraaktype niet gevonden" }, { status: 404 });
    }

    // Haal instellingen op
    const { data: settings } = await supabaseAdmin
      .from("admin_settings")
      .select("key, value")
      .in("key", ["booking_horizon_days", "booking_page_intro_text", "sender_name"]);

    const settingsMap = Object.fromEntries(
      (settings || []).map((s) => [s.key, s.value]),
    );

    const horizonDays = parseInt(settingsMap.booking_horizon_days || "30");

    // Haal wekelijks schema op
    const { data: schedules } = await supabaseAdmin
      .from("availability_schedules")
      .select("day_of_week, start_time, end_time, is_active")
      .eq("is_active", true);

    // Haal overrides op
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + horizonDays);
    const todayStr = today.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    const { data: overrides } = await supabaseAdmin
      .from("availability_overrides")
      .select("date, start_time, end_time, is_blocked")
      .gte("date", todayStr)
      .lte("date", endStr);

    // Haal bestaande boekingen op (voor conflict check)
    const { data: existingBookings } = await supabaseAdmin
      .from("bookings")
      .select("id, slot_id, status, availability_slots(date, start_time, end_time)")
      .in("status", ["confirmed"])
      .not("slot_id", "is", null)
      .limit(500);

    // Haal bestaande slots op
    const { data: existingSlots } = await supabaseAdmin
      .from("availability_slots")
      .select("id, date, start_time, end_time, is_available, is_booked")
      .gte("date", todayStr)
      .lte("date", endStr)
      .limit(500);

    // Genereer beschikbare slots op basis van schema + overrides
    const slotDuration = eventType.duration_minutes;
    const bufferBefore = eventType.buffer_before_minutes;
    const bufferAfter = eventType.buffer_after_minutes;

    const dagNamen: Record<number, string> = {
      0: "Zondag", 1: "Maandag", 2: "Dinsdag", 3: "Woensdag",
      4: "Donderdag", 5: "Vrijdag", 6: "Zaterdag",
    };

    const days: { datum: string; dag: string; slots: { id: string; start: string; eind: string }[] }[] = [];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const current = new Date(tomorrow);
    while (current <= endDate) {
      const dateStr = current.toISOString().split("T")[0];
      const dayOfWeek = current.getDay();

      // Check overrides voor deze dag
      const dayOverrides = (overrides as OverrideRow[] || []).filter(
        (o) => o.date === dateStr,
      );
      const isFullDayBlocked = dayOverrides.some(
        (o) => o.is_blocked && !o.start_time,
      );

      if (!isFullDayBlocked) {
        // Vind het schema voor deze dag
        const daySchedule = (schedules as ScheduleRow[] || []).find(
          (s) => s.day_of_week === dayOfWeek,
        );

        if (daySchedule) {
          const startMin = timeToMinutes(daySchedule.start_time);
          const endMin = timeToMinutes(daySchedule.end_time);

          const daySlots: { id: string; start: string; eind: string }[] = [];

          let time = startMin + bufferBefore;
          while (time + slotDuration <= endMin) {
            const slotStart = minutesToTime(time);
            const slotEnd = minutesToTime(time + slotDuration);

            // Check of dit slot geblokkeerd is door een override
            const isOverrideBlocked = dayOverrides.some((o) => {
              if (!o.is_blocked || !o.start_time || !o.end_time) return false;
              const oStart = timeToMinutes(o.start_time);
              const oEnd = timeToMinutes(o.end_time);
              return time < oEnd && time + slotDuration > oStart;
            });

            // Check of dit slot al geboekt is (via bestaande slots)
            const existingSlot = (existingSlots as SlotRow[] || []).find(
              (s) => s.date === dateStr && s.start_time === slotStart + ":00",
            );

            const isBooked = existingSlot?.is_booked || false;
            const isBlocked = existingSlot && !existingSlot.is_available;

            if (!isOverrideBlocked && !isBooked && !isBlocked) {
              daySlots.push({
                id: existingSlot?.id || `gen_${dateStr}_${slotStart}`,
                start: slotStart,
                eind: slotEnd,
              });
            }

            time += slotDuration + bufferAfter;
          }

          if (daySlots.length > 0) {
            // Check max bookings per day
            if (eventType.max_bookings_per_day) {
              const dayBookingsCount = (existingBookings || []).filter((b) => {
                const slot = b.availability_slots as unknown as { date: string } | null;
                return slot?.date === dateStr;
              }).length;

              if (dayBookingsCount >= eventType.max_bookings_per_day) {
                current.setDate(current.getDate() + 1);
                continue;
              }
            }

            days.push({
              datum: dateStr,
              dag: dagNamen[dayOfWeek],
              slots: daySlots,
            });
          }
        }
      }

      current.setDate(current.getDate() + 1);
    }

    // Inquiry data
    let inquiry = null;
    if (inquiryId) {
      const { data } = await supabaseAdmin
        .from("personeel_aanvragen")
        .select("id, contactpersoon, email, telefoon, bedrijfsnaam")
        .eq("id", inquiryId)
        .single();
      inquiry = data;
    }

    return NextResponse.json({
      event_type: eventType,
      days,
      inquiry,
      intro_text: settingsMap.booking_page_intro_text || "",
      sender_name: settingsMap.sender_name || "TopTalent Jobs",
    });
  } catch (error) {
    console.error("Bookings GET error:", error);
    return NextResponse.json({ error: "Kon slots niet ophalen" }, { status: 500 });
  }
}

// POST: Afspraak boeken
export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRedisRateLimit(`booking:${clientIP}`, formRateLimit);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Te veel boekingen. Probeer het later opnieuw." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const {
      slot_id,
      event_type_id,
      date,
      start_time,
      end_time,
      client_name,
      client_email,
      client_phone,
      company_name,
      notes,
      inquiry_id,
      source = "website",
      booking_type = "client",
      kandidaat_naam,
      kandidaat_email,
      kandidaat_telefoon,
      kandidaat_notities,
      kandidaat_cv_url,
      inschrijving_id,
    } = body;

    const isKandidaat = booking_type === "kandidaat";

    if (!client_name || !client_email) {
      return NextResponse.json(
        { error: "Naam en e-mailadres zijn vereist" },
        { status: 400 },
      );
    }

    if (!slot_id && (!date || !start_time || !end_time)) {
      return NextResponse.json(
        { error: "Tijdslot of datum/tijd zijn vereist" },
        { status: 400 },
      );
    }

    let actualSlotId = slot_id;
    let slotDate = date;
    let slotStartTime = start_time;
    let slotEndTime = end_time;

    // Als er een bestaand slot_id is, gebruik dat
    if (slot_id && !slot_id.startsWith("gen_")) {
      const { data: slot, error: slotError } = await supabaseAdmin
        .from("availability_slots")
        .select("id, date, start_time, end_time, is_available, is_booked")
        .eq("id", slot_id)
        .single();

      if (slotError || !slot) {
        return NextResponse.json({ error: "Tijdslot niet gevonden" }, { status: 404 });
      }

      if (!slot.is_available || slot.is_booked) {
        return NextResponse.json(
          { error: "Dit tijdslot is helaas niet meer beschikbaar. Kies een ander tijdstip." },
          { status: 409 },
        );
      }

      slotDate = slot.date;
      slotStartTime = slot.start_time;
      slotEndTime = slot.end_time;

      // Markeer slot als geboekt
      await supabaseAdmin
        .from("availability_slots")
        .update({ is_booked: true, is_available: false })
        .eq("id", slot_id);
    } else {
      // Genereer een slot on-the-fly (schema-gebaseerd)
      const targetDate = slot_id?.startsWith("gen_")
        ? slot_id.split("_")[1]
        : date;
      const targetStart = slot_id?.startsWith("gen_")
        ? slot_id.split("_")[2]
        : start_time;
      const targetEnd = end_time;

      slotDate = targetDate;
      slotStartTime = targetStart;
      slotEndTime = targetEnd;

      // Conflict check
      const { data: conflict } = await supabaseAdmin
        .from("availability_slots")
        .select("id")
        .eq("date", targetDate)
        .eq("start_time", targetStart + ":00")
        .eq("is_booked", true)
        .maybeSingle();

      if (conflict) {
        return NextResponse.json(
          { error: "Dit tijdslot is helaas niet meer beschikbaar." },
          { status: 409 },
        );
      }

      // Maak het slot aan
      const { data: newSlot } = await supabaseAdmin
        .from("availability_slots")
        .upsert(
          {
            date: targetDate,
            start_time: targetStart.length === 5 ? targetStart + ":00" : targetStart,
            end_time: (targetEnd || minutesToTime(timeToMinutes(targetStart) + 60)).length === 5
              ? (targetEnd || minutesToTime(timeToMinutes(targetStart) + 60)) + ":00"
              : targetEnd || minutesToTime(timeToMinutes(targetStart) + 60) + ":00",
            is_available: false,
            is_booked: true,
          },
          { onConflict: "date,start_time" },
        )
        .select()
        .single();

      actualSlotId = newSlot?.id || null;
    }

    // Generate tokens
    const cancellationToken = generateToken();
    const rescheduleToken = generateToken();

    // Maak booking aan
    const bookingInsert: Record<string, unknown> = {
      slot_id: actualSlotId,
      event_type_id: event_type_id || null,
      inquiry_id: inquiry_id || null,
      client_name: isKandidaat ? (kandidaat_naam || client_name) : client_name,
      client_email: isKandidaat ? (kandidaat_email || client_email) : client_email,
      client_phone: isKandidaat ? (kandidaat_telefoon || client_phone || null) : (client_phone || null),
      company_name: company_name || null,
      notes: isKandidaat ? (kandidaat_notities || notes || null) : (notes || null),
      status: "confirmed",
      cancellation_token: cancellationToken,
      reschedule_token: rescheduleToken,
      source,
      booking_type: isKandidaat ? "kandidaat" : "client",
    };

    if (isKandidaat) {
      bookingInsert.kandidaat_naam = kandidaat_naam || client_name || null;
      bookingInsert.kandidaat_email = kandidaat_email || client_email || null;
      bookingInsert.kandidaat_telefoon = kandidaat_telefoon || client_phone || null;
      bookingInsert.kandidaat_cv_url = kandidaat_cv_url || null;
      bookingInsert.kandidaat_notities = kandidaat_notities || notes || null;
      bookingInsert.inschrijving_id = inschrijving_id || null;
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert(bookingInsert)
      .select()
      .single();

    if (bookingError || !booking) {
      // Rollback slot
      if (actualSlotId) {
        await supabaseAdmin
          .from("availability_slots")
          .update({ is_booked: false, is_available: true })
          .eq("id", actualSlotId);
      }
      console.error("Booking create error:", bookingError);
      return NextResponse.json({ error: "Kon boeking niet aanmaken" }, { status: 500 });
    }

    // Koppel booking aan aanvraag
    if (inquiry_id) {
      await supabaseAdmin
        .from("personeel_aanvragen")
        .update({ booking_id: booking.id })
        .eq("id", inquiry_id);
    }

    // Google Calendar event aanmaken
    let meetLink: string | undefined;
    if (isGoogleCalendarConfigured()) {
      const startDateTime = `${slotDate}T${slotStartTime}`;
      const endDateTime = `${slotDate}T${slotEndTime}`;

      const bookingName = isKandidaat ? (kandidaat_naam || client_name) : client_name;
      const bookingEmail = isKandidaat ? (kandidaat_email || client_email) : client_email;

      const calResult = await createGoogleCalendarEvent({
        summary: isKandidaat
          ? `Kennismaking: ${bookingName}`
          : `Gesprek: ${bookingName}${company_name ? ` (${company_name})` : ""}`,
        description: isKandidaat
          ? [
              `Kandidaat: ${bookingName}`,
              `Email: ${bookingEmail}`,
              kandidaat_telefoon ? `Telefoon: ${kandidaat_telefoon}` : "",
              kandidaat_notities ? `\nNotities: ${kandidaat_notities}` : "",
              kandidaat_cv_url ? `\nCV: ${kandidaat_cv_url}` : "",
            ].filter(Boolean).join("\n")
          : [
              `Klant: ${client_name}`,
              company_name ? `Bedrijf: ${company_name}` : "",
              `Email: ${client_email}`,
              client_phone ? `Telefoon: ${client_phone}` : "",
              notes ? `\nNotities: ${notes}` : "",
            ].filter(Boolean).join("\n"),
        startDateTime,
        endDateTime,
        attendeeEmail: bookingEmail,
        addMeetLink: true,
      });

      if (calResult.eventId) {
        const updateData: Record<string, unknown> = { google_calendar_event_id: calResult.eventId };
        if (calResult.meetLink) {
          updateData.google_meet_link = calResult.meetLink;
          meetLink = calResult.meetLink;
        }
        await supabaseAdmin
          .from("bookings")
          .update(updateData)
          .eq("id", booking.id);
      }
    }

    // Datum/tijd formatteren
    const datumFormatted = new Date(slotDate).toLocaleDateString("nl-NL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const startFormatted = typeof slotStartTime === "string" ? slotStartTime.slice(0, 5) : "";
    const endFormatted = typeof slotEndTime === "string" ? slotEndTime.slice(0, 5) : "";

    // Haal afzender instellingen op
    const { data: senderSettings } = await supabaseAdmin
      .from("admin_settings")
      .select("key, value")
      .in("key", ["sender_email", "sender_name"]);

    const sMap = Object.fromEntries((senderSettings || []).map((s) => [s.key, s.value]));
    const senderEmail = sMap.sender_email || "info@toptalentjobs.nl";
    const senderName = sMap.sender_name || "TopTalent Jobs";

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";
    const manageUrl = `${baseUrl}/afspraak/${cancellationToken}`;

    // Verstuur bevestigingsmails
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      if (isKandidaat) {
        // Kandidaat bevestigingsmail
        const kNaam = kandidaat_naam || client_name;
        const kEmail = kandidaat_email || client_email;
        try {
          await resend.emails.send({
            from: `${senderName} <${senderEmail}>`,
            to: [kEmail],
            subject: `Je kennismakingsgesprek is bevestigd`,
            html: buildKandidaatBookingBevestiging({
              naam: kNaam,
              datum: datumFormatted,
              tijd: `${startFormatted} - ${endFormatted}`,
              meetLink,
              annuleringsLink: manageUrl,
            }),
          });

          await supabaseAdmin
            .from("bookings")
            .update({ confirmation_email_sent: true })
            .eq("id", booking.id);
        } catch (emailErr) {
          console.error("Kandidaat booking confirmation email error:", emailErr);
        }

        // Admin notificatie
        try {
          await resend.emails.send({
            from: `${senderName} <${senderEmail}>`,
            to: [senderEmail],
            subject: `Nieuw kennismakingsgesprek: ${kNaam} op ${datumFormatted}`,
            html: buildKandidaatBookingNotificatie({
              kandidaatNaam: kNaam,
              email: kEmail,
              telefoon: kandidaat_telefoon || client_phone,
              cvUrl: kandidaat_cv_url,
              inschrijvingId: inschrijving_id,
              meetLink,
              datum: datumFormatted,
              tijd: `${startFormatted} - ${endFormatted}`,
            }),
          });
        } catch (emailErr) {
          console.error("Kandidaat booking notification email error:", emailErr);
        }
      } else {
        // Klant bevestigingsmail
        try {
          await resend.emails.send({
            from: `${senderName} <${senderEmail}>`,
            to: [client_email],
            subject: `Je afspraak met ${senderName} is bevestigd`,
            html: buildBookingConfirmationHtml({
              clientName: client_name,
              datumFormatted,
              startTime: startFormatted,
              endTime: endFormatted,
              senderName,
              notes,
              manageUrl,
            }),
          });

          await supabaseAdmin
            .from("bookings")
            .update({ confirmation_email_sent: true })
            .eq("id", booking.id);
        } catch (emailErr) {
          console.error("Booking confirmation email error:", emailErr);
        }

        try {
          await resend.emails.send({
            from: `${senderName} <${senderEmail}>`,
            to: [senderEmail],
            subject: `Nieuwe afspraak: ${client_name} op ${datumFormatted}`,
            html: buildBookingNotificationHtml({
              clientName: client_name,
              clientEmail: client_email,
              clientPhone: client_phone,
              companyName: company_name,
              datumFormatted,
              startTime: startFormatted,
              endTime: endFormatted,
              notes,
              inquiryId: inquiry_id,
            }),
          });
        } catch (emailErr) {
          console.error("Booking notification email error:", emailErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        datum: slotDate,
        datum_formatted: datumFormatted,
        start_time: startFormatted,
        end_time: endFormatted,
        client_name: isKandidaat ? (kandidaat_naam || client_name) : client_name,
        cancellation_token: cancellationToken,
        manage_url: manageUrl,
        booking_type: isKandidaat ? "kandidaat" : "client",
        ...(meetLink ? { meet_link: meetLink } : {}),
      },
    });
  } catch (error) {
    console.error("Booking POST error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
