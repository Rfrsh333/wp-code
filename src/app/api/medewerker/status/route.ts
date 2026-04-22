import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMedewerkerSession } from "@/lib/session";
import { captureRouteError } from "@/lib/sentry-utils";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Check account status
    const { data: statusData } = await supabaseAdmin
      .from("medewerkers")
      .select("status")
      .eq("id", medewerker.id)
      .single();

    return NextResponse.json({
      gepauzeerd: statusData?.status === "gepauzeerd",
      status: statusData?.status || "actief",
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/status", action: "GET" });
    // console.error("Status check error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
