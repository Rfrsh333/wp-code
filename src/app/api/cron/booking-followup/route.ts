import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email-service";
import { buildFollowUpEmailHtml } from "@/lib/email-templates";
import { captureRouteError, withCronMonitor } from "@/lib/sentry-utils";

// Follow-up: stuur follow-up email 1 dag na voltooide afspraak
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return withCronMonitor("cron-booking-followup", async () => {

  // Zoek bookings die gisteren completed zijn en nog geen follow-up hebben gehad
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStart = new Date(yesterday);
  yesterdayStart.setHours(0, 0, 0, 0);
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const { data: completedBookings } = await supabaseAdmin
    .from("bookings")
    .select("id, client_name, client_email, status, completed_at, availability_slots(date)")
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .gte("completed_at", yesterdayStart.toISOString())
    .lte("completed_at", yesterdayEnd.toISOString());

  // Haal afzender instellingen op
  const { data: senderSettings } = await supabaseAdmin
    .from("admin_settings")
    .select("key, value")
    .in("key", ["sender_email", "sender_name"]);

  const sMap = Object.fromEntries((senderSettings || []).map((s) => [s.key, s.value]));
  const senderEmail = sMap.sender_email || "info@toptalentjobs.nl";
  const senderName = sMap.sender_name || "TopTalent Jobs";

  let sent = 0;

  for (const booking of completedBookings || []) {
    try {
      await sendEmail({
        from: `${senderName} <${senderEmail}>`,
        to: [booking.client_email],
        subject: `Bedankt voor je gesprek — ${senderName}`,
        html: buildFollowUpEmailHtml({
          clientName: booking.client_name,
          senderName,
        }),
      });
      sent++;
    } catch (err) {
      captureRouteError(err, { route: "/api/cron/booking-followup", action: "GET" });
      // console.error(`Follow-up email failed for booking ${booking.id}:`, err);
    }
  }

  return NextResponse.json({ success: true, sent, total: (completedBookings || []).length });
  });
}
