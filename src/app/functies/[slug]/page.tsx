import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllFunctieSlugs, getFunctie, getAllFuncties } from "@/data/functies";
import { getPublishedGeoContentForFunctie } from "@/lib/geo/engine";
import { GEO_STEDEN } from "@/lib/geo/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllFunctieSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const functie = getFunctie(slug);

  if (!functie) {
    return { title: "Pagina niet gevonden" };
  }

  return {
    title: {
      absolute: `${functie.title} | TopTalent Jobs`,
    },
    description: functie.metaDescription,
    alternates: {
      canonical: `https://www.toptalentjobs.nl/functies/${functie.slug}/`,
    },
    openGraph: {
      title: `${functie.title} | TopTalent Jobs`,
      description: functie.metaDescription,
      type: "website",
      url: `https://www.toptalentjobs.nl/functies/${functie.slug}/`,
      siteName: "TopTalent Jobs",
      locale: "nl_NL",
    },
  };
}

export const revalidate = 86400; // 24h ISR

const dienstLabels: Record<string, string> = {
  uitzenden: "Uitzenden",
  detachering: "Detachering",
  recruitment: "Recruitment",
};

export default async function FunctiePage({ params }: PageProps) {
  const { slug } = await params;
  const functie = getFunctie(slug);

  if (!functie) {
    notFound();
  }

  const allFuncties = getAllFuncties();
  const relatedFuncties = functie.relatedFunctions
    .map((s) => getFunctie(s))
    .filter(Boolean);

  // Haal gepubliceerde geo-content op die relevant is voor deze functie
  const geoLinks = await getPublishedGeoContentForFunctie(functie.functieNaam);

  const naam = functie.functieNaam;
  const pageUrl = `https://www.toptalentjobs.nl/functies/${functie.slug}/`;

  // --- Structured Data ---
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: functie.h1,
    description: functie.definition,
    url: pageUrl,
    serviceType: `${naam.charAt(0).toUpperCase() + naam.slice(1)} inhuren`,
    provider: {
      "@type": "EmploymentAgency",
      name: "TopTalent Jobs",
      url: "https://www.toptalentjobs.nl/",
      telephone: "+31617177939",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Kanaalstraat 15",
        addressLocality: "Utrecht",
        postalCode: "3531 CJ",
        addressCountry: "NL",
      },
    },
    areaServed: {
      "@type": "Country",
      name: "Nederland",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: functie.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.toptalentjobs.nl/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Functies",
        item: "https://www.toptalentjobs.nl/functies/",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: functie.title.split(" — ")[0],
        item: pageUrl,
      },
    ],
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="min-h-screen bg-white">
        {/* Breadcrumbs */}
        <nav className="max-w-4xl mx-auto px-4 pt-6 pb-2" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-neutral-500">
            <li>
              <Link href="/" className="hover:text-blue-600">Home</Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/functies/" className="hover:text-blue-600">Functies</Link>
            </li>
            <li>/</li>
            <li className="text-neutral-900 font-medium truncate max-w-[250px]">
              {functie.title.split(" — ")[0]}
            </li>
          </ol>
        </nav>

        {/* Hero / Header */}
        <header className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {functie.availableVia.map((dienst) => (
              <Link
                key={dienst}
                href={`/diensten/${dienst}/`}
                className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
              >
                {dienstLabels[dienst]}
              </Link>
            ))}
            <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
              {functie.hourlyRateRange} / uur
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 leading-tight mb-4">
            {functie.h1}
          </h1>
          <p className="text-lg text-neutral-600 leading-relaxed">
            {functie.intro}
          </p>
        </header>

        {/* Definitieblok — zichtbaar voor zoekmachines en AI */}
        <section className="max-w-4xl mx-auto px-4 pb-10">
          <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-xl p-5">
            <p className="text-neutral-800 leading-relaxed">
              {functie.definition}
            </p>
            <ul className="mt-3 space-y-1">
              {functie.keyFacts.map((fact, i) => (
                <li key={i} className="text-sm text-neutral-600 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5 shrink-0">&#10003;</span>
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Wanneer inhuren */}
        <section className="max-w-4xl mx-auto px-4 pb-10">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">
            Wanneer {naam} inhuren?
          </h2>
          <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6">
            <ul className="space-y-3">
              {functie.whenToHire.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-neutral-700">
                  <span className="mt-1 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Taken & Verantwoordelijkheden */}
        <section className="max-w-4xl mx-auto px-4 pb-10">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">
            Taken en verantwoordelijkheden
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {functie.responsibilities.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 bg-white rounded-xl border border-neutral-200"
              >
                <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-neutral-700 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Vaardigheden & Eisen */}
        <section className="max-w-4xl mx-auto px-4 pb-10">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">
            Gevraagde vaardigheden
          </h2>
          <div className="bg-gradient-to-br from-neutral-50 to-blue-50/30 rounded-2xl border border-neutral-200 p-6">
            <ul className="space-y-2">
              {functie.skills.map((skill, i) => (
                <li key={i} className="flex items-start gap-2 text-neutral-700">
                  <span className="text-blue-500 mt-1">&#8226;</span>
                  {skill}
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-neutral-200 text-sm text-neutral-500">
              <strong className="text-neutral-700">Ervaring:</strong> {functie.experienceRequired}
            </div>
          </div>
        </section>

        {/* Kosten / Tarieven blok */}
        <section className="max-w-4xl mx-auto px-4 pb-10">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">
            Wat kost {naam} inhuren?
          </h2>
          <div className="bg-blue-600 text-white rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-blue-100 text-sm mb-1">Uurtarief indicatie</p>
                <p className="text-3xl font-bold">{functie.hourlyRateRange}</p>
                <p className="text-blue-200 text-sm mt-1">Per uur, inclusief werkgeverslasten</p>
              </div>
              <Link
                href="/kosten-calculator/"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors text-center"
              >
                Bereken exacte kosten
              </Link>
            </div>
          </div>
        </section>

        {/* Beschikbaar via (diensten) */}
        <section className="max-w-4xl mx-auto px-4 pb-10">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">
            Hoe kunt u een {naam} inhuren?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {functie.availableVia.map((dienst) => (
              <Link
                key={dienst}
                href={`/diensten/${dienst}/`}
                className="p-5 bg-white rounded-xl border border-neutral-200 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <h3 className="font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors mb-2">
                  {dienstLabels[dienst]}
                </h3>
                <p className="text-sm text-neutral-500">
                  {dienst === "uitzenden" && "Tijdelijke inzet — flexibel op- en afschalen"}
                  {dienst === "detachering" && "Langdurige plaatsing — geen werkgeversrisico"}
                  {dienst === "recruitment" && "Vast personeel — werving en selectie"}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">
            Veelgestelde vragen over {naam} inhuren
          </h2>
          <div className="space-y-3">
            {functie.faqs.map((faq, idx) => (
              <details
                key={idx}
                className="group bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none font-semibold text-neutral-900 hover:bg-neutral-100 transition-colors">
                  {faq.question}
                  <svg
                    className="w-5 h-5 text-neutral-400 group-open:rotate-180 transition-transform shrink-0 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-4 text-neutral-700 leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA + trust signals */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 md:p-12 text-white text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Direct een {naam} inhuren?
            </h2>
            <p className="text-blue-100 mb-6 max-w-xl mx-auto">
              TopTalent Jobs levert ervaren horecapersoneel, meestal binnen 24 uur.
              Vraag vandaag nog vrijblijvend personeel aan.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/personeel-aanvragen/"
                className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors"
              >
                Personeel aanvragen
              </Link>
              <Link
                href="/contact/"
                className="px-6 py-3 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
              >
                Contact opnemen
              </Link>
            </div>
            {/* Trust signals */}
            <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-white/20 text-sm text-blue-100 flex-wrap">
              <span>WAADI-geregistreerd</span>
              <span>500+ tevreden klanten</span>
              <span>Vervanging binnen 2 uur</span>
            </div>
          </div>
        </section>

        {/* Gerelateerde functies */}
        {relatedFuncties.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 pb-12">
            <h2 className="text-xl font-bold text-neutral-900 mb-4">
              Gerelateerde functies
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {relatedFuncties.map((rel) => rel && (
                <Link
                  key={rel.slug}
                  href={`/functies/${rel.slug}/`}
                  className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <span className="font-semibold text-sm text-blue-600 group-hover:text-blue-700">
                    {rel.title.split(" — ")[0]}
                  </span>
                  <p className="text-xs text-neutral-500 mt-1">{rel.hourlyRateRange} / uur</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Beschikbaar per regio — dynamische geo-content links + locatiepagina's */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-bold text-neutral-900 mb-3">
            {naam.charAt(0).toUpperCase() + naam.slice(1)} inhuren per regio
          </h2>
          <p className="text-sm text-neutral-600 mb-5">
            Lees meer over het inhuren van een {naam} in uw regio. TopTalent Jobs levert {naam}en in Amsterdam, Utrecht, Rotterdam, Den Haag en Eindhoven.
          </p>

          {/* Geo-content links (dynamisch uit Supabase) */}
          {geoLinks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {geoLinks.map((geo) => {
                const stadInfo = GEO_STEDEN[geo.stad as keyof typeof GEO_STEDEN];
                const stadNaam = stadInfo?.naam || geo.stad;
                return (
                  <Link
                    key={geo.slug}
                    href={`/geo/${geo.slug}/`}
                    className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200 hover:border-blue-400 hover:bg-blue-100 transition-colors group"
                  >
                    <span className="text-blue-600 font-semibold text-sm group-hover:text-blue-700">
                      {naam.charAt(0).toUpperCase() + naam.slice(1)} inhuren in {stadNaam}
                    </span>
                    <svg className="w-4 h-4 text-blue-400 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7-7" />
                    </svg>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Locatiepagina links (altijd zichtbaar als fallback) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {[
              { href: "/locaties/amsterdam/", city: "Amsterdam" },
              { href: "/locaties/utrecht/", city: "Utrecht" },
              { href: "/locaties/rotterdam/", city: "Rotterdam" },
              { href: "/locaties/den-haag/", city: "Den Haag" },
              { href: "/locaties/eindhoven/", city: "Eindhoven" },
            ].map((loc) => (
              <Link
                key={loc.href}
                href={loc.href}
                className="p-3 rounded-lg border border-neutral-200 bg-neutral-50 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
              >
                <span className="text-sm font-medium text-neutral-700 hover:text-blue-600">
                  {naam.charAt(0).toUpperCase() + naam.slice(1)} in {loc.city}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Interne links naar diensten & overig */}
        <section className="max-w-4xl mx-auto px-4 pb-16">
          <h2 className="text-xl font-bold text-neutral-900 mb-4">
            Meer over horecapersoneel
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/diensten/"
              className="flex items-center gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <span className="text-blue-600 font-semibold text-sm">Alle diensten</span>
            </Link>
            <Link
              href="/locaties/"
              className="flex items-center gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <span className="text-blue-600 font-semibold text-sm">Locaties in Nederland</span>
            </Link>
            <Link
              href="/kosten-calculator/"
              className="flex items-center gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <span className="text-blue-600 font-semibold text-sm">Kosten berekenen</span>
            </Link>
            <Link
              href="/veelgestelde-vragen/"
              className="flex items-center gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <span className="text-blue-600 font-semibold text-sm">Veelgestelde vragen</span>
            </Link>
          </div>
        </section>

        {/* Overzicht alle functies (interne links + thin content preventie) */}
        <section className="max-w-4xl mx-auto px-4 pb-16">
          <h2 className="text-xl font-bold text-neutral-900 mb-4">
            Alle functies die wij leveren
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {allFuncties.map((f) => (
              <Link
                key={f.slug}
                href={`/functies/${f.slug}/`}
                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                  f.slug === functie.slug
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {f.title.split(" — ")[0]}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
