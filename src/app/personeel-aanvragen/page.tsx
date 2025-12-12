"use client";

import PersoneelAanvragenWizard from "@/components/forms/PersoneelAanvragenWizard";

export default function PersoneelAanvragenPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-neutral-50 to-white py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-block text-[#F27501] font-medium text-sm tracking-wider uppercase mb-4">
              Personeel aanvragen
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-6">
              Vind het perfecte{" "}
              <span className="text-[#F27501]">horecapersoneel</span>
            </h1>
            <p className="text-neutral-600 text-lg">
              Vul het formulier in en wij nemen binnen 24 uur contact met u op.
              Geen verplichtingen, gewoon een persoonlijk gesprek over uw behoefte.
            </p>
          </div>

          <PersoneelAanvragenWizard />

          {/* Trust Indicators */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-[#F27501]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-neutral-900 mb-1">Reactie binnen 24 uur</h3>
                <p className="text-sm text-neutral-500">Wij nemen snel contact met u op</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-[#F27501]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-neutral-900 mb-1">Geen verplichtingen</h3>
                <p className="text-sm text-neutral-500">Vrijblijvend advies gesprek</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-[#F27501]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-neutral-900 mb-1">500+ tevreden klanten</h3>
                <p className="text-sm text-neutral-500">Bewezen trackrecord</p>
              </div>
          </div>
        </div>
      </section>
    </>
  );
}
