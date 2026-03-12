import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const checks: Record<string, boolean> = {
    supabase: false,
    resend: Boolean(process.env.RESEND_API_KEY),
    redis: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    cron: Boolean(process.env.CRON_SECRET),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    webhookSecret: Boolean(process.env.RESEND_WEBHOOK_SECRET),
    kandidaatSecret: Boolean(process.env.KANDIDAAT_TOKEN_SECRET),
  };

  // Supabase connectivity check
  try {
    const { error } = await supabaseAdmin
      .from("inschrijvingen")
      .select("id", { head: true, count: "exact" });

    checks.supabase = !error;
  } catch {
    checks.supabase = false;
  }

  // Redis connectivity check
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
