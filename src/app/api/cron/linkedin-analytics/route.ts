import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getActiveLinkedInClient } from "@/lib/linkedin/token-manager";

// Cron: dagelijks — analytics ophalen voor gepubliceerde posts
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await getActiveLinkedInClient();
    if (!client) {
      return NextResponse.json({ message: "LinkedIn niet verbonden", updated: 0 });
    }

    // Get published posts from last 90 days that have a URN
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: posts } = await supabaseAdmin
      .from("linkedin_posts")
      .select("id, linkedin_post_urn")
      .eq("status", "published")
      .not("linkedin_post_urn", "is", null)
      .gte("published_at", ninetyDaysAgo)
      .order("published_at", { ascending: false })
      .limit(50);

    if (!posts || posts.length === 0) {
      return NextResponse.json({ message: "Geen posts om te updaten", updated: 0 });
    }

    let updated = 0;
    const errors: string[] = [];

    for (const post of posts) {
      try {
        const analytics = await client.getPostAnalytics(post.linkedin_post_urn!);
        if (!analytics) continue;

        const stats = analytics.totalShareStatistics;
        const totalEngagement = stats.likeCount + stats.commentCount + stats.shareCount + stats.clickCount;
        const engagementRate = stats.impressionCount > 0
          ? (totalEngagement / stats.impressionCount) * 100
          : 0;

        await supabaseAdmin
          .from("linkedin_posts")
          .update({
            impressions: stats.impressionCount,
            likes: stats.likeCount,
            comments: stats.commentCount,
            shares: stats.shareCount,
            clicks: stats.clickCount,
            engagement_rate: Math.round(engagementRate * 100) / 100,
            analytics_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", post.id);

        updated++;

        // Rate limiting: wait between API calls
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        errors.push(`${post.id}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    return NextResponse.json({
      updated,
      total: posts.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[LinkedIn Analytics Cron] Error:", error);
    return NextResponse.json({ error: "Cron fout" }, { status: 500 });
  }
}
