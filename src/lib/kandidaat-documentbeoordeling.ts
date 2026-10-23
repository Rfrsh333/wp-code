import { supabaseAdmin } from "@/lib/supabase";
import { logEmail, sendDocumentenGoedgekeurd } from "@/lib/candidate-onboarding";
import { captureRouteError } from "@/lib/sentry-utils";
import { alleVerplichteGoedgekeurd, DOCUMENTFASE_STATUSSEN } from "@/lib/kandidaat-documenten";

/**
 * Na een beoordeling door de admin (goedkeuren/afkeuren van een kandidaatdocument): zijn nu alle
 * verplichte documenten goedgekeurd, dan gaat de kandidaat van de documentfase naar
 * `goedgekeurd` en krijgt hij de beloofde mail (B16). Alleen een menselijke beoordeling telt;
 * documenten met status "ontvangen" (nog niet bekeken) nooit (B2).
 * De statusovergang is voorwaardelijk (alleen vanuit de documentfase), dus de mail gaat één keer.
 */
export type BeoordelingUitkomst = {
  allesGoedgekeurd: boolean;
  statusGewijzigd: boolean;
  mailVerstuurd: boolean;
};

export async function naDocumentBeoordeling(inschrijvingId: string): Promise<BeoordelingUitkomst> {
  const uitkomst: BeoordelingUitkomst = { allesGoedgekeurd: false, statusGewijzigd: false, mailVerstuurd: false };

  const [{ data: kandidaat }, { data: documenten }] = await Promise.all([
    supabaseAdmin
      .from("inschrijvingen")
      .select("id, voornaam, achternaam, email, uitbetalingswijze, onboarding_status")
      .eq("id", inschrijvingId)
      .maybeSingle(),
    supabaseAdmin.from("kandidaat_documenten").select("type, status").eq("inschrijving_id", inschrijvingId),
  ]);
  if (!kandidaat) return uitkomst;

  uitkomst.allesGoedgekeurd = alleVerplichteGoedgekeurd(
    (documenten ?? []) as { type: string; status: string | null }[],
    kandidaat.uitbetalingswijze,
  );
  if (!uitkomst.allesGoedgekeurd) return uitkomst;
  if (!(DOCUMENTFASE_STATUSSEN as readonly string[]).includes(kandidaat.onboarding_status ?? "")) return uitkomst;

  const nu = new Date().toISOString();
  const { data: bijgewerkt, error } = await supabaseAdmin
    .from("inschrijvingen")
    .update({
      onboarding_status: "goedgekeurd",
      goedgekeurd_op: nu,
      documenten_compleet: true,
      onboarding_step: 3,
      laatste_onboarding_actie: nu,
      laatste_contact_op: nu,
    })
    .eq("id", inschrijvingId)
    .in("onboarding_status", [...DOCUMENTFASE_STATUSSEN])
    .select("id")
    .maybeSingle();
  if (error) {
    captureRouteError(error, { route: "lib/kandidaat-documentbeoordeling", action: "STATUS" });
    return uitkomst;
  }
  if (!bijgewerkt) return uitkomst; // intussen al door iemand anders verder gezet
  uitkomst.statusGewijzigd = true;

  try {
    const resultaat = await sendDocumentenGoedgekeurd(kandidaat);
    if (resultaat.error) throw new Error(resultaat.error.message);
    await logEmail(kandidaat.id, "custom", kandidaat.email, "Je documenten zijn goedgekeurd", resultaat.data?.id);
    uitkomst.mailVerstuurd = true;
  } catch (mailFout) {
    captureRouteError(mailFout, { route: "lib/kandidaat-documentbeoordeling", action: "MAIL" });
  }
  return uitkomst;
}
