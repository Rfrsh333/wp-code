import Link from "next/link";
import { Metadata } from "next";
import { getAllLocations } from "@/data/locations";

export const metadata: Metadata = {
  title: "Locaties - Horeca Uitzendbureau | TopTalent Jobs",
  description:
    "Bekijk in welke regio's TopTalent Jobs actief is. Lokale horecapersoneel oplossingen in Utrecht, Amsterdam en Rotterdam.",
  alternates: {
    canonical: "https://toptalentjobs.nl/locaties",
  },
};

export default function LocatiesPage() {
  const locations = getAllLocations();

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6">
            Onze Locaties
          </h1>

          <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
            TopTalent Jobs levert horecapersoneel in de belangrijkste steden
            van Nederland. Kies uw locatie voor lokale informatie en directe
            aanvraagmogelijkheden.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-12">
          {locations.map((location) => (
            <Link
              key={location.slug}
              href={`/locaties/${location.slug}`}
              className="group rounded-2xl border border-neutral-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-[#F97316]/40 hover:shadow-lg"
            >
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-neutral-900 group-hover:text-[#F97316] transition-colors">
                  {location.name}
                </h2>
                <svg
                  className="w-6 h-6 text-[#F97316] flex-shrink-0 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>

              <p className="text-neutral-600 mb-4 text-sm leading-relaxed">
                {location.description.substring(0, 120)}...
              </p>

              <div className="border-t border-neutral-100 pt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    {location.serviceAreas.slice(0, 2).join(", ")} + omgeving
                  </span>
                </div>

                <div className="flex gap-3 text-xs text-neutral-500">
                  <span>🍽️ {location.statistics.restaurants}+ restaurants</span>
                  <span>🏨 {location.statistics.hotels}+ hotels</span>
                  <span>🎉 {location.statistics.events}+ events</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Service Areas Overview */}
        <div className="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 border border-orange-100">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6 text-center">
            Uitgebreid werkgebied
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {locations.map((location) => (
              <div key={location.slug}>
                <h3 className="font-bold text-neutral-900 mb-2 flex items-center gap-2">
                  <span className="text-[#F97316]">📍</span>
                  {location.name}
                </h3>
                <ul className="text-sm text-neutral-600 space-y-1">
                  {location.serviceAreas.slice(0, 5).map((area, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-[#F97316] font-bold">•</span>
                      <span>{area}</span>
                    </li>
                  ))}
                  {location.serviceAreas.length > 5 && (
                    <li className="text-neutral-500 italic">
                      + {location.serviceAreas.length - 5} meer gebieden
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">
            Staat uw locatie er niet bij?
          </h2>
          <p className="mb-6 text-white/90 max-w-2xl mx-auto">
            Wij zijn continu aan het uitbreiden. Neem contact met ons op om te
            kijken of wij ook in uw regio kunnen leveren.
          </p>
          <Link
            href="/contact"
            className="inline-block bg-white text-[#F97316] px-8 py-3 rounded-xl font-semibold hover:bg-neutral-100 transition-colors"
          >
            Neem contact op
          </Link>
        </div>
      </div>
    </div>
  );
}
