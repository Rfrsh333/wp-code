import Link from "next/link";
import { buildPageMetadata } from "@/lib/metadata";
import CalculatorClient from "./CalculatorClient";

export const metadata = buildPageMetadata({
  title: "Kosten horecapersoneel berekenen | Gratis calculator | TopTalent",
  description:
    "Bereken in 2 minuten wat horecapersoneel écht kost. Vergelijk vast personeel, uitzendkrachten en ZZP'ers en ontvang een helder kostenoverzicht.",
  path: "/kosten-calculator/",
});

export default function KostenCalculatorPage() {
  return (
    <>
      {/* Hero Section - Server Rendered for LCP */}
      <section
        className="pt-24 md:pt-32 pb-12 md:pb-16"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #FFF7F1 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <span className="inline-block bg-orange-100 text-[#F97316] text-xs font-semibold px-3 py-1.5 md:px-4 md:py-2 rounded-full uppercase tracking-wide mb-4 md:mb-6">
            Gratis tool
          </span>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-4 md:mb-6 leading-tight">
            Wat kost horecapersoneel <span className="text-[#F97316]">écht</span>?
          </h1>
          <p className="text-base md:text-lg text-neutral-600 max-w-2xl mx-auto">
            Bereken in 2 minuten uw personeelskosten. Vergelijk vast personeel,
            uitzendkrachten en ZZP&apos;ers - en ontvang een helder kostenoverzicht.
          </p>
        </div>
      </section>

      {/* Interactive Calculator */}
      <CalculatorClient />

      {/* Trust Section - Server Rendered */}
      <section className="py-16 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-neutral-900 text-center mb-12">
            Hoe wij rekenen
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: "Actuele tarieven",
                desc: "Gebaseerd op marktgemiddelden en onze eigen ervaring in de horeca.",
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: "CAO-conform",
                desc: "Onze tarieven voldoen aan de CAO Horeca en alle wettelijke verplichtingen.",
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
                title: "Transparante opbouw",
                desc: "Geen verborgen kosten. Wat u ziet is wat u betaalt.",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 text-center shadow-sm border border-neutral-100
                  hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-[#FFF7F1] rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#F97316]">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-3">{item.title}</h3>
                <p className="text-neutral-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Server Rendered */}
      <section className="py-16 bg-white">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div
            className="py-12 px-8 rounded-3xl"
            style={{
              background: "linear-gradient(180deg, #FFF7F1 0%, #FFFFFF 100%)",
            }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
              Liever persoonlijk advies?
            </h2>
            <p className="text-neutral-600 mb-8">
              Elke horecazaak is anders. Wij denken graag mee over een personeelsoplossing die past bij uw situatie.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact/"
                className="bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                  shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                  hover:bg-[#EA580C] hover:-translate-y-0.5 transition-all duration-300 text-center"
              >
                Neem contact op
              </Link>
              <Link
                href="/diensten/"
                className="border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
                  hover:border-[#F97316] hover:text-[#F97316] transition-all duration-300 text-center"
              >
                Bekijk onze diensten
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
