import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email-service";
import { hashToken } from "@/lib/token-hash";
import { captureRouteError } from "@/lib/sentry-utils";
import { isOntbrekendeKolom } from "@/lib/db-kolom-fallback";
import { renderEmailLayout } from "@/lib/klant-password-reset";
import {
  EMAIL_VERIFICATIE_GELDIG_MS,
  emailVerificatieMailInhoud,
  emailVerificatieUrl,
} from "@/lib/klant-registratie-regels";

/**
 * Onboardingstand van een klant: e-mailadres bevestigd en door TopTalent gecontroleerd.
 * Kolommen uit migratie 20261023_klant_onboarding.sql. Zolang die ontbreken (42703/PGRST204)
 * geldt elke klant als bevestigd en gecontroleerd: alles werkt dan zoals voorheen.
 * Regels: lib/klant-registratie-regels.ts en lib/klant-controle-regels.ts.
 */

export type OnboardingStand = {
  emailBevestigd: boolean;
  gecontroleerd: boolean;
  /** false = migratie nog niet gedraaid (alles zoals voorheen). */
  beschikbaar: boolean;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";
}

export async function laadOnboardingStand(klantId: string): Promise<OnboardingStand> {
  const { data, error } = await supabaseAdmin
    .from("klanten")
    .select("email_geverifieerd_op, gecontroleerd_op")
    .eq("id", klantId)
    .maybeSingle();
  if (isOntbrekendeKolom(error)) return { emailBevestigd: true, gecontroleerd: true, beschikbaar: false };
  if (error) throw error;
  return {
    emailBevestigd: !!data?.email_geverifieerd_op,
    gecontroleerd: !!data?.gecontroleerd_op,
    beschikbaar: true,
  };
}

/** Markeer als gecontroleerd (TopTalent maakte of nodigde de klant uit, of keurde de eerste dienst goed). */
export async function markeerGecontroleerd(klantId: string, route = "lib/klant-onboarding"): Promise<void> {
  const { error } = await supabaseAdmin
    .from("klanten")
    .update({ gecontroleerd_op: new Date().toISOString() })
    .eq("id", klantId)
    .is("gecontroleerd_op", null);
  if (error && !isOntbrekendeKolom(error)) captureRouteError(error, { route, action: "GECONTROLEERD" });
}

/** Markeer het e-mailadres als bevestigd (bevestigingslink, of wachtwoord ingesteld via een maillink). */
export async function markeerEmailBevestigd(klantId: string, route = "lib/klant-onboarding"): Promise<void> {
  const { error } = await supabaseAdmin
    .from("klanten")
    .update({ email_geverifieerd_op: new Date().toISOString(), email_verificatie_token: null, email_verificatie_verloopt_op: null })
    .eq("id", klantId)
    .is("email_geverifieerd_op", null);
  if (error && !isOntbrekendeKolom(error)) captureRouteError(error, { route, action: "EMAIL_BEVESTIGD" });
}

/** Nieuw bevestigingstoken: de klant krijgt het token, de database alleen de hash. */
export function nieuwVerificatieToken(): { token: string; hash: string; verlooptOp: string } {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, hash: hashToken(token), verlooptOp: new Date(Date.now() + EMAIL_VERIFICATIE_GELDIG_MS).toISOString() };
}

export async function stuurVerificatieMail(klant: { email: string; contactpersoon: string | null }, token: string) {
  return sendEmail({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [klant.email],
    replyTo: "info@toptalentjobs.nl",
    subject: "Bevestig uw e-mailadres voor TopTalent Business",
    emailType: "klant_email_verificatie",
    html: renderEmailLayout(emailVerificatieMailInhoud({ contactpersoon: klant.contactpersoon, url: emailVerificatieUrl(getBaseUrl(), token) })),
  });
}

export type OpnieuwResultaat = "verstuurd" | "al_bevestigd" | "niet_beschikbaar" | "mislukt";

/** Nieuwe bevestigingslink voor een ingelogde klant (vorige link vervalt). */
export async function stuurVerificatieOpnieuw(klantId: string, route: string): Promise<OpnieuwResultaat> {
  const { data: klant, error } = await supabaseAdmin
    .from("klanten")
    .select("id, email, contactpersoon, email_geverifieerd_op")
    .eq("id", klantId)
    .maybeSingle();
  if (isOntbrekendeKolom(error)) return "niet_beschikbaar";
  if (error || !klant?.email) return "mislukt";
  if (klant.email_geverifieerd_op) return "al_bevestigd";

  const { token, hash, verlooptOp } = nieuwVerificatieToken();
  const { error: opslaanFout } = await supabaseAdmin
    .from("klanten")
    .update({ email_verificatie_token: hash, email_verificatie_verloopt_op: verlooptOp })
    .eq("id", klant.id);
  if (isOntbrekendeKolom(opslaanFout)) return "niet_beschikbaar";
  if (opslaanFout) {
    captureRouteError(opslaanFout, { route, action: "VERIFICATIE_TOKEN" });
    return "mislukt";
  }
  const { error: mailFout } = await stuurVerificatieMail({ email: klant.email, contactpersoon: klant.contactpersoon }, token);
  if (mailFout) {
    captureRouteError(mailFout, { route, action: "VERIFICATIE_MAIL" });
    return "mislukt";
  }
  return "verstuurd";
}

export type BevestigResultaat = "bevestigd" | "ongeldig" | "niet_beschikbaar";

/** Bevestigt het e-mailadres bij een geldig, ongebruikt token. Eenmalig: het token wordt gewist. */
export async function bevestigEmailMetToken(token: string, route: string): Promise<BevestigResultaat> {
  if (!/^[0-9a-f]{64}$/.test(token)) return "ongeldig";
  const { data, error } = await supabaseAdmin
    .from("klanten")
    .update({ email_geverifieerd_op: new Date().toISOString(), email_verificatie_token: null, email_verificatie_verloopt_op: null })
    .eq("email_verificatie_token", hashToken(token))
    .gt("email_verificatie_verloopt_op", new Date().toISOString())
    .select("id");
  if (isOntbrekendeKolom(error)) return "niet_beschikbaar";
  if (error) {
    captureRouteError(error, { route, action: "BEVESTIGEN" });
    return "ongeldig";
  }
  return data && data.length > 0 ? "bevestigd" : "ongeldig";
}
