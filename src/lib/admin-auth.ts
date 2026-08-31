import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin authenticatie helpers

export type AdminRole = "owner" | "operations" | "recruiter" | "finance";

const DEFAULT_ADMIN_ROLE: AdminRole = "operations";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const VALID_ROLES: AdminRole[] = ["owner", "operations", "recruiter", "finance"];

function parseAdminRoleMap(): Map<string, AdminRole> {
  const roleMap = new Map<string, AdminRole>();
  const raw = (process.env.ADMIN_ROLE_MAP || "").trim();
  if (!raw) return roleMap;

  const add = (email?: string, role?: string) => {
    const e = (email || "").trim().toLowerCase();
    const r = (role || "").trim().toLowerCase();
    if (e && VALID_ROLES.includes(r as AdminRole)) {
      roleMap.set(normalizeEmail(e), r as AdminRole);
    }
  };

  // Ondersteun zowel JSON ({"email":"role"}) als CSV (email:role,email:role) zodat de
  // waarde niet stilletjes faalt bij een formaatverschil (audit P2-196).
  if (raw.startsWith("{")) {
    try {
      const obj = JSON.parse(raw) as Record<string, string>;
      for (const [email, role] of Object.entries(obj)) add(email, role);
      return roleMap;
    } catch {
      // Val terug op CSV-parsing hieronder.
    }
  }

  raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const [email, role] = entry.split(":");
      add(email, role);
    });

  return roleMap;
}

export function getAdminRole(email: string): AdminRole {
  const normalizedEmail = normalizeEmail(email);

  const explicit = parseAdminRoleMap().get(normalizedEmail);
  if (explicit) return explicit;

  // Escape hatch: de eerste ADMIN_EMAILS-entry is standaard 'owner'. Zo houdt de primaire
  // beheerder altijd volledige toegang, óók bij een lege of verkeerd geformatteerde
  // ADMIN_ROLE_MAP — dit voorkomt dat rol-gates iemand permanent buitensluiten.
  const emails = getAdminEmails().map(normalizeEmail);
  if (emails.length > 0 && emails[0] === normalizedEmail) return "owner";

  return DEFAULT_ADMIN_ROLE;
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
