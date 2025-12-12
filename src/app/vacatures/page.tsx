"use client";

import Link from "next/link";
import FadeIn from "@/components/animations/FadeIn";
import StaggerContainer, { StaggerItem } from "@/components/animations/StaggerContainer";

const vacatures = [
  {
    id: 1,
    titel: "Horeca Medewerker",
    locatie: "Utrecht",
    type: "Flexibel",
    beschrijving: "Ben jij een enthousiaste horeca medewerker die graag in verschillende horecagelegenheden wil werken? Wij zoeken jou!",
    categorie: "Bediening",
  },
  {
    id: 2,
    titel: "Barista",
    locatie: "Amsterdam",
    type: "Parttime / Fulltime",
    beschrijving: "Passie voor koffie? Als barista bij TopTalent werk je bij de leukste koffiezaken en evenementen.",
    categorie: "Bediening",
  },
  {
    id: 3,
    titel: "Evenementen Medewerker",
    locatie: "Heel Nederland",
    type: "Flexibel",
    beschrijving: "Werk mee aan de mooiste festivals en evenementen. Van catering tot bediening, afwisseling gegarandeerd.",
    categorie: "Evenementen",
  },
  {
    id: 4,
    titel: "Kok / Hulpkok",
    locatie: "Utrecht en omgeving",
    type: "Flexibel",
    beschrijving: "Ervaring in de keuken? Werk als kok of hulpkok bij verschillende restaurants en cateringbedrijven.",
    categorie: "Keuken",
  },
  {
    id: 5,
    titel: "Afwasser",
    locatie: "Utrecht",
    type: "Flexibel",
    beschrijving: "Betrouwbaar en hardwerkend? Als afwasser ben je onmisbaar in elke professionele keuken.",
    categorie: "Keuken",
  },
  {
    id: 6,
    titel: "Runner / Food Runner",
    locatie: "Amsterdam",
    type: "Parttime",
    beschrijving: "Snel en accuraat werken? Als runner zorg je dat de gerechten op tijd bij de gasten komen.",
    categorie: "Bediening",
  },
];

export default function VacaturesPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-block text-[#F27501] font-medium text-sm tracking-wider uppercase mb-4">
                Carriere
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
                Vind jouw ideale baan
              </h1>
              <p className="text-neutral-600 text-lg leading-relaxed">
                Bekijk onze actuele vacatures in de horeca en evenementensector.
                Flexibel werken met uitstekende arbeidsvoorwaarden.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Benefits Bar */}
      <section className="py-8 bg-neutral-900">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-white">
            {[
              { icon: "€", label: "Competitief salaris" },
              { icon: "⚡", label: "Snelle uitbetaling" },
              { icon: "📱", label: "Eigen talent-app" },
              { icon: "🎓", label: "Gratis trainingen" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vacatures Grid */}
      <section className="py-20 lg:py-28 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" staggerDelay={0.1}>
            {vacatures.map((vacature) => (
              <StaggerItem key={vacature.id}>
                <div className="group bg-white rounded-2xl p-8 shadow-sm border border-neutral-100 hover:shadow-xl hover:border-neutral-200 transition-all duration-500 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-[#FEF3E7] text-[#F27501] px-3 py-1.5 rounded-lg text-sm font-medium">
                      {vacature.categorie}
                    </span>
                    <span className="text-neutral-500 text-sm">{vacature.type}</span>
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-3">{vacature.titel}</h3>
                  <div className="flex items-center text-neutral-500 mb-4">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {vacature.locatie}
                  </div>
                  <p className="text-neutral-600 mb-6 flex-grow">{vacature.beschrijving}</p>
                  <Link
                    href="/contact"
                    className="block w-full bg-[#F27501] text-white text-center px-6 py-3.5 rounded-xl font-semibold
                    shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                    hover:bg-[#d96800] transition-all duration-300"
                  >
                    Solliciteer nu
                  </Link>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Open Sollicitatie */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
              Niet de juiste vacature gevonden?
            </h2>
            <p className="text-lg text-neutral-600 mb-10 leading-relaxed">
              Stuur een open sollicitatie! Wij zijn altijd op zoek naar gemotiveerd talent
              voor de horeca en evenementensector. Wellicht hebben wij binnenkort de perfecte match voor jou.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-[#F27501] text-white px-8 py-4 rounded-lg font-semibold
              shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
              hover:bg-[#d96800] transition-all duration-300"
            >
              Stuur open sollicitatie
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Proces */}
      <section className="py-20 lg:py-28 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="inline-block text-[#F27501] font-medium text-sm tracking-wider uppercase mb-4">
                Hoe werkt het
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900">
                In 4 stappen aan de slag
              </h2>
            </div>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-4 gap-8" staggerDelay={0.15}>
            {[
              { num: "01", title: "Solliciteer", desc: "Stuur je gegevens via het contactformulier" },
              { num: "02", title: "Kennismaking", desc: "We nodigen je uit voor een gesprek" },
              { num: "03", title: "Inschrijving", desc: "Je wordt ingeschreven in ons systeem" },
              { num: "04", title: "Aan de slag", desc: "Je ontvangt je eerste opdracht" },
            ].map((step, i) => (
              <StaggerItem key={i}>
                <div className="text-center">
                  <div className="text-5xl font-bold text-[#F27501]/20 mb-4">{step.num}</div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">{step.title}</h3>
                  <p className="text-neutral-600">{step.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </>
  );
}
