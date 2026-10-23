import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError, withCronMonitor } from "@/lib/sentry-utils";
import { isOntbrekendeKolom } from "@/lib/db-kolom-fallback";
import { nlMoment } from "@/lib/nl-tijd";
import { ANNULEER_REDEN_AUTOMATISCH, isAutomatischIngetrokken } from "@/lib/medewerker/reactie-regels";
import { notifyMedewerkerReactieIngetrokken } from "@/lib/dienst-push-triggers";

/**
 * Automatisch intrekken van reacties (uitgebreid reageren): een open reactie (`aangemeld`) met
 * auto_intrekken_uren die voorbij haar intrekmoment is, gaat naar `geannuleerd` met
 * annuleer_reden = automatisch_ingetrokken, en de medewerker krijgt een push.
 *
 * Draait dagelijks (vercel.json; alle crons hier zijn dagelijks). Dat is genoeg omdat de code een
 * verlopen reactie al eerder uitsluit (lazy check in lib/medewerker/reactie-regels): de werkgever
 * kan haar niet meer accepteren en ze telt niet als open reactie. Deze cron zet de status echt om
 * en laat de medewerker het weten. `geannuleerd` staat in HERACTIVEERBAAR, dus opnieuw reageren kan.
 */

type Een<T> = T | T[] | null | undefined;
const een = <T,>(v: Een<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

type Rij = {
  id: string;
  medewerker_id: string;
  dienst_id: string;
  status: string;
  auto_intrekken_uren: number | null;
  dienst: Een<{ datum: string; start_tijd: string; functie: string | null; klant_naam: string | null }>;
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return withCronMonitor("cron-reacties-intrekken", async () => {
    const nu = new Date();
    const { data, error } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, medewerker_id, dienst_id, status, auto_intrekken_uren, dienst:diensten!inner(datum, start_tijd, functie, klant_naam)")
      .eq("status", "aangemeld")
      .not("auto_intrekken_uren", "is", null)
      .limit(1000);

    // Migratie 20261023_uitgebreid_reageren.sql nog niet gedraaid: niets te doen.
    if (isOntbrekendeKolom(error)) return NextResponse.json({ success: true, overgeslagen: "migratie_ontbreekt" });
    if (error) {
      captureRouteError(error, { route: "/api/cron/reacties-intrekken", action: "GET" });
      return NextResponse.json({ error: "Reacties ophalen mislukt" }, { status: 500 });
    }

    let ingetrokken = 0;
    let pushes = 0;
    for (const rij of (data ?? []) as unknown as Rij[]) {
      const dienst = een(rij.dienst);
      if (!dienst || !isAutomatischIngetrokken(rij, dienst, nu)) continue;

      // Conditioneel op `aangemeld`: is de reactie intussen gekozen of ingetrokken, dan niets doen.
      const { data: bijgewerkt, error: updateFout } = await supabaseAdmin
        .from("dienst_aanmeldingen")
        .update({ status: "geannuleerd", annuleer_reden: ANNULEER_REDEN_AUTOMATISCH })
        .eq("id", rij.id)
        .eq("status", "aangemeld")
        .select("id")
        .maybeSingle();
      if (updateFout) {
        captureRouteError(updateFout, { route: "/api/cron/reacties-intrekken", action: "UPDATE" });
        continue;
      }
      if (!bijgewerkt) continue;
      ingetrokken++;

      // Alleen een push als de dienst nog moet beginnen (anders is het bericht zinloos).
      if (nlMoment(dienst.datum, dienst.start_tijd).getTime() > nu.getTime()) {
        try {
          const r = await notifyMedewerkerReactieIngetrokken({
            medewerkerId: rij.medewerker_id,
            dienstId: rij.dienst_id,
            datum: dienst.datum,
            functie: dienst.functie,
            klantNaam: dienst.klant_naam,
            uren: Number(rij.auto_intrekken_uren),
          });
          pushes += r.sent;
        } catch (e) {
          captureRouteError(e, { route: "/api/cron/reacties-intrekken", action: "PUSH" });
        }
      }
    }

    return NextResponse.json({ success: true, ingetrokken, pushes });
  });
}
