/**
 * Genereer een .ics bestand voor agenda download
 */
export function generateICS(params: {
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location?: string;
}): string {
  const { title, description, startDate, startTime, endTime, location } = params;

  // Converteer naar ICS formaat: YYYYMMDDTHHMMSS
  const dtStart = `${startDate.replace(/-/g, "")}T${startTime.replace(/:/g, "")}00`;
  const dtEnd = `${startDate.replace(/-/g, "")}T${endTime.replace(/:/g, "")}00`;
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const uid = `booking-${Date.now()}@toptalentjobs.nl`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TopTalent Jobs//Booking//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART;TZID=Europe/Amsterdam:${dtStart}`,
    `DTEND;TZID=Europe/Amsterdam:${dtEnd}`,
    `DTSTAMP:${now}`,
    `UID:${uid}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    location ? `LOCATION:${escapeICS(location)}` : "",
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Herinnering",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function escapeICS(text: string): string {
  return text.replace(/[,;\\]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}
