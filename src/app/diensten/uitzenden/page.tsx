import Link from "next/link";
import Section from "@/components/Section";
import ClientAnimationWrapper from "@/components/ClientAnimationWrapper";
import PremiumImage from "@/components/PremiumImage";
import FAQ from "@/components/FAQ";

import type { FAQItem } from "@/data/location-service-faqs";

const faqItems: FAQItem[] = [
  {
    question: "Hoe snel kan ik personeel krijgen?",
    answer: "Vaak binnen 24 uur. Bij spoedinzet kunnen we soms dezelfde dag horecapersoneel leveren, afhankelijk van beschikbaarheid."
  },
  {
    question: "Wat zijn de kosten van uitzendpersoneel?",
    answer: "Tarieven variëren per functie en ervaring. Gebruik onze kosten calculator voor een indicatie of neem contact op voor een prijs op maat."
  },
  {
    question: "Kan ik zelf het personeel kiezen?",
    answer: "Ja, wij sturen cv's en profielen door. U beslist uiteindelijk wie er start. Bij vaste samenwerking kennen we uw voorkeuren beter."
  },
  {
    question: "Wat als het personeel niet bevalt?",
    answer: "U kunt altijd vervanging aanvragen. Wij blijven betrokken tijdens de samenwerking en zorgen voor passende alternatieven."
  },
  {
    question: "Hoe zit het met verzekeringen en administratie?",
    answer: "Volledig geregeld. De medewerkers zijn via ons verzekerd en wij verzorgen alle administratie, loonadministratie en belastingen."
  },
];

export default function UitzendenPage() {
  return (
    <>
      {/* ============================================================
          SECTION FLOW: Hero (wit) → Wat is (tinted) → Wanneer (wit) →
          Zo werkt het (tinted) → CTA (wit)
          ============================================================ */}

      {/* HERO - WIT */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <ClientAnimationWrapper direction="left">
              <div>
                <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
                  <Link href="/diensten">Diensten</Link> › Uitzenden
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 leading-[1.1]">
                  Uitzenden met direct inzetbaar horecapersoneel
                </h1>
                <p className="text-xl text-neutral-600 mb-8 leading-relaxed max-w-xl">
                  Piekmomenten, events of onverwachte uitval? Wij leveren binnen 24 uur
                  passend horecapersoneel. Heldere afspraken en snelle inzet.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/personeel-aanvragen"
                    className="inline-flex items-center justify-center bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                    shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                    hover:bg-[#EA580C] transition-all duration-300"
                  >
                    Direct personeel aanvragen
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  <Link
                    href="tel:+31649200412"
                    className="inline-flex items-center justify-center border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
                    hover:border-[#F97316] hover:text-[#F97316] transition-all duration-300"
                  >
                    Bel direct
                  </Link>
                </div>
              </div>
            </ClientAnimationWrapper>

            <ClientAnimationWrapper direction="right" delay={0.2}>
              <div className="hidden lg:flex justify-center lg:justify-end">
                <PremiumImage
                  src="/images/dienst-uitzenden.png"
                  alt="Horecapersoneel in de bediening tijdens tijdelijke inzet"
                  width={480}
                  height={480}
                />
              </div>
            </ClientAnimationWrapper>
          </div>
        </Section.Container>
      </Section>

      {/* WAT IS UITZENDEN - TINTED */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <div className="max-w-4xl mx-auto">
            <ClientAnimationWrapper>
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                  Wat is uitzenden?
                </h2>
                <p className="text-xl text-neutral-600 leading-relaxed">
                  Bij uitzenden werkt het horecapersoneel bij u, maar blijft in dienst bij TopTalent Jobs.
                  U houdt grip op de{" "}
                  <Link href="/diensten/detachering">personele bezetting</Link> zonder werkgeversrisico&apos;s. Wij regelen alles:
                  van werving tot salarisadministratie.
                </p>
              </div>
            </ClientAnimationWrapper>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Flexibel",
                  description: "Schaal op of af wanneer u wilt. Per dag, week of maand inzetbaar.",
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ),
                },
                {
                  title: "Snel",
                  description: "Vaak binnen 24 uur gekwalificeerd horecapersoneel op locatie.",
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ),
                },
                {
                  title: "Ontzorgd",
                  description: "Geen administratie en geen werkgeversrisico. Wij handelen alles af.",
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                },
              ].map((item, i) => (
                <ClientAnimationWrapper key={i} delay={0.1 * i}>
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-100 h-full">
                    <div className="w-14 h-14 bg-[#FEF3E7] rounded-xl flex items-center justify-center text-[#F97316] mb-5">
                      {item.icon}
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-3">{item.title}</h3>
                    <p className="text-neutral-600 leading-relaxed">{item.description}</p>
                  </div>
                </ClientAnimationWrapper>
              ))}
            </div>
          </div>
        </Section.Container>
      </Section>

      {/* WANNEER KIEZEN VOOR UITZENDEN - WIT */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <ClientAnimationWrapper>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                Wanneer kies je voor uitzenden?
              </h2>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
                Uitzenden is de ideale oplossing wanneer u tijdelijk extra medewerkers nodig heeft.
              </p>
            </div>
          </ClientAnimationWrapper>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                scenario: "Piekdrukte",
                description: "Drukke weekenden, feestdagen of onverwachte topdrukte.",
                color: "from-orange-500/10 to-orange-500/5",
              },
              {
                scenario: "Evenementen",
                description: "Festivals, congressen, bruiloften of bedrijfsfeesten.",
                color: "from-amber-500/10 to-amber-500/5",
              },
              {
                scenario: "Ziekte of uitval",
                description: "Acute vervanging nodig? Wij staan direct klaar.",
                color: "from-orange-500/10 to-orange-500/5",
              },
              {
                scenario: "Seizoenswerk",
                description: "Terrasseizoen, kerstperiode of zomerdrukte.",
                color: "from-amber-500/10 to-amber-500/5",
              },
            ].map((item, i) => (
              <ClientAnimationWrapper key={i} delay={0.1 * i}>
                <div className={`bg-gradient-to-br ${item.color} rounded-2xl p-8 border border-neutral-100`}>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">{item.scenario}</h3>
                  <p className="text-neutral-600">{item.description}</p>
                </div>
              </ClientAnimationWrapper>
            ))}
          </div>
        </Section.Container>
      </Section>

      {/* ZO WERKT HET - TINTED */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <ClientAnimationWrapper>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                Zo werkt uitzenden bij ons
              </h2>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
                Van aanvraag tot inzet: een helder en snel proces.
              </p>
            </div>
          </ClientAnimationWrapper>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-8 left-[calc(12.5%+28px)] right-[calc(12.5%+28px)] h-0.5 bg-gradient-to-r from-[#F97316] via-[#F97316] to-[#F97316]/30" />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { step: "1", title: "Intake", description: "U vertelt ons wat u nodig heeft" },
                  { step: "2", title: "Match", description: "Wij selecteren de juiste kandidaten" },
                  { step: "3", title: "Inzet", description: "Horecapersoneel start bij u op locatie" },
                  { step: "4", title: "Nazorg", description: "Wij blijven betrokken en evalueren" },
                ].map((item, i) => (
                  <ClientAnimationWrapper key={i} delay={0.15 * i}>
                    <div className="text-center relative">
                      <div className="w-14 h-14 bg-[#F97316] rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 relative z-10">
                        {item.step}
                      </div>
                      <h3 className="font-bold text-neutral-900 mb-2">{item.title}</h3>
                      <p className="text-neutral-600 text-sm">{item.description}</p>
                    </div>
                  </ClientAnimationWrapper>
                ))}
              </div>
            </div>
          </div>
        </Section.Container>
      </Section>

      {/* FAQ - TINTED */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <ClientAnimationWrapper>
            <FAQ items={faqItems} />
          </ClientAnimationWrapper>
        </Section.Container>
      </Section>

      {/* CTA - WIT */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <ClientAnimationWrapper>
            <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-60 h-60 border border-white/20 rounded-full translate-x-1/3 translate-y-1/3"></div>
              </div>

              <div className="relative z-10 max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Binnen 24 uur horecapersoneel beschikbaar
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Klaar om in te plannen?
                </h2>
                <p className="text-white/90 text-lg leading-relaxed mb-10">
                  Vertel ons wat u nodig heeft en wij regelen de inzet.
                  Geen verplichtingen, gewoon een goed gesprek.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/personeel-aanvragen"
                    className="bg-white text-[#F97316] px-8 py-4 rounded-xl text-base font-semibold
                    hover:bg-neutral-100 transition-all duration-300"
                  >
                    Personeel aanvragen
                  </Link>
                  <Link
                    href="/contact"
                    className="border-2 border-white/30 text-white px-8 py-4 rounded-xl text-base font-semibold
                    hover:bg-white/10 transition-all duration-300"
                  >
                    Neem contact op
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
