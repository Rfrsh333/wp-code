"use client";

import Link from "next/link";
import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";
import PremiumImage from "@/components/PremiumImage";

export default function RecruitmentPage() {
  return (
    <>
      {/* ============================================================
          SECTION FLOW: Hero (wit) → Aanpak (tinted) → Waarom (wit) →
          Selectieproces (tinted) → CTA (wit)
          ============================================================ */}

      {/* HERO - WIT */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <FadeIn direction="left">
              <div>
                <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
                  <Link href="/diensten">Diensten</Link> › Recruitment
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 leading-[1.1]">
                  Recruitment voor vast horecapersoneel
                </h1>
                <p className="text-xl text-neutral-600 mb-8 leading-relaxed max-w-xl">
                  Werving en selectie van vast horecapersoneel. Wij zoeken vaste medewerkers
                  die passen bij uw service, tempo en team.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                    shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                    hover:bg-[#EA580C] transition-all duration-300"
                  >
                    Start recruitment
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  <Link
                    href="tel:+31649200412"
                    className="inline-flex items-center justify-center border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
                    hover:border-[#F97316] hover:text-[#F97316] transition-all duration-300"
                  >
                    Direct overleggen
                  </Link>
                </div>
              </div>
            </FadeIn>

            <FadeIn direction="right" delay={0.2}>
              <div className="hidden lg:flex justify-center lg:justify-end">
                <PremiumImage
                  src="/images/dienst-recruitment.png"
                  alt="Recruitmentgesprek voor vaste horecakrachten in de horeca"
                  width={480}
                  height={480}
                />
              </div>
            </FadeIn>
          </div>
        </Section.Container>
      </Section>

      {/* ONZE AANPAK - TINTED */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                Onze aanpak
              </h2>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
                Van intake tot indiensttreding: een helder proces voor vaste medewerkers.
              </p>
            </div>
          </FadeIn>

          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {[
                {
                  step: "01",
                  title: "Intake",
                  description: "Gesprek over functie, team en planning.",
                },
                {
                  step: "02",
                  title: "Werving",
                  description: "Gerichte werving in netwerk en markt.",
                },
                {
                  step: "03",
                  title: "Screening",
                  description: "Cv-check, interviews, referenties en toetsing.",
                },
                {
                  step: "04",
                  title: "Matching",
                  description: "Selectie op ervaring, rolfit en teamfit.",
                },
                {
                  step: "05",
                  title: "Plaatsing",
                  description: "Begeleiding tot indiensttreding en nazorg.",
                },
              ].map((item, i) => (
                <FadeIn key={i} delay={0.1 * i}>
                  <div className="bg-white rounded-2xl p-6 border border-neutral-100 h-full relative group hover:shadow-lg transition-all duration-300">
                    <div className="text-4xl font-bold text-[#F97316]/20 mb-3 group-hover:text-[#F97316]/40 transition-colors duration-300">
                      {item.step}
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-2">{item.title}</h3>
                    <p className="text-neutral-600 text-sm leading-relaxed">{item.description}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </Section.Container>
      </Section>

      {/* WAAROM VIA ONS - WIT */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <FadeIn direction="left">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                  Waarom recruitment via TopTalent?
                </h2>
                <p className="text-lg text-neutral-600 mb-8 leading-relaxed">
                  Recruitment voor{" "}
                  <Link href="/diensten/detachering">vaste bezetting</Link> vraagt tijd en focus. Wij nemen dit uit handen
                  en presenteren kandidaten die passen bij uw organisatie.
                </p>

                <div className="space-y-4">
                  {[
                    {
                      title: "Teamfit",
                      description: "Wij kijken verder dan het CV en toetsen op samenwerking en gastvrijheid.",
                    },
                    {
                      title: "Branchekennis",
                      description: "Wij kennen functies, roosters en de praktijk in de horeca.",
                    },
                    {
                      title: "Efficiënt proces",
                      description: "Geen brede advertenties en stapels CV's, alleen gerichte selectie.",
                    },
                    {
                      title: "Nazorg bij mismatch",
                      description: "Past het niet binnen de proefperiode, dan zoeken we kosteloos opnieuw.",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="w-6 h-6 rounded-full bg-[#F97316] flex items-center justify-center flex-shrink-0 mt-1">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-900">{item.title}</h3>
                        <p className="text-neutral-600 text-sm">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            <FadeIn direction="right" delay={0.2}>
              <div className="bg-gradient-to-br from-[#F97316]/5 to-orange-100/30 rounded-3xl p-10 lg:p-12">
                <div className="text-center">
                  <div className="text-6xl font-bold text-[#F97316] mb-4">95%</div>
                  <p className="text-xl text-neutral-700 font-medium mb-6">
                    van onze plaatsingen is na 1 jaar nog werkzaam
                  </p>
                  <div className="h-px bg-neutral-200 my-6"></div>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <div className="text-3xl font-bold text-neutral-900">14</div>
                      <p className="text-neutral-600 text-sm">dagen gemiddelde doorlooptijd</p>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-neutral-900">100%</div>
                      <p className="text-neutral-600 text-sm">plaatsingsgarantie</p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </Section.Container>
      </Section>

      {/* SELECTIEPROCES - TINTED */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <FadeIn direction="left">
              <div className="order-2 lg:order-1 grid grid-cols-2 gap-4">
                {[
                  { icon: "IN", label: "Intake en profiel" },
                  { icon: "SO", label: "Actieve sourcing" },
                  { icon: "IV", label: "Diepte-interviews" },
                  { icon: "RC", label: "Referentiecheck" },
                  { icon: "VT", label: "Vaardigheidstoets" },
                  { icon: "TF", label: "Teamfit-analyse" },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-xl p-5 border border-neutral-100 text-center">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <p className="text-neutral-700 font-medium text-sm">{item.label}</p>
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn direction="right" delay={0.2}>
              <div className="order-1 lg:order-2">
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                  Selectieproces voor vaste functies
                </h2>
                <p className="text-lg text-neutral-600 mb-6 leading-relaxed">
                  Elke kandidaat doorloopt een uitgebreid selectietraject.
                  Zo weet u zeker dat wie wij presenteren ook echt geschikt is.
                </p>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  Wij presenteren geen tientallen CV&apos;s. U ontvangt 2-3 geschikte kandidaten
                  die passen bij uw rol. Kwaliteit boven kwantiteit.
                </p>
              </div>
            </FadeIn>
          </div>
        </Section.Container>
      </Section>

      {/* CTA - WIT */}
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
                  Op zoek naar vaste medewerkers?
                </h2>
                <p className="text-white/90 text-lg leading-relaxed mb-10">
                  Vertel ons welke rol u wilt invullen. Wij gaan voor u aan de slag en presenteren
                  binnen twee weken een shortlist met passende kandidaten.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/contact"
                    className="bg-white text-[#F97316] px-8 py-4 rounded-xl text-base font-semibold
                    hover:bg-neutral-100 transition-all duration-300"
                  >
                    Start zoekopdracht
                  </Link>
                  <Link
                    href="tel:+31649200412"
                    className="border-2 border-white/30 text-white px-8 py-4 rounded-xl text-base font-semibold
                    hover:bg-white/10 transition-all duration-300"
                  >
                    Bel voor advies
                  </Link>
                </div>
              </div>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>
    </>
  );
}
