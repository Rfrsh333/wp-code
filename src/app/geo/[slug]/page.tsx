import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedGeoContent } from "@/lib/geo/engine";
import { buildAllStructuredData } from "@/lib/geo/structured-data";
import { GEO_STEDEN } from "@/lib/geo/types";
import { GEO_CONTENT_TYPES } from "@/lib/geo/types";
import Link from "next/link";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const content = await getPublishedGeoContent(slug);

  if (!content) {
    return { title: "Pagina niet gevonden" };
  }

  const stadNaam = content.stad === "den-haag"
    ? "Den Haag"
    : content.stad.charAt(0).toUpperCase() + content.stad.slice(1);

  return {
    title: content.seo_title || content.title,
    description: content.meta_description || content.excerpt || undefined,
    keywords: [...(content.primary_keywords || []), ...(content.secondary_keywords || [])],
    alternates: {
      canonical: `https://toptalentjobs.nl/geo/${content.slug}`,
    },
    openGraph: {
      title: content.title,
      description: content.meta_description || content.excerpt || undefined,
      type: "article",
      url: `https://toptalentjobs.nl/geo/${content.slug}`,
      siteName: "TopTalent Jobs",
      locale: "nl_NL",
    },
  };
}

export default async function GeoPage({ params }: PageProps) {
  const { slug } = await params;
  const content = await getPublishedGeoContent(slug);

  if (!content) {
    notFound();
  }

  const stadKey = content.stad as keyof typeof GEO_STEDEN;
  const stadInfo = GEO_STEDEN[stadKey];
  const stadNaam = stadInfo?.naam || content.stad;
  const typeInfo = GEO_CONTENT_TYPES[content.content_type as keyof typeof GEO_CONTENT_TYPES];

  // Structured data
  const schemas = buildAllStructuredData(content);

  // Converteer markdown naar simpele HTML (basic)
  const bodyHtml = markdownToHtml(content.body_markdown);

  return (
    <>
      {/* JSON-LD Structured Data */}
      {schemas.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <main className="min-h-screen bg-white">
        {/* Breadcrumbs */}
        <nav className="max-w-4xl mx-auto px-4 pt-6 pb-2" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-neutral-500">
            <li>
              <Link href="/" className="hover:text-blue-600">Home</Link>
            </li>
            <li>/</li>
            <li>
              <Link href={`/geo?stad=${content.stad}`} className="hover:text-blue-600">
                {stadNaam}
              </Link>
            </li>
            <li>/</li>
            <li className="text-neutral-900 font-medium truncate max-w-[200px]">
              {content.title}
            </li>
          </ol>
        </nav>

        {/* Header */}
        <header className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
              {typeInfo?.label || content.content_type}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs font-semibold">
              {stadNaam}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 leading-tight mb-4">
            {content.title}
          </h1>
          {content.excerpt && (
            <p className="text-lg text-neutral-600 leading-relaxed">
              {content.excerpt}
            </p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-neutral-400">
            <time dateTime={content.gepubliceerd_op || content.created_at}>
              {new Date(content.gepubliceerd_op || content.created_at).toLocaleDateString("nl-NL", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span>TopTalent Jobs Redactie</span>
          </div>
        </header>

        {/* Body content */}
        <article className="max-w-4xl mx-auto px-4 pb-8">
          <div
            className="prose prose-neutral prose-lg max-w-none
              prose-headings:text-neutral-900 prose-headings:font-bold
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-neutral-700 prose-p:leading-relaxed
              prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-neutral-900
              prose-ul:my-4 prose-li:text-neutral-700
              prose-ol:my-4"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </article>

        {/* FAQ Section (apart gerenderd voor structured data) */}
        {content.faq_items && content.faq_items.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 pb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-6">
              Veelgestelde vragen
            </h2>
            <div className="space-y-4">
              {content.faq_items.map((faq, idx) => (
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
        )}

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 pb-16">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 md:p-12 text-white text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Horeca personeel nodig in {stadNaam}?
            </h2>
            <p className="text-blue-100 mb-6 max-w-xl mx-auto">
              TopTalent Jobs levert betrouwbaar en ervaren horeca personeel, vaak binnen 24 uur.
              Neem vandaag nog contact op voor een vrijblijvende offerte.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/personeel-aanvragen"
                className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors"
              >
                Personeel aanvragen
              </Link>
              <Link
                href="/contact"
                className="px-6 py-3 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
              >
                Contact opnemen
              </Link>
            </div>
          </div>
        </section>

        {/* Bronnen */}
        {content.bronnen && content.bronnen.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 pb-12">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
              Bronnen
            </h3>
            <ul className="space-y-1">
              {content.bronnen.map((bron, idx) => (
                <li key={idx} className="text-sm text-neutral-600">
                  {bron.url ? (
                    <a
                      href={bron.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {bron.title}
                    </a>
                  ) : (
                    bron.title
                  )}
                  {bron.type && (
                    <span className="ml-1 text-neutral-400">({bron.type})</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}

/**
 * Basic markdown to HTML converter
 * Handles headings, bold, italic, links, lists, paragraphs
 */
function markdownToHtml(markdown: string): string {
  if (!markdown) return "";

  let html = markdown
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Unordered lists
    .replace(/^[*-] (.+)$/gm, "<li>$1</li>")
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Horizontal rule
    .replace(/^---$/gm, "<hr />")
    // Line breaks / paragraphs
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />");

  // Wrap in paragraphs
  html = `<p>${html}</p>`;

  // Fix list items (wrap consecutive <li> in <ul>)
  html = html.replace(/(<li>.*?<\/li>(?:<br \/>)?)+/g, (match) => {
    const items = match.replace(/<br \/>/g, "");
    return `<ul>${items}</ul>`;
  });

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, "");
  html = html.replace(/<p>\s*<(h[1-3]|ul|ol|hr)/g, "<$1");
  html = html.replace(/<\/(h[1-3]|ul|ol)>\s*<\/p>/g, "</$1>");

  return html;
}
