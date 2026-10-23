import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import {
  verifyKlantSession,
  verifyMedewerkerSession,
  type KlantSession,
  type MedewerkerSession,
} from "@/lib/session";

/**
 * Eén plek voor portaal-authenticatie (klant + medewerker).
 *
 * - Token komt uit de httpOnly-cookie (web) óf uit `Authorization: Bearer` (native app).
 * - Na de JWT-check wordt de account-status in de database gecontroleerd, zodat een
 *   gedeactiveerd account meteen geen toegang meer heeft (de JWT zelf leeft 7 dagen).
 * - Zodra kolom `sessie_geldig_vanaf` bestaat (migratie 20261001_portaal_sessies.sql),
 *   worden tokens die daarvóór zijn uitgegeven geweigerd: uitloggen-overal / wachtwoord
 *   wijzigen trekt zo alle sessies in. Zonder die kolom valt de check stil weg.
 */

const MEDEWERKER_TOEGESTAAN = ["actief"];
const KLANT_TOEGESTAAN = ["actief"];

async function readToken(cookieName: string, request?: Request): Promise<string | null> {
  const header = request?.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  const cookieStore = await cookies();
  return cookieStore.get(cookieName)?.value ?? null;
}

type AccountRow = { status: string | null; sessie_geldig_vanaf?: string | null };

async function loadAccount(table: "medewerkers" | "klanten", id: string): Promise<AccountRow | null> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("status, sessie_geldig_vanaf")
    .eq("id", id)
    .maybeSingle();

  // 42703 = kolom bestaat niet (migratie nog niet gedraaid) → zonder intrekking verder.
  if (error?.code === "42703") {
    const fallback = await supabaseAdmin.from(table).select("status").eq("id", id).maybeSingle();
    return (fallback.data as AccountRow | null) ?? null;
  }
  if (error) return null;
  return (data as AccountRow | null) ?? null;
}

function isRevoked(account: AccountRow, iat?: number): boolean {
  if (!account.sessie_geldig_vanaf || !iat) return false;
  return iat * 1000 < new Date(account.sessie_geldig_vanaf).getTime() - 1000;
}

export async function getMedewerkerSession(request?: Request): Promise<MedewerkerSession | null> {
  const token = await readToken("medewerker_session", request);
  if (!token) return null;
  const session = await verifyMedewerkerSession(token);
  if (!session) return null;

  const account = await loadAccount("medewerkers", session.id);
  if (!account || !MEDEWERKER_TOEGESTAAN.includes(account.status ?? "")) return null;
  if (isRevoked(account, session.iat)) return null;
  return session;
}

export async function getKlantSession(request?: Request): Promise<KlantSession | null> {
  const token = await readToken("klant_session", request);
  if (!token) return null;
  const session = await verifyKlantSession(token);
  if (!session) return null;

  const account = await loadAccount("klanten", session.id);
  if (!account || !KLANT_TOEGESTAAN.includes(account.status ?? "")) return null;
  if (isRevoked(account, session.iat)) return null;
  return session;
}

/** Trekt alle bestaande sessies van een account in (no-op zonder migratie). */
export async function revokeSessions(table: "medewerkers" | "klanten", id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from(table)
    .update({ sessie_geldig_vanaf: new Date().toISOString() })
    .eq("id", id);
  if (error && error.code !== "42703" && error.code !== "PGRST204") {
    throw error;
  }
}
