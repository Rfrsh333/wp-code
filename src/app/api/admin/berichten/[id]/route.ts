import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { gelezen } = await request.json();

  if (gelezen) {
    await supabaseAdmin
      .from("berichten")
      .update({ gelezen: true, gelezen_at: new Date().toISOString() })
      .eq("id", id);
  }

  return NextResponse.json({ success: true });
}
