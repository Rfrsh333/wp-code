import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  // Basis health check voor monitoring (altijd publiek)
  let supabaseOk = false;
  try {
    const { error } = await supabaseAdmin
      .from("inschrijvingen")
      .select("id", { head: true, count: "exact" });
    supabaseOk = !error;
  } catch {
    supabaseOk = false;
  }

  // Alleen admins krijgen gedetailleerde informatie
  const { isAdmin } = await verifyAdmin(request);

  if (!isAdmin) {
    return NextResponse.json(
      { status: supabaseOk ? "ok" : "degraded", timestamp: new Date().toISOString() },
      { status: supabaseOk ? 200 : 503, headers: { "Cache-Control": "no-cache, max-age=60" } }
    );
  }

  // Admin: volledige checks
  const checks: Record<string, boolean> = {
    supabase: supabaseOk,
    resend: Boolean(process.env.RESEND_API_KEY),
    redis: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    cron: Boolean(process.env.CRON_SECRET),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    webhookSecret: Boolean(process.env.RESEND_WEBHOOK_SECRET),
    kandidaatSecret: Boolean(process.env.KANDIDAAT_TOKEN_SECRET),
  };

  if (checks.redis) {
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      await redis.ping();
      checks.redisPing = true;
    } catch {
      checks.redisPing = false;
    }
  }

  const failingChecks = Object.entries(checks)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return NextResponse.json(
    {
      status: failingChecks.length === 0 ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
      failingChecks,
    },
    {
      status: failingChecks.length === 0 ? 200 : 503,
      headers: { "Cache-Control": "no-cache, max-age=60" },
    }
  );
}
