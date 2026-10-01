import { supabaseAdmin } from "@/lib/supabase";

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  actions?: Array<{ action: string; title: string }>;
}

interface PushSubscriptionRecord {
  id: string;
  endpoint: string | null;
  p256dh: string | null;
  auth: string | null;
  expo_token?: string | null;
}

// expo_token bestaat pas na migratie 20261001_portaal_sessies.sql; zonder die kolom (42703)
// valt de query terug op alleen web-push.
const SUB_COLUMNS = "id, endpoint, p256dh, auth, expo_token";
const SUB_COLUMNS_WEB = "id, endpoint, p256dh, auth";

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
  // Haal alle subscriptions op voor deze user
  const subscriptions = await selectSubscriptions((q) => q.eq("user_id", userId).eq("user_type", userType));

  if (!subscriptions.length) {
    return { sent: 0, failed: 0 };
  }

  return sendPushToSubscriptions(subscriptions, payload);
}

/**
 * Stuur push notificatie naar alle gebruikers van een bepaald type
 */
export async function sendPushToAllOfType(
  userType: "medewerker" | "klant",
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await selectSubscriptions((q) => q.eq("user_type", userType));

  if (!subscriptions.length) {
    return { sent: 0, failed: 0 };
  }

  return sendPushToSubscriptions(subscriptions, payload);
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

  const subscriptions = await selectSubscriptions((q) => q.in("user_id", userIds).eq("user_type", userType));

  if (!subscriptions.length) {
    return { sent: 0, failed: 0 };
  }

  return sendPushToSubscriptions(subscriptions, payload);
}

/**
 * Interne functie: verstuur naar array van subscriptions
 */
async function sendPushToSubscriptions(
  alle: PushSubscriptionRecord[],
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const appSubs = alle.filter((s) => s.expo_token);
  const subscriptions = alle.filter(
    (s): s is PushSubscriptionRecord & { endpoint: string; p256dh: string; auth: string } =>
      !s.expo_token && !!s.endpoint && !!s.p256dh && !!s.auth,
  );

  const app = await sendExpoPush(appSubs, payload);
  if (subscriptions.length === 0) return app;
  const web = await sendWebPush(subscriptions, payload);
  return { sent: app.sent + web.sent, failed: app.failed + web.failed };
}

/**
 * Native app (iOS/Android) via de Expo push-dienst, die doorstuurt naar APNs/FCM.
 * `url` gaat mee als data; de app vertaalt die naar het juiste scherm.
 */
async function sendExpoPush(
  subs: PushSubscriptionRecord[],
  payload: PushPayload
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
            data: { url: payload.url ?? null, tag: payload.tag ?? null },
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

/** Web-push (PWA) via VAPID. */
async function sendWebPush(
  subscriptions: Array<PushSubscriptionRecord & { endpoint: string; p256dh: string; auth: string }>,
  payload: PushPayload
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
          JSON.stringify(payload),
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
