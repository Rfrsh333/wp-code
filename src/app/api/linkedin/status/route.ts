import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { getActiveConnection } from "@/lib/linkedin/token-manager";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const connection = await getActiveConnection();

    if (!connection) {
      return NextResponse.json({
        connected: false,
        profile: null,
        token_expires_at: null,
      });
    }

    const isExpired = new Date(connection.token_expires_at) <= new Date();

    return NextResponse.json({
      connected: !isExpired,
      expired: isExpired,
      profile: {
        name: connection.profile_name,
        image_url: connection.profile_image_url,
        person_id: connection.linkedin_person_id,
      },
      token_expires_at: connection.token_expires_at,
      scopes: connection.scopes,
    });
  } catch (error) {
    console.error("[LinkedIn] Status error:", error);
    return NextResponse.json({ error: "Fout bij ophalen status" }, { status: 500 });
  }
}
