import { NextRequest, NextResponse } from "next/server";
import { getActiveConnection, refreshAccessToken } from "@/lib/linkedin/token-manager";
import { sendTelegramAlert } from "@/lib/telegram";

// Cron: dagelijks — token refresh als het bijna verloopt
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const connection = await getActiveConnection();

    if (!connection) {
      return NextResponse.json({ message: "Geen actieve LinkedIn connectie", refreshed: false });
    }

    const now = new Date();
    const expiresAt = new Date(connection.token_expires_at);
    const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    // Refresh if token expires within 7 days
    if (daysUntilExpiry > 7) {
      return NextResponse.json({
        message: `Token nog ${Math.round(daysUntilExpiry)} dagen geldig`,
        refreshed: false,
      });
    }

    if (!connection.refresh_token) {
      await sendTelegramAlert(
        `⚠️ <b>LinkedIn token verloopt over ${Math.round(daysUntilExpiry)} dagen</b>\nGeen refresh token beschikbaar. Handmatig opnieuw verbinden nodig.`
      );
      return NextResponse.json({
        message: "Geen refresh token — handmatig opnieuw verbinden",
        refreshed: false,
        days_until_expiry: Math.round(daysUntilExpiry),
      });
    }

    const result = await refreshAccessToken(connection);

    if (result) {
      return NextResponse.json({ refreshed: true });
    }

    await sendTelegramAlert(
      `❌ <b>LinkedIn token refresh mislukt</b>\nToken verloopt over ${Math.round(daysUntilExpiry)} dagen. Controleer de connectie.`
    );

    return NextResponse.json({ refreshed: false, error: "Refresh mislukt" }, { status: 500 });
  } catch (error) {
    console.error("[LinkedIn Token Refresh Cron] Error:", error);
    return NextResponse.json({ error: "Cron fout" }, { status: 500 });
  }
}
