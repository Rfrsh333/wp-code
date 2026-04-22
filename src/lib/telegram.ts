const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Escape user input for Telegram HTML parse mode
function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export { escapeTelegramHtml };

// Rate-limit: max 1 alert per dedupeKey per cooldown period
const alertCooldowns = new Map<string, number>();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minuten

// Auto-clean cooldown map every 10 minutes to prevent memory leak
let lastCleanup = Date.now();
function cleanupCooldowns() {
  const now = Date.now();
  if (now - lastCleanup < 10 * 60 * 1000) return;
  lastCleanup = now;
  for (const [key, timestamp] of alertCooldowns) {
    if (now - timestamp > COOLDOWN_MS) alertCooldowns.delete(key);
  }
}

export async function sendTelegramAlert(message: string, dedupeKey?: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("[TELEGRAM] Bot token or chat ID not configured, skipping alert");
    return;
  }

  // Rate-limit check
  if (dedupeKey) {
    cleanupCooldowns();
    const lastSent = alertCooldowns.get(dedupeKey) || 0;
    if (Date.now() - lastSent < COOLDOWN_MS) return;
    alertCooldowns.set(dedupeKey, Date.now());
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`Telegram API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Telegram request timed out after 10s");
    } else {
      console.error("Telegram error:", error);
    }
  } finally {
    clearTimeout(timeout);
  }
}
