import { sendEmail } from "@/lib/email-service";
import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import { isOntbrekendeKolom } from "@/lib/db-kolom-fallback";
import { markeerGecontroleerd } from "@/lib/klant-onboarding";
import {
  createKlantPasswordResetToken,
  klantResetBeschikbaar,
  renderEmailLayout,
  ResetNietBeschikbaarError,
  RESET_NIET_BESCHIKBAAR_MELDING,
} from "@/lib/klant-password-reset";
import {
  beoordeelUitnodiging,
  KLANT_UITNODIGING_GELDIG_MS,
  uitnodigingMailInhoud,
  uitnodigingUrl,
  type UitnodigingWeigering,
} from "@/lib/klant-uitnodiging-regels";

/**
 * Uitnodiging "wachtwoord instellen" voor een klant die TopTalent zelf aanmaakt.
 * Regels en mailtekst: lib/klant-uitnodiging-regels.ts. Token en reset-pagina: die van
 * "wachtwoord vergeten" (lib/klant-password-reset.ts), maar 7 dagen geldig.
 */

export type UitnodigingResultaat =
  | { ok: true; email: string; geldigTot: string }
  | {
      ok: false;
      reden: UitnodigingWeigering | "niet_gevonden" | "niet_beschikbaar" | "mail_mislukt";
      melding: string;
    };

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";
}

export async function stuurKlantUitnodiging(
  klantId: string,
  opties: { heractiveren?: boolean; route?: string } = {},
): Promise<UitnodigingResultaat> {
  const route = opties.route || "lib/klant-uitnodiging";
  const { data: klant, error } = await supabaseAdmin
    .from("klanten")
    .select("id, bedrijfsnaam, contactpersoon, email, status")
    .eq("id", klantId)
    .maybeSingle();

  if (error || !klant) {
    if (error) captureRouteError(error, { route, action: "UITNODIGING_LADEN" });
    return { ok: false, reden: "niet_gevonden", melding: "Klant niet gevonden." };
  }

  const oordeel = beoordeelUitnodiging(klant, { heractiveren: opties.heractiveren });
  if (!oordeel.ok) return oordeel;

  // Zonder de resetkolommen (migratie 20261001_klant_portaal.sql) kan er geen link gemaakt worden.
  if (!(await klantResetBeschikbaar())) {
    return { ok: false, reden: "niet_beschikbaar", melding: RESET_NIET_BESCHIKBAAR_MELDING };
  }

  if (oordeel.zetActief) {
    const { error: statusFout } = await supabaseAdmin.from("klanten").update({ status: "actief" }).eq("id", klant.id);
    if (statusFout) {
      captureRouteError(statusFout, { route, action: "UITNODIGING_STATUS" });
      return { ok: false, reden: "mail_mislukt", melding: "Account activeren mislukt; er is geen uitnodiging verstuurd." };
    }
  }

  let token: string;
  try {
    token = await createKlantPasswordResetToken(klant.id, KLANT_UITNODIGING_GELDIG_MS);
  } catch (e) {
    if (e instanceof ResetNietBeschikbaarError) {
      return { ok: false, reden: "niet_beschikbaar", melding: RESET_NIET_BESCHIKBAAR_MELDING };
    }
    captureRouteError(e, { route, action: "UITNODIGING_TOKEN" });
    return { ok: false, reden: "mail_mislukt", melding: "Uitnodiging maken mislukt. Probeer het opnieuw." };
  }

  const email = (klant.email as string).trim().toLowerCase();
  const { error: mailFout } = await sendEmail({
    from: "TopTalent <info@toptalentjobs.nl>",
    to: [email],
    replyTo: "info@toptalentjobs.nl",
    subject: "Uw TopTalent Business account staat klaar: stel uw wachtwoord in",
    emailType: "klant_uitnodiging",
    html: renderEmailLayout(
      uitnodigingMailInhoud({
        contactpersoon: klant.contactpersoon,
        bedrijfsnaam: klant.bedrijfsnaam,
        url: uitnodigingUrl(getBaseUrl(), token),
      }),
    ),
  });
  if (mailFout) {
    captureRouteError(mailFout, { route, action: "UITNODIGING_MAIL" });
    return { ok: false, reden: "mail_mislukt", melding: "De uitnodigingsmail kon niet worden verstuurd. Probeer het opnieuw." };
  }

  // Moment van uitnodigen bewaren (migratie 20261023_klant_onboarding.sql); zonder kolom niet erg.
  const nu = new Date().toISOString();
  const { error: tijdFout } = await supabaseAdmin.from("klanten").update({ uitgenodigd_op: nu }).eq("id", klant.id);
  if (tijdFout && !isOntbrekendeKolom(tijdFout)) captureRouteError(tijdFout, { route, action: "UITNODIGING_MOMENT" });

  // Door TopTalent uitgenodigd = gecontroleerd: geen eerste-dienstcontrole (lib/klant-controle-regels).
  await markeerGecontroleerd(klant.id, route);

  return { ok: true, email, geldigTot: new Date(Date.now() + KLANT_UITNODIGING_GELDIG_MS).toISOString() };
}
