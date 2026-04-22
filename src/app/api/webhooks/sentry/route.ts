import { NextRequest, NextResponse } from "next/server";
import { captureRouteError } from "@/lib/sentry-utils";
import { createHmac } from "crypto";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function verifySentrySignature(body: string, signature: string): boolean {
  const secret = process.env.SENTRY_WEBHOOK_SECRET;
  if (!secret) return false;
  const hmac = createHmac("sha256", secret);
  const digest = hmac.update(body, "utf-8").digest("hex");
  return digest === signature;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("sentry-hook-signature") || "";

  if (!verifySentrySignature(body, signature)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return NextResponse.json({ error: "Telegram not configured" }, { status: 500 });
  }

  try {
    const payload = JSON.parse(body);
    const action = payload.action;
    const data = payload.data;

    // Alleen bij nieuwe issues of error spikes
    if (action !== "created" && action !== "triggered") {
      return NextResponse.json({ ok: true });
    }

    const issue = data?.issue || data?.event || {};
    const title = issue.title || "Onbekende error";
    const culprit = issue.culprit || "";
    const url = issue.web_url || issue.url || "";
    const level = issue.level || "error";
    const count = issue.count || 1;

    const emoji = level === "fatal" ? "🔴" : level === "error" ? "🟠" : "🟡";

    const message = [
      `${emoji} <b>Sentry ${level.toUpperCase()}</b>`,
      ``,
      `<b>${escapeHtml(title)}</b>`,
      culprit ? `<code>${escapeHtml(culprit)}</code>` : "",
      count > 1 ? `Aantal: ${count}x` : "",
      ``,
      url ? `<a href="${url}">Bekijk in Sentry →</a>` : "",
    ].filter(Boolean).join("\n");

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/webhooks/sentry", action: "POST" });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
