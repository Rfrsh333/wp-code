import { supabaseAdmin } from "@/lib/supabase";
import { sendMedewerkerShiftConfirmationEmail } from "@/lib/medewerker-shift-email";
import { geldendeTijden, kledingVoorMail } from "@/lib/medewerker/reactie-regels";
import { haalDienstExtras, haalVoorwaarden } from "@/lib/medewerker/reactie-voorwaarden";

type Een<T> = T | T[] | null | undefined;
const een = <T,>(v: Een<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export type InplanGegevens = {
  medewerker: { naam: string; email: string | null };
  dienst: {
    id: string;
    klant_id: string | null;
    klant_naam: string;
    locatie: string;
    datum: string;
    functie: string;
    start_tijd: string;
    eind_tijd: string;
  };
};

/**
 * Bevestigingsmail "je bent ingepland" voor één aanmelding, op één plek voor werkgever, admin en
 * vervanging. Gebruikt de tijden die voor deze aanmelding gelden (eigen tijden na acceptatie), de
 * pauze en het kledingvoorschrift van de dienst (met de oude `notities` als fallback).
 * Geeft de gegevens terug (of null als de aanmelding niet bestaat), zodat de aanroeper er verder
 * mee kan (bv. de klant een push sturen).
 */
export async function stuurInplanBevestiging(aanmeldingId: string): Promise<InplanGegevens | null> {
  const { data } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select(`
      id,
      medewerker:medewerkers(naam, email),
      dienst:diensten(id, klant_id, klant_naam, locatie, datum, start_tijd, eind_tijd, functie, notities)
    `)
    .eq("id", aanmeldingId)
    .maybeSingle();

  const medewerker = een(data?.medewerker as Een<{ naam: string; email: string | null }>);
  const dienst = een(
    data?.dienst as Een<{
      id: string;
      klant_id: string | null;
      klant_naam: string;
      locatie: string;
      datum: string;
      start_tijd: string;
      eind_tijd: string;
      functie: string;
      notities: string | null;
    }>,
  );
  if (!medewerker || !dienst) return null;

  const [voorwaarden, extras] = await Promise.all([haalVoorwaarden([aanmeldingId]), haalDienstExtras([dienst.id])]);
  const tijden = geldendeTijden(dienst, voorwaarden.get(aanmeldingId));
  const extra = extras.get(dienst.id);

  if (medewerker.email) {
    await sendMedewerkerShiftConfirmationEmail({
      medewerkerNaam: medewerker.naam,
      medewerkerEmail: medewerker.email,
      functie: dienst.functie,
      datum: dienst.datum,
      startTijd: tijden.start_tijd,
      eindTijd: tijden.eind_tijd,
      locatie: dienst.locatie,
      klantNaam: dienst.klant_naam,
      kledingvoorschrift: kledingVoorMail({ kledingvoorschrift: extra?.kledingvoorschrift, notities: dienst.notities }),
      pauzeMinuten: extra?.pauze_minuten ?? null,
    });
  }

  return {
    medewerker,
    dienst: { ...dienst, start_tijd: tijden.start_tijd, eind_tijd: tijden.eind_tijd },
  };
}
