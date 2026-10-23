import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import { stuurKlantUitnodiging } from "@/lib/klant-uitnodiging";
import { markeerGecontroleerd } from "@/lib/klant-onboarding";
import {
  letterlijkLikePatroon,
  moetBestaandeKlantUitnodigen,
  statusNaDienstInplannen,
} from "@/lib/klant-uitnodiging-regels";

type DienstKlantInput = {
  klant_naam?: string | null;
  klant_email?: string | null;
  klant_telefoon?: string | null;
};

function normalizeString(value?: string | null) {
  return value?.trim() || null;
}

/** Uitnodiging versturen zonder dat het inplannen van de dienst kan mislukken. */
async function nodigUitZonderFout(klantId: string) {
  try {
    const resultaat = await stuurKlantUitnodiging(klantId, { route: "lib/klanten-sync" });
    if (!resultaat.ok && resultaat.reden === "mail_mislukt") {
      captureRouteError(new Error(resultaat.melding), { route: "lib/klanten-sync", action: "UITNODIGING" });
    }
  } catch (error) {
    captureRouteError(error, { route: "lib/klanten-sync", action: "UITNODIGING" });
  }
}

/**
 * Koppelt een dienst aan een klant op bedrijfsnaam (hoofdletterongevoelig, letterlijk) en maakt
 * de klant aan als hij nog niet bestaat.
 *
 * `uitnodigen: true` (admin plant een dienst in): een nieuwe klant met e-mailadres krijgt de
 * uitnodiging "wachtwoord instellen", net als een bestaande klant zonder wachtwoord waarvan het
 * e-mailadres nu pas bekend wordt. De achtergrondsynchronisatie (syncDienstenKlantIds, bij het
 * openen van Facturen) nodigt bewust niemand uit: dat zou in één keer oude klanten mailen.
 *
 * Een gedeactiveerde of verwijderde klant wordt niet meer stilletjes heractiveerd.
 */
export async function ensureKlantForDienst(input: DienstKlantInput, opties: { uitnodigen?: boolean } = {}) {
  const bedrijfsnaam = normalizeString(input.klant_naam);
  const email = normalizeString(input.klant_email)?.toLowerCase() || null;

  if (!bedrijfsnaam) {
    return null;
  }

  const { data: existingKlant } = await supabaseAdmin
    .from("klanten")
    .select("id, email, status, wachtwoord")
    .ilike("bedrijfsnaam", letterlijkLikePatroon(bedrijfsnaam))
    .limit(1)
    .maybeSingle();

  if (existingKlant) {
    const updates: Record<string, string> = {};
    const emailNetToegevoegd = !!email && !existingKlant.email;

    if (emailNetToegevoegd) {
      updates.email = email;
    }

    const nieuweStatus = statusNaDienstInplannen(existingKlant.status);
    if (nieuweStatus) {
      updates.status = nieuweStatus;
    }

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin.from("klanten").update(updates).eq("id", existingKlant.id);
    }

    if (
      opties.uitnodigen &&
      moetBestaandeKlantUitnodigen({
        emailNetToegevoegd,
        heeftWachtwoord: !!existingKlant.wachtwoord,
        status: nieuweStatus ?? existingKlant.status,
      })
    ) {
      await nodigUitZonderFout(existingKlant.id as string);
    }

    return existingKlant.id as string;
  }

  const insertData: Record<string, string> = {
    bedrijfsnaam,
    contactpersoon: bedrijfsnaam,
    status: "actief",
  };
  if (email) {
    insertData.email = email;
  }

  const { data: createdKlant, error } = await supabaseAdmin
    .from("klanten")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  // Door TopTalent aangemaakt = gecontroleerd (geen eerste-dienstcontrole).
  await markeerGecontroleerd(createdKlant.id as string, "lib/klanten-sync");

  if (opties.uitnodigen && email) {
    await nodigUitZonderFout(createdKlant.id as string);
  }

  return createdKlant.id as string;
}

export async function syncDienstenKlantIds() {
  const { data: diensten, error } = await supabaseAdmin
    .from("diensten")
    .select("id, klant_id, klant_naam, klant_email, klant_telefoon")
    .is("klant_id", null)
    .not("klant_naam", "is", null);

  if (error || !diensten?.length) {
    return;
  }

  for (const dienst of diensten) {
    const klantId = await ensureKlantForDienst(dienst);
    if (!klantId) {
      continue;
    }

    await supabaseAdmin.from("diensten").update({ klant_id: klantId }).eq("id", dienst.id);
  }
}
