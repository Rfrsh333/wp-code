import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { sendTelegramAlert } from "@/lib/telegram";

export async function GET(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get last 50 berichten
  const { data: berichten } = await supabaseAdmin
    .from("klant_berichten")
    .select("*")
    .eq("klant_id", klant.id)
    .order("created_at", { ascending: true })
    .limit(50);

  // Mark unread messages from toptalent as read
  const ongelezen = (berichten || []).filter(
    (b) => b.afzender === "toptalent" && !b.gelezen
  );
  if (ongelezen.length > 0) {
    await supabaseAdmin
      .from("klant_berichten")
      .update({ gelezen: true, gelezen_op: new Date().toISOString() })
      .in("id", ongelezen.map((b) => b.id));
  }

  // Count unread for badge
  const { count: ongelezen_count } = await supabaseAdmin
    .from("klant_berichten")
    .select("id", { count: "exact", head: true })
    .eq("klant_id", klant.id)
    .eq("afzender", "toptalent")
    .eq("gelezen", false);

  return NextResponse.json({
    berichten: berichten || [],
    ongelezen_count: ongelezen_count || 0,
  });
}

export async function POST(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bericht } = await request.json();
  if (!bericht?.trim()) {
    return NextResponse.json({ error: "Bericht mag niet leeg zijn" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("klant_berichten").insert({
    klant_id: klant.id,
    afzender: "klant",
    bericht: bericht.trim(),
  });

  if (error) {
    return NextResponse.json({ error: "Bericht versturen mislukt" }, { status: 500 });
  }

  // Telegram notification (geen PII — AVG compliance)
  await sendTelegramAlert(
    `<b>Nieuw bericht van klant</b>\n` +
    `Nieuw bericht van klant — bekijk in dashboard`
  );

  return NextResponse.json({ success: true });
}
