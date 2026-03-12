"use client";

import { Suspense, useState, useCallback } from "react";
import Section from "@/components/Section";
import InschrijfFormulier from "@/components/forms/InschrijfFormulier";

function ReferralBanner() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const referralUrl = "https://www.toptalentuitzendbureau.nl/inschrijven/";

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = referralUrl;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [referralUrl]);

  const handleWhatsApp = useCallback(() => {
    const message = encodeURIComponent(
      `Hey! Wil jij ook werken in de horeca? Schrijf je in bij TopTalent en verdien goed geld met flexibele uren 💪\n\n${referralUrl}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  }, [referralUrl]);

  return (
    <>
      {/* Floating pill */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        role="complementary"
        aria-label="Referral bonus banner"
      >
        <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C] rounded-full shadow-2xl shadow-orange-500/30 p-1">
          <div className="bg-white rounded-full px-6 py-3 flex items-center gap-4">
            <span className="text-lg" aria-hidden="true">🎁</span>
            <span className="text-sm font-medium text-neutral-900 hidden sm:block">
              Verdien €50 per verwijzing!
            </span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#F97316] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#EA580C] transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
            >
              Meer info
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Referral programma details"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 animate-in fade-in zoom-in duration-200">
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-600"
              aria-label="Sluiten"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <span className="text-4xl mb-3 block">🎁</span>
              <h2 className="text-2xl font-bold text-neutral-900">
                Verdien €50 per verwijzing!
              </h2>
              <p className="text-neutral-600 mt-2">
                Ken jij iemand die in de horeca wil werken? Wanneer jouw vriend zich inschrijft en de eerste dienst voltooit, ontvang jij €50 bonus.
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-4 mb-8">
              {[
                { step: "1", title: "Deel jouw link", desc: "Stuur de inschrijflink naar een vriend" },
                { step: "2", title: "Vriend schrijft zich in", desc: "Je vriend meldt zich aan via jouw link" },
                { step: "3", title: "€50 bonus!", desc: "Na de eerste voltooide dienst ontvang jij €50" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#F97316] to-[#EA580C] flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-bold">{item.step}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900">{item.title}</p>
                    <p className="text-sm text-neutral-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleWhatsApp}
                className="w-full bg-[#25D366] text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#1fb855] transition-all duration-300 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Deel via WhatsApp
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full bg-[#F97316] text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#EA580C] transition-all duration-300 flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Link gekopieerd!
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Kopieer link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function InschrijvenPage() {
  return (
    <>
      {/* ============================================================
          SECTION FLOW (Design System):
          Full page tinted section with form
          ============================================================ */}

      {/* Form Section - Tinted */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          {/* Benefits bar */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-12 pb-12 border-b border-neutral-200/50">
            {[
              { icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", text: "Competitief salaris" },
              { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", text: "Flexibele uren" },
              { icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z", text: "Werk in jouw regio" },
              { icon: "M13 10V3L4 14h7v7l9-11h-7z", text: "Snel aan de slag" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-neutral-600">
                <div className="w-8 h-8 rounded-lg bg-[#F97316]/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </div>
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" /></div>}>
            <InschrijfFormulier />
          </Suspense>

          {/* Trust badges */}
          <div className="mt-16 pt-12 border-t border-neutral-200/50">
            <div className="text-center mb-8">
              <p className="text-sm text-neutral-500 uppercase tracking-wider font-medium">
                Waarom kiezen voor TopTalent?
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center group">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm shadow-neutral-900/5 border border-neutral-100 flex items-center justify-center mx-auto mb-4 group-hover:shadow-md group-hover:border-[#F97316]/20 transition-all duration-300">
                  <svg className="w-6 h-6 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-neutral-900 mb-1">Betrouwbaar & Eerlijk</h3>
                <p className="text-sm text-neutral-500">Transparante afspraken en correcte uitbetaling</p>
              </div>

              <div className="text-center group">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm shadow-neutral-900/5 border border-neutral-100 flex items-center justify-center mx-auto mb-4 group-hover:shadow-md group-hover:border-[#F97316]/20 transition-all duration-300">
                  <svg className="w-6 h-6 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-neutral-900 mb-1">Persoonlijke begeleiding</h3>
                <p className="text-sm text-neutral-500">Altijd een vast aanspreekpunt</p>
              </div>

              <div className="text-center group">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm shadow-neutral-900/5 border border-neutral-100 flex items-center justify-center mx-auto mb-4 group-hover:shadow-md group-hover:border-[#F97316]/20 transition-all duration-300">
                  <svg className="w-6 h-6 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-neutral-900 mb-1">Top werkgevers</h3>
                <p className="text-sm text-neutral-500">Werk bij de beste horecazaken</p>
              </div>
            </div>
          </div>
        </Section.Container>
      </Section>

      {/* Referral Banner - floating pill */}
      <ReferralBanner />
    </>
  );
}
