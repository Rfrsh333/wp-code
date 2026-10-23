import { supabaseAdmin } from "@/lib/supabase";
import { haalDemoIds } from "@/lib/demo";
import { NIL_UUID } from "@/lib/demo-regels";
import { bewaarMeldingen, bewaarMeldingenVoorIedereen, type MeldingOpslag } from "@/lib/meldingen/meldingen-opslag";
import {
  meldingIdVoor,
  pushData,
  type MeldingCategorie,
  type MeldingIds,
  type MeldingInvoer,
} from "@/lib/meldingen/meldingen-regels";

/**
 * Meldingencentrum (stap 5): elke push hieronder wordt per ontvanger ook een melding (tabel
 * `meldingen`), ook voor wie geen pushabonnement heeft. Dat kan de push nooit breken: een mislukte
 * insert gaat naar Sentry, zonder tabel (migratie 20261023_meldingencentrum.sql) wordt er niets
 * opgeslagen.
 *
 * `melding_id` in de push: eerst wordt de melding opgeslagen (hooguit MELDING_WACHT_MS; intussen
 * worden de pushabonnementen al opgehaald), daarna gaat de push met per abonnement het id van de
 * melding van de eigenaar: Expo in `data.melding_id`, web-push als `melding_id` in de payload. De
 * app markeert die melding bij openen als gelezen. Ook bij een broadcast (sendPushToAllOfType,
 * sendPushToUsers) krijgt elke ontvanger zijn eigen id. Null als er voor die ontvanger geen melding
 * is (account inactief, tabel ontbreekt) of als het opslaan niet op tijd klaar was; bij ontdubbelen
 * ("overslaan") het id van de eerdere kaart over hetzelfde.
 */
export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  actions?: Array<{ action: string; title: string }>;
  /**
   * Tab in het meldingencentrum. Zonder: afgeleid uit tag en url
   * (lib/meldingen/meldingen-regels.ts → categorieVoorMelding). Gaat niet mee in de push.
   */
  categorie?: MeldingCategorie;
  /** Ontdubbelen van kaarten (zie MeldingInvoer). Gaan niet mee in de push. */
  sleutels?: MeldingInvoer["sleutels"];
  ontdubbel?: MeldingInvoer["ontdubbel"];
}

/** Wat er naar Expo en web-push gaat: de payload zonder de meldingvelden (de push blijft gelijk). */
function pushDeel(payload: PushPayload): PushPayload {
  if (!("categorie" in payload) && !("sleutels" in payload) && !("ontdubbel" in payload)) return payload;
  const rest = { ...payload };
  delete rest.categorie;
  delete rest.sleutels;
  delete rest.ontdubbel;
  return rest;
}

/**
 * Hoe lang de push op de melding (en haar id) wacht. Daarna gaat de push zonder melding_id en loopt
 * het opslaan op de achtergrond verder (routes hebben 10 s).
 */
const MELDING_WACHT_MS = 3000;

/** De ids van de opgeslagen meldingen, of een lege lijst als het opslaan niet op tijd klaar is. */
async function meldingIdsOpTijd(melding: Promise<MeldingOpslag>): Promise<MeldingIds> {
  let klok: ReturnType<typeof setTimeout> | undefined;
  const teLaat = new Promise<"te_laat">((klaar) => {
    klok = setTimeout(() => klaar("te_laat"), MELDING_WACHT_MS);
  });
  try {
    // bewaarMeldingen* gooit nooit; voor de zekerheid toch afgevangen, zodat de push altijd gaat.
    const uitkomst = await Promise.race([melding.catch(() => null), teLaat]);
    if (uitkomst === "te_laat") {
      console.warn(`[Push] melding na ${MELDING_WACHT_MS} ms nog niet opgeslagen; push gaat zonder melding_id`);
      return new Map();
    }
    return uitkomst?.ids ?? new Map();
  } finally {
    clearTimeout(klok);
  }
}

/**
 * Eerst de melding (voor melding_id), intussen de abonnementen ophalen, dan de push. De push bepaalt
 * het resultaat (en een eventuele fout); een mislukte melding houdt de push nooit tegen.
 */
async function metMelding(
  melding: Promise<MeldingOpslag>,
  abonnementen: Promise<PushSubscriptionRecord[]>,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  const ids = meldingIdsOpTijd(melding);
  let subscriptions: PushSubscriptionRecord[];
  try {
    subscriptions = await abonnementen;
  } catch (e) {
    await ids;
    throw e;
  }
  const meldingIds = await ids;
  if (!subscriptions.length) return { sent: 0, failed: 0 };
  return sendPushToSubscriptions(subscriptions, pushDeel(payload), meldingIds);
}

interface PushSubscriptionRecord {
  id: string;
  /** Eigenaar van het abonnement: daarmee zoeken we zijn melding_id op. */
  user_id?: string | null;
  endpoint: string | null;
  p256dh: string | null;
  auth: string | null;
  expo_token?: string | null;
}

// expo_token bestaat pas na migratie 20261001_portaal_sessies.sql; zonder die kolom (42703)
// valt de query terug op alleen web-push.
const SUB_COLUMNS = "id, user_id, endpoint, p256dh, auth, expo_token";
const SUB_COLUMNS_WEB = "id, user_id, endpoint, p256dh, auth";

async function selectSubscriptions(
  filter: (q: ReturnType<ReturnType<typeof supabaseAdmin.from>["select"]>) => PromiseLike<{ data: unknown; error: { code?: string } | null }>,
): Promise<PushSubscriptionRecord[]> {
  const eerste = await filter(supabaseAdmin.from("push_subscriptions").select(SUB_COLUMNS));
  if (eerste.error?.code === "42703") {
    const web = await filter(supabaseAdmin.from("push_subscriptions").select(SUB_COLUMNS_WEB));
    return (web.data as PushSubscriptionRecord[] | null) ?? [];
  }
  return (eerste.data as PushSubscriptionRecord[] | null) ?? [];
}

/**
 * Stuur push notificatie naar een specifieke gebruiker
 */
export async function sendPushToUser(
  userId: string,
  userType: "medewerker" | "klant",
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  return metMelding(
    bewaarMeldingen([userId], userType, payload),
    // Alle abonnementen van deze gebruiker
    selectSubscriptions((q) => q.eq("user_id", userId).eq("user_type", userType)),
    payload,
  );
}

/**
 * Stuur push notificatie naar alle gebruikers van een bepaald type.
 *
 * Demo-accounts (lib/demo.ts) vormen een eigen wereld: standaard (`demo: false`) gaat een
 * broadcast alleen naar echte gebruikers; met `demo: true` (actie van een demo-account) alleen
 * naar demo-gebruikers, zodat een reviewer nooit een push naar echte medewerkers veroorzaakt.
 * De melding gaat naar alle actieve accounts van die wereld, ook zonder pushabonnement.
 */
export async function sendPushToAllOfType(
  userType: "medewerker" | "klant",
  payload: PushPayload,
  opties: { demo?: boolean } = {}
): Promise<{ sent: number; failed: number }> {
  const demo = opties.demo === true;
  const ids = await haalDemoIds();
  const demoSet = userType === "medewerker" ? ids.medewerkers : ids.klanten;
  const demoLijst = [...demoSet];
  return metMelding(
    bewaarMeldingenVoorIedereen(userType, payload, { demo, demoIds: demoSet }),
    selectSubscriptions((q) => {
      const basis = q.eq("user_type", userType);
      if (demo) return basis.in("user_id", demoLijst.length > 0 ? demoLijst : [NIL_UUID]);
      return demoLijst.length > 0 ? basis.not("user_id", "in", `(${demoLijst.join(",")})`) : basis;
    }),
    payload,
  );
}

/**
 * Stuur push notificatie naar meerdere specifieke users
 */
export async function sendPushToUsers(
  userIds: string[],
  userType: "medewerker" | "klant",
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!userIds.length) return { sent: 0, failed: 0 };

  // Gerichte broadcast (pushNaarMedewerkers): per blok één melding (en melding_id) per ontvanger.
  return metMelding(
    bewaarMeldingen(userIds, userType, payload),
    selectSubscriptions((q) => q.in("user_id", userIds).eq("user_type", userType)),
    payload,
  );
}

/**
 * Interne functie: verstuur naar array van subscriptions, elk met het melding_id van de eigenaar.
 */
async function sendPushToSubscriptions(
  alle: PushSubscriptionRecord[],
  payload: PushPayload,
  meldingIds: MeldingIds,
): Promise<{ sent: number; failed: number }> {
  const appSubs = alle.filter((s) => s.expo_token);
  const subscriptions = alle.filter(
    (s): s is PushSubscriptionRecord & { endpoint: string; p256dh: string; auth: string } =>
      !s.expo_token && !!s.endpoint && !!s.p256dh && !!s.auth,
  );

  const app = await sendExpoPush(appSubs, payload, meldingIds);
  if (subscriptions.length === 0) return app;
  const web = await sendWebPush(subscriptions, payload, meldingIds);
  return { sent: app.sent + web.sent, failed: app.failed + web.failed };
}

/**
 * Native app (iOS/Android) via de Expo push-dienst, die doorstuurt naar APNs/FCM.
 * `data`: url (de app vertaalt die naar het juiste scherm), tag en melding_id (de app markeert die
 * melding bij openen als gelezen; null als die onbekend is).
 */
async function sendExpoPush(
  subs: PushSubscriptionRecord[],
  payload: PushPayload,
  meldingIds: MeldingIds,
): Promise<{ sent: number; failed: number }> {
  if (subs.length === 0) return { sent: 0, failed: 0 };

  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

  let sent = 0;
  let failed = 0;
  const verlopen: string[] = [];

  // Expo accepteert max. 100 berichten per verzoek.
  for (let i = 0; i < subs.length; i += 100) {
    const batch = subs.slice(i, i + 100);
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers,
        body: JSON.stringify(
          batch.map((s) => ({
            to: s.expo_token,
            title: payload.title,
            body: payload.body,
            data: pushData(payload, meldingIdVoor(meldingIds, s.user_id)),
            sound: "default",
          })),
        ),
      });
      const json = (await res.json().catch(() => null)) as { data?: Array<{ status: string; details?: { error?: string } }> } | null;
      const tickets = json?.data ?? [];
      batch.forEach((s, idx) => {
        const t = tickets[idx];
        if (t?.status === "ok") sent++;
        else {
          failed++;
          if (t?.details?.error === "DeviceNotRegistered") verlopen.push(s.id);
        }
      });
    } catch (err) {
      failed += batch.length;
      console.error("[Push] Expo-verzending mislukt:", err);
    }
  }

  if (verlopen.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("id", verlopen);
  }
  return { sent, failed };
}

/** Web-push (PWA) via VAPID. De payload krijgt per abonnement `melding_id` (of null) erbij. */
async function sendWebPush(
  subscriptions: Array<PushSubscriptionRecord & { endpoint: string; p256dh: string; auth: string }>,
  payload: PushPayload,
  meldingIds: MeldingIds,
): Promise<{ sent: number; failed: number }> {
  // Dynamic import om build failures te voorkomen als web-push niet geïnstalleerd is
  let webpush: typeof import("web-push");
  try {
    webpush = await import("web-push");
  } catch {
    console.error("[Push] web-push module niet gevonden. Run: npm install web-push");
    return { sent: 0, failed: subscriptions.length };
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL || "mailto:info@toptalentjobs.nl";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error("[Push] VAPID keys niet geconfigureerd");
    return { sent: 0, failed: subscriptions.length };
  }

  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

  let sent = 0;
  let failed = 0;
  const expiredIds: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify({ ...payload, melding_id: meldingIdVoor(meldingIds, sub.user_id) }),
          { TTL: 86400 } // 24 uur geldig
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // 410 Gone of 404 = subscription verlopen → verwijderen
        if (statusCode === 410 || statusCode === 404) {
          expiredIds.push(sub.id);
        }
        failed++;
        console.error(`[Push] Failed for ${sub.endpoint.substring(0, 50)}:`, statusCode);
      }
    })
  );

  // Verwijder verlopen subscriptions
  if (expiredIds.length > 0) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("id", expiredIds);
    console.log(`[Push] ${expiredIds.length} verlopen subscriptions verwijderd`);
  }

  return { sent, failed };
}
