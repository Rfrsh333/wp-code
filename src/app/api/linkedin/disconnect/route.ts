import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { disconnectLinkedIn } from "@/lib/linkedin/token-manager";
import { sendTelegramAlert } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const success = await disconnectLinkedIn(email || "");
    if (!success) {
      return NextResponse.json({ error: "Geen actieve connectie gevonden" }, { status: 404 });
    }

    await sendTelegramAlert(`🔌 <b>LinkedIn ontkoppeld</b> door ${email}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[LinkedIn] Disconnect error:", error);
    return NextResponse.json({ error: "Fout bij ontkoppelen" }, { status: 500 });
  }
}
