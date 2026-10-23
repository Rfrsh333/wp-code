import { after, NextRequest, NextResponse } from "next/server";
import { haalChecklist } from "@/lib/medewerker/checklist";
import { CHECKLIST_CODE } from "@/lib/medewerker/reageer-checklist";
import { controleerInzetbaarheid } from "@/lib/medewerker/aanmelden";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { ensureKlantForDienst } from "@/lib/klanten-sync";
import { stuurInplanBevestiging } from "@/lib/medewerker/inplan-bevestiging";
import { schrijfMetKolomFallback } from "@/lib/db-kolom-fallback";
import {
  effectieveAanmeldStatus,
  isAutomatischIngetrokken,
  medewerkerUurtariefVoorAanmelding,
  parseKledingvoorschrift,
  parsePauzeMinuten,
  REACTIE_FOUTCODES,
  reactieVoorWerkgever,
} from "@/lib/medewerker/reactie-regels";
import { GEEN_EXTRAS, haalDienstExtras, haalVoorwaarden, naarVoorwaarden } from "@/lib/medewerker/reactie-voorwaarden";

/** Dienstvelden die pas met migratie 20261023_uitgebreid_reageren.sql bestaan. */
const NIEUWE_DIENST_KOLOMMEN = ["kledingvoorschrift", "pauze_minuten"] as const;

/** Kledingvoorschrift en pauze uit het admin-formulier controleren (zelfde regels als de aanvraag). */
function dienstExtrasUitPayload(payload: Record<string, unknown>): string | null {
  if ("kledingvoorschrift" in payload) {
    const k = parseKledingvoorschrift(payload.kledingvoorschrift);
    if (!k.ok) return k.error;
    payload.kledingvoorschrift = k.waarde;
  }
  if ("pauze_minuten" in payload) {
    const p = parsePauzeMinuten(payload.pauze_minuten);
    if (!p.ok) return p.error;
    payload.pauze_minuten = p.waarde;
  }
  return null;
}
import { dienstenPostSchema, validateAdminBody } from "@/lib/validations-admin";
import { notifyKlantMedewerkerAssigned } from "@/lib/klant-push-triggers";
import { captureRouteError } from "@/lib/sentry-utils";
import { notifyMedewerkerAanmeldingBeslist } from "@/lib/dienst-push-triggers";

export async function GET(request: NextRequest) {
  // KRITIEK: Verify admin with proper email check
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized diensten access attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }
  const week = request.nextUrl.searchParams.get("week");
  const status = request.nextUrl.searchParams.get("status");

  let query = supabaseAdmin.from("diensten").select("id, klant_id, klant_naam, functie, datum, start_tijd, eind_tijd, aantal_nodig, plekken_totaal, plekken_beschikbaar, locatie, uurtarief, status, notities, is_spoeddienst, spoeddienst_token, spoeddienst_whatsapp_tekst, created_at").order("datum", { ascending: true }).limit(500);

  // ✅ Optional status filter
  if (status) {
    query = query.eq("status", status);
  }

  // ✅ Date filtering: week or default from yesterday
  if (week) {
    const start = new Date(week + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    query = query.gte("datum", start.toISOString().split("T")[0]).lte("datum", end.toISOString().split("T")[0]);
  } else {
    // Default: show diensten from yesterday onwards (includes recent and upcoming)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    query = query.gte("datum", yesterday.toISOString().split("T")[0]);
  }
  const { data } = await query;
  // Kledingvoorschrift en pauze apart (bestaan pas na de migratie; zonder migratie leeg).
  const extras = await haalDienstExtras((data ?? []).map((d) => d.id as string));
  return NextResponse.json({ data: (data ?? []).map((d) => ({ ...d, ...(extras.get(d.id as string) ?? GEEN_EXTRAS) })) });
}

export async function POST(request: NextRequest) {
  // KRITIEK: Verify admin with proper email check
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized diensten mutation attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  try {
  const rawBody = await request.json();
  const validation = validateAdminBody(dienstenPostSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { action, id, dienst_id, data } = rawBody;

  if (action === "create") {
    const payload = { ...data, status: data.status || "open" };
    // Zet plekken_beschikbaar en plekken_totaal op basis van aantal_nodig
    // zodat medewerkers de dienst kunnen zien in Ontdekken
    if (payload.aantal_nodig && !payload.plekken_totaal) {
      payload.plekken_totaal = payload.aantal_nodig;
      payload.plekken_beschikbaar = payload.aantal_nodig;
    }
    if (payload.klant_naam) {
      payload.klant_id = await ensureKlantForDienst(payload, { uitnodigen: true });
    }
    // Genereer spoeddienst token als het een spoeddienst is
    if (payload.is_spoeddienst) {
      payload.spoeddienst_token = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
      payload.spoeddienst_whatsapp_tekst = generateWhatsAppTekst(payload);
    }
    const extrasFout = dienstExtrasUitPayload(payload);
    if (extrasFout) return NextResponse.json({ error: extrasFout }, { status: 400 });
    const { error, weggelaten } = await schrijfMetKolomFallback(payload, NIEUWE_DIENST_KOLOMMEN, (rij) =>
      supabaseAdmin.from("diensten").insert(rij),
    );
    if (error) {
      captureRouteError(error, { route: "/api/admin/diensten", action: "POST" });
      // console.error("[DIENSTEN] Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (weggelaten.length > 0) {
      return NextResponse.json({ success: true, waarschuwing: "Kledingvoorschrift en pauze zijn niet opgeslagen: de migratie is nog niet gedraaid." });
    }
  }
  if (action === "update") {
    const payload = { ...data };
    // Sync plekken_totaal als aantal_nodig verandert
    if (payload.aantal_nodig !== undefined) {
      const { data: current } = await supabaseAdmin
        .from("diensten")
        .select("plekken_totaal, plekken_beschikbaar, aantal_nodig")
        .eq("id", id)
        .single();
      const oldTotal = current?.plekken_totaal || current?.aantal_nodig || 0;
      const oldBeschikbaar = current?.plekken_beschikbaar ?? oldTotal;
      const newTotal = payload.aantal_nodig;
      const diff = newTotal - oldTotal;
      payload.plekken_totaal = newTotal;
      payload.plekken_beschikbaar = Math.max(0, oldBeschikbaar + diff);
    }
    if (payload.klant_naam) {
      payload.klant_id = await ensureKlantForDienst(payload, { uitnodigen: true });
    }
    // Als spoeddienst wordt geactiveerd en er nog geen token is
    if (payload.is_spoeddienst && !payload.spoeddienst_token) {
      const { data: existing } = await supabaseAdmin
        .from("diensten")
        .select("spoeddienst_token")
        .eq("id", id)
        .single();
      if (!existing?.spoeddienst_token) {
        payload.spoeddienst_token = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
      }
      payload.spoeddienst_whatsapp_tekst = generateWhatsAppTekst(payload);
    }
    if (payload.is_spoeddienst === false) {
      payload.spoeddienst_token = null;
      payload.spoeddienst_whatsapp_tekst = null;
    }
    const extrasFout = dienstExtrasUitPayload(payload);
    if (extrasFout) return NextResponse.json({ error: extrasFout }, { status: 400 });
    const { weggelaten } = await schrijfMetKolomFallback(payload, NIEUWE_DIENST_KOLOMMEN, (rij) =>
      supabaseAdmin.from("diensten").update(rij).eq("id", id),
    );
    if (weggelaten.length > 0) {
      return NextResponse.json({ success: true, waarschuwing: "Kledingvoorschrift en pauze zijn niet opgeslagen: de migratie is nog niet gedraaid." });
    }
  }
  if (action === "delete") {
    await supabaseAdmin.from("diensten").delete().eq("id", id);
  }
  if (action === "get_aanmeldingen") {
    const [{ data: aanmeldingen }, { data: dienst }, extras] = await Promise.all([
      supabaseAdmin
        .from("dienst_aanmeldingen")
        .select("*, medewerker:medewerkers(naam, email, telefoon, profile_photo_url, gemiddelde_score, aantal_beoordelingen)")
        .eq("dienst_id", dienst_id)
        .order("aangemeld_at", { ascending: true })
        .limit(100),
      supabaseAdmin.from("diensten").select("datum, start_tijd, eind_tijd, uurtarief").eq("id", dienst_id).maybeSingle(),
      haalDienstExtras([dienst_id]),
    ]);
    // `*` bevat de reactievelden zodra de migratie gedraaid is. Per reactie dezelfde weergave als
    // de werkgever ziet, plus voor TopTalent wat de medewerker zelf per uur krijgt.
    const dienstInfo = {
      datum: dienst?.datum ?? null,
      start_tijd: dienst?.start_tijd ?? null,
      eind_tijd: dienst?.eind_tijd ?? null,
      uurtarief: (dienst?.uurtarief as number | null) ?? null,
      pauze_minuten: extras.get(dienst_id)?.pauze_minuten ?? null,
    };
    const metReactie = (aanmeldingen ?? []).map((a: Record<string, unknown>) => {
      const bron = { status: a.status as string, ...naarVoorwaarden(a) };
      return {
        ...a,
        status: effectieveAanmeldStatus(bron, dienstInfo),
        reactie: {
          ...reactieVoorWerkgever(bron, dienstInfo),
          medewerker_uurtarief: medewerkerUurtariefVoorAanmelding(dienstInfo.uurtarief, bron.voorgesteld_uurtarief),
        },
      };
    });
    return NextResponse.json({ data: metReactie });
  }
  if (action === "update_aanmelding") {
    // Een open reactie voorbij haar intrekmoment kan ook TopTalent niet meer accepteren.
    if (data.status === "geaccepteerd") {
      const [{ data: huidig }, voorwaarden] = await Promise.all([
        supabaseAdmin.from("dienst_aanmeldingen").select("status, dienst:diensten(datum, start_tijd)").eq("id", id).maybeSingle(),
        haalVoorwaarden([id]),
      ]);
      const d = (Array.isArray(huidig?.dienst) ? huidig?.dienst[0] : huidig?.dienst) as { datum: string; start_tijd: string } | null | undefined;
      if (huidig && isAutomatischIngetrokken({ status: huidig.status, ...(voorwaarden.get(id) ?? {}) }, d)) {
        return NextResponse.json(
          { error: "Deze reactie is automatisch ingetrokken en kan niet meer worden geaccepteerd.", code: REACTIE_FOUTCODES.reactieIngetrokken },
          { status: 409 },
        );
      }
    }
    await supabaseAdmin
      .from("dienst_aanmeldingen")
      .update({ status: data.status, beoordeeld_at: new Date().toISOString() })
      .eq("id", id);

    if (data.status === "geaccepteerd" || data.status === "afgewezen") {
      const status: "geaccepteerd" | "afgewezen" = data.status;
      after(() =>
        notifyMedewerkerAanmeldingBeslist(id, status).catch((e) =>
          captureRouteError(e, { route: "/api/admin/diensten", action: "PUSH" }),
        ),
      );
    }

    if (data.status === "geaccepteerd") {
      // Bevestigingsmail met de tijden die voor deze medewerker gelden (eigen tijden na acceptatie).
      const ingepland = await stuurInplanBevestiging(id);
      const medewerker = ingepland?.medewerker;
      const dienst = ingepland?.dienst;

      if (medewerker?.email && dienst) {
        // Push notificatie naar klant: medewerker toegewezen
        const { data: klantRecord } = await supabaseAdmin
          .from("klanten")
          .select("id")
          .eq("bedrijfsnaam", dienst.klant_naam)
          .maybeSingle();
        if (klantRecord) {
          const formattedDate = new Date(dienst.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
          void notifyKlantMedewerkerAssigned(klantRecord.id, medewerker.naam, dienst.functie, formattedDate);
        }
      }
    }
  }

  // Spoeddienst: haal responses op
  if (action === "get_spoeddienst_responses") {
    const { data: responses } = await supabaseAdmin
      .from("spoeddienst_responses")
      .select("id, dienst_id, medewerker_id, naam, telefoon, status, created_at")
      .eq("dienst_id", dienst_id)
      .order("created_at", { ascending: true })
      .limit(100);
    return NextResponse.json({ data: responses });
  }

  // Spoeddienst: update response status (bevestig/afwijs)
  if (action === "update_spoeddienst_response") {
    // B1: bevestigen plant de medewerker direct in; dat mag de checklist vóór reageren (ID, KvK,
    // btw, IBAN, akkoord) en de verloopblokkade niet omzeilen.
    if (data.status === "bevestigd") {
      const { data: reactie } = await supabaseAdmin
        .from("spoeddienst_responses")
        .select("medewerker_id")
        .eq("id", id)
        .maybeSingle();
      if (reactie?.medewerker_id) {
        const checklist = await haalChecklist(reactie.medewerker_id);
        if (!checklist.compleet) {
          return NextResponse.json(
            {
              error: `Kan niet bevestigen: de checklist van deze medewerker is niet compleet (${checklist.ontbrekend.map((p) => p.label).join(", ")}).`,
              code: CHECKLIST_CODE,
              ontbrekend: checklist.ontbrekend,
            },
            { status: 409 },
          );
        }
        const melding = await controleerInzetbaarheid(reactie.medewerker_id);
        if (melding) return NextResponse.json({ error: `Kan niet bevestigen: ${melding}` }, { status: 409 });
      }
    }

    await supabaseAdmin
      .from("spoeddienst_responses")
      .update({ status: data.status })
      .eq("id", id);

    // Bij bevestiging: maak ook een dienst_aanmelding aan als er een medewerker_id is
    if (data.status === "bevestigd") {
      const { data: response } = await supabaseAdmin
        .from("spoeddienst_responses")
        .select("medewerker_id, dienst_id")
        .eq("id", id)
        .single();

      if (response?.medewerker_id) {
        // Check of er al een aanmelding bestaat
        const { data: existing } = await supabaseAdmin
          .from("dienst_aanmeldingen")
          .select("id")
          .eq("dienst_id", response.dienst_id)
          .eq("medewerker_id", response.medewerker_id)
          .maybeSingle();

        if (!existing) {
          await supabaseAdmin.from("dienst_aanmeldingen").insert({
            dienst_id: response.dienst_id,
            medewerker_id: response.medewerker_id,
            status: "geaccepteerd",
            aangemeld_at: new Date().toISOString(),
            beoordeeld_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  // Spoeddienst: regenereer WhatsApp tekst (na bewerking)
  if (action === "regenerate_whatsapp") {
    const { data: dienst } = await supabaseAdmin
      .from("diensten")
      .select("klant_naam, locatie, datum, start_tijd, eind_tijd, functie, aantal_nodig, uurtarief, spoeddienst_token")
      .eq("id", id)
      .single();

    if (dienst) {
      const tekst = generateWhatsAppTekst(dienst);
      await supabaseAdmin
        .from("diensten")
        .update({ spoeddienst_whatsapp_tekst: tekst })
        .eq("id", id);
      return NextResponse.json({ data: { whatsapp_tekst: tekst } });
    }
  }

  return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    captureRouteError(err, { route: "/api/admin/diensten", action: "POST" });
    // console.error("[DIENSTEN] POST error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function generateWhatsAppTekst(dienst: {
  klant_naam?: string;
  locatie?: string;
  datum?: string;
  start_tijd?: string;
  eind_tijd?: string;
  functie?: string;
  aantal_nodig?: number;
  uurtarief?: number | null;
  spoeddienst_token?: string;
}): string {
  const functieLabels: Record<string, string> = {
    bediening: "Bediening",
    bar: "Bar",
    keuken: "Keuken",
    afwas: "Afwas",
    gastheer: "Gastheer/vrouw",
  };

  const date = dienst.datum
    ? new Date(dienst.datum + "T00:00:00").toLocaleDateString("nl-NL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dienstDate = dienst.datum ? new Date(dienst.datum + "T00:00:00") : null;
  let dagLabel = date;
  if (dienstDate) {
    if (dienstDate.getTime() === today.getTime()) dagLabel = `Vandaag (${date})`;
    else {
      const morgen = new Date(today);
      morgen.setDate(morgen.getDate() + 1);
      if (dienstDate.getTime() === morgen.getTime()) dagLabel = `Morgen (${date})`;
    }
  }

  const functie = functieLabels[dienst.functie || ""] || dienst.functie || "";
  const startTijd = dienst.start_tijd?.substring(0, 5) || "";
  const eindTijd = dienst.eind_tijd?.substring(0, 5) || "";
  const tarief = dienst.uurtarief ? `\n💰 €${dienst.uurtarief.toFixed(2)}/uur` : "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";

  return `🚨 SPOEDDIENST 🚨

📍 ${dienst.klant_naam || ""}, ${dienst.locatie || ""}
📅 ${dagLabel}
⏰ ${startTijd} - ${eindTijd}
👤 ${dienst.aantal_nodig || 1}x ${functie}${tarief}

Beschikbaar? Klik hier:
${baseUrl}/spoeddienst/${dienst.spoeddienst_token || ""}`;
}
