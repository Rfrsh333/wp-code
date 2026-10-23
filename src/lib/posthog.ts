import posthog, { type CaptureResult } from "posthog-js";

// Openbare projectsleutel (client-side token, bedoeld om in de browser te staan).
const SLEUTEL = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "phc_AThATBAHgv5EMQvPzAbD8mJBEva4nEudR54yDoZfLScU";
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

const PRODUCTIE_HOSTS = ["www.toptalentjobs.nl", "toptalentjobs.nl"];
const URL_PROPS = ["$current_url", "$referrer", "$initial_current_url", "$initial_referrer"];
// We identificeren niemand; deze events tellen alleen mee voor de limiet.
const OVERBODIG = new Set(["$set", "$opt_in"]);

let gestart = false;

/**
 * Alleen meten op de echte site: localhost en Vercel-previews vervuilen de cijfers niet.
 * `NEXT_PUBLIC_POSTHOG_ALTIJD=1` zet het lokaal aan om te testen.
 */
function magMeten(): boolean {
  if (process.env.NEXT_PUBLIC_POSTHOG_ALTIJD === "1") return true;
  return PRODUCTIE_HOSTS.includes(window.location.hostname);
}

/** Querystrings bevatten soms activatie- of resettokens; alleen utm-parameters blijven staan. */
function zonderGevoeligeParams(url: unknown): unknown {
  if (typeof url !== "string" || !url.includes("?")) return url;
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) {
      if (!key.startsWith("utm_")) u.searchParams.delete(key);
    }
    return u.toString();
  } catch {
    return url.split("?")[0];
  }
}

function opschonen(event: CaptureResult | null): CaptureResult | null {
  if (!event || OVERBODIG.has(event.event)) return null;
  const props = event.properties ?? {};
  // Beheer is intern gebruik en hoort niet in de productcijfers.
  if (typeof props.$pathname === "string" && props.$pathname.startsWith("/admin")) return null;
  for (const key of URL_PROPS) {
    if (key in props) props[key] = zonderGevoeligeParams(props[key]);
  }
  return event;
}

/** Volgt de cookiekeuze: pas starten na "alles accepteren", stoppen zodra die wordt ingetrokken. */
export function volgCookiekeuze(toestemming: boolean) {
  if (toestemming) {
    if (!magMeten()) return;
    if (gestart) {
      if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
      return;
    }
    posthog.init(SLEUTEL, {
      api_host: HOST,
      ui_host: "https://eu.posthog.com",
      defaults: "2026-08-30",
      person_profiles: "identified_only",
      disable_session_recording: true,
      disable_surveys: true,
      capture_exceptions: false, // Sentry vangt fouten al af
      mask_personal_data_properties: true,
      disable_external_dependency_loading: true, // geen extra scripts van PostHog-servers
      before_send: opschonen,
    });
    gestart = true;
  } else if (gestart) {
    posthog.opt_out_capturing();
  }
}
