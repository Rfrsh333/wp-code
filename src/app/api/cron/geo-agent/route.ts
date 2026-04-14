import { NextRequest, NextResponse } from "next/server";
import { runGeoContentPlan } from "@/lib/geo/engine";
import { runFullMonitoring } from "@/lib/geo/monitor";
import { runAutoOptimization } from "@/lib/geo/optimizer";
import { runCompetitorAnalysis } from "@/lib/geo/competitor";
import type { GeoStad } from "@/lib/geo/types";

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
    const stad = searchParams.get("stad") as string | null;
    const autoPublish = searchParams.get("auto_publish") === "true";
    const engines = (searchParams.get("engines") || "perplexity").split(",");

    const results: Record<string, unknown> = {};

    // Stap 1: Content genereren
    if (mode === "full" || mode === "generate") {
      results.generate = await runGeoContentPlan({
        maxItems,
        autoPublish,
        stad: (stad as GeoStad) || undefined,
      });
    }

    // Stap 2: Monitoring (citation checks)
    if (mode === "full" || mode === "monitor") {
      results.monitor = await runFullMonitoring({
        maxItems: maxItems + 2,
        engines: engines as ("perplexity" | "chatgpt" | "google_ai")[],
      });
    }

    // Stap 3: Auto-optimalisatie
    if (mode === "full" || mode === "optimize") {
      results.optimize = await runAutoOptimization({
        maxItems,
        minScore: 60,
      });
    }

    // Stap 4: Concurrentie-analyse + content gaps
    if (mode === "full" || mode === "competitor") {
      results.competitor = await runCompetitorAnalysis();
    }

    return NextResponse.json({ success: true, mode, results });
  } catch (error) {
    console.error("[GEO CRON] Error:", error);
    return NextResponse.json(
      { error: "GEO agent fout", details: (error as Error).message },
      { status: 500 }
    );
  }
}
