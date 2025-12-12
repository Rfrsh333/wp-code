import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Diensten - TopTalent Jobs",
  description: "Ontdek onze diensten: uitzenden, detachering en recruitment voor horeca en evenementen.",
};

export default function DienstenPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 to-orange-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Onze <span className="text-[#F27501]">Diensten</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Flexibele personeelsoplossingen voor horeca en evenementen
          </p>
        </div>
      </section>

      {/* Diensten Detail */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Uitzenden */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="w-16 h-16 bg-[#F27501] rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Uitzenden</h2>
              <p className="text-lg text-gray-600 mb-6">
                We plaatsen tijdelijk onze arbeidskrachten bij horecagelegenheden en evenementen.
                Perfect voor piekmomenten, festivals, evenementen of seizoenswerk.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-[#F27501] mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Flexibele inzet per dag, week of maand
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-[#F27501] mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Geschoold en ervaren personeel
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-[#F27501] mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Snelle beschikbaarheid (binnen 24-48 uur)
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-[#F27501] mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Geen administratieve rompslomp
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl p-8 h-64 flex items-center justify-center">
              <span className="text-6xl">👥</span>
            </div>
          </div>

          {/* Detachering */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="order-2 lg:order-1 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-8 h-64 flex items-center justify-center">
              <span className="text-6xl">💼</span>
            </div>
            <div className="order-1 lg:order-2">
              <div className="w-16 h-16 bg-[#F27501] rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Detachering</h2>
              <p className="text-lg text-gray-600 mb-6">
                Langdurige plaatsing voor vaste periodes. Ons personeel werkt bij u, maar blijft bij ons in dienst.
                De perfecte tussenoplossing voor structurele behoefte.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-[#F27501] mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Vaste medewerker voor langere periode
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-[#F27501] mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Wij regelen alle administratie
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-[#F27501] mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Optie tot overname na detachering
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-[#F27501] mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Continuïteit en stabiliteit
                </li>
              </ul>
            </div>
          </div>

          {/* Recruitment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-16 h-16 bg-[#F27501] rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Recruitment</h2>
              <p className="text-lg text-gray-600 mb-6">
                Aantrekken, selecteren en plaatsen van geschikte kandidaten.
                Wij vinden het perfecte talent voor uw organisatie en nemen u het hele proces uit handen.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-[#F27501] mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Uitgebreide selectieprocedure
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-[#F27501] mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Referentiecheck en screening
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-[#F27501] mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Match op basis van cultuur en skills
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-[#F27501] mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Garantie op plaatsing
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-8 h-64 flex items-center justify-center">
              <span className="text-6xl">🔍</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#F27501]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Interesse in onze diensten?
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Neem vrijblijvend contact met ons op voor een offerte op maat.
          </p>
          <Link
            href="/contact"
            className="bg-white text-[#F27501] px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-colors inline-block"
          >
            Neem Contact Op
          </Link>
        </div>
      </section>
    </>
  );
}
