import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const checks = {
    supabase: false,
    resend: Boolean(process.env.RESEND_API_KEY),
    redis: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    cron: Boolean(process.env.CRON_SECRET),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  try {
    const { error } = await supabaseAdmin
      .from("inschrijvingen")
      .select("id", { head: true, count: "exact" });

    checks.supabase = !error;
  } catch {
    checks.supabase = false;
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
    { status: failingChecks.length === 0 ? 200 : 503 }
  );
}
