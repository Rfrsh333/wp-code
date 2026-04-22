import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import {
  syncGoogleCalendarToSlots,
  generateSlots,
  isGoogleCalendarConfigured,
} from "@/lib/google-calendar";
import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";

// GET: Sync Google Calendar + genereer slots (cron of handmatig)
export async function GET(request: NextRequest) {
  // Accepteer zowel cron secret als admin auth
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const { isAdmin } = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  try {
    // Haal booking horizon op
    const { data: horizonSetting } = await supabaseAdmin
      .from("admin_settings")
      .select("value")
      .eq("key", "booking_horizon_days")
      .single();

    const horizonDays = parseInt(horizonSetting?.value || "14");

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + horizonDays);

    const fromDate = today.toISOString().split("T")[0];
    const toDate = endDate.toISOString().split("T")[0];

    // 1. Genereer ontbrekende slots
    const slotsCreated = await generateSlots(fromDate, toDate);

    // 2. Sync met Google Calendar
    let syncResult = { synced: 0, blocked: 0 };
    if (isGoogleCalendarConfigured()) {
      syncResult = await syncGoogleCalendarToSlots();
    }

    return NextResponse.json({
      success: true,
      slots_created: slotsCreated,
      google_calendar: {
        configured: isGoogleCalendarConfigured(),
        slots_checked: syncResult.synced,
        slots_blocked: syncResult.blocked,
      },
      period: { from: fromDate, to: toDate },
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/calendar/sync", action: "GET" });
    // console.error("Calendar sync error:", error);
    return NextResponse.json({ error: "Sync mislukt" }, { status: 500 });
  }
}
