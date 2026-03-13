import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Auto-complete: markeer afspraken in het verleden als "completed" of "no_show"
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const currentTime = now.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

  // Zoek confirmed bookings waarvan het tijdslot in het verleden ligt
  const { data: pastBookings } = await supabaseAdmin
    .from("bookings")
    .select("id, client_name, status, availability_slots(date, start_time, end_time)")
    .eq("status", "confirmed");

  let completed = 0;

  for (const booking of pastBookings || []) {
    const slot = booking.availability_slots as unknown as { date: string; start_time: string; end_time: string } | null;
    if (!slot) continue;

    // Check of de afspraak al voorbij is (datum < vandaag, of vandaag maar eindtijd verstreken)
    const isPast = slot.date < todayStr ||
      (slot.date === todayStr && slot.end_time.slice(0, 5) < currentTime);

    if (isPast) {
      await supabaseAdmin
        .from("bookings")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", booking.id);
      completed++;
    }
  }

  return NextResponse.json({
    success: true,
    completed,
    checked_at: now.toISOString(),
  });
}
