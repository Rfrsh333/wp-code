"use client";

import Link from "next/link";
import Image from "next/image";
import FadeIn from "@/components/animations/FadeIn";
import StaggerContainer, { StaggerItem } from "@/components/animations/StaggerContainer";

export default function Home() {
  return (
    <>
      {/* Hero Section - Premium & Clean */}
      <section className="bg-white min-h-[85vh] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left side - Text */}
            <FadeIn direction="left" duration={0.8}>
              <div className="max-w-xl">
                <span className="inline-block text-[#F27501] font-medium text-sm tracking-wider uppercase mb-4">
                  Horeca Uitzendbureau
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 leading-tight">
                  Uw partner voor{" "}
                  <span className="text-[#F27501]">kwalitatief</span>{" "}
                  horecapersoneel
                </h1>
                <p className="text-neutral-600 text-lg leading-relaxed mb-10">
                  TopTalent levert betrouwbaar en professioneel personeel voor restaurants,
                  hotels en evenementen. Binnen 24 uur de juiste mensen op de juiste plek.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/personeel-aanvragen"
                    className="group bg-[#F27501] text-white px-8 py-4 rounded-lg text-base font-semibold
                    shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                    hover:bg-[#d96800] transition-all duration-300 text-center"
                  >
                    Personeel aanvragen
                    <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform duration-300">
                      &rarr;
                    </span>
                  </Link>
                  <Link
                    href="/inschrijven"
                    className="group border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-lg
                    text-base font-semibold hover:border-[#F27501] hover:text-[#F27501]
                    transition-all duration-300 text-center"
                  >
                    Solliciteren
                  </Link>
                </div>

                {/* Trust indicators */}
                <div className="mt-12 pt-8 border-t border-neutral-100">
                  <div className="flex items-center gap-8">
                    <div>
                      <p className="text-3xl font-bold text-neutral-900">100+</p>
                      <p className="text-sm text-neutral-500">Tevreden klanten</p>
                    </div>
                    <div className="w-px h-12 bg-neutral-200"></div>
                    <div>
                      <p className="text-3xl font-bold text-neutral-900">24u</p>
                      <p className="text-sm text-neutral-500">Responstijd</p>
                    </div>
                    <div className="w-px h-12 bg-neutral-200"></div>
                    <div>
                      <p className="text-3xl font-bold text-neutral-900">98%</p>
                      <p className="text-sm text-neutral-500">Klanttevredenheid</p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Right side - Image */}
            <FadeIn direction="right" delay={0.2} duration={0.8}>
              <div className="relative flex justify-center items-center h-full">
                {/* Powder splash background */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image
                    src="/images/powder-splash.png"
                    alt=""
                    width={500}
                    height={500}
                    className="object-contain opacity-90 scale-150"
                    priority
                  />
                </div>
                <Image
                  src="/images/barista.png"
                  alt="Professionele barista"
                  width={240}
                  height={320}
                  className="object-contain z-10 relative drop-shadow-2xl"
                  priority
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Services Section - Premium Cards */}
      <section className="py-24 lg:py-32 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="inline-block text-[#F27501] font-medium text-sm tracking-wider uppercase mb-4">
                Onze Diensten
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-6">
                Flexibele personeelsoplossingen
              </h2>
              <p className="text-neutral-600 text-lg leading-relaxed">
                Van tijdelijke inhuur tot permanente plaatsing. Wij bieden complete
                personeelsoplossingen voor de horeca- en evenementenbranche.
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8" staggerDelay={0.15}>
            {/* Uitzenden */}
            <StaggerItem>
              <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 border border-neutral-100 h-full">
                <div className="w-14 h-14 bg-[#FEF3E7] rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#F27501] transition-colors duration-300">
                  <svg className="w-7 h-7 text-[#F27501] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-4">Uitzenden</h3>
                <p className="text-neutral-600 leading-relaxed mb-6">
                  Tijdelijke inzet van gekwalificeerd horecapersoneel. Flexibel in te zetten
                  voor piekuren, evenementen of seizoensgebonden drukte.
                </p>
                <Link href="/diensten" className="inline-flex items-center text-[#F27501] font-medium hover:gap-3 gap-2 transition-all duration-300">
                  Meer informatie
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </StaggerItem>

            {/* Detachering */}
            <StaggerItem>
              <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 border border-neutral-100 h-full">
                <div className="w-14 h-14 bg-[#FEF3E7] rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#F27501] transition-colors duration-300">
                  <svg className="w-7 h-7 text-[#F27501] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-4">Detachering</h3>
                <p className="text-neutral-600 leading-relaxed mb-6">
                  Langdurige plaatsing van ervaren professionals. Ideaal voor structurele
                  versterking met behoud van flexibiliteit.
                </p>
                <Link href="/diensten" className="inline-flex items-center text-[#F27501] font-medium hover:gap-3 gap-2 transition-all duration-300">
                  Meer informatie
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </StaggerItem>

            {/* Recruitment */}
            <StaggerItem>
              <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 border border-neutral-100 h-full">
                <div className="w-14 h-14 bg-[#FEF3E7] rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#F27501] transition-colors duration-300">
                  <svg className="w-7 h-7 text-[#F27501] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-4">Recruitment</h3>
                <p className="text-neutral-600 leading-relaxed mb-6">
                  Werving en selectie voor vaste posities. Wij vinden de perfecte match
                  voor uw organisatie met onze uitgebreide kandidatenpool.
                </p>
                <Link href="/diensten" className="inline-flex items-center text-[#F27501] font-medium hover:gap-3 gap-2 transition-all duration-300">
                  Meer informatie
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

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
