import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { listActiveSources } from "@/lib/content/repository";
import { logAuditEvent } from "@/lib/audit-log";

const sourceInputSchema = z.object({
  name: z.string().min(2),
  sourceType: z.enum(["rss", "scrape", "manual"]),
  sourceUrl: z.string().url(),
  rssUrl: z.string().url().nullable(),
  categoryFocus: z.array(z.string()).min(1),
  region: z.string().nullable(),
  trustLevel: z.enum(["low", "medium", "high", "verified"]),
  fetchFrequency: z.enum(["hourly", "every_6_hours", "daily", "weekly"]),
});

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const sources = await listActiveSources();
  return NextResponse.json({ sources });
}

export async function POST(request: NextRequest) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const parsed = sourceInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid source payload" }, { status: 400 });
  }

  const payload = parsed.data;
  const { error } = await supabaseAdmin.from("sources").insert({
    name: payload.name,
    source_type: payload.sourceType,
    source_url: payload.sourceUrl,
    rss_url: payload.rssUrl,
    category_focus: payload.categoryFocus,
    region: payload.region,
    trust_level: payload.trustLevel,
    fetch_frequency: payload.fetchFrequency,
    is_active: true,
  });

  if (error) {
    console.error("[content] Failed to create source", error);
    return NextResponse.json({ error: "Source could not be created" }, { status: 500 });
  }

  await logAuditEvent({
    actorEmail: email,
    actorRole: role,
    action: "content_source_created",
    targetTable: "sources",
    targetId: null,
    summary: `Content source toegevoegd: ${payload.name}`,
    metadata: payload,
  });

  const sources = await listActiveSources();
  return NextResponse.json({ sources });
}
