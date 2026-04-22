import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRedisRateLimit, formRateLimit, getClientIP } from "@/lib/rate-limit-redis";
import { verifyRecaptcha } from "@/lib/recaptcha";

// Escape PostgREST filter special characters to prevent filter injection
function escapePostgrestFilter(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/\./g, "\\.")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/%/g, "\\%")
    .replace(/\*/g, "\\*");
}

// GET: Publieke FAQ items ophalen (alleen gepubliceerde)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const slug = searchParams.get("slug");

  let query = supabaseAdmin
    .from("faq_items")
    .select("*")
    .eq("status", "published")
    .order("category")
    .order("priority", { ascending: true })
    .limit(100);

  if (category) {
    query = query.eq("category", category);
  }

  if (search) {
    const sanitized = escapePostgrestFilter(search.slice(0, 200));
    query = query.or(`question.ilike.%${sanitized}%,answer.ilike.%${sanitized}%`);
  }

  if (slug) {
    const { data, error } = await supabaseAdmin
      .from("faq_items")
      .select("*")
      .eq("status", "published")
      .eq("slug", slug)
      .limit(1)
      .single();
    if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    return NextResponse.json({ data }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }

  return NextResponse.json({ data }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}

// POST: Bezoeker dient een vraag in
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rateLimit = await checkRedisRateLimit(`faq:${clientIP}`, formRateLimit);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het zo opnieuw." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))) } }
    );
  }

  const body = await request.json();
  const { question, email, name, recaptchaToken } = body;

  if (!recaptchaToken) {
    return NextResponse.json({ error: "reCAPTCHA verificatie vereist" }, { status: 400 });
  }
  const recaptchaResult = await verifyRecaptcha(recaptchaToken);
  if (!recaptchaResult.success) {
    return NextResponse.json({ error: recaptchaResult.error || "Spam detectie mislukt" }, { status: 400 });
  }

  if (!question || typeof question !== "string" || question.trim().length < 10) {
    return NextResponse.json(
      { error: "Vraag moet minimaal 10 tekens bevatten" },
      { status: 400 }
    );
  }

  if (question.length > 500) {
    return NextResponse.json(
      { error: "Vraag mag maximaal 500 tekens bevatten" },
      { status: 400 }
    );
  }

  // Genereer slug van de vraag
  const slug = question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/-$/, "");

  const { error } = await supabaseAdmin.from("faq_items").insert({
    question: question.trim(),
    answer: "",
    category: "Ingediend",
    source: "visitor",
    status: "pending",
    slug: `visitor-${slug}-${Date.now()}`,
    visitor_email: email?.trim() || null,
    visitor_name: name?.trim() || null,
  });

  if (error) {
    return NextResponse.json({ error: "Vraag kon niet worden ingediend" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
