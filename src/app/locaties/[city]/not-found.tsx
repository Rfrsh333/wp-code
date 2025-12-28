import Link from "next/link";
import { getAllLocations } from "@/data/locations";

export default function NotFound() {
  const locations = getAllLocations();

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
            Locatie niet gevonden
          </h1>
          <p className="text-xl text-neutral-600 mb-2">
            Deze locatie bestaat (nog) niet in ons netwerk.
          </p>
          <p className="text-neutral-500">
            Bekijk hieronder de locaties waar wij wel actief zijn.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {locations.map((location) => (
            <Link
              key={location.slug}
              href={`/locaties/${location.slug}`}
              className="group rounded-2xl border border-neutral-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-[#F97316]/40 hover:shadow-lg text-left"
            >
              <h2 className="text-xl font-bold text-neutral-900 mb-2 group-hover:text-[#F97316] transition-colors">
                {location.name}
              </h2>
              <p className="text-neutral-600 text-sm mb-4">
                {location.description.substring(0, 100)}...
              </p>
              <div className="flex items-center gap-2 text-sm text-[#F97316] font-semibold">
                Bekijk locatie
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/locaties"
            className="bg-[#F97316] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#EA580C] transition-colors"
          >
            Alle locaties
          </Link>
          <Link
            href="/contact"
            className="border-2 border-neutral-300 text-neutral-700 px-8 py-3 rounded-xl font-semibold hover:bg-neutral-50 transition-colors"
          >
            Neem contact op
          </Link>
        </div>
      </div>
    </div>
  );
}
