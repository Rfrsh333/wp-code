"use client";

import Section from "@/components/Section";
import InschrijfFormulier from "@/components/forms/InschrijfFormulier";

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

          <InschrijfFormulier />

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
    </>
  );
}
