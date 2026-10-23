import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { captureRouteError } from "@/lib/sentry-utils";

const BUCKET = "kandidaat-documenten";

/**
 * Haalt het opslagpad uit bookings.kandidaat_cv_url. Nieuwe boekingen slaan
 * het pad op (`cv/…`); oudere bevatten een (inmiddels verlopen) signed URL
 * waar het pad in zit.
 */
function cvPad(waarde: string): string | null {
  if (!waarde.startsWith("http")) return waarde;
  const match = waarde.match(/\/object\/sign\/kandidaat-documenten\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// GET ?booking_id=… → vers gesigneerde URL (1 uur) voor het cv bij een kandidaat-afspraak
export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const bookingId = request.nextUrl.searchParams.get("booking_id");
  if (!bookingId) {
    return NextResponse.json({ error: "booking_id is verplicht" }, { status: 400 });
  }

  try {
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, kandidaat_cv_url")
      .eq("id", bookingId)
      .maybeSingle();

    const pad = booking?.kandidaat_cv_url ? cvPad(booking.kandidaat_cv_url) : null;
    if (!pad) {
      return NextResponse.json({ error: "Geen cv gevonden bij deze afspraak" }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(pad, 60 * 60);
    if (error || !data) {
      captureRouteError(error ?? new Error("Signed URL leeg"), { route: "/api/admin/bookings/cv", action: "GET" });
      return NextResponse.json({ error: "CV kon niet worden geopend" }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/bookings/cv", action: "GET" });
    return NextResponse.json({ error: "CV kon niet worden geopend" }, { status: 500 });
  }
}
