"use client";

import Link from "next/link";
import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";
import StaggerContainer, { StaggerItem } from "@/components/animations/StaggerContainer";

export default function OverOnsPage() {
  return (
    <>
      {/* ============================================================
          SECTION FLOW (Design System):
          Hero (white) → Verhaal (tinted) → Waarden (white) → Stats (dark) → CTA (white)
          ============================================================ */}

      {/* Hero Section - White */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
                Over Ons
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
                Jouw Personeel, Onze Missie
              </h1>
              <p className="text-neutral-600 text-lg leading-relaxed">
                TopTalent Jobs is uw betrouwbare partner voor kwalitatief horecapersoneel.
                Wij verbinden talent met kansen.
              </p>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>

      {/* Ons Verhaal - Tinted */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn direction="left">
              <div>
                <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
                  Ons Verhaal
                </span>
                <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-6">
                  Wij geloven in mensen
                </h2>
                <p className="text-lg text-neutral-600 mb-6 leading-relaxed">
                  TopTalent Jobs is opgericht met een duidelijke missie: het verbinden van gemotiveerd talent
                  met bedrijven in de horeca en evenementensector die flexibel en kwalitatief
                  personeel nodig hebben.
                </p>
                <p className="text-lg text-neutral-600 mb-6 leading-relaxed">
                  Wij geloven dat werk meer is dan alleen een baan. Het gaat om plezier,
                  ontwikkeling en het maken van impact. Daarom investeren wij in onze mensen
                  met trainingen, een sterke community en eerlijke arbeidsvoorwaarden.
                </p>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  Of u nu een restaurant, hotel, cateringbedrijf of evenementenorganisatie bent -
                  wij leveren het personeel dat bij u past.
                </p>
              </div>
            </FadeIn>
            <FadeIn direction="right" delay={0.2}>
              <div className="bg-gradient-to-br from-[#F97316]/10 to-orange-100/50 rounded-3xl p-12 flex items-center justify-center aspect-square lg:aspect-auto lg:h-[450px]">
                <div className="text-center">
                  <div className="text-8xl mb-6">&#127919;</div>
                  <p className="text-xl text-neutral-700 font-medium">Verbinden van Talent</p>
                </div>
              </div>
            </FadeIn>
          </div>
        </Section.Container>
      </Section>

      {/* Kernwaarden - White */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
                Onze Waarden
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-6">
                Waar wij voor staan
              </h2>
              <p className="text-neutral-600 text-lg leading-relaxed">
                Onze kernwaarden vormen de basis van alles wat wij doen en definiëren hoe wij samenwerken.
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-8" staggerDelay={0.1}>
            {[
              {
                icon: (
                  <svg className="w-8 h-8 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: "Betrouwbaarheid",
                desc: "Wij komen onze afspraken na. Altijd. Dat is de basis van elk succesvol partnership. U kunt op ons rekenen, 24/7.",
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                ),
                title: "Kwaliteit",
                desc: "Alleen het beste personeel draagt onze naam. Grondig gescreend en professioneel getraind voor uw tevredenheid.",
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: "Snelheid",
                desc: "In de horeca telt elke minuut. Wij reageren snel en leveren nog sneller. Vaak binnen 24 uur personeel beschikbaar.",
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                ),
                title: "Persoonlijk",
                desc: "Geen nummers, maar mensen. Wij kennen onze klanten én ons talent persoonlijk. Elke relatie telt.",
              },
            ].map((value, i) => (
              <StaggerItem key={i}>
                <div className="bg-neutral-50 rounded-2xl p-8 border border-neutral-100 hover:border-[#F97316]/20 hover:shadow-lg transition-all duration-300 h-full">
                  <div className="w-16 h-16 bg-[#FEF3E7] rounded-2xl flex items-center justify-center mb-6">
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-4">{value.title}</h3>
                  <p className="text-neutral-600 leading-relaxed">{value.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </Section.Container>
      </Section>

      {/* Stats - Dark */}
      <Section variant="white" spacing="none">
        <section className="py-20 lg:py-28 bg-neutral-900 text-white">
          <Section.Container>
            <FadeIn>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Waarom TopTalent?
                </h2>
                <p className="text-neutral-400 text-lg">
                  Cijfers die spreken
                </p>
              </div>
            </FadeIn>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8" staggerDelay={0.15}>
              {[
                { value: "24/7", label: "Bereikbaar voor vragen en ondersteuning" },
                { value: "100+", label: "Tevreden opdrachtgevers" },
                { value: "500+", label: "Gemotiveerde medewerkers" },
              ].map((stat, i) => (
                <StaggerItem key={i}>
                  <div className="text-center p-8 bg-neutral-800/50 rounded-2xl border border-neutral-700/50">
                    <div className="text-5xl md:text-6xl font-bold text-[#F97316] mb-4">{stat.value}</div>
                    <p className="text-neutral-400">{stat.label}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </Section.Container>
        </section>
      </Section>

      {/* CTA Section - White */}
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
                  Wilt u samenwerken?
                </h2>
                <p className="text-white/90 text-lg leading-relaxed mb-10">
                  Ontdek hoe TopTalent Jobs u kan helpen met flexibel en kwalitatief personeel.
                  Neem vandaag nog contact met ons op.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/contact"
                    className="bg-white text-[#F97316] px-8 py-4 rounded-lg text-base font-semibold
                    hover:bg-neutral-100 transition-all duration-300"
                  >
                    Neem contact op
                  </Link>
                  <Link
                    href="/inschrijven"
                    className="border-2 border-white/30 text-white px-8 py-4 rounded-lg text-base font-semibold
                    hover:bg-white/10 transition-all duration-300"
                  >
                    Schrijf je in
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
