import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocation } from "@/data/locations";
import Section from "@/components/Section/Section";
import LocatieSubNav from "@/components/LocatieSubNav";
import RelatedLocations from "@/components/RelatedLocations";
import PremiumImage from "@/components/PremiumImage/PremiumImage";

interface PageProps {
  params: Promise<{
    city: string;
  }>;
}

export default async function CityPage({ params }: PageProps) {
  const { city } = await params;
  const location = getLocation(city);

  if (!location) {
    notFound();
  }

  // City-specific intro text
  const cityIntros: Record<string, string> = {
    amsterdam: "Van centrum tot Zuidas, van evenementen tot internationale horeca. Wij leveren snel en betrouwbaar horeca personeel in heel Amsterdam en omgeving.",
    rotterdam: "Van havengebied tot zakencentra, van Markthal tot Ahoy. Wij leveren snel en betrouwbaar horeca personeel in heel Rotterdam en omgeving.",
    "den-haag": "Van politiek centrum tot Scheveningen strand. Wij leveren snel en betrouwbaar horeca personeel in heel Den Haag en omgeving.",
    eindhoven: "Van High Tech Campus tot Stratumseind. Wij leveren snel en betrouwbaar horeca personeel in heel Eindhoven en omgeving.",
  };

  const cityIcons: Record<string, string> = {
    amsterdam: "🌷",
    rotterdam: "🏙️",
    "den-haag": "🏛️",
    eindhoven: "💡",
  };

  const cityHighlights: Record<string, string> = {
    amsterdam: "Centrum • Zuidas • De Pijp",
    rotterdam: "Centrum • Kop van Zuid • Haven",
    "den-haag": "Centrum • Scheveningen • Statenkwartier",
    eindhoven: "Centrum • Strijp-S • HTC",
  };

  const cityImages: Record<string, { src: string; alt: string }> = {
    utrecht: {
      src: "/images/locatie-utrecht-hero.png",
      alt: "Horeca personeel Utrecht centrum en Jaarbeurs"
    },
    amsterdam: {
      src: "/images/locatie-amsterdam-hero.png",
      alt: "Horeca personeel Amsterdam centrum en Zuidas"
    },
    rotterdam: {
      src: "/images/locatie-rotterdam-hero.png",
      alt: "Horeca personeel Rotterdam Markthal en haven"
    },
    "den-haag": {
      src: "/images/locatie-den-haag-hero.png",
      alt: "Horeca personeel Den Haag Scheveningen en centrum"
    },
    eindhoven: {
      src: "/images/locatie-eindhoven-hero.png",
      alt: "Horeca personeel Eindhoven Strijp-S en High Tech Campus"
    }
  };

  return (
    <>
      {/* HERO - Matched styling with /diensten/uitzenden */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
                <Link href="/locaties">Locaties</Link> › {location.name}
              </span>

              {/* Sub-navigatie */}
              <LocatieSubNav city={city} />

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 leading-[1.1]">
                Horeca personeel {location.name}
              </h1>
              <p className="text-xl text-neutral-600 mb-8 leading-relaxed max-w-xl">
                {cityIntros[city] || location.heroText}
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
              {cityImages[city] && (
                <PremiumImage
                  src={cityImages[city].src}
                  alt={cityImages[city].alt}
                  width={600}
                  height={600}
                />
              )}
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
                    <li key={index}>
                      <Link
                        href={service.href}
                        className="text-neutral-700 hover:text-[#F97316] transition-colors inline-flex items-center gap-2 group"
                      >
                        <span>•</span>
                        <span className="group-hover:underline">{service.label}</span>
                      </Link>
                    </li>
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
                Personeel nodig in {location.name}?
              </h2>
              <p className="text-white/90 text-lg leading-relaxed mb-10">
                {location.ctaText}
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

      {/* Related Locations */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <RelatedLocations currentSlug={location.slug} />
        </Section.Container>
      </Section>
    </>
  );
}
