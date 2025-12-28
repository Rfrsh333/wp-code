"use client";

import Link from "next/link";
import Section from "@/components/Section/Section";
import { getLocation } from "@/data/locations";

export default function UtrechtPage() {
  const location = getLocation("utrecht");

  if (!location) {
    return null;
  }

  return (
    <>
      {/* HERO - Matched styling with /diensten/uitzenden */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
                <Link href="/locaties">Locaties</Link> › Utrecht
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 leading-[1.1]">
                Horeca personeel Utrecht
              </h1>
              <p className="text-xl text-neutral-600 mb-8 leading-relaxed max-w-xl">
                Van studentenevenementen tot zakelijke congressen, van Jaarbeurs tot binnenstad.
                Wij leveren snel en betrouwbaar horeca personeel in heel Utrecht en omgeving.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/personeel-aanvragen"
                  className="inline-flex items-center justify-center bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                  shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                  hover:bg-[#EA580C] transition-all duration-300"
                >
                  Personeel aanvragen
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
                  hover:border-[#F97316] hover:text-[#F97316] transition-all duration-300"
                >
                  Neem contact op
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex justify-center lg:justify-end">
              <div className="w-full max-w-md aspect-square bg-gradient-to-br from-orange-50 to-white rounded-3xl border border-orange-100 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-6xl mb-4">🏙️</div>
                  <p className="text-neutral-600 font-medium">Utrecht</p>
                  <p className="text-sm text-neutral-500 mt-2">Binnenstad • Jaarbeurs • Leidsche Rijn</p>
                </div>
              </div>
            </div>
          </div>
        </Section.Container>
      </Section>

      {/* Rest of content */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <div className="max-w-4xl mx-auto">
            {/* USPs Section */}
            <div className="bg-white rounded-2xl p-8 mb-12 border border-neutral-100 shadow-sm">
              <h2 className="text-2xl font-bold text-neutral-900 mb-4">
                Waarom TopTalent in Utrecht?
              </h2>
              <ul className="space-y-3 text-neutral-700">
                <li className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🏢</span>
                  <span className="pt-1">Lokale expertise: wij kennen de Utrechtse horeca van binnenstad tot Jaarbeurs</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">⚡</span>
                  <span className="pt-1">Vaak binnen 24 uur personeel beschikbaar, afhankelijk van beschikbaarheid</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">👥</span>
                  <span className="pt-1">Ervaren medewerkers die Utrecht kennen en vaak meerdere talen spreken</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🎯</span>
                  <span className="pt-1">Flexibel inzetbaar voor UIT-week, TivoliVredenburg, Jaarbeurs events en reguliere diensten</span>
                </li>
              </ul>
            </div>

            {/* Services & Functions Grid */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white rounded-xl p-6 border border-neutral-200">
                <h3 className="text-xl font-bold text-neutral-900 mb-3">
                  Onze diensten in Utrecht
                </h3>
                <ul className="space-y-2 text-neutral-700">
                  <li>• Uitzenden voor tijdelijke inzet</li>
                  <li>• Detachering voor langere periode</li>
                  <li>• Recruitment voor vaste medewerkers</li>
                  <li>• Evenementenpersoneel</li>
                </ul>
                <Link
                  href="/diensten"
                  className="inline-block mt-4 text-[#F97316] font-semibold hover:underline"
                >
                  Bekijk alle diensten →
                </Link>
              </div>

              <div className="bg-white rounded-xl p-6 border border-neutral-200">
                <h3 className="text-xl font-bold text-neutral-900 mb-3">
                  Beschikbare functies
                </h3>
                <ul className="space-y-2 text-neutral-700">
                  <li>• Barista's & bartenders</li>
                  <li>• Bediening & horecamedewerkers</li>
                  <li>• Koks & keukenpersoneel</li>
                  <li>• Gastheren & gastvrouwen</li>
                </ul>
                <Link
                  href="/inschrijven"
                  className="inline-block mt-4 text-[#F97316] font-semibold hover:underline"
                >
                  Schrijf je in als kandidaat →
                </Link>
              </div>
            </div>

            {/* Service Areas */}
            <div className="bg-white rounded-xl p-6 border border-neutral-200 mb-12">
              <h3 className="text-xl font-bold text-neutral-900 mb-3">
                Werkgebied in Utrecht en omgeving
              </h3>
              <p className="text-neutral-600 mb-4">
                Van binnenstad tot Leidsche Rijn - wij leveren overal horeca personeel:
              </p>
              <div className="flex flex-wrap gap-2">
                {location.serviceAreas.map((area, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 bg-orange-50 text-[#F97316] px-3 py-1 rounded-full text-sm border border-orange-100"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Local Events */}
            <div className="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 mb-12 border border-orange-100">
              <h3 className="text-xl font-bold text-neutral-900 mb-3">
                Ervaring met Utrechtse evenementen
              </h3>
              <p className="text-neutral-600 mb-4">
                Utrecht heeft een bruisend evenementenleven. Wij hebben ruime ervaring met:
              </p>
              <ul className="space-y-2 text-neutral-700">
                {location.localEvents.map((event, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-[#F97316]">✓</span>
                    {event}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section.Container>
      </Section>

      {/* CTA Section - Matched styling */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-40 h-40 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-0 w-60 h-60 border border-white/20 rounded-full translate-x-1/3 translate-y-1/3"></div>
            </div>

            <div className="relative z-10 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Vaak binnen 24 uur beschikbaar
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Personeel nodig in Utrecht?
              </h2>
              <p className="text-white/90 text-lg leading-relaxed mb-10">
                Neem contact op en ontvang vaak binnen 24 uur gekwalificeerd personeel voor uw zaak in Utrecht en omgeving.
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
        </Section.Container>
      </Section>

      {/* Related Cities */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <div className="border-t border-neutral-200 pt-8">
            <h3 className="text-2xl font-bold text-neutral-900 mb-6 text-center">
              Ook actief in andere steden
            </h3>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-6">
              <Link
                href="/locaties/amsterdam"
                className="group bg-white rounded-xl p-6 border border-neutral-200 hover:border-[#F97316] hover:shadow-lg transition-all"
              >
                <h4 className="text-xl font-bold text-neutral-900 mb-2 group-hover:text-[#F97316]">
                  Amsterdam
                </h4>
                <p className="text-neutral-600 text-sm mb-3">
                  Horeca personeel in Amsterdam centrum, Zuidas en omgeving.
                </p>
              </Link>

              <Link
                href="/locaties/rotterdam"
                className="group bg-white rounded-xl p-6 border border-neutral-200 hover:border-[#F97316] hover:shadow-lg transition-all"
              >
                <h4 className="text-xl font-bold text-neutral-900 mb-2 group-hover:text-[#F97316]">
                  Rotterdam
                </h4>
                <p className="text-neutral-600 text-sm mb-3">
                  Flexibel horeca personeel in Rotterdam en havengebied.
                </p>
              </Link>
            </div>
            <div className="text-center">
              <Link
                href="/locaties"
                className="inline-block text-[#F97316] font-semibold hover:underline"
              >
                Bekijk alle locaties →
              </Link>
            </div>
          </div>
        </Section.Container>
      </Section>
    </>
  );
}
