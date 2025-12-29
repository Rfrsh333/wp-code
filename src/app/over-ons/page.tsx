"use client";

import Link from "next/link";
import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";
import StaggerContainer, { StaggerItem } from "@/components/animations/StaggerContainer";
import PremiumImage from "@/components/PremiumImage";

export default function OverOnsPage() {
  return (
    <>
      {/* ============================================================
          SECTION FLOW (Design System):
          Hero (white) → Waarom (tinted) → Verhaal (white) → Waarden (tinted) → Stats (dark) → CTA (white)
          ============================================================ */}

      {/* Hero Section - White (CRO: Emotion-driven opening) */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
                Over Ons
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
                Geen personeelsstress meer. Gewoon goed personeel, op tijd.
              </h1>
              <p className="text-neutral-600 text-lg leading-relaxed">
                U kent het: last-minute uitval, ziekte, onverwachte drukte. Elke keer weer die onzekerheid of u voldoende mensen heeft staan.
                Wij zorgen dat u die stress niet meer hoeft te voelen.
              </p>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>

      {/* Waarom Wij Bestaan - Tinted (CRO: New section explaining the problem) */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <div className="max-w-4xl mx-auto">
            <FadeIn>
              <div className="text-center mb-12">
                <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
                  Waarom Wij Bestaan
                </span>
                <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-6">
                  Wij snappen het probleem
                </h2>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FadeIn direction="left">
                <div className="bg-white rounded-2xl p-8 border border-neutral-200">
                  <h3 className="text-xl font-bold text-neutral-900 mb-4">Het probleem</h3>
                  <p className="text-neutral-600 leading-relaxed mb-4">
                    Horeca draait op mensen. Maar wat als iemand zich ziek meldt? Of als het onverwacht druk wordt?
                    Dan staat u er. Met lege diensten, overbelast personeel, en klanten die wachten.
                  </p>
                  <p className="text-neutral-600 leading-relaxed">
                    Traditionele uitzendbureaus zijn traag, onpersoonlijk, en leveren vaak mensen die de horeca niet kennen.
                    Dat levert stress op, niet oplossingen.
                  </p>
                </div>
              </FadeIn>

              <FadeIn direction="right">
                <div className="bg-white rounded-2xl p-8 border border-neutral-200">
                  <h3 className="text-xl font-bold text-neutral-900 mb-4">Onze oplossing</h3>
                  <p className="text-neutral-600 leading-relaxed mb-4">
                    TopTalent Jobs is anders. Wij zijn zelf vanuit de horeca gekomen en weten hoe frustrerend personeelstekort is.
                    Daarom hebben we een flexpool opgebouwd van mensen die de horeca écht kennen.
                  </p>
                  <p className="text-neutral-600 leading-relaxed">
                    Snel, betrouwbaar, en persoonlijk. Zodat u zich kunt focussen op uw gasten, niet op roosters die niet kloppen.
                  </p>
                </div>
              </FadeIn>
            </div>
          </div>
        </Section.Container>
      </Section>

      {/* Ons Verhaal - White */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-[58%_42%] gap-8 lg:gap-12 items-center">
            {/* Tekst - Links */}
            <FadeIn direction="left">
              <div className="order-2 lg:order-1 text-center lg:text-left">
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

            {/* Afbeelding - Rechts (Premium Frame) */}
            <div className="order-1 lg:order-2">
              <div className="w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[420px] mx-auto lg:mx-0 lg:ml-auto">
                <PremiumImage
                  src="/images/over-ons-verhaal.png"
                  alt="TopTalent Jobs - horeca uitzendbureau team dat personeelstekort in de horeca oplost"
                  width={420}
                  height={420}
                />
              </div>
            </div>
          </div>
        </Section.Container>
      </Section>

      {/* Kernwaarden - Tinted (CRO: Concrete behavior translation) */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
                Onze Waarden
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-6">
                Wat dit voor u betekent
              </h2>
              <p className="text-neutral-600 text-lg leading-relaxed">
                Geen vage beloftes. Dit is concreet hoe wij werken en wat u kunt verwachten.
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
                desc: "Eén vast aanspreekpunt die uw zaak kent. Duidelijke planning met bevestiging vooraf. Als er onverhoopt iets misgaat, krijgt u binnen 2 uur vervanging.",
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                ),
                title: "Kwaliteit",
                desc: "Alleen mensen met minimaal 6 maanden horeca-ervaring. Persoonlijk intakegesprek en referentiecheck. Ze kennen het verschil tussen à la carte en banket.",
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: "Snelheid",
                desc: "Binnen 15 minuten antwoord op uw aanvraag. Bij beschikbaarheid vaak binnen 24 uur personeel op de vloer. Ook last-minute? We doen ons best.",
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                ),
                title: "Persoonlijk",
                desc: "U belt, wij nemen op (geen wachtrij). Vaste contactpersoon die uw voorkeuren kent. Nazorg: we bellen na de eerste shift om te checken hoe het ging.",
              },
            ].map((value, i) => (
              <StaggerItem key={i}>
                <div className="bg-white rounded-2xl p-8 border border-neutral-100 hover:border-[#F97316]/20 hover:shadow-lg transition-all duration-300 h-full">
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

      {/* Social Proof - Dark (CRO: Light trust signals with outcomes) */}
      <Section variant="white" spacing="none">
        <section className="py-20 lg:py-28 bg-neutral-900 text-white">
          <Section.Container>
            <FadeIn>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Resultaten die spreken
                </h2>
                <p className="text-neutral-400 text-lg">
                  Dit zeggen onze klanten
                </p>
              </div>
            </FadeIn>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16" staggerDelay={0.15}>
              {[
                {
                  quote: "Binnen 18 uur volledige bezetting tijdens hoogseizoen",
                  company: "Restaurant De Smaak"
                },
                {
                  quote: "40 diensten ingevuld in één week zonder gedoe",
                  company: "Grand Hotel Amsterdam"
                },
                {
                  quote: "100% beschikbaarheid tijdens piekweekend",
                  company: "Evenementenlocatie"
                },
              ].map((item, i) => (
                <StaggerItem key={i}>
                  <div className="text-center p-8 bg-neutral-800/50 rounded-2xl border border-neutral-700/50">
                    <p className="text-lg text-white mb-4 leading-relaxed">"{item.quote}"</p>
                    <p className="text-sm text-neutral-400">— {item.company}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8" staggerDelay={0.15}>
              {[
                { value: "95%", label: "Klanten heeft binnen 24u personeel" },
                { value: "200+", label: "Horeca locaties geholpen in 2025" },
                { value: "24/7", label: "Bereikbaar voor spoedvragen" },
              ].map((stat, i) => (
                <StaggerItem key={i}>
                  <div className="text-center p-8">
                    <div className="text-5xl md:text-6xl font-bold text-[#F97316] mb-4">{stat.value}</div>
                    <p className="text-neutral-400">{stat.label}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </Section.Container>
        </section>
      </Section>

      {/* CTA Section - White (CRO: Conversational, non-salesy) */}
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
                  Zullen we even meekijken?
                </h2>
                <p className="text-white/90 text-lg leading-relaxed mb-10">
                  Vertel ons wat u nodig heeft. Geen verplichtingen, gewoon een eerlijk gesprek over hoe wij kunnen helpen.
                  We bellen binnen 15 minuten terug.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/personeel-aanvragen"
                    className="bg-white text-[#F97316] px-8 py-4 rounded-lg text-base font-semibold
                    hover:bg-neutral-100 transition-all duration-300"
                  >
                    Bekijk beschikbaarheid
                  </Link>
                  <Link
                    href="/contact"
                    className="border-2 border-white/30 text-white px-8 py-4 rounded-lg text-base font-semibold
                    hover:bg-white/10 transition-all duration-300"
                  >
                    Direct contact
                  </Link>
                </div>
                <p className="text-white/70 text-sm mt-6">
                  ✓ Geen inschrijfkosten  ✓ Reactie binnen 15 min  ✓ Vaak morgen al personeel
                </p>
              </div>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>
    </>
  );
}
