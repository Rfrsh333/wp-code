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
  endpoint: string;
  p256dh: string;
  auth: string;
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
  const { data: subscriptions, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("user_type", userType);

  if (error || !subscriptions?.length) {
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
  const { data: subscriptions, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_type", userType);

  if (error || !subscriptions?.length) {
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

  const { data: subscriptions, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds)
    .eq("user_type", userType);

  if (error || !subscriptions?.length) {
    return { sent: 0, failed: 0 };
  }

  return sendPushToSubscriptions(subscriptions, payload);
}

/**
 * Interne functie: verstuur naar array van subscriptions
 */
async function sendPushToSubscriptions(
  subscriptions: PushSubscriptionRecord[],
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
