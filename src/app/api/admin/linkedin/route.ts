import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { linkedinPostActionSchema, formatZodErrors } from "@/lib/validations";
import { getActiveLinkedInClient } from "@/lib/linkedin/token-manager";
import {
  generateLinkedInPost,
  convertBlogToLinkedIn,
  generateBatchPosts,
} from "@/lib/linkedin/content-generator";
import { sendTelegramAlert } from "@/lib/telegram";

// GET /api/admin/linkedin — list posts + stats
export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabaseAdmin
      .from("linkedin_posts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);

    const { data: posts, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Stats
    const { data: allPosts } = await supabaseAdmin
      .from("linkedin_posts")
      .select("status, impressions, likes, comments, shares, clicks, published_at");

    const all = allPosts || [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const published = all.filter((p) => p.status === "published");
    const stats = {
      total_posts: all.length,
      drafts: all.filter((p) => p.status === "draft").length,
      approved: all.filter((p) => p.status === "approved").length,
      scheduled: all.filter((p) => p.status === "scheduled").length,
      published: published.length,
      failed: all.filter((p) => p.status === "failed").length,
      total_impressions: published.reduce((s, p) => s + (p.impressions || 0), 0),
      total_likes: published.reduce((s, p) => s + (p.likes || 0), 0),
      total_comments: published.reduce((s, p) => s + (p.comments || 0), 0),
      total_shares: published.reduce((s, p) => s + (p.shares || 0), 0),
      total_clicks: published.reduce((s, p) => s + (p.clicks || 0), 0),
      posts_this_week: published.filter(
        (p) => p.published_at && new Date(p.published_at) >= weekAgo
      ).length,
      posts_this_month: published.filter(
        (p) => p.published_at && new Date(p.published_at) >= monthAgo
      ).length,
    };

    return NextResponse.json({ posts: posts || [], total: count, stats });
  } catch (error) {
    console.error("[LinkedIn] GET error:", error);
    return NextResponse.json({ error: "Fout bij ophalen" }, { status: 500 });
  }
}

// POST /api/admin/linkedin — actions
export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = linkedinPostActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodErrors(parsed.error) },
        { status: 400 }
      );
    }

    const data = parsed.data;

    switch (data.action) {
      case "create": {
        const { action: _, ...postData } = data;
        const { data: post, error } = await supabaseAdmin
          .from("linkedin_posts")
          .insert({
            ...postData,
            status: postData.scheduled_for ? "scheduled" : "draft",
            created_by: email,
          })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ post });
      }

      case "update": {
        const { action: _, id, ...updateData } = data;
        const { error } = await supabaseAdmin
          .from("linkedin_posts")
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq("id", id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case "delete": {
        const { error } = await supabaseAdmin
          .from("linkedin_posts")
          .delete()
          .eq("id", data.id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case "approve": {
        const { error } = await supabaseAdmin
          .from("linkedin_posts")
          .update({
            status: "approved",
            approved_by: email,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id)
          .in("status", ["draft"]);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case "schedule": {
        const { error } = await supabaseAdmin
          .from("linkedin_posts")
          .update({
            status: "scheduled",
            scheduled_for: data.scheduled_for,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id)
          .in("status", ["draft", "approved"]);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case "publish_now": {
        const { data: post } = await supabaseAdmin
          .from("linkedin_posts")
          .select("*")
          .eq("id", data.id)
          .single();

        if (!post) return NextResponse.json({ error: "Post niet gevonden" }, { status: 404 });

        const client = await getActiveLinkedInClient();
        if (!client) {
          return NextResponse.json(
            { error: "LinkedIn is niet verbonden of token is verlopen" },
            { status: 400 }
          );
        }

        // Mark as publishing
        await supabaseAdmin
          .from("linkedin_posts")
          .update({ status: "publishing", updated_at: new Date().toISOString() })
          .eq("id", data.id);

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
            .eq("id", data.id);

          await sendTelegramAlert(
            `📤 <b>LinkedIn post gepubliceerd</b>\n${post.content.substring(0, 100)}...`
          );

          return NextResponse.json({ success: true, urn: result.id });
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
            .eq("id", data.id);

          return NextResponse.json({ error: errorMsg }, { status: 500 });
        }
      }

      case "retry": {
        // Reset failed post to approved for re-publishing
        const { error } = await supabaseAdmin
          .from("linkedin_posts")
          .update({
            status: "approved",
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id)
          .eq("status", "failed");

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case "generate": {
        const result = await generateLinkedInPost({
          categorie: data.categorie,
          template_id: data.template_id,
          context: data.context,
        });

        const { data: post, error } = await supabaseAdmin
          .from("linkedin_posts")
          .insert({
            content: result.content,
            hashtags: result.hashtags,
            template_id: result.template_id || null,
            status: "draft",
            post_type: "text",
            created_by: email,
          })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ post });
      }

      case "generate_from_blog": {
        const result = await convertBlogToLinkedIn(data.content_post_id);
        if (!result) {
          return NextResponse.json({ error: "Blog post niet gevonden of conversie mislukt" }, { status: 400 });
        }

        const { data: post, error } = await supabaseAdmin
          .from("linkedin_posts")
          .insert({
            content: result.content,
            hashtags: result.hashtags,
            link_url: result.link_url,
            content_post_id: data.content_post_id,
            status: "draft",
            post_type: "link",
            created_by: email,
          })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ post });
      }

      case "generate_batch": {
        const results = await generateBatchPosts(data.count, data.categorie);
        const inserts = results.map((r) => ({
          content: r.content,
          hashtags: r.hashtags,
          template_id: r.template_id || null,
          status: "draft" as const,
          post_type: "text" as const,
          created_by: email,
        }));

        const { data: posts, error } = await supabaseAdmin
          .from("linkedin_posts")
          .insert(inserts)
          .select();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ posts, count: posts?.length || 0 });
      }

      case "bulk_approve": {
        const { error } = await supabaseAdmin
          .from("linkedin_posts")
          .update({
            status: "approved",
            approved_by: email,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in("id", data.ids)
          .eq("status", "draft");

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, count: data.ids.length });
      }

      case "bulk_delete": {
        const { error } = await supabaseAdmin
          .from("linkedin_posts")
          .delete()
          .in("id", data.ids);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, count: data.ids.length });
      }

      default:
        return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
    }
  } catch (error) {
    console.error("[LinkedIn] POST error:", error);
    return NextResponse.json({ error: "Fout bij verwerken" }, { status: 500 });
  }
}
