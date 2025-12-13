"use client";

import Link from "next/link";
import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";
import PremiumImage from "@/components/PremiumImage";

export default function DienstenPage() {
  return (
    <>
      {/* ============================================================
          SECTION FLOW (Design System):
          Hero (white) → Uitzenden (tinted) → Detachering (white) →
          Recruitment (tinted) → CTA (white)
          ============================================================ */}

      {/* Hero Section - WHITE */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
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
        </Section.Container>
      </Section>

      {/* UITZENDEN - TINTED */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <div id="uitzenden" className="scroll-mt-32">
            <FadeIn>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_42%] gap-8 lg:gap-12 items-center">
                <div className="order-2 lg:order-1 text-center lg:text-left">
                  <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-4">Uitzenden</h2>
                  <p className="text-lg text-neutral-600 mb-6 leading-[1.6] max-w-[560px] mx-auto lg:mx-0">
                    Tijdelijke inzet van gekwalificeerd horecapersoneel. Perfect voor piekmomenten,
                    festivals, evenementen of seizoensgebonden drukte. Flexibel in te zetten wanneer u het nodig heeft.
                  </p>
                  <ul className="space-y-3 mb-6 text-left max-w-[560px] mx-auto lg:mx-0">
                    {[
                      "Flexibele inzet per dag, week of maand",
                      "Geschoold en ervaren personeel",
                      "Snelle beschikbaarheid (binnen 24 uur)",
                      "Geen administratieve rompslomp"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-neutral-700">
                        <div className="w-5 h-5 rounded-full bg-[#F97316] flex items-center justify-center flex-shrink-0">
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
                    className="inline-flex items-center text-[#F97316] font-semibold hover:gap-3 gap-2 transition-all duration-300"
                  >
                    Direct personeel aanvragen
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                <div className="order-1 lg:order-2">
                  <div className="w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[380px] mx-auto lg:mx-0 lg:ml-auto">
                    <PremiumImage
                      src="/images/dienst-uitzenden.png"
                      alt="Uitzenden - Snel & Flexibel"
                      width={380}
                      height={380}
                    />
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </Section.Container>
      </Section>

      {/* DETACHERING - WHITE */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <div id="detachering" className="scroll-mt-32">
            <FadeIn>
              <div className="grid grid-cols-1 lg:grid-cols-[42%_1fr] gap-8 lg:gap-12 items-center">
                <div className="order-1">
                  <div className="w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[380px] mx-auto lg:mx-0">
                    <PremiumImage
                      src="/images/dienst-detachering.png"
                      alt="Detachering - Langdurig Partnership"
                      width={380}
                      height={380}
                    />
                  </div>
                </div>
                <div className="order-2 text-center lg:text-left">
                  <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-4">Detachering</h2>
                  <p className="text-lg text-neutral-600 mb-6 leading-[1.6] max-w-[560px] mx-auto lg:mx-0">
                    Langdurige plaatsing voor vaste periodes. Ons personeel werkt bij u, maar blijft bij ons in dienst.
                    De perfecte tussenoplossing voor structurele personeelsbehoefte met behoud van flexibiliteit.
                  </p>
                  <ul className="space-y-3 mb-6 text-left max-w-[560px] mx-auto lg:mx-0">
                    {[
                      "Vaste medewerker voor langere periode",
                      "Wij regelen alle administratie",
                      "Optie tot overname na detachering",
                      "Continuiteit en stabiliteit"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-neutral-700">
                        <div className="w-5 h-5 rounded-full bg-[#F97316] flex items-center justify-center flex-shrink-0">
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
                    className="inline-flex items-center text-[#F97316] font-semibold hover:gap-3 gap-2 transition-all duration-300"
                  >
                    Meer informatie aanvragen
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </Section.Container>
      </Section>

      {/* RECRUITMENT - TINTED */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <div id="recruitment" className="scroll-mt-32">
            <FadeIn>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_42%] gap-8 lg:gap-12 items-center">
                <div className="order-2 lg:order-1 text-center lg:text-left">
                  <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-4">Recruitment</h2>
                  <p className="text-lg text-neutral-600 mb-6 leading-[1.6] max-w-[560px] mx-auto lg:mx-0">
                    Werving en selectie voor vaste posities. Wij vinden het perfecte talent voor uw organisatie
                    en nemen u het hele proces uit handen. Van intake tot plaatsing.
                  </p>
                  <ul className="space-y-3 mb-6 text-left max-w-[560px] mx-auto lg:mx-0">
                    {[
                      "Uitgebreide selectieprocedure",
                      "Referentiecheck en screening",
                      "Match op basis van cultuur en skills",
                      "Garantie op plaatsing"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-neutral-700">
                        <div className="w-5 h-5 rounded-full bg-[#F97316] flex items-center justify-center flex-shrink-0">
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
                    className="inline-flex items-center text-[#F97316] font-semibold hover:gap-3 gap-2 transition-all duration-300"
                  >
                    Start uw zoekopdracht
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                <div className="order-1 lg:order-2">
                  <div className="w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[380px] mx-auto lg:mx-0 lg:ml-auto">
                    <PremiumImage
                      src="/images/dienst-recruitment.png"
                      alt="Recruitment - De perfecte match"
                      width={380}
                      height={380}
                    />
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </Section.Container>
      </Section>

      {/* CTA Section - WHITE */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <FadeIn>
            <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
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
                  className="inline-block bg-white text-[#F97316] px-8 py-4 rounded-lg text-base font-semibold
                  hover:bg-neutral-100 transition-all duration-300"
                >
                  Neem contact op
                </Link>
              </div>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>
    </>
  );
}
