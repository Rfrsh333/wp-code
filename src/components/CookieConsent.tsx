"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "ttj_cookie_consent";

type ConsentValue = "all" | "necessary";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY) as ConsentValue | null;
    if (!stored) {
      setIsVisible(true);
    }

    const onOpen = () => setIsVisible(true);
    window.addEventListener("ttj-cookie-open", onOpen);
    return () => window.removeEventListener("ttj-cookie-open", onOpen);
  }, []);

  const handleConsent = (value: ConsentValue) => {
    window.localStorage.setItem(CONSENT_KEY, value);
    window.dispatchEvent(new CustomEvent("ttj-cookie-consent", { detail: value }));
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "cookie_consent_update", consent: value });
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4">
      <div className="max-w-4xl mx-auto bg-white border border-neutral-200 rounded-2xl shadow-2xl shadow-neutral-900/10 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">
              Cookies & privacy
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              We gebruiken noodzakelijke cookies voor de werking van de site en optionele
              cookies voor analytics en marketing. Je kunt je voorkeur altijd wijzigen via
              onze cookie-instellingen.
            </p>
            <Link href="/cookies" className="text-sm text-[#F27501] hover:underline">
              Cookie-instellingen
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => handleConsent("necessary")}
              className="px-5 py-3 rounded-xl border border-neutral-200 text-neutral-700 font-medium hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
            >
              Alleen noodzakelijk
            </button>
            <button
              type="button"
              onClick={() => handleConsent("all")}
              className="px-5 py-3 rounded-xl bg-[#F27501] text-white font-semibold hover:bg-[#d96800] transition-colors"
            >
              Alles accepteren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
