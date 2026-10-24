"use client";

import { useSyncExternalStore } from "react";

export const CONSENT_KEY = "ttj_cookie_consent";
export const CONSENT_EVENT = "ttj-cookie-consent";

export type CookieKeuze = "all" | "necessary";

/** localStorage kan gooien (private mode, geblokkeerde cookies) — dan: geen keuze. */
function leesKeuze(): CookieKeuze | null {
  try {
    const waarde = window.localStorage.getItem(CONSENT_KEY);
    return waarde === "all" || waarde === "necessary" ? waarde : null;
  } catch {
    return null;
  }
}

function abonneer(onStoreChange: () => void) {
  // Keuze verandert via ons eigen event (zelfde tabblad) of een ander tabblad.
  window.addEventListener(CONSENT_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

/**
 * De cookiekeuze van de bezoeker. Op de server en tijdens het hydrateren altijd null, zodat de
 * HTML gelijk blijft (anders React-fout #418 bij terugkerende bezoekers); daarna de echte keuze.
 */
export function useCookieKeuze(): CookieKeuze | null {
  return useSyncExternalStore(abonneer, leesKeuze, () => null);
}
