import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const showAll = request.nextUrl.searchParams.get("all") === "true";

  const { data, error } = await supabaseAdmin
    .from("normalized_articles")
    .select(`
      id,
      title,
      canonical_url,
      source_name,
      published_at,
      article_analysis (
        is_relevant,
        primary_audience,
        category,
        impact_level,
        urgency_level,
        confidence_score,
        summary
      )
    `)
    .order("published_at", { ascending: false })
    .limit(showAll ? 50 : 25);

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ articles: [] });
    }

    console.error("[content] Failed to load article overview", error);
    return NextResponse.json({ error: "Articles konden niet geladen worden" }, { status: 500 });
  }

  const allArticles = (data ?? []).map((row) => {
    const analysis = Array.isArray(row.article_analysis) ? row.article_analysis[0] : row.article_analysis;

    return {
      id: String(row.id),
      title: String(row.title),
      canonicalUrl: String(row.canonical_url),
      sourceName: String(row.source_name),
      publishedAt: (row.published_at as string | null) ?? null,
      analysis: analysis
        ? {
            isRelevant: Boolean(analysis.is_relevant),
            primaryAudience: (analysis.primary_audience as string | null) ?? null,
            category: (analysis.category as string | null) ?? null,
            impactLevel: (analysis.impact_level as string | null) ?? null,
            urgencyLevel: (analysis.urgency_level as string | null) ?? null,
            confidenceScore: Number(analysis.confidence_score ?? 0),
            summary: (analysis.summary as string | null) ?? null,
          }
        : null,
    };
  });

  const articles = showAll
    ? allArticles
    : allArticles.filter((a) => a.analysis?.isRelevant !== false);

  return NextResponse.json({ articles, totalUnfiltered: allArticles.length });
}
