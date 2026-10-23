import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import { maskeerIban } from "@/lib/medewerker/iban";
import { isEncryptionConfigured } from "@/lib/encryption";
import { nlVandaag } from "@/lib/nl-tijd";
import { ZELFFACTURERING_IS_CONCEPT, ZELFFACTURERING_VERSIE } from "@/content/zelffacturering-akkoord";
import { bankConfig, isZelffactureringActief, uitbetaalTermijnWerkdagen } from "@/lib/uitbetaling/config";
import { GEEN_CACHE, uitbetalingToegang } from "@/lib/uitbetaling/admin-toegang";
import { haalLeveranciers, haalUrenMetStatus, isMigratieFout, ZELFFACTUUR_KOLOMMEN, type UrenItem } from "@/lib/uitbetaling/db";
import {
  BLOKKADE_LABELS,
  berekenTotalen,
  leverancierBlokkades,
  naarCenten,
  volgendeWerkdag,
} from "@/lib/uitbetaling/regels";

/**
 * Admin-tab Uitbetalingen (alleen owner/finance): wat uitbetaalbaar is per medewerker, wat nog op de
 * werkgever wacht, gefactureerde uren zonder goedkeuring door TopTalent, en de rondes met hun
 * zelffacturen. Bedragen in hele centen. Er staat nergens een volledig IBAN in dit antwoord.
 */

type Rij = Record<string, unknown>;

export async function GET(request: NextRequest) {
  const toegang = await uitbetalingToegang(request);
  if (!toegang.ok) return toegang.response;

  try {
    const termijn = uitbetaalTermijnWerkdagen();
    const bank = bankConfig();
    const { items, migratieOntbreekt } = await haalUrenMetStatus({}, { termijnWerkdagen: termijn });

    const medewerkerIds = [...new Set(items.map((i) => i.medewerker_id))];
    const { perId: leveranciers, akkoordKolommen } = await haalLeveranciers(medewerkerIds);

    // Uitbetaalbaar, per medewerker.
    const perMedewerker = new Map<string, UrenItem[]>();
    for (const i of items.filter((x) => x.status === "uitbetaalbaar")) {
      perMedewerker.set(i.medewerker_id, [...(perMedewerker.get(i.medewerker_id) ?? []), i]);
    }
    const uitbetaalbaar = [...perMedewerker.entries()]
      .map(([medewerkerId, regels]) => {
        const l = leveranciers.get(medewerkerId);
        const blokkades = l ? leverancierBlokkades(l, ZELFFACTURERING_VERSIE) : (["naam"] as const);
        const totalen = berekenTotalen(
          regels.map((r) => r.regel),
          l?.kor ?? false,
        );
        return {
          medewerker_id: medewerkerId,
          naam: l?.naam ?? "Onbekend",
          iban_gemaskeerd: l?.iban ? maskeerIban(l.iban) : null,
          kor: l?.kor ?? false,
          blokkades: blokkades.map((code) => ({ code, label: BLOKKADE_LABELS[code] })),
          aantal: regels.length,
          excl_centen: totalen.excl_centen,
          btw_centen: totalen.btw_centen,
          incl_centen: totalen.incl_centen,
          regels: regels.map((r) => ({
            uren_registratie_id: r.uren_registratie_id,
            datum: r.regel.datum,
            werkgever: r.regel.werkgever,
            uren: r.regel.uren,
            uurtarief_centen: r.regel.uurtarief_centen,
            toeslag_centen: r.regel.toeslag_centen,
            reiskosten_centen: r.regel.reiskosten_centen,
            bedrag_centen: r.regel.bedrag_centen,
            klant_factuur_nummer: r.klant_factuur_nummer,
            betaald_op: r.klant_factuur_betaald_op,
            uiterlijk_uitbetalen: r.uiterlijk_uitbetalen,
          })),
        };
      })
      .sort((a, b) => a.naam.localeCompare(b.naam, "nl"));

    const wacht = items.filter((i) => i.status === "wacht_op_betaling_werkgever" && i.klant_factuur_status !== "conflict");
    // Uren die op meer dan één klantfactuur staan: nooit automatisch uitbetalen, eerst uitzoeken.
    const conflicten = items
      .filter((i) => i.klant_factuur_status === "conflict")
      .map((i) => ({
        uren_registratie_id: i.uren_registratie_id,
        medewerker_naam: leveranciers.get(i.medewerker_id)?.naam ?? "Onbekend",
        datum: i.regel.datum,
        werkgever: i.regel.werkgever,
      }));
    const zonderGoedkeuring = items
      .filter((i) => i.status === "wacht_op_goedkeuring")
      .map((i) => ({
        uren_registratie_id: i.uren_registratie_id,
        medewerker_naam: leveranciers.get(i.medewerker_id)?.naam ?? "Onbekend",
        datum: i.regel.datum,
        werkgever: i.regel.werkgever,
        uren: i.regel.uren,
        klant_factuur_nummer: i.klant_factuur_nummer,
        klant_factuur_status: i.klant_factuur_status,
      }));

    // Rondes + hun zelffacturen (rondes in opbouw zijn niet zichtbaar).
    let rondes: Rij[] = [];
    if (!migratieOntbreekt) {
      const { data: rondeRijen, error } = await supabaseAdmin
        .from("uitbetaalrondes")
        .select(
          "id, bericht_id, status, uitvoer_datum, aantal_betalingen, totaal_bedrag, aangemaakt_door, aangemaakt_op, sepa_gedownload_op, sepa_gedownload_door, verwerkt_door, verwerkt_op",
        )
        .neq("status", "concept")
        .order("aangemaakt_op", { ascending: false })
        .limit(50);
      if (error && !isMigratieFout(error)) throw error;
      const ids = (rondeRijen ?? []).map((r) => r.id as string);
      const { data: zf, error: zfFout } = ids.length
        ? await supabaseAdmin.from("uitbetalingen").select(ZELFFACTUUR_KOLOMMEN).in("ronde_id", ids).order("factuur_nummer")
        : { data: [], error: null };
      if (zfFout) throw zfFout;
      rondes = (rondeRijen ?? []).map((r) => ({
        id: r.id,
        bericht_id: r.bericht_id,
        status: r.status,
        uitvoer_datum: r.uitvoer_datum,
        aantal_betalingen: r.aantal_betalingen,
        totaal_centen: naarCenten(r.totaal_bedrag as number),
        aangemaakt_door: r.aangemaakt_door,
        aangemaakt_op: r.aangemaakt_op,
        sepa_gedownload_op: r.sepa_gedownload_op,
        sepa_gedownload_door: r.sepa_gedownload_door,
        verwerkt_door: r.verwerkt_door,
        verwerkt_op: r.verwerkt_op,
        facturen: ((zf ?? []) as Rij[])
          .filter((f) => f.ronde_id === r.id)
          .map((f) => ({
            id: f.id,
            factuur_nummer: f.factuur_nummer,
            factuur_datum: f.factuur_datum,
            medewerker_naam: f.leverancier_naam,
            excl_centen: naarCenten(f.bedrag_excl as number),
            btw_centen: naarCenten(f.btw_bedrag as number),
            incl_centen: naarCenten(f.bedrag_incl as number),
            kor: f.kor,
            status: f.status,
            iban_laatste4: f.iban_laatste4,
            heeft_pdf: !!f.pdf_pad,
          })),
      }));
    }

    return NextResponse.json(
      {
        actief: isZelffactureringActief(),
        migratie_ontbreekt: migratieOntbreekt || !akkoordKolommen,
        tekst: { versie: ZELFFACTURERING_VERSIE, concept: ZELFFACTURERING_IS_CONCEPT },
        config: {
          bank_ok: bank.ok,
          bank_fouten: bank.ok ? [] : bank.fouten,
          bank_naam: bank.ok ? bank.naam : null,
          bank_iban_gemaskeerd: bank.ok ? maskeerIban(bank.iban) : null,
          termijn_werkdagen: termijn,
          versleuteling_ok: isEncryptionConfigured(),
        },
        standaard_uitvoerdatum: volgendeWerkdag(nlVandaag()),
        uitbetaalbaar,
        wacht_op_betaling: { aantal: wacht.length, excl_centen: wacht.reduce((t, i) => t + i.regel.bedrag_centen, 0) },
        zonder_goedkeuring: zonderGoedkeuring,
        conflicten,
        rondes,
      },
      { headers: GEEN_CACHE },
    );
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/uitbetalingen", action: "GET" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
