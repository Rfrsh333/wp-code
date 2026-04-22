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

export async function sendTelegramAlert(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("[TELEGRAM] Bot token or chat ID not configured, skipping alert");
    return;
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
