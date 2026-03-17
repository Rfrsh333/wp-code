/**
 * Service Worker utilities voor client-side gebruik.
 * Verzendt berichten naar actieve service workers (bijv. bij logout).
 */

/**
 * Stuur een LOGOUT bericht naar de actieve service worker zodat
 * user-specifieke caches (API data, dynamische pagina's) worden gewist.
 * Voorkomt dat een volgende gebruiker gecachte data van de vorige ziet.
 */
export async function clearSwCacheOnLogout(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: "LOGOUT" });
  } catch {
    // Niet kritiek — als SW niet beschikbaar is, is er ook geen cache
  }
}
