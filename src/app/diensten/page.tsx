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
                Diensten horeca uitzendbureau
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
                Diensten voor horeca-werkgevers
              </h1>
              <p className="text-neutral-600 text-lg leading-relaxed">
                Kies de inzet die past bij uw planning: tijdelijk, projectmatig of vast.
                Wij regelen selectie, inzet en administratie voor horeca en events.
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
                  <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-4">Uitzenden horeca</h2>
                  <p className="text-lg text-neutral-600 mb-6 leading-[1.6] max-w-[560px] mx-auto lg:mx-0">
                    Tijdelijke inzet van horecakrachten bij piekmomenten,
                    events of seizoensdrukte. Ideaal als u snel wilt opschalen
                    zonder extra vaste lasten.
                  </p>
                  <ul className="space-y-3 mb-6 text-left max-w-[560px] mx-auto lg:mx-0">
                    {[
                      "Inzet per dienst, week of seizoen",
                      "Ervaren krachten voor keuken en bediening",
                      "Snelle startmogelijkheden",
                      "Wij regelen contracten en verloning"
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
                    href="/diensten/uitzenden"
                    className="inline-flex items-center text-[#F97316] font-semibold hover:gap-3 gap-2 transition-all duration-300"
                  >
                    Meer over uitzenden
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                <div className="order-1 lg:order-2">
                  <Link href="/diensten/uitzenden" className="block w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[380px] mx-auto lg:mx-0 lg:ml-auto group">
                    <div className="transition-transform duration-300 group-hover:scale-[1.02]">
                      <PremiumImage
                        src="/images/dienst-uitzenden.png"
                        alt="Horeca medewerker tijdens tijdelijke inzet via uitzendbureau"
                        width={380}
                        height={380}
                      />
                    </div>
                  </Link>
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
                  <Link href="/diensten/detachering" className="block w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[380px] mx-auto lg:mx-0 group">
                    <div className="transition-transform duration-300 group-hover:scale-[1.02]">
                      <PremiumImage
                        src="/images/dienst-detachering.png"
                        alt="Gedetacheerde horecakrachten voor structurele inzet"
                        width={380}
                        height={380}
                      />
                    </div>
                  </Link>
                </div>
                <div className="order-2 text-center lg:text-left">
                  <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-4">Detachering</h2>
                  <p className="text-lg text-neutral-600 mb-6 leading-[1.6] max-w-[560px] mx-auto lg:mx-0">
                    Structurele bezetting met behoud van flexibiliteit. De medewerker
                    werkt bij u, blijft bij ons in dienst en past in uw vaste rooster.
                  </p>
                  <ul className="space-y-3 mb-6 text-left max-w-[560px] mx-auto lg:mx-0">
                    {[
                      "Vaste inzet voor langere periode",
                      "Duidelijke tariefafspraken",
                      "Optie tot overname na detachering",
                      "Continuiteit voor uw planning"
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
                    href="/diensten/detachering"
                    className="inline-flex items-center text-[#F97316] font-semibold hover:gap-3 gap-2 transition-all duration-300"
                  >
                    Meer over detachering
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
                    Werving en selectie voor vaste functies in uw team. We nemen
                    het hele traject uit handen, van intake tot aanname.
                  </p>
                  <ul className="space-y-3 mb-6 text-left max-w-[560px] mx-auto lg:mx-0">
                    {[
                      "Intake met leidinggevende en team",
                      "Selectie op ervaring en cultuurfit",
                      "Referentiecheck en screening",
                      "Begeleiding tot indiensttreding"
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
                    href="/diensten/recruitment"
                    className="inline-flex items-center text-[#F97316] font-semibold hover:gap-3 gap-2 transition-all duration-300"
                  >
                    Meer over recruitment
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                <div className="order-1 lg:order-2">
                  <Link href="/diensten/recruitment" className="block w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[380px] mx-auto lg:mx-0 lg:ml-auto group">
                    <div className="transition-transform duration-300 group-hover:scale-[1.02]">
                      <PremiumImage
                        src="/images/dienst-recruitment.png"
                        alt="Recruitmentgesprek voor vaste horeca functies"
                        width={380}
                        height={380}
                      />
                    </div>
                  </Link>
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
                  Wilt u de juiste dienst kiezen?
                </h2>
                <p className="text-white/90 text-lg leading-relaxed mb-10">
                  We denken graag mee over de beste inzet voor uw locatie
                  en maken een duidelijke planningsofferte.
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
