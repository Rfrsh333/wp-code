import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin authenticatie helpers

export type AdminRole = "owner" | "operations" | "recruiter" | "finance";

const DEFAULT_ADMIN_ROLE: AdminRole = "operations";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseAdminRoleMap(): Map<string, AdminRole> {
  const roleMap = new Map<string, AdminRole>();
  const raw = process.env.ADMIN_ROLE_MAP || "";

  raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const [email, role] = entry.split(":").map((value) => value.trim().toLowerCase());
      if (!email || !role) return;
      if (["owner", "operations", "recruiter", "finance"].includes(role)) {
        roleMap.set(normalizeEmail(email), role as AdminRole);
      }
    });

  return roleMap;
}

export function getAdminRole(email: string): AdminRole {
  const normalizedEmail = normalizeEmail(email);
  const roleMap = parseAdminRoleMap();
  return roleMap.get(normalizedEmail) || DEFAULT_ADMIN_ROLE;
}

export function hasRequiredAdminRole(
  role: AdminRole | undefined,
  allowedRoles: AdminRole[]
): boolean {
  return Boolean(role && allowedRoles.includes(role));
}

/**
 * Checkt of een email adres een admin is
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => normalizeEmail(e)) || [];
  return adminEmails.includes(normalizeEmail(email));
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
export async function verifyAdmin(
  request: NextRequest
): Promise<{ isAdmin: boolean; email?: string; role?: AdminRole }> {
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

  return {
    isAdmin: true,
    email: user.email,
    role: getAdminRole(user.email),
  };
}
