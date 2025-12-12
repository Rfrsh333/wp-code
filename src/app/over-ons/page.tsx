import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Over Ons - TopTalent Jobs",
  description: "Leer meer over TopTalent Jobs. Jouw personeel, onze missie: flexibel en kwalitatief.",
};

export default function OverOnsPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 to-orange-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Over <span className="text-[#F27501]">TopTalent</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Jouw Personeel, Onze Missie: Flexibel en Kwalitatief
          </p>
        </div>
      </section>

      {/* Ons Verhaal */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Ons Verhaal</h2>
              <p className="text-lg text-gray-600 mb-4">
                TopTalent Jobs is opgericht met één doel: het verbinden van gemotiveerd talent
                met bedrijven in de horeca en evenementensector die flexibel en kwalitatief
                personeel nodig hebben.
              </p>
              <p className="text-lg text-gray-600 mb-4">
                Wij geloven dat werk meer is dan alleen een baan. Het gaat om plezier,
                ontwikkeling en het maken van impact. Daarom investeren wij in onze mensen
                met trainingen, een sterke community en eerlijke arbeidsvoorwaarden.
              </p>
              <p className="text-lg text-gray-600">
                Of u nu een restaurant, hotel, cateringbedrijf of evenementenorganisatie bent -
                wij leveren het personeel dat bij u past.
              </p>
            </div>
            <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl p-8 h-80 flex items-center justify-center">
              <span className="text-8xl">🎯</span>
            </div>
          </div>
        </div>
      </section>

      {/* Kernwaarden */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Onze Kernwaarden
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Dit is waar wij voor staan en wat ons drijft
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Plezier */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="w-16 h-16 bg-[#F27501] rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Plezier</h3>
              <p className="text-gray-600">
                Met plezier slagen we beter in wat we willen bereiken. Wij geloven dat
                werkgeluk de basis is voor goede prestaties. Daarom zorgen we voor een
                positieve werkomgeving waar mensen graag komen werken.
              </p>
            </div>

            {/* Impact */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="w-16 h-16 bg-[#F27501] rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Impact</h3>
              <p className="text-gray-600">
                Wij willen economisch, ecologisch en sociaal verschil maken. Door mensen
                aan het werk te helpen en bedrijven te ondersteunen, dragen wij bij aan
                een sterke samenleving.
              </p>
            </div>

            {/* Betrokken */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="w-16 h-16 bg-[#F27501] rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Betrokken</h3>
              <p className="text-gray-600">
                Meeleven, meedenken en meevoelen met onze mensen. Wij kennen onze
                medewerkers persoonlijk en staan altijd klaar om te helpen. Geen nummers,
                maar mensen.
              </p>
            </div>

            {/* Vernieuwend */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="w-16 h-16 bg-[#F27501] rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Vernieuwend</h3>
              <p className="text-gray-600">
                Door anders te kijken maken kleine aanpassingen een groot verschil.
                Wij blijven innoveren met moderne tools en processen om de beste
                service te leveren.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Waarom TopTalent */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Waarom TopTalent?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-[#F27501] mb-2">24/7</div>
              <p className="text-gray-600">Bereikbaar voor vragen en ondersteuning</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-[#F27501] mb-2">100+</div>
              <p className="text-gray-600">Tevreden opdrachtgevers</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-[#F27501] mb-2">500+</div>
              <p className="text-gray-600">Gemotiveerde medewerkers</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Wilt u samenwerken?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Ontdek hoe TopTalent Jobs u kan helpen met flexibel personeel.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-[#F27501] text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-[#d96800] transition-colors"
            >
              Neem Contact Op
            </Link>
            <Link
              href="/vacatures"
              className="bg-transparent text-white border-2 border-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-gray-900 transition-colors"
            >
              Bekijk Vacatures
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
