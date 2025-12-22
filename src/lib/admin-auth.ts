import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin authenticatie helpers

/**
 * Checkt of een email adres een admin is
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Haalt de lijst van admin emails op
 */
export function getAdminEmails(): string[] {
  return process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
}

/**
 * Verifieert of een request van een admin komt
 * Checkt zowel of de user geauthenticeerd is ALS of het een admin email is
 */
export async function verifyAdmin(request: NextRequest): Promise<{ isAdmin: boolean; email?: string }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { isAdmin: false };
  }

  const token = authHeader.split(" ")[1];
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user || !user.email) {
    return { isAdmin: false };
  }

  // KRITIEK: Check of de user email ook daadwerkelijk een admin email is
  if (!isAdminEmail(user.email)) {
    return { isAdmin: false, email: user.email };
  }

  return { isAdmin: true, email: user.email };
}
