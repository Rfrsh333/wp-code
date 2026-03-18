import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import {
  getGeoContentList,
  getGeoStats,
  updateGeoContentStatus,
  generateGeoContent,
  saveGeoContent,
} from "@/lib/geo/engine";
import { getPerformanceData, getCitationDetails, checkContentCitations } from "@/lib/geo/monitor";
import { analyseContent, optimizeContent, runAutoOptimization } from "@/lib/geo/optimizer";
import { getConcurrentenOverzicht, getContentGaps, runCompetitorAnalysis } from "@/lib/geo/competitor";
import type { GeoContentType, GeoStad, GeoContent } from "@/lib/geo/types";

/**
 * Admin API voor GEO Agent
 *
 * GET actions: list, stats, performance, citations, concurrenten, gaps, analyse
 * POST actions: generate, update_status, bulk_publish, monitor, optimize, run_competitor
 */

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action") || "list";

    switch (action) {
      case "stats": {
        const stats = await getGeoStats();
        return NextResponse.json(stats);
      }

      case "performance": {
        const data = await getPerformanceData({
          dagen: parseInt(searchParams.get("dagen") || "30"),
          content_id: searchParams.get("content_id") || undefined,
        });
        return NextResponse.json({ performance: data });
      }

      case "citations": {
        const data = await getCitationDetails({
          content_id: searchParams.get("content_id") || undefined,
          engine: searchParams.get("engine") || undefined,
          limit: parseInt(searchParams.get("limit") || "50"),
        });
        return NextResponse.json({ citations: data });
      }

      case "concurrenten": {
        const data = await getConcurrentenOverzicht();
        return NextResponse.json({ concurrenten: data });
      }

      case "gaps": {
        const data = await getContentGaps(searchParams.get("status") || undefined);
        return NextResponse.json({ gaps: data });
      }

      case "analyse": {
        const contentId = searchParams.get("content_id");
        if (!contentId) {
          return NextResponse.json({ error: "content_id is verplicht" }, { status: 400 });
        }

        const { data: content } = await (await import("@/lib/supabase")).supabaseAdmin
          .from("geo_content")
          .select("*")
          .eq("id", contentId)
          .single();

        if (!content) {
          return NextResponse.json({ error: "Content niet gevonden" }, { status: 404 });
        }

        const analyse = await analyseContent(content as GeoContent);
        return NextResponse.json({ analyse });
      }

      default: {
        // List content
        const filters = {
          status: searchParams.get("status") || undefined,
          stad: searchParams.get("stad") || undefined,
          content_type: searchParams.get("content_type") || undefined,
        };
        const content = await getGeoContentList(filters);
        return NextResponse.json({ content });
      }
    }
  } catch (error) {
    console.error("[GEO ADMIN] GET Error:", error);
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "generate": {
        const { content_type, stad, focus_keywords, extra_context } = body;
        if (!content_type || !stad) {
          return NextResponse.json({ error: "content_type en stad zijn verplicht" }, { status: 400 });
        }

        const result = await generateGeoContent({
          content_type: content_type as GeoContentType,
          stad: stad as GeoStad,
          focus_keywords,
          extra_context,
        });

        const saved = await saveGeoContent(result, false);
        return NextResponse.json({
          success: true,
          content: saved,
          tokens: result.tokens_gebruikt,
          duur_ms: result.duur_ms,
        });
      }

      case "update_status": {
        const { id, status, notities } = body;
        if (!id || !status) {
          return NextResponse.json({ error: "id en status zijn verplicht" }, { status: 400 });
        }

        const updated = await updateGeoContentStatus(id, status, notities);
        return NextResponse.json({ success: true, content: updated });
      }

      case "bulk_publish": {
        const { ids } = body;
        if (!Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json({ error: "ids array is verplicht" }, { status: 400 });
        }

        const results = [];
        for (const id of ids) {
          try {
            await updateGeoContentStatus(id, "gepubliceerd");
            results.push({ id, success: true });
          } catch (err) {
            results.push({ id, success: false, error: (err as Error).message });
          }
        }
        return NextResponse.json({ success: true, results });
      }

      case "monitor": {
        // Monitor specifieke content of alles
        const { content_id, engines } = body;

        if (content_id) {
          const { data: content } = await (await import("@/lib/supabase")).supabaseAdmin
            .from("geo_content")
            .select("*")
            .eq("id", content_id)
            .single();

          if (!content) {
            return NextResponse.json({ error: "Content niet gevonden" }, { status: 404 });
          }

          const results = await checkContentCitations(
            content as GeoContent,
            engines || ["perplexity"]
          );

          return NextResponse.json({
            success: true,
            citaties: results.filter((r) => r.geciteerd).length,
            totaal: results.length,
            details: results,
          });
        }

        // Importeer en run full monitoring
        const { runFullMonitoring } = await import("@/lib/geo/monitor");
        const monitorResult = await runFullMonitoring({
          maxItems: body.max || 5,
          engines: engines || ["perplexity"],
        });

        return NextResponse.json({ success: true, ...monitorResult });
      }

      case "optimize": {
        const { content_id } = body;

        if (content_id) {
          // Optimaliseer specifiek item
          const { data: content } = await (await import("@/lib/supabase")).supabaseAdmin
            .from("geo_content")
            .select("*")
            .eq("id", content_id)
            .single();

          if (!content) {
            return NextResponse.json({ error: "Content niet gevonden" }, { status: 404 });
          }

          const result = await optimizeContent(content as GeoContent);
          return NextResponse.json({ success: true, ...result });
        }

        // Run auto-optimalisatie
        const optResult = await runAutoOptimization({ maxItems: body.max || 3 });
        return NextResponse.json({ success: true, ...optResult });
      }

      case "run_competitor": {
        const result = await runCompetitorAnalysis();
        return NextResponse.json({ success: true, ...result });
      }

      default:
        return NextResponse.json({ error: `Onbekende actie: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("[GEO ADMIN] POST Error:", error);
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }
}
