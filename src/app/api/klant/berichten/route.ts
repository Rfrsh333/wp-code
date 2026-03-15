import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verifyKlantSession } from "@/lib/session";
import { sendTelegramAlert } from "@/lib/telegram";

async function getKlant() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");
  if (!session) return null;
  return await verifyKlantSession(session.value);
}

export async function GET() {
  const klant = await getKlant();
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
  const klant = await getKlant();
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

  // Telegram notification
  await sendTelegramAlert(
    `<b>Nieuw bericht van klant</b>\n` +
    `Klant: ${klant.bedrijfsnaam}\n` +
    `Bericht: ${bericht.trim().slice(0, 200)}`
  );

  return NextResponse.json({ success: true });
}
