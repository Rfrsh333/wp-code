import { google, calendar_v3 } from "googleapis";
import { supabaseAdmin } from "@/lib/supabase";

// ============================================
// Google Calendar OAuth2 Client
// ============================================

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

function getCalendar(): calendar_v3.Calendar | null {
  const auth = getOAuth2Client();
  if (!auth) return null;
  return google.calendar({ version: "v3", auth });
}

export function isGoogleCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

// ============================================
// Free/Busy check — Google → App
// ============================================

interface BusyPeriod {
  start: string;
  end: string;
}

/**
 * Haal bezette periodes op uit Google Calendar voor een datumbereik
 */
export async function getGoogleBusyPeriods(
  startDate: string,
  endDate: string,
): Promise<BusyPeriod[]> {
  const calendar = getCalendar();
  if (!calendar) return [];

  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  try {
    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: new Date(`${startDate}T00:00:00`).toISOString(),
        timeMax: new Date(`${endDate}T23:59:59`).toISOString(),
        items: [{ id: calendarId }],
      },
    });

    const busy = res.data.calendars?.[calendarId]?.busy || [];
    return busy
      .filter((b): b is { start: string; end: string } => !!b.start && !!b.end)
      .map((b) => ({ start: b.start!, end: b.end! }));
  } catch (error) {
    console.error("Google Calendar free/busy error:", error);
    return [];
  }
}

// ============================================
// Event aanmaken — App → Google
// ============================================

interface CreateEventParams {
  summary: string;
  description: string;
  startDateTime: string; // ISO string
  endDateTime: string; // ISO string
  attendeeEmail?: string;
  addMeetLink?: boolean;
}

interface CreateEventResult {
  eventId: string | null;
  meetLink?: string;
}

/**
 * Maak een event aan in Google Calendar bij een boeking
 */
export async function createGoogleCalendarEvent(
  params: CreateEventParams,
): Promise<CreateEventResult> {
  const calendar = getCalendar();
  if (!calendar) return { eventId: null };

  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  try {
    const event: calendar_v3.Schema$Event = {
      summary: params.summary,
      description: params.description,
      start: {
        dateTime: params.startDateTime,
        timeZone: "Europe/Amsterdam",
      },
      end: {
        dateTime: params.endDateTime,
        timeZone: "Europe/Amsterdam",
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 30 },
          { method: "email", minutes: 60 },
        ],
      },
    };

    if (params.attendeeEmail) {
      event.attendees = [{ email: params.attendeeEmail }];
    }

    if (params.addMeetLink) {
      event.conferenceData = {
        createRequest: {
          requestId: `toptalent-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    const res = await calendar.events.insert({
      calendarId,
      requestBody: event,
      conferenceDataVersion: params.addMeetLink ? 1 : undefined,
    });

    const meetLink = res.data.hangoutLink
      || res.data.conferenceData?.entryPoints?.[0]?.uri
      || undefined;

    return { eventId: res.data.id || null, meetLink };
  } catch (error) {
    console.error("Google Calendar create event error:", error);
    return { eventId: null };
  }
}

// ============================================
// Event verwijderen — bij annulering
// ============================================

export async function deleteGoogleCalendarEvent(eventId: string): Promise<boolean> {
  const calendar = getCalendar();
  if (!calendar) return false;

  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    });
    return true;
  } catch (error) {
    console.error("Google Calendar delete event error:", error);
    return false;
  }
}

// ============================================
// Sync: markeer slots als niet-beschikbaar
// o.b.v. Google Calendar events
// ============================================

/**
 * Synchroniseer availability_slots met Google Calendar.
 * Markeert slots als niet-beschikbaar als er een Google Calendar event overlapt.
 */
export async function syncGoogleCalendarToSlots(): Promise<{
  synced: number;
  blocked: number;
}> {
  if (!isGoogleCalendarConfigured()) {
    return { synced: 0, blocked: 0 };
  }

  // Haal de booking horizon op
  const { data: horizonSetting } = await supabaseAdmin
    .from("admin_settings")
    .select("value")
    .eq("key", "booking_horizon_days")
    .single();

  const horizonDays = parseInt(horizonSetting?.value || "14");

  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + horizonDays);

  const startStr = today.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  // Haal bezette periodes op
  const busyPeriods = await getGoogleBusyPeriods(startStr, endStr);

  // Haal alle toekomstige slots op
  const { data: slots } = await supabaseAdmin
    .from("availability_slots")
    .select("id, date, start_time, end_time, is_available, google_calendar_event_id")
    .gte("date", startStr)
    .lte("date", endStr);

  if (!slots?.length) return { synced: 0, blocked: 0 };

  let blocked = 0;

  for (const slot of slots) {
    const slotStart = new Date(`${slot.date}T${slot.start_time}`);
    const slotEnd = new Date(`${slot.date}T${slot.end_time}`);

    // Check of dit slot overlapt met een Google Calendar event
    const isBlocked = busyPeriods.some((busy) => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      return slotStart < busyEnd && slotEnd > busyStart;
    });

    if (isBlocked && slot.is_available) {
      // Markeer als niet-beschikbaar door Google Calendar
      await supabaseAdmin
        .from("availability_slots")
        .update({
          is_available: false,
          google_calendar_event_id: "google_blocked",
        })
        .eq("id", slot.id);
      blocked++;
    } else if (!isBlocked && slot.google_calendar_event_id === "google_blocked") {
      // Was geblokkeerd door Google maar nu vrij — maak weer beschikbaar
      await supabaseAdmin
        .from("availability_slots")
        .update({
          is_available: true,
          google_calendar_event_id: null,
        })
        .eq("id", slot.id);
    }
  }

  // Sla laatste sync tijdstip op
  await supabaseAdmin
    .from("admin_settings")
    .upsert({ key: "google_calendar_last_sync", value: new Date().toISOString() }, { onConflict: "key" });

  return { synced: slots.length, blocked };
}

// ============================================
// Slots genereren voor een datumbereik
// ============================================

/**
 * Genereer availability slots op basis van availability_schedules (Schema tab)
 * met fallback naar admin_settings voor backwards compatibility.
 */
export async function generateSlots(
  fromDate: string,
  toDate: string,
): Promise<number> {
  // Haal availability_schedules op (de Schema tab in de Agenda)
  const { data: schedules } = await supabaseAdmin
    .from("availability_schedules")
    .select("day_of_week, start_time, end_time, is_active");

  // Haal slot_duration uit admin_settings
  const { data: settings } = await supabaseAdmin
    .from("admin_settings")
    .select("key, value")
    .in("key", ["slot_duration_minutes", "default_start_time", "default_end_time", "working_days"]);

  const settingsMap = Object.fromEntries((settings || []).map((s) => [s.key, s.value]));
  const slotDuration = parseInt(settingsMap.slot_duration_minutes || "30");

  // Bouw een map van dag → { start, end } vanuit schedules
  const scheduleMap = new Map<number, { start: string; end: string }>();
  if (schedules && schedules.length > 0) {
    for (const s of schedules) {
      if (s.is_active && s.start_time && s.end_time) {
        scheduleMap.set(s.day_of_week, {
          start: s.start_time.slice(0, 5),
          end: s.end_time.slice(0, 5),
        });
      }
    }
  }

  // Fallback: als er geen schedules zijn, gebruik admin_settings
  if (scheduleMap.size === 0) {
    const defaultStart = settingsMap.default_start_time || "09:00";
    const defaultEnd = settingsMap.default_end_time || "17:00";
    const workingDays = (settingsMap.working_days || "1,2,3,4,5")
      .split(",")
      .map((d: string) => parseInt(d.trim()));

    for (const day of workingDays) {
      scheduleMap.set(day, { start: defaultStart, end: defaultEnd });
    }
  }

  // Haal overrides op om geblokkeerde dagen te respecteren
  const { data: overrides } = await supabaseAdmin
    .from("availability_overrides")
    .select("date, is_blocked, start_time, end_time")
    .gte("date", fromDate)
    .lte("date", toDate);

  const blockedDates = new Set(
    (overrides || [])
      .filter((o) => o.is_blocked && !o.start_time)
      .map((o) => o.date)
  );

  let created = 0;
  const current = new Date(fromDate);
  const end = new Date(toDate);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0=zo, 1=ma, ...
    const dateStr = current.toISOString().split("T")[0];

    const schedule = scheduleMap.get(dayOfWeek);
    if (schedule && !blockedDates.has(dateStr)) {
      const startMinutes = timeToMinutes(schedule.start);
      const endMinutes = timeToMinutes(schedule.end);

      let time = startMinutes;
      while (time + slotDuration <= endMinutes) {
        const startTime = minutesToTime(time);
        const endTime = minutesToTime(time + slotDuration);

        const { error } = await supabaseAdmin
          .from("availability_slots")
          .upsert(
            {
              date: dateStr,
              start_time: startTime,
              end_time: endTime,
              is_available: true,
              is_booked: false,
            },
            { onConflict: "date,start_time", ignoreDuplicates: true },
          );

        if (!error) created++;
        time += slotDuration;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return created;
}

// ============================================
// Helpers
// ============================================

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
