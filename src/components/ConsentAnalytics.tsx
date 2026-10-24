"use client";

import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { volgCookiekeuze } from "@/lib/posthog";
import { useCookieKeuze } from "@/hooks/useCookieKeuze";

export default function ConsentAnalytics() {
  const hasConsent = useCookieKeuze() === "all";

  useEffect(() => {
    volgCookiekeuze(hasConsent);
  }, [hasConsent]);

  if (!hasConsent) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
