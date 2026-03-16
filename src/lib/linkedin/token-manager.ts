// ============================================================
// LinkedIn OAuth Token Manager
// ============================================================

import { supabaseAdmin } from "@/lib/supabase";
import { LinkedInClient } from "./client";
import type { LinkedInConnection } from "@/types/linkedin";

const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

interface TokenRefreshResult {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

export async function getActiveConnection(): Promise<LinkedInConnection | null> {
  const { data, error } = await supabaseAdmin
    .from("linkedin_connections")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as LinkedInConnection;
}

export async function isLinkedInConnected(): Promise<boolean> {
  const connection = await getActiveConnection();
  if (!connection) return false;
  return new Date(connection.token_expires_at) > new Date();
}

export async function getActiveLinkedInClient(): Promise<LinkedInClient | null> {
  const connection = await getActiveConnection();
  if (!connection) return null;

  // Check if token is expired
  const now = new Date();
  const expiresAt = new Date(connection.token_expires_at);

  if (expiresAt <= now) {
    // Try to refresh
    if (connection.refresh_token) {
      const refreshed = await refreshAccessToken(connection);
      if (refreshed) {
        return new LinkedInClient(refreshed.access_token, connection.linkedin_person_id);
      }
    }
    return null;
  }

  // Token expires within 1 hour — refresh proactively
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  if (expiresAt <= oneHourFromNow && connection.refresh_token) {
    refreshAccessToken(connection).catch(console.error);
  }

  return new LinkedInClient(connection.access_token, connection.linkedin_person_id);
}

export async function refreshAccessToken(
  connection: LinkedInConnection
): Promise<TokenRefreshResult | null> {
  if (!connection.refresh_token) return null;

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[LinkedIn] Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET");
    return null;
  }

  try {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const res = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error(`[LinkedIn] Token refresh failed (${res.status}): ${error}`);

      // Mark connection as inactive if refresh permanently fails
      if (res.status === 401 || res.status === 400) {
        await supabaseAdmin
          .from("linkedin_connections")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", connection.id);
      }
      return null;
    }

    const data: TokenRefreshResult = await res.json();

    // Update stored tokens
    const updateData: Record<string, unknown> = {
      access_token: data.access_token,
      token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (data.refresh_token) {
      updateData.refresh_token = data.refresh_token;
      if (data.refresh_token_expires_in) {
        updateData.refresh_token_expires_at = new Date(
          Date.now() + data.refresh_token_expires_in * 1000
        ).toISOString();
      }
    }

    await supabaseAdmin
      .from("linkedin_connections")
      .update(updateData)
      .eq("id", connection.id);

    console.log("[LinkedIn] Token refreshed successfully");
    return data;
  } catch (error) {
    console.error("[LinkedIn] Token refresh error:", error);
    return null;
  }
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
} | null> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.error("[LinkedIn] Missing OAuth env vars");
    return null;
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error(`[LinkedIn] Code exchange failed (${res.status}): ${error}`);
    return null;
  }

  return res.json();
}

export async function disconnectLinkedIn(userEmail: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("linkedin_connections")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_email", userEmail)
    .eq("is_active", true);

  return !error;
}
