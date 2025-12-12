"use client";

import InschrijfFormulier from "@/components/forms/InschrijfFormulier";

export default function InschrijvenPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-neutral-50 to-white py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-block text-[#F27501] font-medium text-sm tracking-wider uppercase mb-4">
              Word onderdeel van ons team
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-6">
              Werk in de <span className="text-[#F27501]">horeca</span> via TopTalent
            </h1>
            <p className="text-neutral-600 text-lg">
              Ben je op zoek naar flexibel werk in de horeca? Schrijf je nu in en wij matchen je
              met de beste werkgevers in jouw regio.
            </p>
          </div>

          <InschrijfFormulier />

          {/* Benefits */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-[#F27501]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-neutral-900 text-sm">Goed salaris</h3>
            </div>

            <div className="text-center p-4">
              <div className="w-12 h-12 bg-[#F27501]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-neutral-900 text-sm">Flexibele uren</h3>
            </div>

            <div className="text-center p-4">
              <div className="w-12 h-12 bg-[#F27501]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-neutral-900 text-sm">In jouw regio</h3>
            </div>

            <div className="text-center p-4">
              <div className="w-12 h-12 bg-[#F27501]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-neutral-900 text-sm">Snel aan de slag</h3>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
