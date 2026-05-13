import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTelegramAlert } from "@/lib/telegram";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: dueLeads, error } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("id, bedrijfsnaam, contactpersoon, telefoon, email, branche, stad, auto_sequence_next_action, auto_sequence_next_date, volgende_actie_notitie, last_follow_up_reminder_at")
      .lte("auto_sequence_next_date", endOfDay.toISOString())
      .not("auto_sequence_next_action", "is", null)
      .not("pipeline_stage", "in", '("klant","afgewezen")')
      .or(`last_follow_up_reminder_at.is.null,last_follow_up_reminder_at.lt.${startOfDay.toISOString()}`)
      .limit(50);

    if (error) {
      console.error("[CRON acquisitie-followups] Query error:", error);
      return NextResponse.json({ error: "Query mislukt" }, { status: 500 });
    }

    if (!dueLeads?.length) {
      return NextResponse.json({ success: true, sent: 0, message: "Geen due follow-ups" });
    }

    let sent = 0;
    for (const lead of dueLeads) {
      await sendTelegramAlert(
        `⏰ <b>Acquisitie follow-up due</b>\n\n` +
        `Bedrijf: ${lead.bedrijfsnaam}\n` +
        `${lead.contactpersoon ? `Contact: ${lead.contactpersoon}\n` : ""}` +
        `${lead.telefoon ? `Tel: ${lead.telefoon}\n` : ""}` +
        `${lead.email ? `Email: ${lead.email}\n` : ""}` +
        `${lead.stad ? `Stad: ${lead.stad}\n` : ""}` +
        `${lead.branche ? `Branche: ${lead.branche}\n` : ""}` +
        `Actie: ${lead.auto_sequence_next_action}\n\n` +
        `${lead.volgende_actie_notitie || "Open het acquisitie-dashboard voor details."}`
      );

      await supabaseAdmin
        .from("acquisitie_leads")
        .update({ last_follow_up_reminder_at: now.toISOString() })
        .eq("id", lead.id);

      sent++;
    }

    return NextResponse.json({ success: true, sent });
  } catch (error) {
    console.error("[CRON acquisitie-followups] Error:", error);
    return NextResponse.json({ error: "Cron job mislukt" }, { status: 500 });
  }
}
