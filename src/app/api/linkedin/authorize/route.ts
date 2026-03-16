import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "LinkedIn OAuth is niet geconfigureerd" },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();
  const scopes = ["openid", "profile", "w_member_social"].join(" ");

  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", scopes);

  return NextResponse.json({ url: authUrl.toString(), state });
}
