import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { generateContent } from "@/lib/agents/content-generator";
import { contentPostSchema, validateAdminBody } from "@/lib/validations-admin";

// GET /api/admin/content - Alle content posts ophalen
export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    let query = supabaseAdmin
      .from("content_posts")
      .select("id, type, status, titel, inhoud, meta_description, keywords, slug, gepubliceerd_op, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (type) query = query.eq("type", type);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });

    // Stats
    const all = data || [];
    const stats = {
      totaal: all.length,
      drafts: all.filter(p => p.status === "draft").length,
      published: all.filter(p => p.status === "published").length,
      blogs: all.filter(p => p.type === "blog").length,
      linkedin: all.filter(p => p.type === "linkedin").length,
    };

    return NextResponse.json({ posts: all, stats }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Content GET error:", error);
    return NextResponse.json({ error: "Fout bij ophalen content" }, { status: 500 });
  }
}

// POST /api/admin/content - Content genereren, opslaan, publiceren
export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await request.json();
    const validation = validateAdminBody(contentPostSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { action } = body;

    if (action === "generate") {
      const { type, subtype } = body;
      if (!type || !["blog", "linkedin"].includes(type)) {
        return NextResponse.json({ error: "type moet 'blog' of 'linkedin' zijn" }, { status: 400 });
      }

      const result = await generateContent(type, subtype);

      // Genereer slug voor blogs
      const slug = type === "blog" && result.titel
        ? result.titel.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 80)
        : null;

      // Sla op als draft
      const { data: post, error } = await supabaseAdmin
        .from("content_posts")
        .insert({
          type,
          status: "draft",
          titel: result.titel,
          inhoud: result.inhoud,
          meta_description: result.meta_description || null,
          keywords: result.keywords || null,
          slug,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      return NextResponse.json({ post });
    }

    if (action === "update") {
      const { id, titel, inhoud, meta_description, keywords, status: newStatus } = body;
      if (!id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });

      const updateData: Record<string, unknown> = {};
      if (titel !== undefined) updateData.titel = titel;
      if (inhoud !== undefined) updateData.inhoud = inhoud;
      if (meta_description !== undefined) updateData.meta_description = meta_description;
      if (keywords !== undefined) updateData.keywords = keywords;
      if (newStatus) updateData.status = newStatus;

      await supabaseAdmin.from("content_posts").update(updateData).eq("id", id);
      return NextResponse.json({ success: true });
    }

    if (action === "publish") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });

      await supabaseAdmin
        .from("content_posts")
        .update({ status: "published", gepubliceerd_op: new Date().toISOString() })
        .eq("id", id);

      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });
      await supabaseAdmin.from("content_posts").delete().eq("id", id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
  } catch (error) {
    console.error("Content POST error:", error);
    return NextResponse.json({ error: "Fout bij verwerken" }, { status: 500 });
  }
}
