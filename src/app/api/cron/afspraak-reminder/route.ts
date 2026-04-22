import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email-service";
import { buildReminderEmailHtml } from "@/lib/email-templates";

// Dagelijkse cron: stuurt reminders 24u voor afspraken
// Configureer via Vercel Cron of externe scheduler: GET /api/cron/afspraak-reminder
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Zoek bookings die morgen plaatsvinden en nog geen reminder hebben gehad
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Haal bookings op met hun slot info
    const { data: bookings, error: dbError } = await supabaseAdmin
      .from("bookings")
      .select("*, availability_slots!inner(date, start_time, end_time)")
      .eq("availability_slots.date", tomorrowStr)
      .eq("status", "confirmed")
      .eq("reminder_email_sent", false);

    if (dbError) {
      console.error("Reminder DB error:", dbError);
      return NextResponse.json({ error: "Database fout" }, { status: 500 });
    }

    if (!bookings?.length) {
      return NextResponse.json({ success: true, sent: 0, message: "Geen reminders te versturen" });
    }

    // Haal afzender instellingen op
    const { data: settings } = await supabaseAdmin
      .from("admin_settings")
      .select("key, value")
      .in("key", ["sender_email", "sender_name"]);

    const sMap = Object.fromEntries((settings || []).map((s) => [s.key, s.value]));
    const senderEmail = sMap.sender_email || "info@toptalentjobs.nl";
    const senderName = sMap.sender_name || "TopTalent Jobs";

    let sent = 0;

    for (const booking of bookings) {
      const slot = booking.availability_slots;
      if (!slot) continue;

      const datumFormatted = new Date(slot.date).toLocaleDateString("nl-NL", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      try {
        await sendEmail({
          from: `${senderName} <${senderEmail}>`,
          to: [booking.client_email],
          subject: `Morgen: je gesprek met ${senderName} om ${slot.start_time.slice(0, 5)}`,
          html: buildReminderEmailHtml({
            clientName: booking.client_name,
            datumFormatted,
            startTime: slot.start_time.slice(0, 5),
            endTime: slot.end_time.slice(0, 5),
          }),
        });

        await supabaseAdmin
          .from("bookings")
          .update({ reminder_email_sent: true })
          .eq("id", booking.id);

        sent++;
      } catch (emailError) {
        console.error(`Reminder email fout voor ${booking.client_email}:`, emailError);
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      total: bookings.length,
      datum: tomorrowStr,
    });
  } catch (error) {
    console.error("Reminder cron error:", error);
    return NextResponse.json({ error: "Cron job mislukt" }, { status: 500 });
  }
}
