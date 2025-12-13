"use client";

import Link from "next/link";
import Image from "next/image";
import FadeIn from "@/components/animations/FadeIn";

export default function DienstenPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-block text-[#F27501] font-medium text-sm tracking-wider uppercase mb-4">
                Onze Diensten
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
                Flexibele personeelsoplossingen
              </h1>
              <p className="text-neutral-600 text-lg leading-relaxed">
                Van tijdelijke uitzendkrachten tot permanente plaatsingen.
                Wij bieden complete personeelsoplossingen voor de horeca- en evenementenbranche.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Diensten Detail */}
      <section className="py-20 lg:py-28 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">

          {/* ============================================================
              UITZENDEN - Afbeelding RECHTS van tekst
              ============================================================ */}
          <div id="uitzenden" className="scroll-mt-32 mb-24">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              {/* Tekst - Links */}
              <FadeIn direction="left" className="flex-1">
                <div>
                  <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-6">Uitzenden</h2>
                  <p className="text-lg text-neutral-600 mb-8 leading-relaxed">
                    Tijdelijke inzet van gekwalificeerd horecapersoneel. Perfect voor piekmomenten,
                    festivals, evenementen of seizoensgebonden drukte. Flexibel in te zetten wanneer u het nodig heeft.
                  </p>
                  <ul className="space-y-4 mb-8">
                    {[
                      "Flexibele inzet per dag, week of maand",
                      "Geschoold en ervaren personeel",
                      "Snelle beschikbaarheid (binnen 24 uur)",
                      "Geen administratieve rompslomp"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-neutral-700">
                        <div className="w-5 h-5 rounded-full bg-[#F27501] flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/contact"
                    className="inline-flex items-center text-[#F27501] font-semibold hover:gap-3 gap-2 transition-all duration-300"
                  >
                    Direct personeel aanvragen
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </FadeIn>

              {/* Afbeelding - Rechts */}
              <FadeIn direction="right" delay={0.2} className="flex-1 w-full lg:w-auto">
                <div className="bg-gradient-to-br from-[#F27501]/10 to-orange-100/50 rounded-3xl p-8 lg:p-12 flex flex-col items-center justify-center aspect-square lg:aspect-auto lg:h-[400px]">
                  <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-2xl overflow-hidden mb-6">
                    <Image
                      src="/images/dienst-uitzenden.png"
                      alt="Uitzenden"
                      width={256}
                      height={256}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-neutral-600 font-medium">Snel & Flexibel</p>
                </div>
              </FadeIn>
            </div>
          </div>

          {/* ============================================================
              DETACHERING - Afbeelding LINKS van tekst
              ============================================================ */}
          <div id="detachering" className="scroll-mt-32 mb-24">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              {/* Afbeelding - Links (op desktop) */}
              <FadeIn direction="left" delay={0.2} className="flex-1 w-full lg:w-auto order-1 lg:order-1">
                <div className="bg-gradient-to-br from-blue-100/50 to-blue-50 rounded-3xl p-8 lg:p-12 flex flex-col items-center justify-center aspect-square lg:aspect-auto lg:h-[400px]">
                  <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-2xl overflow-hidden mb-6">
                    <Image
                      src="/images/dienst-detachering.png"
                      alt="Detachering"
                      width={256}
                      height={256}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-neutral-600 font-medium">Langdurig Partnership</p>
                </div>
              </FadeIn>

              {/* Tekst - Rechts (op desktop) */}
              <FadeIn direction="right" className="flex-1 order-2 lg:order-2">
                <div>
                  <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-6">Detachering</h2>
                  <p className="text-lg text-neutral-600 mb-8 leading-relaxed">
                    Langdurige plaatsing voor vaste periodes. Ons personeel werkt bij u, maar blijft bij ons in dienst.
                    De perfecte tussenoplossing voor structurele personeelsbehoefte met behoud van flexibiliteit.
                  </p>
                  <ul className="space-y-4 mb-8">
                    {[
                      "Vaste medewerker voor langere periode",
                      "Wij regelen alle administratie",
                      "Optie tot overname na detachering",
                      "Continuiteit en stabiliteit"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-neutral-700">
                        <div className="w-5 h-5 rounded-full bg-[#F27501] flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/contact"
                    className="inline-flex items-center text-[#F27501] font-semibold hover:gap-3 gap-2 transition-all duration-300"
                  >
                    Meer informatie aanvragen
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </FadeIn>
            </div>
          </div>

          {/* ============================================================
              RECRUITMENT - Afbeelding RECHTS van tekst
              ============================================================ */}
          <div id="recruitment" className="scroll-mt-32">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              {/* Tekst - Links */}
              <FadeIn direction="left" className="flex-1">
                <div>
                  <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-6">Recruitment</h2>
                  <p className="text-lg text-neutral-600 mb-8 leading-relaxed">
                    Werving en selectie voor vaste posities. Wij vinden het perfecte talent voor uw organisatie
                    en nemen u het hele proces uit handen. Van intake tot plaatsing.
                  </p>
                  <ul className="space-y-4 mb-8">
                    {[
                      "Uitgebreide selectieprocedure",
                      "Referentiecheck en screening",
                      "Match op basis van cultuur en skills",
                      "Garantie op plaatsing"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-neutral-700">
                        <div className="w-5 h-5 rounded-full bg-[#F27501] flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/contact"
                    className="inline-flex items-center text-[#F27501] font-semibold hover:gap-3 gap-2 transition-all duration-300"
                  >
                    Start uw zoekopdracht
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </FadeIn>

              {/* Afbeelding - Rechts */}
              <FadeIn direction="right" delay={0.2} className="flex-1 w-full lg:w-auto">
                <div className="bg-gradient-to-br from-green-100/50 to-green-50 rounded-3xl p-8 lg:p-12 flex flex-col items-center justify-center aspect-square lg:aspect-auto lg:h-[400px]">
                  <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-2xl overflow-hidden mb-6">
                    <Image
                      src="/images/dienst-recruitment.png"
                      alt="Recruitment"
                      width={256}
                      height={256}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-neutral-600 font-medium">De Perfecte Match</p>
                </div>
              </FadeIn>
            </div>
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <FadeIn>
            <div className="bg-gradient-to-br from-[#F27501] to-[#d96800] rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-60 h-60 border border-white/20 rounded-full translate-x-1/3 translate-y-1/3"></div>
              </div>

              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Interesse in onze diensten?
                </h2>
                <p className="text-white/90 text-lg leading-relaxed mb-10">
                  Neem vrijblijvend contact met ons op voor een persoonlijk adviesgesprek
                  en een offerte op maat.
                </p>
                <Link
                  href="/contact"
                  className="inline-block bg-white text-[#F27501] px-8 py-4 rounded-lg text-base font-semibold
                  hover:bg-neutral-100 transition-all duration-300"
                >
                  Neem contact op
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
