import { NextRequest, NextResponse } from "next/server";
import { runGeoContentPlan } from "@/lib/geo/engine";

/**
 * Cron endpoint voor automatische GEO content generatie
 * Wordt aangeroepen door een cron scheduler (bijv. Vercel Cron)
 *
 * Query params:
 * - max: max aantal items per run (default: 2)
 * - stad: optioneel, alleen content voor deze stad
 * - auto_publish: of content direct gepubliceerd wordt (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificatie: alleen via cron secret of admin
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const maxItems = Math.min(parseInt(searchParams.get("max") || "2"), 5);
    const stad = searchParams.get("stad") as any;
    const autoPublish = searchParams.get("auto_publish") === "true";

    console.log(`[GEO CRON] Start: max=${maxItems}, stad=${stad || "alle"}, auto_publish=${autoPublish}`);

    const result = await runGeoContentPlan({
      maxItems,
      autoPublish,
      stad: stad || undefined,
    });

    console.log(`[GEO CRON] Klaar: ${result.generated} gegenereerd, ${result.skipped} overgeslagen, ${result.errors.length} fouten`);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[GEO CRON] Error:", error);
    return NextResponse.json(
      { error: "GEO agent fout", details: (error as Error).message },
      { status: 500 }
    );
  }
}
