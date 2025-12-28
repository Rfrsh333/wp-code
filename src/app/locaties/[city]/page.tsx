import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocation } from "@/data/locations";
import Breadcrumbs from "@/components/Breadcrumbs";
import RelatedLocations from "@/components/RelatedLocations";

interface Props {
  params: Promise<{ city: string }>;
}

export default async function CityPage({ params }: Props) {
  const { city } = await params;
  const location = getLocation(city);

  if (!location) {
    notFound();
  }

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Locaties", href: "/locaties" },
    { label: location.name, href: `/locaties/${location.slug}` },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbItems} />

        <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6">
          Horeca Personeel {location.name}
        </h1>

        <p className="text-xl text-neutral-600 mb-8">{location.heroText}</p>

        {/* USPs Section */}
        <div className="bg-gradient-to-br from-neutral-50 to-white rounded-2xl p-8 mb-12 border border-neutral-200">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">
            Waarom TopTalent in {location.name}?
          </h2>
          <ul className="space-y-3 text-neutral-700">
            {location.usps.map((usp, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{usp.icon}</span>
                <span className="pt-1">{usp.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Services & Functions Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <h3 className="text-xl font-bold text-neutral-900 mb-3">
              Onze diensten in {location.name}
            </h3>
            <ul className="space-y-2 text-neutral-700">
              {location.services.map((service, index) => (
                <li key={index}>• {service}</li>
              ))}
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
              {location.functions.map((func, index) => (
                <li key={index}>• {func}</li>
              ))}
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
            Werkgebied in {location.name}
          </h3>
          <p className="text-neutral-600 mb-4">
            Wij leveren horeca personeel in de volgende gebieden:
          </p>
          <div className="flex flex-wrap gap-2">
            {location.serviceAreas.map((area, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 bg-orange-50 text-[#F97316] px-3 py-1 rounded-full text-sm border border-orange-100"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                {area}
              </span>
            ))}
          </div>
        </div>

        {/* Local Events & USPs */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl p-6 border border-orange-100">
            <h3 className="text-xl font-bold text-neutral-900 mb-3">
              📅 Ervaring met lokale evenementen
            </h3>
            <ul className="space-y-2 text-neutral-700">
              {location.localEvents.map((event, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#F97316] font-bold">•</span>
                  <span>{event}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl p-6 border border-orange-100">
            <h3 className="text-xl font-bold text-neutral-900 mb-3">
              ✨ Wat ons uniek maakt
            </h3>
            <ul className="space-y-2 text-neutral-700 text-sm">
              {location.uniqueSellingPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#F97316] font-bold">✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-2xl p-8 text-white text-center mb-12">
          <h2 className="text-2xl font-bold mb-4">
            Personeel nodig in {location.name}?
          </h2>
          <p className="mb-6 text-white/90">{location.ctaText}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/personeel-aanvragen"
              className="bg-white text-[#F97316] px-8 py-3 rounded-xl font-semibold hover:bg-neutral-100 transition-colors"
            >
              Personeel aanvragen
            </Link>
            <Link
              href="/contact"
              className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors"
            >
              Contact opnemen
            </Link>
          </div>
        </div>

        {/* Related Locations */}
        <RelatedLocations currentSlug={location.slug} />
      </div>
    </div>
  );
}
