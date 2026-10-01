import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMedewerkerSession, type MedewerkerSession } from "@/lib/session";

/**
 * Sessie voor de boete-routes (status, boetes, betaal-boete).
 *
 * `getMedewerkerSession` (portal-auth) laat alleen `actief` door. Een medewerker die
 * met een lopende sessie wordt gepauzeerd (openstaande boete) moet de boete nog wel
 * kunnen zien en betalen; daarom staat dit helpertje ook `gepauzeerd` toe. De
 * sessie-intrekking (`sessie_geldig_vanaf`) werkt hetzelfde als in portal-auth.
 *
 * Bewust een apart bestand: portal-auth is gedeeld met het klantportaal.
 */
const TOEGESTAAN = ["actief", "gepauzeerd"];

export type MedewerkerBoeteSessie = MedewerkerSession & { status: string };

export async function getMedewerkerSessieInclGepauzeerd(request?: Request): Promise<MedewerkerBoeteSessie | null> {
  let token: string | null = null;
  const header = request?.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) token = header.slice(7).trim() || null;
  if (!token) token = (await cookies()).get("medewerker_session")?.value ?? null;
  if (!token) return null;

  const session = await verifyMedewerkerSession(token);
  if (!session) return null;

  type AccountRow = { status: string | null; sessie_geldig_vanaf?: string | null };
  const volledig = await supabaseAdmin
    .from("medewerkers")
    .select("status, sessie_geldig_vanaf")
    .eq("id", session.id)
    .maybeSingle();
  let account = volledig.data as AccountRow | null;
  if (volledig.error?.code === "42703") {
    // Migratie 20261001_portaal_sessies nog niet gedraaid: zonder intrekking verder.
    const fallback = await supabaseAdmin.from("medewerkers").select("status").eq("id", session.id).maybeSingle();
    if (fallback.error) return null;
    account = fallback.data as AccountRow | null;
  } else if (volledig.error) {
    return null;
  }
  if (!account) return null;

  if (!TOEGESTAAN.includes(account.status ?? "")) return null;
  if (
    account.sessie_geldig_vanaf &&
    session.iat &&
    session.iat * 1000 < new Date(account.sessie_geldig_vanaf).getTime() - 1000
  ) {
    return null;
  }
  return { ...session, status: account.status ?? "actief" };
}
