import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email-service";
import { buildReminderEmailHtml } from "@/lib/email-templates";
import { captureRouteError, withCronMonitor } from "@/lib/sentry-utils";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return withCronMonitor("cron-booking-reminders", async () => {

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: bookingsWithSlots } = await supabaseAdmin
    .from("bookings")
    .select("id, client_name, client_email, status, reminder_email_sent, cancellation_token, google_meet_link, availability_slots(date, start_time, end_time)")
    .eq("status", "confirmed")
    .eq("reminder_email_sent", false);

  const morgenBookings = (bookingsWithSlots || []).filter((b) => {
    const slot = b.availability_slots as unknown as { date: string } | null;
    return slot?.date === tomorrowStr;
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

  for (const booking of morgenBookings) {
    const slot = booking.availability_slots as unknown as { date: string; start_time: string; end_time: string };
    if (!slot) continue;

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
        subject: `Herinnering: je afspraak morgen met ${senderName}`,
        html: buildReminderEmailHtml({
          clientName: booking.client_name,
          datumFormatted,
          startTime: slot.start_time.slice(0, 5),
          endTime: slot.end_time.slice(0, 5),
          manageUrl,
          meetLink: (booking as Record<string, unknown>).google_meet_link as string | undefined,
        }),
      });

      await supabaseAdmin
        .from("bookings")
        .update({ reminder_email_sent: true })
        .eq("id", booking.id);

      sent++;
    } catch (err) {
      captureRouteError(err, { route: "/api/cron/booking-reminders", action: "GET" });
      // console.error(`Reminder email failed for booking ${booking.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    date: tomorrowStr,
    sent,
    failed,
    total: morgenBookings.length,
  });
  });
}
