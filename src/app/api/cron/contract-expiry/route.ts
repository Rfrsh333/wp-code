import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    // 1. Markeer actieve contracten met verlopen einddatum als "verlopen"
    const { data: verlopen, error: verlopenError } = await supabaseAdmin
      .from("contracten")
      .update({ status: "verlopen" })
      .eq("status", "actief")
      .lt("einddatum", today)
      .select("id, contract_nummer");

    if (verlopenError) {
      console.error("[CRON CONTRACT-EXPIRY] Error updating expired:", verlopenError);
    }

    // 2. Annuleer verzonden contracten waarvan het onderteken_token verlopen is
    const { data: geannuleerd, error: annuleerError } = await supabaseAdmin
      .from("contracten")
      .update({ status: "geannuleerd" })
      .in("status", ["verzonden", "bekeken"])
      .lt("onderteken_token_verloopt_at", new Date().toISOString())
      .select("id, contract_nummer");

    if (annuleerError) {
      console.error("[CRON CONTRACT-EXPIRY] Error cancelling expired tokens:", annuleerError);
    }

    const result = {
      success: true,
      date: today,
      verlopen: verlopen?.length || 0,
      geannuleerd: geannuleerd?.length || 0,
      details: {
        verlopen_contracten: verlopen?.map((c) => c.contract_nummer) || [],
        geannuleerde_contracten: geannuleerd?.map((c) => c.contract_nummer) || [],
      },
    };

    console.log("[CRON CONTRACT-EXPIRY]", JSON.stringify(result));
    return NextResponse.json(result);
  } catch (error) {
    console.error("[CRON CONTRACT-EXPIRY] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
