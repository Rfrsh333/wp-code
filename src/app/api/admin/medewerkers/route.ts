import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  // KRITIEK: Dit endpoint was publiek - alleen admins mogen medewerkers zien
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized medewerkers access attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { data } = await supabaseAdmin.from("medewerkers").select("*").order("naam");
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  // KRITIEK: Alleen admins mogen medewerkers aanpassen
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized medewerkers POST attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

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
