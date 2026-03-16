import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/admin/linkedin/analytics — aggregated analytics
export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Published posts with analytics
    const { data: posts } = await supabaseAdmin
      .from("linkedin_posts")
      .select("id, content, published_at, impressions, likes, comments, shares, clicks, engagement_rate")
      .eq("status", "published")
      .gte("published_at", since)
      .order("published_at", { ascending: true });

    const all = posts || [];

    // Summary
    const summary = {
      total_posts: all.length,
      total_impressions: all.reduce((s, p) => s + (p.impressions || 0), 0),
      total_likes: all.reduce((s, p) => s + (p.likes || 0), 0),
      total_comments: all.reduce((s, p) => s + (p.comments || 0), 0),
      total_shares: all.reduce((s, p) => s + (p.shares || 0), 0),
      total_clicks: all.reduce((s, p) => s + (p.clicks || 0), 0),
      avg_engagement_rate:
        all.length > 0
          ? all.reduce((s, p) => s + (p.engagement_rate || 0), 0) / all.length
          : 0,
    };

    // Daily aggregation for charts
    const dailyMap = new Map<string, {
      date: string;
      posts: number;
      impressions: number;
      likes: number;
      comments: number;
      shares: number;
    }>();

    for (const post of all) {
      if (!post.published_at) continue;
      const day = post.published_at.split("T")[0];
      const existing = dailyMap.get(day) || {
        date: day,
        posts: 0,
        impressions: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      };
      existing.posts += 1;
      existing.impressions += post.impressions || 0;
      existing.likes += post.likes || 0;
      existing.comments += post.comments || 0;
      existing.shares += post.shares || 0;
      dailyMap.set(day, existing);
    }

    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Top posts by engagement
    const topPosts = [...all]
      .sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        content_preview: p.content?.substring(0, 100) || "",
        published_at: p.published_at,
        impressions: p.impressions,
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        clicks: p.clicks,
      }));

    return NextResponse.json({ summary, daily, topPosts, period_days: days });
  } catch (error) {
    console.error("[LinkedIn Analytics] GET error:", error);
    return NextResponse.json({ error: "Fout bij ophalen analytics" }, { status: 500 });
  }
}
