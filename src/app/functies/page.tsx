import { Metadata } from "next";
import Link from "next/link";
import { getAllFuncties } from "@/data/functies";

export const metadata: Metadata = {
  title: {
    absolute: "Horecapersoneel Inhuren per Functie | TopTalent Jobs",
  },
  description:
    "Alle horecafuncties van TopTalent Jobs: koks, bediening, barista's, barmannen, catering en event managers. Binnen 24 uur beschikbaar.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/functies/",
  },
  openGraph: {
    title: "Horecapersoneel Inhuren per Functie | TopTalent Jobs",
    description:
      "Alle horecafuncties van TopTalent Jobs: koks, bediening, barista's, barmannen, catering en event managers. Binnen 24 uur beschikbaar.",
    type: "website",
    url: "https://www.toptalentjobs.nl/functies/",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
  },
};

export const revalidate = 86400;

const dienstLabels: Record<string, string> = {
  uitzenden: "Uitzenden",
  detachering: "Detachering",
  recruitment: "Recruitment",
};

export default function FunctiesOverzichtPage() {
  const functies = getAllFuncties();

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
    ],
  };

  return (
    <>
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
            <li className="text-neutral-900 font-medium">Functies</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 leading-tight mb-4">
            Horecapersoneel inhuren per functie
          </h1>
          <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl">
            TopTalent Jobs levert ervaren horecapersoneel voor elke functie in uw keuken, bediening of evenement.
            Bekijk hieronder alle functies die wij leveren — meestal binnen 24 uur beschikbaar.
          </p>
        </header>

        {/* Functies grid */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {functies.map((functie) => (
              <Link
                key={functie.slug}
                href={`/functies/${functie.slug}/`}
                className="p-6 bg-white rounded-2xl border border-neutral-200 hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <h2 className="text-lg font-bold text-neutral-900 group-hover:text-blue-600 transition-colors mb-2">
                  {functie.title.split(" — ")[0]}
                </h2>
                <p className="text-sm text-neutral-600 leading-relaxed mb-3 line-clamp-2">
                  {functie.metaDescription}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                    {functie.hourlyRateRange} / uur
                  </span>
                  {functie.availableVia.map((dienst) => (
                    <span
                      key={dienst}
                      className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 text-xs"
                    >
                      {dienstLabels[dienst]}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 pb-16">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 md:p-12 text-white text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Staat uw functie er niet bij?
            </h2>
            <p className="text-blue-100 mb-6 max-w-xl mx-auto">
              TopTalent Jobs levert ook personeel voor andere horecafuncties.
              Neem contact op en we zoeken de juiste match voor u.
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
          </div>
        </section>
      </main>
    </>
  );
}
