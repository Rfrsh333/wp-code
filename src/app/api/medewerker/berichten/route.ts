import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { captureRouteError } from "@/lib/sentry-utils";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verifyMedewerkerSession } = await import("@/lib/session");
  const medewerker = await verifyMedewerkerSession(session.value);
  if (!medewerker) {
    console.warn("[SECURITY] Invalid medewerker session token");
    return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
  }

  // Fetch inbox (berichten aan mij) + verzonden (berichten van mij)
  const { data: inbox } = await supabaseAdmin
    .from("berichten")
    .select("id, van_type, van_id, aan_type, aan_id, onderwerp, inhoud, created_at")
    .eq("aan_type", "medewerker")
    .eq("aan_id", medewerker.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: verzonden } = await supabaseAdmin
    .from("berichten")
    .select("id, van_type, van_id, aan_type, aan_id, onderwerp, inhoud, created_at")
    .eq("van_type", "medewerker")
    .eq("van_id", medewerker.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const berichten = [...(inbox || []), ...(verzonden || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({ berichten });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verifyMedewerkerSession } = await import("@/lib/session");
  const medewerker = await verifyMedewerkerSession(session.value);
  if (!medewerker) {
    console.warn("[SECURITY] Invalid medewerker session token");
    return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
  }

  const { onderwerp, inhoud } = await request.json();

  if (!inhoud?.trim()) {
    return NextResponse.json({ error: "Bericht inhoud is verplicht" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("berichten").insert({
    van_type: "medewerker",
    van_id: medewerker.id,
    aan_type: "admin",
    aan_id: "admin",
    onderwerp: onderwerp || null,
    inhoud: inhoud.trim(),
  });

  if (error) {
    captureRouteError(error, { route: "/api/medewerker/berichten", action: "POST" });
    // console.error("Error creating bericht:", error);
    return NextResponse.json({ error: "Kon bericht niet versturen" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
