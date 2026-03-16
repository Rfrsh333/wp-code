import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getActiveLinkedInClient } from "@/lib/linkedin/token-manager";
import { sendTelegramAlert } from "@/lib/telegram";

// Cron: elke 15 minuten — publiceert max 1 geplande post
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();

    // Get next scheduled post that's due
    const { data: post } = await supabaseAdmin
      .from("linkedin_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true })
      .limit(1)
      .single();

    if (!post) {
      return NextResponse.json({ message: "Geen posts gepland", published: 0 });
    }

    const client = await getActiveLinkedInClient();
    if (!client) {
      console.error("[LinkedIn Cron] Geen actieve LinkedIn connectie");
      return NextResponse.json({ error: "LinkedIn niet verbonden" }, { status: 500 });
    }

    // Mark as publishing
    await supabaseAdmin
      .from("linkedin_posts")
      .update({ status: "publishing", updated_at: new Date().toISOString() })
      .eq("id", post.id);

    try {
      let result;
      if (post.post_type === "link" && post.link_url) {
        result = await client.createLinkPost(post.content, post.link_url);
      } else if (post.post_type === "image" && post.image_url) {
        result = await client.createImagePost(post.content, post.image_url);
      } else {
        result = await client.createTextPost(post.content);
      }

      await supabaseAdmin
        .from("linkedin_posts")
        .update({
          status: "published",
          linkedin_post_urn: result.id,
          published_at: new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      await sendTelegramAlert(
        `📤 <b>LinkedIn post automatisch gepubliceerd</b>\n${post.content.substring(0, 100)}...`
      );

      return NextResponse.json({ published: 1, post_id: post.id, urn: result.id });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Onbekende fout";

      await supabaseAdmin
        .from("linkedin_posts")
        .update({
          status: "failed",
          error_message: errorMsg,
          retry_count: (post.retry_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      await sendTelegramAlert(
        `❌ <b>LinkedIn post publicatie mislukt</b>\nFout: ${errorMsg}\nPost: ${post.content.substring(0, 80)}...`
      );

      return NextResponse.json({ error: errorMsg, post_id: post.id }, { status: 500 });
    }
  } catch (error) {
    console.error("[LinkedIn Publish Cron] Error:", error);
    return NextResponse.json({ error: "Cron fout" }, { status: 500 });
  }
}
