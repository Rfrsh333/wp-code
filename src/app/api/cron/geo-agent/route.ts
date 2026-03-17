import { NextRequest, NextResponse } from "next/server";
import { runGeoContentPlan } from "@/lib/geo/engine";
import { runFullMonitoring } from "@/lib/geo/monitor";
import { runAutoOptimization } from "@/lib/geo/optimizer";
import { runCompetitorAnalysis } from "@/lib/geo/competitor";

/**
 * Cron endpoint voor de volledige GEO Agent pipeline
 *
 * Query params:
 * - mode: "full" (alles) | "generate" | "monitor" | "optimize" | "competitor" (default: full)
 * - max: max aantal items per stap (default: 2)
 * - stad: optioneel, alleen content voor deze stad
 * - auto_publish: of content direct gepubliceerd wordt (default: false)
 * - engines: komma-gescheiden AI engines voor monitoring (default: perplexity)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get("mode") || "full";
    const maxItems = Math.min(parseInt(searchParams.get("max") || "2"), 5);
    const stad = searchParams.get("stad") as any;
    const autoPublish = searchParams.get("auto_publish") === "true";
    const engines = (searchParams.get("engines") || "perplexity").split(",") as any[];

    console.log(`[GEO CRON] Start mode=${mode}, max=${maxItems}`);

    const results: Record<string, any> = {};

    // Stap 1: Content genereren
    if (mode === "full" || mode === "generate") {
      console.log("[GEO CRON] → Stap 1: Content genereren");
      results.generate = await runGeoContentPlan({
        maxItems,
        autoPublish,
        stad: stad || undefined,
      });
    }

    // Stap 2: Monitoring (citation checks)
    if (mode === "full" || mode === "monitor") {
      console.log("[GEO CRON] → Stap 2: Citation monitoring");
      results.monitor = await runFullMonitoring({
        maxItems: maxItems + 2,
        engines,
      });
    }

    // Stap 3: Auto-optimalisatie
    if (mode === "full" || mode === "optimize") {
      console.log("[GEO CRON] → Stap 3: Auto-optimalisatie");
      results.optimize = await runAutoOptimization({
        maxItems,
        minScore: 60,
      });
    }

    // Stap 4: Concurrentie-analyse + content gaps
    if (mode === "full" || mode === "competitor") {
      console.log("[GEO CRON] → Stap 4: Concurrentie-analyse");
      results.competitor = await runCompetitorAnalysis();
    }

    console.log("[GEO CRON] Pipeline voltooid:", JSON.stringify(results, null, 2));

    return NextResponse.json({ success: true, mode, results });
  } catch (error) {
    console.error("[GEO CRON] Error:", error);
    return NextResponse.json(
      { error: "GEO agent fout", details: (error as Error).message },
      { status: 500 }
    );
  }
}
