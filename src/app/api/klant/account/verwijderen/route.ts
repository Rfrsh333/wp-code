import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession, revokeSessions } from "@/lib/portal-auth";
import { checkRedisRateLimit, klantLoginPerAccountRateLimit } from "@/lib/rate-limit-redis";
import { INGEPLAND_STATUSSEN } from "@/lib/dienst-status";
import { nlVandaag } from "@/lib/nl-tijd";
import { sendTelegramAlert } from "@/lib/telegram";
import { captureRouteError } from "@/lib/sentry-utils";

/**
 * Account verwijderen (App Store-richtlijn 5.1.1(v)).
 *
 * De klantrij wordt niet fysiek verwijderd: facturen verwijzen ernaar en moeten 7 jaar bewaard
 * blijven (fiscale bewaarplicht). In plaats daarvan:
 * - status 'verwijderd' (valt terug op 'inactief' als een CHECK-constraint dat weigert) →
 *   inloggen en elke API geven direct 401 (getKlantSession controleert de status);
 * - persoonsgegevens geanonimiseerd: contactpersoon, e-mail, telefoon, wachtwoord, resettoken;
 * - bedrijfsgegevens (naam, adres, KvK, btw) blijven alleen staan als er facturen zijn — die
 *   horen bij de factuur; zonder facturen worden ook die gewist;
 * - favorieten, templates en push-abonnementen verwijderd; open toekomstige diensten zonder
 *   ingeplande medewerkers geannuleerd.
 * Diensten waar al iemand voor ingepland staat blokkeren het verwijderen: die moeten eerst
 * geannuleerd of afgerond worden (anders staat er een medewerker voor niets).
 */
export async function POST(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limiet = await checkRedisRateLimit(`klant-verwijderen:${klant.id}`, klantLoginPerAccountRateLimit, { failClosed: true });
  if (!limiet.success) {
    return NextResponse.json({ error: "Te veel pogingen. Probeer het later opnieuw." }, { status: 429 });
  }

  try {
    const { wachtwoord, bevestiging } = await request.json().catch(() => ({}));
    if (bevestiging !== "VERWIJDEREN") {
      return NextResponse.json({ error: "Typ VERWIJDEREN om te bevestigen" }, { status: 400 });
    }
    if (typeof wachtwoord !== "string" || !wachtwoord) {
      return NextResponse.json({ error: "Vul uw wachtwoord in" }, { status: 400 });
    }

    const { data: account } = await supabaseAdmin
      .from("klanten")
      .select("id, wachtwoord")
      .eq("id", klant.id)
      .maybeSingle();
    if (!account?.wachtwoord || !(await bcrypt.compare(wachtwoord, account.wachtwoord))) {
      return NextResponse.json({ error: "Wachtwoord is onjuist" }, { status: 403 });
    }

    // Toekomstige diensten
    const { data: toekomstig } = await supabaseAdmin
      .from("diensten")
      .select("id, datum, status, dienst_aanmeldingen(status)")
      .eq("klant_id", klant.id)
      .gte("datum", nlVandaag())
      .not("status", "in", "(geannuleerd,afgerond,voltooid)");

    const metIngepland = (toekomstig || []).filter((d) =>
      ((d.dienst_aanmeldingen as { status: string }[] | null) || []).some((a) =>
        (INGEPLAND_STATUSSEN as readonly string[]).includes(a.status)
      )
    );
    if (metIngepland.length > 0) {
      return NextResponse.json(
        {
          error: `U heeft nog ${metIngepland.length} komende dienst${metIngepland.length === 1 ? "" : "en"} met ingeplande medewerkers. Annuleer die eerst (of neem contact op met TopTalent) en verwijder daarna uw account.`,
          diensten: metIngepland.map((d) => ({ id: d.id, datum: d.datum })),
        },
        { status: 409 },
      );
    }

    const teAnnuleren = (toekomstig || []).map((d) => d.id);
    if (teAnnuleren.length > 0) {
      await supabaseAdmin.from("diensten").update({ status: "geannuleerd" }).in("id", teAnnuleren);
      await supabaseAdmin
        .from("dienst_aanmeldingen")
        .update({ status: "geannuleerd" })
        .in("dienst_id", teAnnuleren)
        .in("status", ["aangemeld", "uitgenodigd"]);
    }

    const { count: aantalFacturen } = await supabaseAdmin
      .from("facturen")
      .select("id", { count: "exact", head: true })
      .eq("klant_id", klant.id);

    // Onbruikbaar wachtwoord: hash van willekeurige bytes die niemand kent.
    const onbruikbaar = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

    const anoniem: Record<string, unknown> = {
      status: "verwijderd",
      contactpersoon: "Verwijderd",
      email: `verwijderd-${klant.id}@verwijderd.invalid`,
      telefoon: null,
      wachtwoord: onbruikbaar,
      reset_token: null,
      reset_token_expires_at: null,
      verwijderd_at: new Date().toISOString(),
    };
    if (!aantalFacturen) {
      Object.assign(anoniem, {
        bedrijfsnaam: "Verwijderd account",
        adres: null,
        postcode: null,
        stad: null,
        kvk_nummer: null,
        btw_nummer: null,
      });
    }

    // Kolommen die (nog) niet bestaan weglaten en opnieuw proberen; 23514 = status-CHECK.
    let update = { ...anoniem };
    for (let poging = 0; poging < 8; poging++) {
      const { error } = await supabaseAdmin.from("klanten").update(update).eq("id", klant.id);
      if (!error) break;
      if (error.code === "23514" && update.status === "verwijderd") {
        update = { ...update, status: "inactief" };
        continue;
      }
      if (error.code === "42703" || error.code === "PGRST204") {
        const kolom = /'([a-z_]+)' column|column "?([a-z_]+)"?/i.exec(error.message || "");
        const naam = kolom?.[1] || kolom?.[2];
        if (naam && naam in update) {
          const rest = { ...update };
          delete rest[naam];
          update = rest;
          continue;
        }
      }
      captureRouteError(error, { route: "/api/klant/account/verwijderen", action: "ANONIMISEREN" });
      return NextResponse.json({ error: "Verwijderen mislukt. Neem contact op met TopTalent." }, { status: 500 });
    }

    // Gekoppelde gegevens die niet fiscaal bewaard hoeven te worden.
    await Promise.all([
      supabaseAdmin.from("klant_favoriete_medewerkers").delete().eq("klant_id", klant.id),
      supabaseAdmin.from("dienst_templates").delete().eq("klant_id", klant.id),
      supabaseAdmin.from("push_subscriptions").delete().eq("user_id", klant.id).eq("user_type", "klant"),
    ]);

    await revokeSessions("klanten", klant.id);
    const cookieStore = await cookies();
    cookieStore.delete("klant_session");

    // Telegram (geen PII — AVG)
    sendTelegramAlert(`<b>Klantaccount verwijderd</b>\nEen klant heeft zijn account verwijderd via het portaal — bekijk in dashboard`)
      .catch((e) => captureRouteError(e, { route: "/api/klant/account/verwijderen", action: "TELEGRAM" }));

    return NextResponse.json({ success: true, facturen_bewaard: aantalFacturen || 0 });
  } catch (error) {
    captureRouteError(error, { route: "/api/klant/account/verwijderen", action: "POST" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
