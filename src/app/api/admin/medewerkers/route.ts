import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function GET() {
  const { data } = await supabaseAdmin.from("medewerkers").select("*").order("naam");
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const { action, id, data } = await request.json();

  if (action === "create" || action === "update") {
    const payload: Record<string, unknown> = { ...data };
    if (data.wachtwoord) {
      payload.wachtwoord = await bcrypt.hash(data.wachtwoord, 10);
    } else {
      delete payload.wachtwoord;
    }

    if (action === "create") {
      await supabaseAdmin.from("medewerkers").insert(payload);
    } else {
      await supabaseAdmin.from("medewerkers").update(payload).eq("id", id);
    }
  }

  if (action === "delete") {
    await supabaseAdmin.from("medewerkers").delete().eq("id", id);
  }

  return NextResponse.json({ success: true });
}
