"use client";

import Link from "next/link";
import Image from "next/image";
import Hero from "@/components/Hero";
import ServicesSection from "@/components/ServicesSection";
import FadeIn from "@/components/animations/FadeIn";
import StaggerContainer, { StaggerItem } from "@/components/animations/StaggerContainer";

export default function Home() {
  return (
    <>
      {/* Hero Section - Premium with Animations */}
      <Hero />

      {/* Services Section - Premium Cards */}
      <ServicesSection />

      {/* Why TopTalent Section */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn direction="left">
              <div>
                <span className="inline-block text-[#F27501] font-medium text-sm tracking-wider uppercase mb-4">
                  Waarom TopTalent
                </span>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-6">
                  Uw betrouwbare partner in horeca staffing
                </h2>
                <p className="text-neutral-600 text-lg leading-relaxed mb-8">
                  Met jarenlange ervaring in de horeca- en evenementenbranche begrijpen
                  wij de uitdagingen van onze klanten. Wij leveren niet alleen personeel,
                  maar bouwen duurzame partnerships.
                </p>

                <div className="space-y-6">
                  {[
                    { title: "Snelle responstijd", desc: "Binnen 24 uur personeel beschikbaar" },
                    { title: "Gekwalificeerd personeel", desc: "Uitgebreid gescreend en getraind" },
                    { title: "Flexibele inzet", desc: "Van enkele uren tot langdurige plaatsing" },
                    { title: "Persoonlijke aanpak", desc: "Vaste contactpersoon voor uw account" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="w-6 h-6 rounded-full bg-[#F27501] flex items-center justify-center flex-shrink-0 mt-1">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-900">{item.title}</h4>
                        <p className="text-neutral-600">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10">
                  <Link
                    href="/over-ons"
                    className="inline-flex items-center text-[#F27501] font-semibold hover:gap-3 gap-2 transition-all duration-300"
                  >
                    Meer over TopTalent
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </FadeIn>

            <FadeIn direction="right" delay={0.2}>
              <div className="bg-neutral-50 rounded-3xl p-10 lg:p-12">
                <h3 className="text-2xl font-bold text-neutral-900 mb-8">Wij bieden</h3>
                <ul className="space-y-5">
                  {[
                    { icon: "€", text: "Concurrerende salarissen voor talent" },
                    { icon: "⚡", text: "Snelle uitbetaling binnen 24 uur" },
                    { icon: "📱", text: "Moderne talent-app voor planning" },
                    { icon: "🎓", text: "Professionele trainingen en certificeringen" },
                    { icon: "👥", text: "Community van vakgenoten" },
                    { icon: "📍", text: "Werkervaring bij premium locaties" },
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-4 text-neutral-700">
                      <span className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#F27501] shadow-sm">
                        {item.icon}
                      </span>
                      <span className="font-medium">{item.text}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-10">
                  <Link
                    href="/vacatures"
                    className="block w-full bg-[#F27501] text-white px-8 py-4 rounded-lg text-base font-semibold
                    shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                    hover:bg-[#d96800] transition-all duration-300 text-center"
                  >
                    Schrijf je nu in
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 lg:py-32 bg-neutral-900 text-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="inline-block text-[#F27501] font-medium text-sm tracking-wider uppercase mb-4">
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
                <div className="bg-neutral-800/50 rounded-2xl p-8 border border-neutral-700/50 hover:border-[#F27501]/30 transition-colors duration-300 h-full">
                  <div className="w-12 h-1 bg-[#F27501] rounded mb-6"></div>
                  <h3 className="text-xl font-bold mb-4">{value.title}</h3>
                  <p className="text-neutral-400 leading-relaxed">{value.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <FadeIn>
            <div className="bg-gradient-to-br from-[#F27501] to-[#d96800] rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
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
                    className="bg-white text-[#F27501] px-8 py-4 rounded-lg text-base font-semibold
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
        </div>
      </section>
    </>
  );
}
