import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verifyMedewerkerSession } = await import("@/lib/session");
  const medewerker = await verifyMedewerkerSession(session.value);
  if (!medewerker) {
    return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
  }

  const { id } = await params;
  const { gelezen } = await request.json();

  if (gelezen) {
    await supabaseAdmin
      .from("berichten")
      .update({ gelezen: true, gelezen_at: new Date().toISOString() })
      .eq("id", id)
      .eq("aan_type", "medewerker")
      .eq("aan_id", medewerker.id);
  }

  return NextResponse.json({ success: true });
}
