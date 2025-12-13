"use client";

import Link from "next/link";
import Hero from "@/components/Hero";
import ServicesSection from "@/components/ServicesSection";
import WhyTopTalent from "@/components/WhyTopTalent";
import HowWeWorkCarousel from "@/components/HowWeWorkCarousel";
import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";
import StaggerContainer, { StaggerItem } from "@/components/animations/StaggerContainer";

export default function Home() {
  return (
    <>
      {/* ============================================================
          SECTION FLOW (Design System):
          Hero (white) → HowWeWork (tinted) → WhyTopTalent (white) →
          Services (tinted) → Values (dark) → CTA (white)
          ============================================================ */}

      {/* Hero Section - White background */}
      <Hero />

      {/* How We Work - Tinted section with fade */}
      <HowWeWorkCarousel />

      {/* Why TopTalent - White background */}
      <WhyTopTalent />

      {/* Services - Tinted section */}
      <ServicesSection />

      {/* Values Section - Dark for contrast */}
      <Section variant="white" spacing="none">
        <section className="py-20 lg:py-28 bg-neutral-900 text-white">
          <Section.Container>
            <FadeIn>
              <div className="text-center max-w-3xl mx-auto mb-14">
                <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
                  Onze Waarden
                </span>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                  Waar wij voor staan
                </h2>
                <p className="text-neutral-400 text-lg leading-relaxed">
                  Onze kernwaarden vormen de basis van alles wat wij doen.
                  Ze sturen onze beslissingen en definiëren onze samenwerking.
                </p>
              </div>
            </FadeIn>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.1}>
              {[
                {
                  title: "Betrouwbaarheid",
                  desc: "Wij komen onze afspraken na. Altijd. Dat is de basis van elk succesvol partnership.",
                },
                {
                  title: "Kwaliteit",
                  desc: "Alleen het beste personeel draagt onze naam. Grondig gescreend en professioneel getraind.",
                },
                {
                  title: "Snelheid",
                  desc: "In de horeca telt elke minuut. Wij reageren snel en leveren nog sneller.",
                },
                {
                  title: "Persoonlijk",
                  desc: "Geen nummers, maar mensen. Wij kennen onze klanten én ons talent persoonlijk.",
                },
              ].map((value, index) => (
                <StaggerItem key={index}>
                  <div className="bg-neutral-800/50 rounded-2xl p-8 border border-neutral-700/50 hover:border-[#F97316]/30 transition-colors duration-300 h-full">
                    <div className="w-12 h-1 bg-[#F97316] rounded mb-6"></div>
                    <h3 className="text-xl font-bold mb-4">{value.title}</h3>
                    <p className="text-neutral-400 leading-relaxed">{value.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </Section.Container>
        </section>
      </Section>

      {/* CTA Section - White background */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <FadeIn>
            <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-60 h-60 border border-white/20 rounded-full translate-x-1/3 translate-y-1/3"></div>
              </div>

              <div className="relative z-10 max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                  Klaar om samen te werken?
                </h2>
                <p className="text-white/90 text-lg leading-relaxed mb-10">
                  Of u nu personeel zoekt of een nieuwe carrière wilt starten in de horeca,
                  wij helpen u graag verder. Neem vandaag nog contact met ons op.
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
                    href="tel:+31649200412"
                    className="border-2 border-white/30 text-white px-8 py-4 rounded-lg text-base font-semibold
                    hover:bg-white/10 transition-all duration-300"
                  >
                    Bel direct: +31 6 49 20 04 12
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
