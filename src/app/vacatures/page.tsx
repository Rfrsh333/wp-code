import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Vacatures - TopTalent Jobs",
  description: "Bekijk onze vacatures in de horeca en evenementensector. Flexibel werken met goede arbeidsvoorwaarden.",
};

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
      <section className="bg-gradient-to-br from-gray-50 to-orange-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Onze <span className="text-[#F27501]">Vacatures</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Vind jouw perfecte baan in de horeca of evenementensector
          </p>
        </div>
      </section>

      {/* Voordelen */}
      <section className="py-12 bg-[#F27501]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-white text-center">
            <div>
              <div className="text-2xl font-bold">💰</div>
              <p className="mt-2 font-medium">Goed Salaris</p>
            </div>
            <div>
              <div className="text-2xl font-bold">⚡</div>
              <p className="mt-2 font-medium">Snelle Uitbetaling</p>
            </div>
            <div>
              <div className="text-2xl font-bold">📱</div>
              <p className="mt-2 font-medium">Handige App</p>
            </div>
            <div>
              <div className="text-2xl font-bold">🎓</div>
              <p className="mt-2 font-medium">Gratis Trainingen</p>
            </div>
          </div>
        </div>
      </section>

      {/* Vacatures Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vacatures.map((vacature) => (
              <div
                key={vacature.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-orange-100 text-[#F27501] px-3 py-1 rounded-full text-sm font-medium">
                    {vacature.categorie}
                  </span>
                  <span className="text-gray-500 text-sm">{vacature.type}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{vacature.titel}</h3>
                <div className="flex items-center text-gray-500 mb-4">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {vacature.locatie}
                </div>
                <p className="text-gray-600 mb-6">{vacature.beschrijving}</p>
                <Link
                  href="/contact"
                  className="block w-full bg-[#F27501] text-white text-center px-6 py-3 rounded-lg font-semibold hover:bg-[#d96800] transition-colors"
                >
                  Solliciteer Nu
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Sollicitatie */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Niet de juiste vacature gevonden?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Stuur een open sollicitatie! Wij zijn altijd op zoek naar gemotiveerd talent
            voor de horeca en evenementensector.
          </p>
          <Link
            href="/contact"
            className="bg-[#F27501] text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-[#d96800] transition-colors inline-block"
          >
            Stuur Open Sollicitatie
          </Link>
        </div>
      </section>

      {/* Proces */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Hoe werkt het?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#F27501] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Solliciteer</h3>
              <p className="text-gray-600">Stuur je gegevens via het contactformulier</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#F27501] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Kennismaking</h3>
              <p className="text-gray-600">We nodigen je uit voor een gesprek</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#F27501] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Inschrijving</h3>
              <p className="text-gray-600">Je wordt ingeschreven in ons systeem</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#F27501] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Aan de slag!</h3>
              <p className="text-gray-600">Je ontvangt je eerste opdracht</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
