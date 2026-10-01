import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
