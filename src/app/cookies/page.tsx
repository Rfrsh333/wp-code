"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "ttj_cookie_consent";

type ConsentValue = "all" | "necessary";

export default function CookiesPage() {
  const [currentConsent, setCurrentConsent] = useState<ConsentValue | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY) as ConsentValue | null;
    setCurrentConsent(stored);
  }, []);

  const updateConsent = (value: ConsentValue) => {
    window.localStorage.setItem(CONSENT_KEY, value);
    window.dispatchEvent(new CustomEvent("ttj-cookie-consent", { detail: value }));
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "cookie_consent_update", consent: value });
    setCurrentConsent(value);
  };

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
          Cookie-instellingen
        </h1>
        <p className="text-neutral-600 mb-8">
          Kies welke cookies je wilt toestaan. Noodzakelijke cookies zijn vereist
          voor de basisfunctionaliteit van de website.
        </p>

        <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200 mb-8">
          <p className="text-sm text-neutral-600 mb-4">
            Huidige keuze:{" "}
            <span className="font-semibold text-neutral-900">
              {currentConsent === "all"
                ? "Alles accepteren"
                : currentConsent === "necessary"
                ? "Alleen noodzakelijk"
                : "Nog geen keuze"}
            </span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => updateConsent("necessary")}
              className="px-5 py-3 rounded-xl border border-neutral-200 text-neutral-700 font-medium hover:border-neutral-300 hover:bg-white transition-colors"
            >
              Alleen noodzakelijk
            </button>
            <button
              type="button"
              onClick={() => updateConsent("all")}
              className="px-5 py-3 rounded-xl bg-[#F27501] text-white font-semibold hover:bg-[#d96800] transition-colors"
            >
              Alles accepteren
            </button>
          </div>
        </div>

        <Link href="/privacy" className="text-[#F27501] hover:underline">
          Lees ons privacybeleid
        </Link>
      </div>
    </section>
  );
}
