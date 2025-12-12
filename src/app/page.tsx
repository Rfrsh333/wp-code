import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/restaurant.jpg"
            alt="Restaurant sfeer"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Jouw Personeel,{" "}
              <span className="text-[#F27501]">Onze Missie</span>
            </h1>
            <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
              Flexibel en kwalitatief personeel voor horeca en evenementen.
              Wij verbinden talent met kansen.
            </p>

            {/* Hero CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <p className="text-lg text-white font-medium">Ik ben opzoek naar:</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/vacatures"
                className="bg-[#F27501] text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-[#d96800] transition-colors shadow-lg"
              >
                Werk
              </Link>
              <Link
                href="/contact"
                className="bg-white text-[#F27501] border-2 border-[#F27501] px-8 py-4 rounded-full text-lg font-semibold hover:bg-[#F27501] hover:text-white transition-colors shadow-lg"
              >
                TopTalent
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Diensten Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Onze Diensten
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Wij bieden verschillende oplossingen voor uw personeelsbehoefte
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Uitzenden */}
            <div className="bg-gray-50 rounded-2xl p-8 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-[#F27501] rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Uitzenden</h3>
              <p className="text-gray-600">
                We plaatsen tijdelijk onze arbeidskrachten bij horecagelegenheden en evenementen. Flexibel personeel wanneer u het nodig heeft.
              </p>
            </div>

            {/* Detachering */}
            <div className="bg-gray-50 rounded-2xl p-8 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-[#F27501] rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Detachering</h3>
              <p className="text-gray-600">
                Langdurige plaatsing voor vaste periodes. Ons personeel werkt bij u, maar blijft bij ons in dienst. De perfecte tussenoplossing.
              </p>
            </div>

            {/* Recruitment */}
            <div className="bg-gray-50 rounded-2xl p-8 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-[#F27501] rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Recruitment</h3>
              <p className="text-gray-600">
                Aantrekken, selecteren en plaatsen van geschikte kandidaten. Wij vinden het perfecte talent voor uw organisatie.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Kom Gezellig Werken Section */}
      <section className="py-20 bg-[#F27501]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Kom Gezellig Werken
            </h2>
            <p className="text-xl text-orange-100 max-w-2xl mx-auto">
              Waarom werken bij TopTalent? Wij bieden meer dan alleen een baan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Goed Salaris", desc: "Competitieve vergoeding voor jouw inzet" },
              { title: "Snelle Uitbetaling", desc: "Binnen 24 uur je geld op je rekening" },
              { title: "Handige App", desc: "Plan je shifts en beheer alles via onze app" },
              { title: "Trainingen", desc: "Gratis trainingen om jezelf te ontwikkelen" },
              { title: "Community", desc: "Word onderdeel van ons gezellige team" },
              { title: "Werkervaring", desc: "Bouw waardevolle ervaring op in de horeca" },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white"
              >
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-orange-100">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/vacatures"
              className="bg-white text-[#F27501] px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-colors inline-block"
            >
              Bekijk Vacatures
            </Link>
          </div>
        </div>
      </section>

      {/* Kernwaarden Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Onze Kernwaarden
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Dit is waar wij voor staan
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Plezier */}
            <div className="text-center">
              <div className="w-20 h-20 bg-[#F27501] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Plezier</h3>
              <p className="text-gray-600">
                Met plezier slagen we beter in wat we willen bereiken.
              </p>
            </div>

            {/* Impact */}
            <div className="text-center">
              <div className="w-20 h-20 bg-[#F27501] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Impact</h3>
              <p className="text-gray-600">
                Economisch, ecologisch en sociaal verschil maken.
              </p>
            </div>

            {/* Betrokken */}
            <div className="text-center">
              <div className="w-20 h-20 bg-[#F27501] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Betrokken</h3>
              <p className="text-gray-600">
                Meeleven, meedenken en meevoelen met onze mensen.
              </p>
            </div>

            {/* Vernieuwend */}
            <div className="text-center">
              <div className="w-20 h-20 bg-[#F27501] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Vernieuwend</h3>
              <p className="text-gray-600">
                Door anders te kijken maken kleine aanpassingen een groot verschil.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/chef.jpg"
            alt="Chef aan het werk"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gray-900/80" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Klaar om te beginnen?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Neem contact met ons op en ontdek hoe wij u kunnen helpen met flexibel personeel.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-[#F27501] text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-[#d96800] transition-colors"
            >
              Neem Contact Op
            </Link>
            <a
              href="tel:+31649200412"
              className="bg-transparent text-white border-2 border-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-gray-900 transition-colors"
            >
              Bel Ons: +31 6 49 20 04 12
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
