import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import {
  getGeoContentList,
  getGeoStats,
  updateGeoContentStatus,
  generateGeoContent,
  saveGeoContent,
} from "@/lib/geo/engine";
import type { GeoContentType, GeoStad } from "@/lib/geo/types";

/**
 * Admin API voor GEO Agent
 * GET: Haal content lijst op + statistieken
 * POST: Genereer nieuwe content of update status
 */

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action") || "list";

    if (action === "stats") {
      const stats = await getGeoStats();
      return NextResponse.json(stats);
    }

    // List content
    const filters = {
      status: searchParams.get("status") || undefined,
      stad: searchParams.get("stad") || undefined,
      content_type: searchParams.get("content_type") || undefined,
    };

    const content = await getGeoContentList(filters);
    return NextResponse.json({ content });
  } catch (error) {
    console.error("[GEO ADMIN] GET Error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "generate": {
        // Genereer nieuwe content
        const { content_type, stad, focus_keywords, extra_context } = body;

        if (!content_type || !stad) {
          return NextResponse.json(
            { error: "content_type en stad zijn verplicht" },
            { status: 400 }
          );
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
          return NextResponse.json(
            { error: "id en status zijn verplicht" },
            { status: 400 }
          );
        }

        const updated = await updateGeoContentStatus(id, status, notities);
        return NextResponse.json({ success: true, content: updated });
      }

      case "bulk_publish": {
        const { ids } = body;
        if (!Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json(
            { error: "ids array is verplicht" },
            { status: 400 }
          );
        }

        const results = [];
        for (const id of ids) {
          try {
            const updated = await updateGeoContentStatus(id, "gepubliceerd");
            results.push({ id, success: true });
          } catch (err) {
            results.push({ id, success: false, error: (err as Error).message });
          }
        }

        return NextResponse.json({ success: true, results });
      }

      default:
        return NextResponse.json(
          { error: `Onbekende actie: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[GEO ADMIN] POST Error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
