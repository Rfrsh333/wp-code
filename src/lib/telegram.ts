const TELEGRAM_BOT_TOKEN = "8106175165:AAGc7CgGbvlpA4SEc3ca9aye7cIOiQhlg_Y";
const TELEGRAM_CHAT_ID = "5090477866";

export async function sendTelegramAlert(message: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (error) {
    console.error("Telegram error:", error);
  }
}
