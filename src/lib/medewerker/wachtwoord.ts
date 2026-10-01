import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { signMedewerkerSession, type MedewerkerSession } from "@/lib/session";

/** Zelfde kosten als activeren/wachtwoord-reset. */
export const BCRYPT_KOSTEN = 12;

/** Klopt het opgegeven wachtwoord voor deze medewerker? (constant-time via bcrypt) */
export async function controleerWachtwoord(medewerkerId: string, wachtwoord: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("medewerkers").select("wachtwoord").eq("id", medewerkerId).maybeSingle();
  const hash = (data as { wachtwoord?: string | null } | null)?.wachtwoord;
  if (!hash || typeof wachtwoord !== "string" || !wachtwoord) return false;
  return bcrypt.compare(wachtwoord, hash);
}

/**
 * Nieuwe sessie na een wachtwoordwijziging (de oude zijn net ingetrokken). Zelfde cookie-
 * instellingen als /api/medewerker/login; het token gaat ook terug voor Bearer-clients (app).
 */
export async function geefNieuweSessie(sessie: MedewerkerSession): Promise<string> {
  const token = await signMedewerkerSession({
    id: sessie.id,
    naam: sessie.naam,
    email: sessie.email,
    functie: sessie.functie,
  });
  const cookieStore = await cookies();
  cookieStore.set("medewerker_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    path: "/",
  });
  return token;
}
