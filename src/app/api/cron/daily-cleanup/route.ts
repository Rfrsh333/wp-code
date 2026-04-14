import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  // Verificeer cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};
  const gisteren = new Date();
  gisteren.setDate(gisteren.getDate() - 1);
  const gisterenStr = gisteren.toISOString().split("T")[0];

  try {
    // 1. Verlopen diensten op "gesloten" zetten
    const { data: verlopenDiensten, error: verlopenError } = await supabaseAdmin
      .from("diensten")
      .update({ status: "gesloten" })
      .in("status", ["open", "vol"])
      .lt("datum", gisterenStr)
      .select("id");

    results.verlopen_diensten_gesloten = verlopenDiensten?.length || 0;
    if (verlopenError) {
      console.error("[CRON] Verlopen diensten error:", verlopenError);
      results.verlopen_error = verlopenError.message;
    }

    // 2. Openstaande aanmeldingen voor verlopen diensten annuleren
    if (verlopenDiensten && verlopenDiensten.length > 0) {
      const verlopenIds = verlopenDiensten.map((d) => d.id);
      const { data: geannuleerd } = await supabaseAdmin
        .from("dienst_aanmeldingen")
        .update({ status: "geannuleerd" })
        .in("dienst_id", verlopenIds)
        .eq("status", "aangemeld")
        .select("id");

      results.aanmeldingen_geannuleerd = geannuleerd?.length || 0;
    }

    // 3. Verlopen sessie tokens opruimen (ouder dan 30 dagen)
    const dertigDagenGeleden = new Date();
    dertigDagenGeleden.setDate(dertigDagenGeleden.getDate() - 30);

    const { count: verlopenSessies } = await supabaseAdmin
      .from("medewerker_sessies")
      .delete({ count: "exact" })
      .lt("created_at", dertigDagenGeleden.toISOString());

    results.verlopen_sessies_verwijderd = verlopenSessies || 0;

    // 4. Oude chatbot gesprekken sluiten (ouder dan 7 dagen, nog open)
    const zevenDagenGeleden = new Date();
    zevenDagenGeleden.setDate(zevenDagenGeleden.getDate() - 7);

    const { data: oudeChats } = await supabaseAdmin
      .from("chatbot_conversations")
      .update({ status: "closed" })
      .in("status", ["ai", "waiting_for_agent"])
      .lt("updated_at", zevenDagenGeleden.toISOString())
      .select("id");

    results.oude_chats_gesloten = oudeChats?.length || 0;

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[CRON] Daily cleanup error:", error);
    return NextResponse.json({ error: "Cleanup mislukt" }, { status: 500 });
  }
}
