import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRedisRateLimit, getClientIP, formRateLimit } from "@/lib/rate-limit-redis";
import { captureRouteError } from "@/lib/sentry-utils";
import { verifyAdmin } from "@/lib/admin-auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { maakBoeking, stuurBoekingMails } from "@/lib/bookings/aanmaken";
import { BEZETTENDE_STATUSSEN, tijdvakkenOverlappen } from "@/lib/bookings/regels";

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
      .order("sort_order")
      .order("slug"); // vaste volgorde bij gelijke sort_order (zelfde keuze als lib/bookings/aanmaken)

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

      // /afspraak-plannen is de klantpagina: kandidaattypes horen daar niet in
      // de keuzelijst (kandidaten boeken via /kennismaking-plannen, dat
      // ?booking_type=kandidaat gebruikt).
      return NextResponse.json({
        event_types: ((eventTypes as EventType[]) || []).filter((et) => et.booking_type !== "kandidaat"),
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

    // Haal bestaande boekingen op (voor conflict check): alle niet-geannuleerde
    // boekingen binnen de horizon, ongeacht het afspraaktype.
    const { data: existingBookings } = await supabaseAdmin
      .from("bookings")
      .select("id, slot_id, status, availability_slots!inner(date, start_time, end_time)")
      .in("status", [...BEZETTENDE_STATUSSEN])
      .gte("availability_slots.date", todayStr)
      .lte("availability_slots.date", endStr)
      .limit(1000);

    const bezetPerDag = new Map<string, { start: string; eind: string }[]>();
    for (const b of existingBookings || []) {
      const slot = b.availability_slots as unknown as { date: string; start_time: string; end_time: string } | null;
      if (!slot) continue;
      const lijst = bezetPerDag.get(slot.date) || [];
      lijst.push({ start: slot.start_time, eind: slot.end_time });
      bezetPerDag.set(slot.date, lijst);
    }

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

            // Bezet als het exacte slot geboekt is óf als het tijdvak overlapt
            // met een boeking van een (ander) afspraaktype.
            const overlaptBoeking = (bezetPerDag.get(dateStr) || []).some((b) =>
              tijdvakkenOverlappen({ start: slotStart, eind: slotEnd }, b),
            );
            const isBooked = existingSlot?.is_booked || overlaptBoeking;
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
    captureRouteError(error, { route: "/api/bookings", action: "GET" });
    // console.error("Bookings GET error:", error);
    return NextResponse.json({ error: "Kon slots niet ophalen" }, { status: 500 });
  }
}

// POST: Afspraak boeken
//
// Publiek (afspraak-plannen, kennismaking-plannen): reCAPTCHA verplicht,
// source = "website", duur uit event_types. Admin-agenda (Bearer-token van een
// admin): geen captcha, source = "admin", eigen eindtijd toegestaan.
// `source` uit de body wordt nooit vertrouwd.
export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRedisRateLimit(`booking:${clientIP}`, formRateLimit);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Te veel boekingen. Probeer het later opnieuw." }, { status: 429 });
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
    }
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

    const { isAdmin } = await verifyAdmin(request);

    if (!isAdmin) {
      const recaptchaToken = str(body.recaptchaToken);
      if (!recaptchaToken) {
        return NextResponse.json({ error: "reCAPTCHA verificatie vereist" }, { status: 400 });
      }
      const recaptchaResult = await verifyRecaptcha(recaptchaToken);
      if (!recaptchaResult.success) {
        return NextResponse.json({ error: recaptchaResult.error || "Spam detectie mislukt" }, { status: 400 });
      }
    }

    const clientName = str(body.client_name) ?? str(body.kandidaat_naam);
    const clientEmail = str(body.client_email) ?? str(body.kandidaat_email);
    if (!clientName || !clientEmail) {
      return NextResponse.json({ error: "Naam en e-mailadres zijn vereist" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail) || clientEmail.length > 255 || clientName.length > 200) {
      return NextResponse.json({ error: "Ongeldig e-mailadres of naam" }, { status: 400 });
    }

    const resultaat = await maakBoeking(
      {
        slotId: str(body.slot_id),
        eventTypeId: str(body.event_type_id),
        gevraagdBookingType: body.booking_type === "kandidaat" ? "kandidaat" : "client",
        datum: str(body.date),
        startTijd: str(body.start_time),
        eindTijd: str(body.end_time),
        clientName,
        clientEmail,
        clientPhone: str(body.client_phone),
        companyName: str(body.company_name),
        notes: str(body.notes)?.slice(0, 2000) ?? null,
        inquiryId: str(body.inquiry_id),
        kandidaatNaam: str(body.kandidaat_naam),
        kandidaatEmail: str(body.kandidaat_email),
        kandidaatTelefoon: str(body.kandidaat_telefoon),
        kandidaatNotities: str(body.kandidaat_notities)?.slice(0, 2000) ?? null,
        // Alleen een pad uit /api/cv-upload accepteren (geen willekeurige URL's).
        kandidaatCvPad: (() => {
          const pad = str(body.kandidaat_cv_pad);
          return pad && /^cv\/[A-Za-z0-9._-]+$/.test(pad) ? pad : null;
        })(),
        inschrijvingId: str(body.inschrijving_id),
      },
      {
        source: isAdmin ? "admin" : "website",
        eigenEindtijdToegestaan: isAdmin,
      },
    );

    if (!resultaat.ok) {
      return NextResponse.json({ error: resultaat.error }, { status: resultaat.status });
    }

    await stuurBoekingMails(resultaat.context, { klant: true, admin: true });

    return NextResponse.json({ success: true, booking: resultaat.booking });
  } catch (error) {
    captureRouteError(error, { route: "/api/bookings", action: "POST" });
    // console.error("Booking POST error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
