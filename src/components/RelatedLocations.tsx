import Link from "next/link";
import { getOtherLocations } from "@/data/locations";

interface RelatedLocationsProps {
  currentSlug: string;
}

export default function RelatedLocations({ currentSlug }: RelatedLocationsProps) {
  const otherLocations = getOtherLocations(currentSlug);

  if (otherLocations.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 pt-12 border-t border-neutral-200">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-neutral-900 mb-3">
          Ook actief in andere regio's
        </h3>
        <p className="text-neutral-600">
          Bekijk onze diensten in andere steden
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {otherLocations.map((location) => (
          <Link
            key={location.slug}
            href={`/locaties/${location.slug}`}
            className="group rounded-2xl border border-neutral-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-[#F97316]/40 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-xl font-bold text-neutral-900 mb-2 group-hover:text-[#F97316] transition-colors">
                  {location.name}
                </h4>
                <p className="text-neutral-600 text-sm mb-3">
                  {location.description.substring(0, 120)}...
                </p>
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{location.serviceAreas.slice(0, 3).join(", ")}</span>
                </div>
              </div>
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

            <div className="mt-4 pt-4 border-t border-neutral-100">
              <div className="flex gap-4 text-xs text-neutral-500">
                <span>🍽️ {location.statistics.restaurants}+ restaurants</span>
                <span>🏨 {location.statistics.hotels}+ hotels</span>
                <span>🎉 {location.statistics.events}+ events</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link
          href="/locaties"
          className="inline-flex items-center gap-2 text-[#F97316] font-semibold hover:underline"
        >
          Bekijk alle locaties
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </section>
  );
}
