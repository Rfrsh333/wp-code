

import Link from "next/link";
import Section from "@/components/Section";
import ClientAnimationWrapper from "@/components/ClientAnimationWrapper";
import PremiumImage from "@/components/PremiumImage";

import type { FAQItem } from "@/data/location-service-faqs";
export default function DetacheringPage() {
  return (
    <>
      {/* ============================================================
          SECTION FLOW: Hero (wit) → Wat is (tinted) → Voordelen (wit) →
          Partnership (tinted) → CTA (wit)
          ============================================================ */}

      {/* HERO - WIT */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <ClientAnimationWrapper direction="left">
              <div>
                <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
                  <Link href="/diensten">Diensten</Link> › Detachering
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 leading-[1.1]">
                  Een vaste horecakracht, zonder vaste lasten
                </h1>
                <p className="text-xl text-neutral-600 mb-8 leading-relaxed max-w-xl">
                  Een professionele medewerker voor langere tijd, zonder werkgeversrisico&apos;s.
                  Stabiliteit voor uw team en voorspelbaarheid in de planning.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                    shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                    hover:bg-[#EA580C] transition-all duration-300"
                  >
                    Meer informatie aanvragen
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  <Link
                    href="tel:+31649713766"
                    className="inline-flex items-center justify-center border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
                    hover:border-[#F97316] hover:text-[#F97316] transition-all duration-300"
                  >
                    Bel voor advies
                  </Link>
                </div>
              </div>
            </ClientAnimationWrapper>

            <ClientAnimationWrapper direction="right" delay={0.2}>
              <div className="hidden lg:flex justify-center lg:justify-end">
                <PremiumImage
                  src="/images/dienst-detachering.png"
                  alt="Gedetacheerde horecakracht voor langdurige inzet"
                  width={480}
                  height={480}
                />
              </div>
            </ClientAnimationWrapper>
          </div>
        </Section.Container>
      </Section>

      {/* WAT IS DETACHERING - TINTED */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <ClientAnimationWrapper direction="left">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                  Wat is detachering?
                </h2>
                <p className="text-lg text-neutral-600 mb-6 leading-relaxed">
                  Bij detachering plaatsen wij een professionele medewerker voor langere tijd bij uw organisatie.
                  De medewerker werkt volledig geïntegreerd in uw team, maar blijft formeel bij ons in dienst.
                </p>
                <p className="text-lg text-neutral-600 mb-6 leading-relaxed">
                  Dit geeft u alle voordelen van een vaste horecakracht, zonder de administratieve lasten
                  en risico&apos;s van werkgeverschap.
                </p>
                <div className="bg-white rounded-xl p-6 border border-neutral-100">
                  <p className="text-neutral-700 font-medium">
                    <span className="text-[#F97316]">Het verschil met uitzenden:</span> Bij detachering gaat het om
                    langdurige, structurele personele bezetting. Bij uitzenden om tijdelijke, flexibele inzet.
                  </p>
                </div>
              </div>
            </ClientAnimationWrapper>

            <ClientAnimationWrapper direction="right" delay={0.2}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "3-12", label: "maanden gemiddelde duur" },
                  { value: "100%", label: "geïntegreerd in uw team" },
                  { value: "0", label: "werkgeversrisico voor u" },
                  { value: "24/7", label: "ondersteuning door ons" },
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 text-center border border-neutral-100">
                    <div className="text-3xl font-bold text-[#F97316] mb-1">{stat.value}</div>
                    <div className="text-neutral-600 text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>
            </ClientAnimationWrapper>
          </div>
        </Section.Container>
      </Section>

      {/* VOORDELEN - WIT */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <ClientAnimationWrapper>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                Voordelen voor uw organisatie
              </h2>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
                Waarom steeds meer horeca-ondernemers kiezen voor detachering.
              </p>
            </div>
          </ClientAnimationWrapper>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: "Continuïteit",
                description: "Een vast gezicht in uw team dat uw bedrijf, processen en gasten kent.",
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                title: "Geen administratie",
                description: "Wij verzorgen salarisadministratie, verzekeringen en alle HR-taken.",
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
              {
                title: "Flexibel contract",
                description: "Opzegmogelijkheden zonder langdurige verplichtingen.",
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                ),
              },
              {
                title: "Optie tot overname",
                description: (
                  <>
                    Tevreden? Na de detacheringsperiode kunt u de{" "}
                    <Link href="/diensten/recruitment">medewerker overnemen</Link>.
                  </>
                ),
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                ),
              },
              {
                title: "Geen werkgeversrisico",
                description: "Ziekte, ontslag, verzekeringen — wij dragen de verantwoordelijkheid.",
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
              {
                title: "Persoonlijke begeleiding",
                description: "Vast aanspreekpunt bij TopTalent voor u én de medewerker.",
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <ClientAnimationWrapper key={i} delay={0.1 * i}>
                <div className="group p-6 rounded-2xl border border-neutral-100 hover:border-[#F97316]/20 hover:shadow-lg transition-all duration-300 h-full">
                  <div className="w-12 h-12 bg-[#FEF3E7] rounded-xl flex items-center justify-center text-[#F97316] mb-4 group-hover:bg-[#F97316] group-hover:text-white transition-all duration-300">
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">{item.title}</h3>
                  <p className="text-neutral-600 text-sm leading-relaxed">{item.description}</p>
                </div>
              </ClientAnimationWrapper>
            ))}
          </div>
        </Section.Container>
      </Section>

      {/* PARTNERSHIP - TINTED */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <ClientAnimationWrapper direction="left">
              <div className="order-2 lg:order-1">
                <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-sm border border-neutral-100">
                  <blockquote className="text-xl text-neutral-700 leading-relaxed mb-6">
                    &ldquo;Detachering via TopTalent geeft ons de stabiliteit van een vaste kracht,
                    met de flexibiliteit die we nodig hebben in de horeca.&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#F97316]/10 rounded-full flex items-center justify-center">
                      <span className="text-[#F97316] font-bold">HR</span>
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">HR Manager</p>
                      <p className="text-neutral-500 text-sm">Hotelketen, Amsterdam</p>
                    </div>
                  </div>
                </div>
              </div>
            </ClientAnimationWrapper>

            <ClientAnimationWrapper direction="right" delay={0.2}>
              <div className="order-1 lg:order-2">
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                  Langdurig partnership
                </h2>
                <p className="text-lg text-neutral-600 mb-6 leading-relaxed">
                  Detachering is meer dan een dienst — het is een samenwerking.
                  Wij investeren in de relatie met zowel u als de gedetacheerde medewerker.
                </p>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  Regelmatige check-ins, open communicatie en proactieve ondersteuning
                  zorgen ervoor dat de samenwerking voor iedereen succesvol is.
                </p>
              </div>
            </ClientAnimationWrapper>
          </div>
        </Section.Container>
      </Section>

      {/* CTA - WIT */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <ClientAnimationWrapper>
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 right-0 w-80 h-80 border border-white rounded-full translate-x-1/3 -translate-y-1/3"></div>
                <div className="absolute bottom-0 left-0 w-60 h-60 border border-white rounded-full -translate-x-1/3 translate-y-1/3"></div>
              </div>

              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Plan een gesprek over detachering
                </h2>
                <p className="text-neutral-300 text-lg leading-relaxed mb-10">
                  Ontdek of detachering past bij uw organisatie.
                  Wij denken graag met u mee over de ideale invulling.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/contact"
                    className="bg-[#F97316] text-white px-8 py-4 rounded-xl text-base font-semibold
                    hover:bg-[#EA580C] transition-all duration-300 shadow-lg shadow-orange-500/20"
                  >
                    Gesprek inplannen
                  </Link>
                  <Link
                    href="tel:+31649713766"
                    className="border-2 border-neutral-600 text-white px-8 py-4 rounded-xl text-base font-semibold
                    hover:border-neutral-400 transition-all duration-300"
                  >
                    Bel: +31 6 49 71 37 66
                  </Link>
                </div>
              </div>
            </div>
          </ClientAnimationWrapper>
        </Section.Container>
      </Section>
    </>
  );
}
