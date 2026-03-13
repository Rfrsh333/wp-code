import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  createGoogleCalendarEvent,
  isGoogleCalendarConfigured,
  generateSlots,
  syncGoogleCalendarToSlots,
} from "@/lib/google-calendar";

interface SlotRow {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_booked: boolean;
}

// GET: Beschikbare slots ophalen voor de booking pagina
export async function GET(request: NextRequest) {
  const inquiryId = request.nextUrl.searchParams.get("ref");

  try {
    // Haal instellingen op
    const { data: settings } = await supabaseAdmin
      .from("admin_settings")
      .select("key, value")
      .in("key", [
        "booking_horizon_days",
        "booking_page_intro_text",
        "slot_duration_minutes",
        "sender_name",
      ]);

    const settingsMap = Object.fromEntries(
      (settings || []).map((s) => [s.key, s.value]),
    );

    const horizonDays = parseInt(settingsMap.booking_horizon_days || "14");

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + horizonDays);

    // Zorg dat slots bestaan voor deze periode
    const fromStr = today.toISOString().split("T")[0];
    const toStr = endDate.toISOString().split("T")[0];
    await generateSlots(fromStr, toStr);

    // Sync met Google Calendar als geconfigureerd
    if (isGoogleCalendarConfigured()) {
      await syncGoogleCalendarToSlots();
    }

    // Haal beschikbare slots op (morgen+, niet vandaag)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: slots } = await supabaseAdmin
      .from("availability_slots")
      .select("id, date, start_time, end_time, is_available, is_booked")
      .gte("date", tomorrowStr)
      .lte("date", toStr)
      .eq("is_available", true)
      .eq("is_booked", false)
      .order("date")
      .order("start_time");

    // Groepeer per dag
    const dagNamen: Record<number, string> = {
      0: "Zondag", 1: "Maandag", 2: "Dinsdag", 3: "Woensdag",
      4: "Donderdag", 5: "Vrijdag", 6: "Zaterdag",
    };

    const grouped: Record<string, { dag: string; slots: { id: string; start: string; eind: string }[] }> = {};

    for (const slot of (slots as SlotRow[] || [])) {
      if (!grouped[slot.date]) {
        const d = new Date(slot.date);
        grouped[slot.date] = {
          dag: dagNamen[d.getDay()],
          slots: [],
        };
      }
      grouped[slot.date].slots.push({
        id: slot.id,
        start: slot.start_time.slice(0, 5),
        eind: slot.end_time.slice(0, 5),
      });
    }

    const days = Object.entries(grouped).map(([datum, data]) => ({
      datum,
      ...data,
    }));

    // Als er een inquiry_id is, haal klantgegevens op
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
      days,
      inquiry,
      intro_text: settingsMap.booking_page_intro_text || "",
      slot_duration: settingsMap.slot_duration_minutes || "30",
      sender_name: settingsMap.sender_name || "TopTalent Jobs",
    });
  } catch (error) {
    console.error("Bookings GET error:", error);
    return NextResponse.json({ error: "Kon slots niet ophalen" }, { status: 500 });
  }
}

// POST: Afspraak boeken
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slot_id, client_name, client_email, client_phone, company_name, notes, inquiry_id } = body;

    if (!slot_id || !client_name || !client_email) {
      return NextResponse.json(
        { error: "Naam, e-mailadres en tijdslot zijn vereist" },
        { status: 400 },
      );
    }

    // Check of het slot nog beschikbaar is
    const { data: slot, error: slotError } = await supabaseAdmin
      .from("availability_slots")
      .select("*")
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

    // Markeer slot als geboekt
    await supabaseAdmin
      .from("availability_slots")
      .update({ is_booked: true, is_available: false })
      .eq("id", slot_id);

    // Maak booking aan
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        slot_id,
        inquiry_id: inquiry_id || null,
        client_name,
        client_email,
        client_phone: client_phone || null,
        company_name: company_name || null,
        notes: notes || null,
        status: "confirmed",
      })
      .select()
      .single();

    if (bookingError || !booking) {
      // Rollback slot
      await supabaseAdmin
        .from("availability_slots")
        .update({ is_booked: false, is_available: true })
        .eq("id", slot_id);
      console.error("Booking create error:", bookingError);
      return NextResponse.json({ error: "Kon boeking niet aanmaken" }, { status: 500 });
    }

    // Koppel booking aan aanvraag als inquiry_id meegegeven
    if (inquiry_id) {
      await supabaseAdmin
        .from("personeel_aanvragen")
        .update({ booking_id: booking.id })
        .eq("id", inquiry_id);
    }

    // Google Calendar event aanmaken
    let googleEventId: string | null = null;
    if (isGoogleCalendarConfigured()) {
      const startDateTime = `${slot.date}T${slot.start_time}`;
      const endDateTime = `${slot.date}T${slot.end_time}`;

      googleEventId = await createGoogleCalendarEvent({
        summary: `Gesprek: ${client_name}${company_name ? ` (${company_name})` : ""}`,
        description: [
          `Klant: ${client_name}`,
          company_name ? `Bedrijf: ${company_name}` : "",
          `Email: ${client_email}`,
          client_phone ? `Telefoon: ${client_phone}` : "",
          notes ? `\nNotities: ${notes}` : "",
          inquiry_id ? `\nAanvraag ID: ${inquiry_id}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        startDateTime,
        endDateTime,
        attendeeEmail: client_email,
      });

      if (googleEventId) {
        await supabaseAdmin
          .from("bookings")
          .update({ google_calendar_event_id: googleEventId })
          .eq("id", booking.id);

        await supabaseAdmin
          .from("availability_slots")
          .update({ google_calendar_event_id: googleEventId })
          .eq("id", slot_id);
      }
    }

    // Datum/tijd formatteren voor response
    const datumFormatted = new Date(slot.date).toLocaleDateString("nl-NL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        datum: slot.date,
        datum_formatted: datumFormatted,
        start_time: slot.start_time.slice(0, 5),
        end_time: slot.end_time.slice(0, 5),
        client_name,
      },
    });
  } catch (error) {
    console.error("Booking POST error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
