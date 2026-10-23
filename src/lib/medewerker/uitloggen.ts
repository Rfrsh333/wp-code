/**
 * Uitloggen vanuit het medewerkerportaal (client-side).
 *
 * 1. Push-abonnement van dít toestel weg (server + browser), zodat een volgende gebruiker
 *    op hetzelfde toestel geen meldingen van de vorige krijgt. Moet vóór het uitloggen,
 *    want de DELETE vereist nog een sessie.
 * 2. Service worker vragen de gebruikersgebonden caches te wissen.
 * 3. Sessiecookie wissen.
 *
 * Elke stap heeft een time-out: `navigator.serviceWorker.ready` (gebruikt in lib/sw-utils)
 * resolvet nooit als er geen service worker is, waardoor uitloggen bleef hangen. lib/sw-utils
 * wordt ook door het klantportaal gebruikt en blijft daarom ongewijzigd.
 */

function metTimeout<T>(belofte: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([belofte, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))]);
}

async function ruimServiceWorkerOp(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registratie = await metTimeout(navigator.serviceWorker.getRegistration(), 2000);
    if (!registratie) return;

    const abonnement = registratie.pushManager
      ? await metTimeout(registratie.pushManager.getSubscription(), 2000)
      : null;
    if (abonnement) {
      await metTimeout(
        fetch("/api/push-subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: abonnement.endpoint }),
        }),
        4000,
      );
      await metTimeout(abonnement.unsubscribe(), 2000);
    }

    registratie.active?.postMessage({ type: "LOGOUT" });
  } catch {
    // Niet kritiek: uitloggen gaat hoe dan ook door.
  }
}

/** Geeft true als de sessie op de server is gewist. */
export async function medewerkerUitloggen(): Promise<boolean> {
  await ruimServiceWorkerOp();
  try {
    const res = await fetch("/api/medewerker/logout", { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}
