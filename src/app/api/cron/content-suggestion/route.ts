import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateContent } from "@/lib/agents/content-generator";

// Cron: wekelijks op maandag 9:00
// Genereert 1 blog suggestie + 2 LinkedIn post suggesties
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results: string[] = [];

    // 1 blog
    const blog = await generateContent("blog");
    const blogSlug = blog.titel
      ? blog.titel.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 80)
      : `blog-${Date.now()}`;

    const { error: blogErr } = await supabaseAdmin.from("content_posts").insert({
      type: "blog",
      status: "draft",
      titel: blog.titel,
      inhoud: blog.inhoud,
      meta_description: blog.meta_description || null,
      keywords: blog.keywords || null,
      slug: blogSlug,
    });
    if (!blogErr) results.push(`Blog: "${blog.titel}"`);

    // 2 LinkedIn posts met verschillende types
    const linkedinTypes = ["tip", "mijlpaal"];
    for (const subtype of linkedinTypes) {
      const post = await generateContent("linkedin", subtype);
      const { error: liErr } = await supabaseAdmin.from("content_posts").insert({
        type: "linkedin",
        status: "draft",
        titel: post.titel,
        inhoud: post.inhoud,
      });
      if (!liErr) results.push(`LinkedIn (${subtype}): "${post.titel}"`);
    }

    // Telegram alert (optioneel)
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: `📝 Nieuwe content suggesties klaar:\n${results.join("\n")}\n\nBekijk in admin dashboard → Content tab`,
          }),
        });
      } catch {
        // Telegram niet kritiek
      }
    }

    return NextResponse.json({
      message: `${results.length} content suggesties gegenereerd`,
      posts: results,
    });
  } catch (error) {
    console.error("Content suggestion cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
