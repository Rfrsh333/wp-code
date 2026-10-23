import { supabaseAdmin } from "@/lib/supabase";
import { decryptField } from "@/lib/encryption";
import { nlVandaag } from "@/lib/nl-tijd";
import { captureRouteError } from "@/lib/sentry-utils";
import { haalKritiekeDocumenten } from "@/lib/medewerker/kritieke-documenten";
import { haalDemoIds } from "@/lib/demo";
import { isDemoMedewerkerId } from "@/lib/demo-regels";
import { reageerChecklist, type ChecklistMedewerker, type ChecklistPunt } from "@/lib/medewerker/reageer-checklist";
import { OVEREENKOMST_VERSIE } from "@/content/overeenkomst-van-opdracht";
import { isAkkoordMogelijk } from "@/lib/uitbetaling/config";

/**
 * DB-kant van de checklist vóór reageren (B1); de regels staan in lib/medewerker/reageer-checklist.
 * Gebruikt door GET /api/medewerker/checklist en door meldAan (alle aanmeld-/acceptroutes).
 */

export type ChecklistStatus = {
  compleet: boolean;
  punten: ChecklistPunt[];
  ontbrekend: ChecklistPunt[];
  overeenkomst: { versie: string; akkoord_op: string | null; akkoord_versie: string | null };
  /** true als migratie 20261023_medewerker_checklist_reageren nog niet gedraaid is: dan geen blokkade. */
  migratieOntbreekt: boolean;
  /** Stap 6: punt "Akkoord zelffacturering" doet mee (ZELFFACTURERING_ACTIEF=1, tekst geen concept, termijn ingesteld én migratie 20261024 gedraaid). */
  zelffacturering: boolean;
  /** Demo-/reviewaccount (Apple/Google): ziet alleen demodiensten en wordt niet geblokkeerd. */
  demo: boolean;
};

const KOLOMMEN = "kvk_nummer, btw_nummer, iban, overeenkomst_akkoord_op, overeenkomst_akkoord_versie";
const ZELFFACTURERING_KOLOMMEN = "zelffacturering_akkoord_op, zelffacturering_akkoord_versie";

/**
 * Medewerkergegevens voor de checklist. Met zelffacturering aan eerst mét de akkoordkolommen;
 * ontbreken die (migratie 20261024 nog niet gedraaid), dan zonder, en dan doet het punt niet mee.
 */
async function haalMedewerker(medewerkerId: string) {
  // Alleen als akkoord geven echt kan (vlag aan, tekst geen concept, termijn ingesteld).
  if (isAkkoordMogelijk()) {
    const metAkkoord = await supabaseAdmin
      .from("medewerkers")
      .select(`${KOLOMMEN}, ${ZELFFACTURERING_KOLOMMEN}`)
      .eq("id", medewerkerId)
      .maybeSingle();
    if (metAkkoord.error?.code !== "42703") return { ...metAkkoord, zelffacturering: !metAkkoord.error };
  }
  const basis = await supabaseAdmin.from("medewerkers").select(KOLOMMEN).eq("id", medewerkerId).maybeSingle();
  return { ...basis, zelffacturering: false };
}

export async function haalChecklist(medewerkerId: string): Promise<ChecklistStatus> {
  const [{ data, error, zelffacturering }, documenten, demoIds] = await Promise.all([
    haalMedewerker(medewerkerId),
    haalKritiekeDocumenten([medewerkerId]),
    haalDemoIds(),
  ]);
  const demo = isDemoMedewerkerId(demoIds, medewerkerId);

  // Kolommen bestaan nog niet: niemand blokkeren op velden die hij niet kan invullen.
  const migratieOntbreekt = error?.code === "42703";
  if (error && !migratieOntbreekt) throw error;
  if (migratieOntbreekt) {
    captureRouteError(new Error("Checklist vóór reageren staat uit: migratie 20261023_medewerker_checklist_reageren ontbreekt"), {
      route: "lib/medewerker/checklist",
      action: "MIGRATIE",
    });
  }

  const rij = (data ?? {}) as Record<string, string | null>;
  const medewerker: ChecklistMedewerker = {
    kvk_nummer: rij.kvk_nummer ?? null,
    btw_nummer: decryptField(rij.btw_nummer ?? null),
    iban: decryptField(rij.iban ?? null),
    overeenkomst_akkoord_op: rij.overeenkomst_akkoord_op ?? null,
    overeenkomst_akkoord_versie: rij.overeenkomst_akkoord_versie ?? null,
    zelffacturering_akkoord_op: rij.zelffacturering_akkoord_op ?? null,
    zelffacturering_akkoord_versie: rij.zelffacturering_akkoord_versie ?? null,
  };

  const punten = reageerChecklist(medewerker, documenten.get(medewerkerId) ?? [], nlVandaag(), { zelffacturering });
  // Demo-accounts (app-review) en een ontbrekende migratie blokkeren niet.
  const ontbrekend = migratieOntbreekt || demo ? [] : punten.filter((p) => !p.ok);
  return {
    compleet: ontbrekend.length === 0,
    punten,
    ontbrekend,
    overeenkomst: {
      versie: OVEREENKOMST_VERSIE,
      akkoord_op: medewerker.overeenkomst_akkoord_op ?? null,
      akkoord_versie: medewerker.overeenkomst_akkoord_versie ?? null,
    },
    migratieOntbreekt,
    zelffacturering,
    demo,
  };
}
