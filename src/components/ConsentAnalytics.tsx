"use client";

import { useSyncExternalStore } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const CONSENT_KEY = "ttj_cookie_consent";

/** localStorage kan gooien (private mode, geblokkeerde cookies) — dan: geen consent. */
function leesConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "all";
  } catch {
    return false;
  }
}

export default function ConsentAnalytics() {
  // Externe store: consent verandert via een custom event of een ander tabblad.
  const hasConsent = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("ttj-cookie-consent", onStoreChange);
      window.addEventListener("storage", onStoreChange);
      return () => {
        window.removeEventListener("ttj-cookie-consent", onStoreChange);
        window.removeEventListener("storage", onStoreChange);
      };
    },
    leesConsent,
    () => false
  );

  if (!hasConsent) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
