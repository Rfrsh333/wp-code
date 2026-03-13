import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

// GET: Alle tickets ophalen (admin)
export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const category = searchParams.get("category");

  let query = supabaseAdmin
    .from("tickets")
    .select("*, ai_similar_faq:faq_items!ai_similar_faq_id(id, question, slug), linked_faq:faq_items!linked_faq_id(id, question, slug)")
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (priority && priority !== "all") query = query.eq("ai_priority", priority);
  if (category && category !== "all") query = query.eq("ai_category", category);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST: Ticket acties (update status, link FAQ, etc.)
export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { action, id, data } = body;

  switch (action) {
    case "update_status": {
      const updateData: Record<string, unknown> = { status: data.status };
      if (data.status === "answered") {
        updateData.answered_at = new Date().toISOString();
      }
      const { error } = await supabaseAdmin
        .from("tickets")
        .update(updateData)
        .eq("id", id);
      if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    case "link_faq": {
      const { error } = await supabaseAdmin
        .from("tickets")
        .update({
          linked_faq_id: data.faq_id,
          status: "answered",
          answered_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    case "answer_as_faq": {
      // Create new FAQ from ticket
      const slug = data.question
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 80);

      const { data: newFaq, error: faqError } = await supabaseAdmin
        .from("faq_items")
        .insert({
          question: data.question,
          answer: data.answer,
          category: data.category || "Overig",
          source: "visitor",
          status: data.publish ? "published" : "draft",
          slug,
          priority: 0,
        })
        .select()
        .single();

      if (faqError) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });

      // Link ticket to new FAQ
      await supabaseAdmin
        .from("tickets")
        .update({
          linked_faq_id: newFaq.id,
          status: "answered",
          answered_at: new Date().toISOString(),
        })
        .eq("id", id);

      return NextResponse.json({ success: true, faq: newFaq });
    }

    case "stats": {
      const [
        { count: totalFaqs },
        { count: openTickets },
        { count: highPriority },
        { count: weekTickets },
      ] = await Promise.all([
        supabaseAdmin.from("faq_items").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabaseAdmin.from("tickets").select("id", { count: "exact", head: true }).in("status", ["new", "in_review"]),
        supabaseAdmin.from("tickets").select("id", { count: "exact", head: true }).eq("ai_priority", "high").in("status", ["new", "in_review"]),
        supabaseAdmin.from("tickets").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      return NextResponse.json({
        totalFaqs: totalFaqs || 0,
        openTickets: openTickets || 0,
        highPriority: highPriority || 0,
        weekTickets: weekTickets || 0,
      });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
