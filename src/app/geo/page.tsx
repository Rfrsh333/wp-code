import { Metadata } from "next";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { GEO_STEDEN, GEO_CONTENT_TYPES } from "@/lib/geo/types";
import type { GeoContent } from "@/lib/geo/types";

export const metadata: Metadata = {
  title: "Horeca Personeel in de Randstad | TopTalent Jobs",
  description:
    "Vind betrouwbaar horeca personeel in Amsterdam, Rotterdam, Den Haag en Utrecht. TopTalent Jobs is jouw partner voor uitzenden, detachering en recruitment in de horeca.",
  alternates: {
    canonical: "https://toptalentjobs.nl/geo",
  },
};

async function getPublishedContent(): Promise<GeoContent[]> {
  const { data } = await supabaseAdmin
    .from("geo_content")
    .select("*")
    .eq("status", "gepubliceerd")
    .order("stad")
    .order("content_type")
    .order("updated_at", { ascending: false });

  return (data || []) as GeoContent[];
}

export default async function GeoIndexPage() {
  const content = await getPublishedContent();

  // Groepeer per stad
  const perStad = new Map<string, GeoContent[]>();
  for (const item of content) {
    const list = perStad.get(item.stad) || [];
    list.push(item);
    perStad.set(item.stad, list);
  }

  const steden = Object.entries(GEO_STEDEN);

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* Header */}
      <section className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">
            Horeca personeel in de Randstad
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl">
            TopTalent Jobs is actief in Amsterdam, Rotterdam, Den Haag en Utrecht.
            Ontdek onze gidsen, veelgestelde vragen en marktinzichten per stad.
          </p>
        </div>
      </section>

      {/* Content per stad */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        {steden.map(([stadSlug, stadInfo]) => {
          const stadContent = perStad.get(stadSlug) || [];

          return (
            <section key={stadSlug} className="mb-12">
              <h2 className="text-2xl font-bold text-neutral-900 mb-1">
                {stadInfo.naam}
              </h2>
              <p className="text-sm text-neutral-500 mb-5">
                {stadInfo.regio} — {stadContent.length} artikel{stadContent.length !== 1 ? "en" : ""}
              </p>

              {stadContent.length === 0 ? (
                <div className="bg-white rounded-xl p-6 border border-neutral-200 text-center text-neutral-400 text-sm">
                  Binnenkort beschikbaar
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stadContent.map((item) => {
                    const typeInfo = GEO_CONTENT_TYPES[item.content_type as keyof typeof GEO_CONTENT_TYPES];
                    return (
                      <Link
                        key={item.id}
                        href={`/geo/${item.slug}`}
                        className="bg-white rounded-xl p-5 border border-neutral-200 hover:border-blue-300 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">
                            {typeInfo?.label || item.content_type}
                          </span>
                          {item.faq_items && item.faq_items.length > 0 && (
                            <span className="text-[10px] text-neutral-400">
                              {item.faq_items.length} FAQs
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-neutral-900 group-hover:text-blue-700 transition-colors mb-1">
                          {item.title}
                        </h3>
                        {item.excerpt && (
                          <p className="text-sm text-neutral-500 line-clamp-2">
                            {item.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-3 text-xs text-neutral-400">
                          <time>
                            {new Date(item.gepubliceerd_op || item.created_at).toLocaleDateString("nl-NL")}
                          </time>
                          <span>•</span>
                          <span>{item.primary_keywords?.slice(0, 2).join(", ")}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* CTA */}
      <section className="bg-white border-t border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-neutral-900 mb-3">
            Direct horeca personeel nodig?
          </h2>
          <p className="text-neutral-600 mb-6 max-w-lg mx-auto">
            Neem contact op met TopTalent Jobs voor betrouwbaar horeca personeel in de Randstad.
          </p>
          <Link
            href="/personeel-aanvragen"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Personeel aanvragen
          </Link>
        </div>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Horeca Personeel in de Randstad",
            description: "Gidsen en informatie over horeca personeel in Amsterdam, Rotterdam, Den Haag en Utrecht.",
            url: "https://toptalentjobs.nl/geo",
            publisher: {
              "@type": "Organization",
              name: "TopTalent Jobs",
              url: "https://toptalentjobs.nl",
            },
          }),
        }}
      />
    </main>
  );
}
