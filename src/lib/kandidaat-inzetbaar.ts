import { supabaseAdmin } from "@/lib/supabase";
import { ensureMedewerkerFromCandidate } from "@/lib/candidate-to-medewerker";
import { verstuurActivatiemail } from "@/lib/medewerker-activation";
import { logEmail, sendWelkomstmail } from "@/lib/candidate-onboarding";
import { captureRouteError } from "@/lib/sentry-utils";

/**
 * Wat er gebeurt als een admin een kandidaat op "inzetbaar" zet. Eén plek, gebruikt door
 * /api/admin/data (los én bulk). "Inzetbaar" is altijd een menselijke klik: de autopilot zet
 * deze status nooit (B2).
 *
 * - Nog geen medewerkeraccount: account aanmaken, koppelen en de activatiemail sturen. Dat is
 *   de enige mail (B15); voorheen ging er tegelijk een tegenstrijdige welkomstmail uit.
 * - Al een account: alleen de welkomstmail (die naar de login wijst), hoogstens één per 24 uur.
 * Het resultaat van elke mail wordt gecontroleerd; een mislukking staat in Sentry en in het
 * antwoord, zodat de admin "Activatiemail opnieuw sturen" kan gebruiken (B8).
 */

export type InzetbaarResultaat = {
  kandidaatId: string;
  medewerkerId: string | null;
  nieuwAccount: boolean;
  mail: "activatie" | "welkom" | "geen";
  mailMislukt: boolean;
  /** Account aanmaken mislukt: de status staat op inzetbaar, maar er is geen medewerker. */
  accountFout?: string;
};

const ROUTE = "lib/kandidaat-inzetbaar";

const KANDIDAAT_VELDEN =
  "id, voornaam, tussenvoegsel, achternaam, email, telefoon, gewenste_functies, interne_notitie, medewerker_id, uitbetalingswijze";

async function welkomRecentVerstuurd(kandidaatId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("email_log")
    .select("id")
    .eq("kandidaat_id", kandidaatId)
    .eq("email_type", "inzetbaar")
    .gte("sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1);
  return (data ?? []).length > 0;
}

export async function verwerkInzetbaar(kandidaatId: string): Promise<InzetbaarResultaat> {
  const leeg: InzetbaarResultaat = { kandidaatId, medewerkerId: null, nieuwAccount: false, mail: "geen", mailMislukt: false };

  const { data: kandidaat } = await supabaseAdmin
    .from("inschrijvingen")
    .select(KANDIDAAT_VELDEN)
    .eq("id", kandidaatId)
    .maybeSingle();
  if (!kandidaat) return leeg;

  const nu = new Date().toISOString();

  if (kandidaat.medewerker_id) {
    if (await welkomRecentVerstuurd(kandidaat.id)) {
      return { ...leeg, medewerkerId: kandidaat.medewerker_id };
    }
    try {
      const resultaat = await sendWelkomstmail(kandidaat);
      if (resultaat.error) throw new Error(resultaat.error.message);
      await logEmail(kandidaat.id, "inzetbaar", kandidaat.email, "Je bent inzetbaar (welkomstmail)", resultaat.data?.id);
      await supabaseAdmin.from("inschrijvingen").update({ welkom_mail_verstuurd_op: nu }).eq("id", kandidaat.id);
      return { ...leeg, medewerkerId: kandidaat.medewerker_id, mail: "welkom" };
    } catch (error) {
      captureRouteError(error, { route: ROUTE, action: "WELKOMSTMAIL" });
      return { ...leeg, medewerkerId: kandidaat.medewerker_id, mail: "welkom", mailMislukt: true };
    }
  }

  let medewerkerId: string;
  try {
    medewerkerId = await ensureMedewerkerFromCandidate(kandidaat);
    const { error } = await supabaseAdmin.from("inschrijvingen").update({ medewerker_id: medewerkerId }).eq("id", kandidaat.id);
    if (error) throw new Error(error.message);
  } catch (error) {
    captureRouteError(error, { route: ROUTE, action: "ACCOUNT_AANMAKEN" });
    return { ...leeg, accountFout: error instanceof Error ? error.message : "Account aanmaken mislukt" };
  }

  const { data: medewerker } = await supabaseAdmin
    .from("medewerkers")
    .select("id, naam, email")
    .eq("id", medewerkerId)
    .maybeSingle();
  if (!medewerker?.email) {
    captureRouteError(new Error(`Medewerker ${medewerkerId} heeft geen e-mailadres; geen activatiemail`), {
      route: ROUTE,
      action: "ACTIVATIEMAIL",
    });
    return { ...leeg, medewerkerId, nieuwAccount: true, mail: "activatie", mailMislukt: true };
  }

  const uitkomst = await verstuurActivatiemail(medewerker, ROUTE);
  if (uitkomst.ok) {
    await logEmail(kandidaat.id, "inzetbaar", medewerker.email, "Je bent inzetbaar: activeer je account", uitkomst.emailId ?? undefined);
    await supabaseAdmin.from("inschrijvingen").update({ welkom_mail_verstuurd_op: nu }).eq("id", kandidaat.id);
  }
  return { ...leeg, medewerkerId, nieuwAccount: true, mail: "activatie", mailMislukt: !uitkomst.ok };
}
