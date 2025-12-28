import Link from "next/link";
import { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import { generateBreadcrumbSchema } from "@/components/Breadcrumbs";
import { getLocation } from "@/data/locations";
import {
  generateLocalBusinessSchema,
  generateLocationFAQSchema,
} from "@/lib/schema-helpers";

export const metadata: Metadata = {
  title: "Horeca Personeel Utrecht | TopTalent Jobs",
  description: "Flexibel horeca personeel in Utrecht. Ervaren krachten voor restaurants, hotels, evenementen en congressen. Vaak binnen 24 uur beschikbaar.",
  alternates: {
    canonical: "https://toptalentjobs.nl/locaties/utrecht",
  },
  openGraph: {
    title: "Horeca Personeel Utrecht | TopTalent Jobs",
    description: "Flexibel horeca personeel in Utrecht. Ervaren krachten voor restaurants, hotels, evenementen en congressen.",
    url: "https://toptalentjobs.nl/locaties/utrecht",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
};

export default function UtrechtPage() {
  const location = getLocation("utrecht");

  if (!location) {
    return null;
  }

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Locaties", href: "/locaties" },
    { label: "Utrecht", href: "/locaties/utrecht" },
  ];

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);
  const localBusinessSchema = generateLocalBusinessSchema(location);
  const faqSchema = generateLocationFAQSchema(location);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbItems} />

          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6">
            Horeca Personeel Utrecht
          </h1>

          <p className="text-xl text-neutral-600 mb-8">
            Van studentenevenementen tot zakelijke congressen, van Jaarbeurs tot binnenstad - TopTalent Jobs levert snel en betrouwbaar horeca personeel in heel Utrecht en omgeving.
          </p>

          {/* Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl p-6 border border-orange-100 text-center">
              <div className="text-3xl font-bold text-[#F97316] mb-2">25+</div>
              <div className="text-sm text-neutral-600">Restaurants</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl p-6 border border-orange-100 text-center">
              <div className="text-3xl font-bold text-[#F97316] mb-2">15+</div>
              <div className="text-sm text-neutral-600">Hotels</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl p-6 border border-orange-100 text-center">
              <div className="text-3xl font-bold text-[#F97316] mb-2">30+</div>
              <div className="text-sm text-neutral-600">Evenementen</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl p-6 border border-orange-100 text-center">
              <div className="text-3xl font-bold text-[#F97316] mb-2">24u</div>
              <div className="text-sm text-neutral-600">Vaak beschikbaar</div>
            </div>
          </div>

          {/* USPs Section */}
          <div className="bg-gradient-to-br from-neutral-50 to-white rounded-2xl p-8 mb-12 border border-neutral-200">
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
                <span className="pt-1">Vaak binnen 24 uur personeel beschikbaar, zelfs voor spoedsituaties</span>
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
              Van binnenstad tot Leidsche Rijn, van studentenwijken tot zakencentra - wij leveren overal:
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

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C] rounded-2xl p-8 text-center text-white mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Personeel nodig in Utrecht?
            </h2>
            <p className="text-lg mb-6 text-white/90">
              {location.ctaText}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/personeel-aanvragen"
                className="bg-white text-[#F97316] px-8 py-3 rounded-lg font-semibold hover:bg-neutral-100 transition-colors"
              >
                Personeel aanvragen
              </Link>
              <Link
                href="/contact"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                Contact opnemen
              </Link>
            </div>
          </div>

          {/* Related Cities - Manual Amsterdam & Rotterdam Cards */}
          <div className="border-t border-neutral-200 pt-8">
            <h3 className="text-2xl font-bold text-neutral-900 mb-6 text-center">
              Ook actief in andere steden
            </h3>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Link
                href="/locaties/amsterdam"
                className="group bg-white rounded-xl p-6 border border-neutral-200 hover:border-[#F97316] hover:shadow-lg transition-all"
              >
                <h4 className="text-xl font-bold text-neutral-900 mb-2 group-hover:text-[#F97316]">
                  Amsterdam
                </h4>
                <p className="text-neutral-600 text-sm mb-3">
                  Horeca personeel Amsterdam voor restaurants, hotels en evenementen.
                </p>
                <div className="flex gap-4 text-xs text-neutral-500">
                  <span>🍽️ 40+ restaurants</span>
                  <span>🏨 25+ hotels</span>
                  <span>🎉 50+ events</span>
                </div>
              </Link>

              <Link
                href="/locaties/rotterdam"
                className="group bg-white rounded-xl p-6 border border-neutral-200 hover:border-[#F97316] hover:shadow-lg transition-all"
              >
                <h4 className="text-xl font-bold text-neutral-900 mb-2 group-hover:text-[#F97316]">
                  Rotterdam
                </h4>
                <p className="text-neutral-600 text-sm mb-3">
                  Flexibel horeca personeel Rotterdam voor restaurants, hotels en evenementen.
                </p>
                <div className="flex gap-4 text-xs text-neutral-500">
                  <span>🍽️ 30+ restaurants</span>
                  <span>🏨 20+ hotels</span>
                  <span>🎉 40+ events</span>
                </div>
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
        </div>
      </div>
    </>
  );
}
