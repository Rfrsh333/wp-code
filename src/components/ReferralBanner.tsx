"use client";

import { useState, useCallback } from "react";

export default function ReferralBanner() {
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
