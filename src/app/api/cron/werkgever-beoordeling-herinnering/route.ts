import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError, withCronMonitor } from "@/lib/sentry-utils";
import { isOntbrekendeKolom } from "@/lib/db-kolom-fallback";
import { haalDemoIds, zelfdeWereld } from "@/lib/demo";
import { nlVandaag, plusDagen } from "@/lib/nl-tijd";
import { sendPushToUser } from "@/lib/push-notifications";
import { isOntbrekendeTabel } from "@/lib/medewerker/werkgever-voorkeuren";
import {
  BEOORDEELBARE_AANMELD_STATUSSEN,
  HERINNERING_DAGEN,
  binnenBeoordeelTermijn,
  herinneringPush,
  isAfgerondVoorBeoordeling,
} from "@/lib/medewerker/werkgever-beoordeling-regels";

/**
 * Herinnering "Hoe was het bij X?" (stap 4 "Vertrouwen zoals YoungOnes"): één push per afgeronde
 * dienst, één keer, voor diensten van de laatste HERINNERING_DAGEN dagen die de medewerker nog niet
 * heeft beoordeeld. Dagelijks (vercel.json).
 *
 * Eén keer: de cron zet eerst dienst_aanmeldingen.werkgever_beoordeling_herinnerd_op (conditioneel op
 * null) en stuurt pas daarna de push; twee gelijktijdige runs kunnen dus niet allebei sturen. Zonder
 * die kolom (migratie 20261023_werkgever_beoordelingen.sql niet gedraaid) slaat de cron alles over,
 * want dan zou hij elke dag opnieuw sturen.
 *
 * Demo-accounts (lib/demo.ts) krijgen geen herinnering, net als bij de andere herinneringen.
 */

type Een<T> = T | T[] | null | undefined;
const een = <T,>(v: Een<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

type Rij = {
  id: string;
  medewerker_id: string;
  dienst_id: string;
  status: string | null;
  uren_registraties: { status: string | null }[] | { status: string | null } | null;
  dienst: Een<{
    id: string;
    datum: string;
    start_tijd: string | null;
    eind_tijd: string | null;
    status: string | null;
    klant_id: string | null;
    klant_naam: string | null;
    functie: string | null;
  }>;
};

const ROUTE = "/api/cron/werkgever-beoordeling-herinnering";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return withCronMonitor("cron-werkgever-beoordeling-herinnering", async () => {
    const nu = new Date();
    const vandaag = nlVandaag();

    // Tabel nog niet aangemaakt: beoordelen kan niet, dus ook geen herinnering.
    const probe = await supabaseAdmin.from("werkgever_beoordelingen").select("id").limit(1);
    if (isOntbrekendeTabel(probe.error)) return NextResponse.json({ success: true, overgeslagen: "migratie_ontbreekt" });
    if (probe.error) {
      captureRouteError(probe.error, { route: ROUTE, action: "PROBE" });
      return NextResponse.json({ error: "Controle mislukt" }, { status: 500 });
    }

    // Uren-ingediend telt ook als afgerond; die aanmeldingen staan dan nog op een ingeplande status.
    const { data, error } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select(
        "id, medewerker_id, dienst_id, status, uren_registraties(status), dienst:diensten!inner(id, datum, start_tijd, eind_tijd, status, klant_id, klant_naam, functie)",
      )
      .in("status", [...BEOORDEELBARE_AANMELD_STATUSSEN])
      .is("werkgever_beoordeling_herinnerd_op", null)
      .gte("dienst.datum", plusDagen(vandaag, -HERINNERING_DAGEN))
      .lte("dienst.datum", vandaag)
      .limit(1000);
    if (isOntbrekendeKolom(error)) return NextResponse.json({ success: true, overgeslagen: "migratie_ontbreekt" });
    if (error) {
      captureRouteError(error, { route: ROUTE, action: "SELECT" });
      return NextResponse.json({ error: "Aanmeldingen ophalen mislukt" }, { status: 500 });
    }

    const demoIds = await haalDemoIds();
    const kandidaten = ((data ?? []) as unknown as Rij[]).filter((r) => {
      const d = een(r.dienst);
      if (!d?.klant_id) return false;
      if (demoIds.medewerkers.has(r.medewerker_id) || !zelfdeWereld(demoIds, r.medewerker_id, d.klant_id)) return false;
      if (!binnenBeoordeelTermijn(d.datum, vandaag)) return false;
      const uren = r.uren_registraties ? (Array.isArray(r.uren_registraties) ? r.uren_registraties : [r.uren_registraties]) : [];
      return isAfgerondVoorBeoordeling({ aanmelding_status: r.status, uren_statussen: uren.map((u) => u?.status), dienst: d }, nu);
    });
    if (kandidaten.length === 0) return NextResponse.json({ success: true, herinnerd: 0, pushes: 0 });

    // Al beoordeeld (bijvoorbeeld meteen na de dienst in het portaal): geen herinnering.
    const beoordeeld = new Set<string>();
    const dienstIds = [...new Set(kandidaten.map((r) => r.dienst_id))];
    for (let i = 0; i < dienstIds.length; i += 150) {
      const { data: rijen, error: fout } = await supabaseAdmin
        .from("werkgever_beoordelingen")
        .select("dienst_id, medewerker_id")
        .in("dienst_id", dienstIds.slice(i, i + 150));
      if (fout) {
        captureRouteError(fout, { route: ROUTE, action: "BEOORDEELD" });
        return NextResponse.json({ error: "Beoordelingen ophalen mislukt" }, { status: 500 });
      }
      for (const r of (rijen ?? []) as { dienst_id: string; medewerker_id: string }[]) beoordeeld.add(`${r.dienst_id}:${r.medewerker_id}`);
    }

    const namen = new Map<string, string | null>();
    const klantIds = [...new Set(kandidaten.map((r) => een(r.dienst)?.klant_id).filter((id): id is string => !!id))];
    for (let i = 0; i < klantIds.length; i += 150) {
      const { data: klanten } = await supabaseAdmin.from("klanten").select("id, bedrijfsnaam").in("id", klantIds.slice(i, i + 150));
      for (const k of (klanten ?? []) as { id: string; bedrijfsnaam: string | null }[]) namen.set(k.id, k.bedrijfsnaam);
    }

    let herinnerd = 0;
    let pushes = 0;
    for (const r of kandidaten) {
      if (beoordeeld.has(`${r.dienst_id}:${r.medewerker_id}`)) continue;
      const d = een(r.dienst)!;

      // Eerst vastleggen, dan sturen: zo gaat de herinnering hooguit één keer.
      const { data: geclaimd, error: claimFout } = await supabaseAdmin
        .from("dienst_aanmeldingen")
        .update({ werkgever_beoordeling_herinnerd_op: nu.toISOString() })
        .eq("id", r.id)
        .is("werkgever_beoordeling_herinnerd_op", null)
        .select("id")
        .maybeSingle();
      if (claimFout) {
        captureRouteError(claimFout, { route: ROUTE, action: "CLAIM" });
        continue;
      }
      if (!geclaimd) continue;
      herinnerd++;

      try {
        const resultaat = await sendPushToUser(
          r.medewerker_id,
          "medewerker",
          herinneringPush({
            dienstId: r.dienst_id,
            klantNaam: (d.klant_id ? namen.get(d.klant_id) : null) || d.klant_naam,
            datum: d.datum,
            functie: d.functie,
          }),
        );
        pushes += resultaat.sent;
      } catch (e) {
        captureRouteError(e, { route: ROUTE, action: "PUSH" });
      }
    }

    return NextResponse.json({ success: true, herinnerd, pushes });
  });
}
