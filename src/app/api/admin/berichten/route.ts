import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { sendNieuwBerichtEmail } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized berichten access attempt by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { data } = await supabaseAdmin
    .from("berichten")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json({ berichten: data || [] });
}

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { aan_id, onderwerp, inhoud } = await request.json();

  if (!aan_id || !inhoud?.trim()) {
    return NextResponse.json({ error: "Medewerker en bericht zijn verplicht" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("berichten").insert({
    van_type: "admin",
    van_id: email || "admin",
    aan_type: "medewerker",
    aan_id,
    onderwerp: onderwerp || null,
    inhoud: inhoud.trim(),
  });

  if (error) {
    console.error("Error creating bericht:", error);
    return NextResponse.json({ error: "Kon bericht niet versturen" }, { status: 500 });
  }

  // Send email notification
  try {
    const { data: medewerker } = await supabaseAdmin
      .from("medewerkers")
      .select("naam, email, notificatie_voorkeuren")
      .eq("id", aan_id)
      .single();

    if (medewerker?.email && medewerker?.notificatie_voorkeuren?.berichten !== false) {
      await sendNieuwBerichtEmail({
        ontvangerNaam: medewerker.naam,
        ontvangerEmail: medewerker.email,
        afzender: "TopTalent Admin",
        onderwerp: onderwerp || null,
        inhoud: inhoud.trim(),
      });
    }
  } catch (emailError) {
    console.error("Error sending bericht notification:", emailError);
  }

  return NextResponse.json({ success: true });
}
