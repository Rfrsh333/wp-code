import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

// GET: Alle FAQ items ophalen (admin)
export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const source = searchParams.get("source");

  let query = supabaseAdmin
    .from("faq_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  if (source) query = query.eq("source", source);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST: Nieuwe FAQ aanmaken of bestaande bijwerken
export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { action, id, data } = body;

  if (action === "create") {
    const slug = generateSlug(data.question);
    const { error } = await supabaseAdmin.from("faq_items").insert({
      question: data.question,
      answer: data.answer || "",
      category: data.category || "Overig",
      subcategory: data.subcategory || null,
      source: data.source || "generated",
      status: data.status || "draft",
      slug,
      priority: data.priority || 0,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (action === "update" && id) {
    const updateData: Record<string, unknown> = { ...data };
    // Als de vraag verandert, update de slug ook
    if (data.question && !data.slug) {
      updateData.slug = generateSlug(data.question);
    }

    const { error } = await supabaseAdmin
      .from("faq_items")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (action === "delete" && id) {
    const { error } = await supabaseAdmin
      .from("faq_items")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (action === "bulk_create" && Array.isArray(data)) {
    const items = data.map((item: { question: string; answer: string; category: string; subcategory?: string; priority?: number }) => ({
      question: item.question,
      answer: item.answer,
      category: item.category,
      subcategory: item.subcategory || null,
      source: "generated",
      status: "published",
      slug: generateSlug(item.question),
      priority: item.priority || 0,
    }));

    const { error } = await supabaseAdmin.from("faq_items").insert(items);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: items.length });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

function generateSlug(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/-$/, "");
}
