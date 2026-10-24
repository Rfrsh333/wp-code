"use client";

import Link from "next/link";
import { CONSENT_EVENT, CONSENT_KEY, useCookieKeuze, type CookieKeuze } from "@/hooks/useCookieKeuze";

export default function CookiesPage() {
  const currentConsent = useCookieKeuze();

  // Het event laat useCookieKeuze opnieuw lezen, dus de getoonde keuze volgt vanzelf.
  const updateConsent = (value: CookieKeuze) => {
    window.localStorage.setItem(CONSENT_KEY, value);
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "cookie_consent_update", consent: value });
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
              className="px-5 py-3 rounded-xl bg-[#F27501] text-[#1D1B19] font-semibold hover:bg-[#E06C00] transition-colors"
            >
              Alles accepteren
            </button>
          </div>
        </div>

        <Link href="/privacy/" className="text-[#B85600] hover:underline">
          Lees ons privacybeleid
        </Link>
      </div>
    </section>
  );
}
