import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email-service";
import { buildMeetReminderEmailHtml } from "@/lib/email-templates";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // Bereken het tijdvenster: 55 tot 65 minuten vanaf nu
  const from = new Date(now.getTime() + 55 * 60 * 1000);
  const to = new Date(now.getTime() + 65 * 60 * 1000);

  const fromTime = `${from.getHours().toString().padStart(2, "0")}:${from.getMinutes().toString().padStart(2, "0")}:00`;
  const toTime = `${to.getHours().toString().padStart(2, "0")}:${to.getMinutes().toString().padStart(2, "0")}:00`;

  // Haal bookings op die vandaag zijn, een meet link hebben, en nog geen 30min reminder hebben gehad
  const { data: bookingsWithSlots } = await supabaseAdmin
    .from("bookings")
    .select("id, client_name, client_email, status, cancellation_token, google_meet_link, reminder_30min_sent, availability_slots(date, start_time, end_time)")
    .eq("status", "confirmed")
    .eq("reminder_30min_sent", false)
    .not("google_meet_link", "is", null);

  // Filter op vandaag en starttijd binnen het 25-35 min venster
  const upcoming = (bookingsWithSlots || []).filter((b) => {
    const slot = b.availability_slots as unknown as { date: string; start_time: string; end_time: string } | null;
    if (!slot || slot.date !== todayStr) return false;
    return slot.start_time >= fromTime && slot.start_time <= toTime;
  });

  const { data: senderSettings } = await supabaseAdmin
    .from("admin_settings")
    .select("key, value")
    .in("key", ["sender_email", "sender_name"]);

  const sMap = Object.fromEntries((senderSettings || []).map((s) => [s.key, s.value]));
  const senderEmail = sMap.sender_email || "info@toptalentjobs.nl";
  const senderName = sMap.sender_name || "TopTalent Jobs";

  let sent = 0;
  let failed = 0;

  for (const booking of upcoming) {
    const slot = booking.availability_slots as unknown as { date: string; start_time: string; end_time: string };
    if (!slot) continue;

    const meetLink = (booking as Record<string, unknown>).google_meet_link as string;
    if (!meetLink) continue;

    const datumFormatted = new Date(slot.date).toLocaleDateString("nl-NL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const manageUrl = booking.cancellation_token
      ? `${baseUrl}/afspraak/${booking.cancellation_token}`
      : undefined;

    try {
      await sendEmail({
        from: `${senderName} <${senderEmail}>`,
        to: [booking.client_email],
        subject: `Je afspraak begint over 1 uur — deelname link`,
        html: buildMeetReminderEmailHtml({
          clientName: booking.client_name,
          datumFormatted,
          startTime: slot.start_time.slice(0, 5),
          endTime: slot.end_time.slice(0, 5),
          meetLink,
          manageUrl,
        }),
      });

      await supabaseAdmin
        .from("bookings")
        .update({ reminder_30min_sent: true })
        .eq("id", booking.id);

      sent++;
    } catch (err) {
      console.error(`30min reminder email failed for booking ${booking.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    date: todayStr,
    sent,
    failed,
    total: upcoming.length,
  });
}
