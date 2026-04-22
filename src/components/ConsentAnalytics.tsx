"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function ConsentAnalytics() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    // Check initial consent state
    const consent = localStorage.getItem("ttj_cookie_consent");
    setHasConsent(consent === "all");

    // Listen for consent changes
    const handleConsent = () => {
      const updated = localStorage.getItem("ttj_cookie_consent");
      setHasConsent(updated === "all");
    };

    window.addEventListener("ttj-cookie-consent", handleConsent);
    return () => window.removeEventListener("ttj-cookie-consent", handleConsent);
  }, []);

  if (!hasConsent) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
