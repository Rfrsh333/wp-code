import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-white min-h-[600px] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text */}
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-8">
                ik ben<br />opzoek naar
              </h1>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/vacatures"
                  className="bg-[#F27501] text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-[#d96800] transition-colors text-center"
                >
                  Werk
                </Link>
                <Link
                  href="/contact"
                  className="bg-[#F27501] text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-[#d96800] transition-colors text-center"
                >
                  TopTalent
                </Link>
              </div>
            </div>

            {/* Right side - Barista Image with orange splash */}
            <div className="relative flex justify-center items-center">
              {/* Orange splash effect */}
              <div className="absolute w-[250px] h-[250px] bg-[#F27501] rounded-full blur-3xl opacity-60"></div>
              <div className="absolute w-[200px] h-[200px] bg-[#FFB347] rounded-full blur-2xl opacity-50 translate-x-10"></div>
              <Image
                src="/images/barista.png"
                alt="Barista"
                width={280}
                height={420}
                className="object-contain z-10 relative max-h-[450px]"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Onze Diensten Section */}
      <section className="py-20 bg-[#FDF8F3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Onze diensten
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-sm">
              Als horeca uitzendbureau bieden wij verschillende diensten. Wil je cateringpersoneel inhuren voor een tijdelijke klus of zoek je horecamedewerkers voor langdurige ondersteuning?
              Wij zetten onze flexibele medewerkers in voor jouw klus. Op zoek naar vast horecapersoneel? Wij vinden voor jou de perfecte match.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {/* Uitzenden */}
            <div className="bg-white rounded-2xl p-8 shadow-sm relative">
              <div className="absolute -top-4 left-8">
                <div className="w-10 h-10 bg-[#F27501] rounded-lg flex items-center justify-center rotate-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mt-6 mb-4 border-b-2 border-[#F27501] pb-2 inline-block">Uitzenden</h3>
              <p className="text-gray-600 text-sm">
                Wij plaatsen tijdelijk onze arbeidskrachten bij horecagelegenheden. We bieden hiermee flexibiliteit voor zowel werknemers als werkgevers. Onze uitzendkrachten helpen bij het invullen van tijdelijke personeelsbehoeften.
              </p>
            </div>

            {/* Detachering */}
            <div className="bg-white rounded-2xl p-8 shadow-sm relative">
              <div className="absolute -top-4 left-8">
                <div className="w-10 h-10 bg-[#F27501] rounded-lg flex items-center justify-center rotate-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mt-6 mb-4 border-b-2 border-[#F27501] pb-2 inline-block">Detachering</h3>
              <p className="text-gray-600 text-sm">
                Voor een vast afgesproken periode plaatsen we onze horecamedewerkers bij onze klanten. Ideaal voor langdurige ondersteuning tijdens drukke periodes. Tegelijkertijd behoud je de flexibiliteit van een personeelsbestand.
              </p>
            </div>

            {/* Recruitment */}
            <div className="bg-white rounded-2xl p-8 shadow-sm relative">
              <div className="absolute -top-4 left-8">
                <div className="w-10 h-10 bg-[#F27501] rounded-lg flex items-center justify-center rotate-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mt-6 mb-4 border-b-2 border-[#F27501] pb-2 inline-block">Recruitment</h3>
              <p className="text-gray-600 text-sm">
                Als uitzendbureau voor horecapersoneel verzorgen wij ook het aantrekken, selecteren en plaatsen van geschikte kandidaten voor vaste vacatures. Veel van onze horecamedewerkers willen uiteindelijk doorgroeien naar een vaste horecabaan.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/diensten"
              className="border-2 border-[#F27501] text-[#F27501] px-8 py-3 rounded-md font-medium hover:bg-[#F27501] hover:text-white transition-colors inline-block"
            >
              Meer informatie
            </Link>
          </div>
        </div>
      </section>

      {/* Kom Gezellig Werken Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            Kom gezellig werken
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Waarom kaart */}
            <div className="bg-gray-50 rounded-2xl p-8 shadow-sm">
              <h3 className="text-xl font-bold text-[#F27501] mb-4">Waarom</h3>
              <p className="text-gray-600 text-sm mb-4">
                Werken bij <span className="font-bold">Top</span>Talent betekent bijdragen aan de toekomst. Meer specifiek: jouw toekomst!
              </p>
              <p className="text-gray-600 text-sm mb-4">
                We zijn voortdurend op zoek naar de meest gedreven individuen om ons team te versterken.
              </p>
              <p className="text-gray-600 text-sm">
                Voordat je op de onderstaande knop klikt, is het goed om te weten wat je van ons kunt verwachten.
              </p>
            </div>

            {/* Wij bieden kaart */}
            <div className="bg-gray-50 rounded-2xl p-8 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Wij bieden</h3>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-700 text-sm">
                  <span className="text-[#F27501] mr-3">€</span>
                  een uitstekend salaris
                </li>
                <li className="flex items-center text-gray-700 text-sm">
                  <span className="text-[#F27501] mr-3">⚡</span>
                  binnen 24 uur uitbetaald
                </li>
                <li className="flex items-center text-gray-700 text-sm">
                  <span className="text-[#F27501] mr-3">📱</span>
                  een eigen handige talent-app
                </li>
                <li className="flex items-center text-gray-700 text-sm">
                  <span className="text-[#F27501] mr-3">🎓</span>
                  trainingen en opleidingen
                </li>
                <li className="flex items-center text-gray-700 text-sm">
                  <span className="text-[#F27501] mr-3">👥</span>
                  eigen community met collega&apos;s
                </li>
                <li className="flex items-center text-gray-700 text-sm">
                  <span className="text-[#F27501] mr-3">📍</span>
                  werkervaring op de gaafste locaties
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/vacatures"
              className="bg-[#F27501] text-white px-8 py-3 rounded-md font-medium hover:bg-[#d96800] transition-colors inline-block"
            >
              Meld je hier aan
            </Link>
          </div>
        </div>
      </section>

      {/* Kernwaarden Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              onze kernwaarden
            </h2>
            <p className="text-gray-600">
              wat wij belangrijk vinden
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Plezier */}
            <div className="bg-gray-50 rounded-2xl p-6 border-b-4 border-[#F27501]">
              <h3 className="text-lg font-bold text-gray-900 mb-3">plezier</h3>
              <p className="text-gray-600 text-sm">
                Met plezier slagen we beter in wat we willen bereiken. Het geeft energie, verbindt, en draagt bij aan een prettige samenwerking.
              </p>
            </div>

            {/* Impact */}
            <div className="bg-gray-50 rounded-2xl p-6 border-b-4 border-[#F27501]">
              <h3 className="text-lg font-bold text-gray-900 mb-3">impact</h3>
              <p className="text-gray-600 text-sm">
                Impact creëren op economisch, ecologisch en sociaal niveau levert de resultaten op waar we naar streven.
              </p>
            </div>

            {/* Betrokken */}
            <div className="bg-gray-50 rounded-2xl p-6 border-b-4 border-[#F27501]">
              <h3 className="text-lg font-bold text-gray-900 mb-3">betrokken</h3>
              <p className="text-gray-600 text-sm">
                Empathiseer, denk mee en voel mee. Wees betrokken bij het proces. Het komt van binnenuit en is oprecht.
              </p>
            </div>

            {/* Vernieuwend */}
            <div className="bg-gray-50 rounded-2xl p-6 border-b-4 border-[#F27501]">
              <h3 className="text-lg font-bold text-gray-900 mb-3">vernieuwend</h3>
              <p className="text-gray-600 text-sm">
                Door anders te kijken kunnen kleine aanpassingen een groot verschil maken. Het is een nieuwe manier van denken en organiseren.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
