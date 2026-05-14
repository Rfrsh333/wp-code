import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedGeoContent } from "@/lib/geo/engine";
import { buildAllStructuredData } from "@/lib/geo/structured-data";
import { GEO_STEDEN, GEO_CONTENT_TYPES } from "@/lib/geo/types";
import Link from "next/link";
import Section from "@/components/Section";
import {
  ScrollReveal,
  FAQAccordion,
  FAQSchemaFallback,
} from "@/components/geo/GeoAnimations";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const content = await getPublishedGeoContent(slug);

  if (!content) {
    return { title: "Pagina niet gevonden" };
  }

  return {
    title: content.seo_title || content.title,
    description: content.meta_description || content.excerpt || undefined,
    keywords: [
      ...(content.primary_keywords || []),
      ...(content.secondary_keywords || []),
    ],
    alternates: {
      canonical: `https://www.toptalentjobs.nl/geo/${content.slug}/`,
    },
    openGraph: {
      title: content.title,
      description: content.meta_description || content.excerpt || undefined,
      type: "article",
      url: `https://www.toptalentjobs.nl/geo/${content.slug}/`,
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
  const typeInfo =
    GEO_CONTENT_TYPES[
      content.content_type as keyof typeof GEO_CONTENT_TYPES
    ];

  const schemas = buildAllStructuredData(content);
  const sections = parseMarkdownSections(content.body_markdown);

  return (
    <>
      {schemas.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <main className="min-h-screen bg-white">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
          {/* Decorative circles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-white/5" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full border border-[#F97316]/10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#F97316]/[0.03]" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 pt-12 pb-16 md:pt-16 md:pb-20 lg:pt-20 lg:pb-24">
            {/* Breadcrumbs */}
            <nav className="mb-8" aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-sm text-neutral-400">
                <li>
                  <Link
                    href="/"
                    className="hover:text-white transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li className="text-neutral-600">/</li>
                <li>
                  <Link
                    href={`/locaties/${content.stad}/`}
                    className="hover:text-white transition-colors"
                  >
                    {stadNaam}
                  </Link>
                </li>
                <li className="text-neutral-600">/</li>
                <li className="text-neutral-300 truncate max-w-[200px]">
                  {content.title}
                </li>
              </ol>
            </nav>

            {/* Badges */}
            <div className="flex items-center gap-2 mb-5">
              <span className="px-3 py-1 rounded-full bg-[#F97316]/10 text-[#F97316] text-xs font-semibold border border-[#F97316]/20">
                {typeInfo?.label || content.content_type}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 text-neutral-300 text-xs font-semibold border border-white/10">
                {stadNaam} • {stadInfo?.regio}
              </span>
            </div>

            {/* H1 */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-5 max-w-3xl">
              {content.title}
            </h1>

            {/* Excerpt */}
            {content.excerpt && (
              <p className="text-lg text-neutral-300 leading-relaxed max-w-2xl mb-8">
                {content.excerpt}
              </p>
            )}

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link
                href="/personeel-aanvragen/"
                className="inline-flex items-center justify-center px-7 py-3.5 bg-[#F97316] text-white font-semibold rounded-xl hover:bg-[#EA580C] transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5"
              >
                Personeel aanvragen
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
              <Link
                href="/contact/"
                className="inline-flex items-center justify-center px-7 py-3.5 border-2 border-white/20 text-white font-semibold rounded-xl hover:bg-white/5 hover:border-white/30 transition-all duration-300"
              >
                Contact opnemen
              </Link>
            </div>

            {/* Trust signals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  icon: "⚡",
                  text: "Binnen 24 uur personeel",
                },
                {
                  icon: "✓",
                  text: "WAADI-geregistreerd",
                },
                {
                  icon: "★",
                  text: "500+ tevreden klanten",
                },
                {
                  icon: "↻",
                  text: "Flexibel inzetbaar",
                },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10"
                >
                  <span className="w-7 h-7 rounded-full bg-[#F97316]/10 flex items-center justify-center text-xs shrink-0">
                    {item.icon}
                  </span>
                  <span className="text-xs sm:text-sm text-neutral-300 font-medium">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Statistieken bar ── */}
        {content.statistieken && content.statistieken.length > 0 && (
          <section className="border-b border-neutral-100 bg-neutral-50">
            <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {content.statistieken.map(
                  (
                    stat: { stat: string; bron: string; jaar: number },
                    idx: number,
                  ) => (
                    <ScrollReveal
                      key={idx}
                      delay={0.1 * idx}
                      direction="up"
                    >
                      <div className="text-center sm:text-left">
                        <p className="text-lg font-bold text-neutral-900">
                          {stat.stat}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {stat.bron} ({stat.jaar})
                        </p>
                      </div>
                    </ScrollReveal>
                  ),
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Body content — rendered as premium sections ── */}
        {sections.map((section, idx) => {
          const isEven = idx % 2 === 0;
          const variant = isEven ? "white" : "tinted";

          return (
            <Section
              key={idx}
              variant={variant as "white" | "tinted"}
              spacing="small"
            >
              <Section.Container narrow>
                <ScrollReveal delay={0.1} direction="up">
                  <article>
                    {section.heading && (
                      <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 leading-tight mb-6 tracking-tight">
                        {section.heading}
                      </h2>
                    )}
                    <div
                      className="prose prose-neutral prose-lg max-w-none
                        prose-headings:text-neutral-900 prose-headings:font-bold prose-headings:tracking-tight
                        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                        prose-p:text-neutral-600 prose-p:leading-relaxed
                        prose-a:text-[#F97316] prose-a:no-underline hover:prose-a:underline prose-a:font-medium
                        prose-strong:text-neutral-800
                        prose-ul:my-4 prose-li:text-neutral-600
                        prose-ol:my-4
                        prose-table:rounded-xl prose-table:overflow-hidden
                        prose-th:bg-neutral-50 prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold prose-th:text-neutral-900 prose-th:border-b prose-th:border-neutral-200
                        prose-td:px-4 prose-td:py-3 prose-td:border-b prose-td:border-neutral-100"
                      dangerouslySetInnerHTML={{
                        __html: markdownToHtml(section.content),
                      }}
                    />
                  </article>
                </ScrollReveal>
              </Section.Container>
            </Section>
          );
        })}

        {/* ── FAQ ── */}
        {content.faq_items && content.faq_items.length > 0 && (
          <Section variant="white" spacing="default">
            <Section.Container narrow>
              <ScrollReveal direction="up">
                <Section.Header
                  eyebrow="Veelgestelde vragen"
                  title={`FAQ — ${content.title.split("—")[0].trim()}`}
                  accentLine
                  align="center"
                />
              </ScrollReveal>
              <FAQAccordion items={content.faq_items} />
              {/* Hidden fallback for crawlers */}
              <FAQSchemaFallback items={content.faq_items} />
            </Section.Container>
          </Section>
        )}

        {/* ── CTA ── */}
        <Section variant="white" spacing="default">
          <Section.Container>
            <ScrollReveal direction="up">
              <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-3xl p-8 md:p-12 lg:p-16 text-center text-white relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 w-40 h-40 border border-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute bottom-0 right-0 w-60 h-60 border border-white/10 rounded-full translate-x-1/3 translate-y-1/3" />
                </div>

                <div className="relative z-10 max-w-3xl mx-auto">
                  {/* Pulse dot */}
                  <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Direct beschikbaar in {stadNaam}
                  </div>

                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                    Horeca personeel nodig in {stadNaam}?
                  </h2>
                  <p className="text-white/85 mb-8 text-lg max-w-xl mx-auto">
                    TopTalent Jobs levert betrouwbaar en ervaren horeca
                    personeel, vaak binnen 24 uur. Neem vandaag nog contact op.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/personeel-aanvragen/"
                      className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#F97316] font-bold rounded-xl hover:bg-orange-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                      Personeel aanvragen
                      <svg
                        className="w-4 h-4 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </Link>
                    <Link
                      href="/contact/"
                      className="inline-flex items-center justify-center px-8 py-4 border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 hover:border-white/50 transition-all duration-300"
                    >
                      Contact opnemen
                    </Link>
                  </div>

                  <p className="text-white/60 text-sm mt-6">
                    Geen verplichtingen • Binnen 24 uur reactie • WAADI-geregistreerd
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </Section.Container>
        </Section>

        {/* ── Populaire functies ── */}
        <Section variant="tinted" spacing="default">
          <Section.Container>
            <ScrollReveal direction="up">
              <Section.Header
                eyebrow="Horecafuncties"
                title={`Populaire functies in ${stadNaam}`}
                subtitle={`TopTalent Jobs levert in ${stadNaam} flexibel horecapersoneel voor diverse functies.`}
                accentLine
                align="center"
              />
            </ScrollReveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  href: "/functies/kok-inhuren/",
                  label: "Kok inhuren",
                  desc: `Ervaren koks in ${stadNaam}`,
                  icon: "👨‍🍳",
                },
                {
                  href: "/functies/bediening-inhuren/",
                  label: "Bediening inhuren",
                  desc: `Obers & serveersters in ${stadNaam}`,
                  icon: "🍽️",
                },
                {
                  href: "/functies/barista-inhuren/",
                  label: "Barista inhuren",
                  desc: `Barista's in ${stadNaam}`,
                  icon: "☕",
                },
                {
                  href: "/functies/barman-inhuren/",
                  label: "Barman inhuren",
                  desc: `Barpersoneel in ${stadNaam}`,
                  icon: "🍸",
                },
                {
                  href: "/functies/catering-medewerker-inhuren/",
                  label: "Catering medewerker",
                  desc: "Cateringpersoneel op locatie",
                  icon: "🥘",
                },
                {
                  href: "/functies/",
                  label: "Alle functies bekijken",
                  desc: "Bekijk ons volledige aanbod",
                  icon: "→",
                  accent: true,
                },
              ].map((item, idx) => (
                <ScrollReveal key={item.href} delay={0.05 * idx} direction="up">
                  <Link
                    href={item.href}
                    className={`group flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 h-full ${
                      (item as { accent?: boolean }).accent
                        ? "bg-[#F97316]/5 border-[#F97316]/20 hover:bg-[#F97316]/10 hover:border-[#F97316]/40"
                        : "bg-white border-neutral-100 hover:border-[#F97316]/30 hover:shadow-lg hover:-translate-y-1"
                    }`}
                  >
                    <span className="w-10 h-10 rounded-xl bg-neutral-50 group-hover:bg-orange-50 flex items-center justify-center text-lg shrink-0 transition-colors">
                      {item.icon}
                    </span>
                    <div>
                      <span className="font-semibold text-neutral-900 group-hover:text-[#F97316] transition-colors block">
                        {item.label}
                      </span>
                      <span className="text-sm text-neutral-500">
                        {item.desc}
                      </span>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </Section.Container>
        </Section>

        {/* ── Gerelateerde diensten & locaties ── */}
        <Section variant="white" spacing="small">
          <Section.Container>
            <ScrollReveal direction="up">
              <Section.Header
                eyebrow="Meer ontdekken"
                title={`Horecapersoneel in ${stadNaam}`}
                accentLine
                align="center"
              />
            </ScrollReveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  href: `/locaties/${content.stad}/`,
                  label: `Horecapersoneel in ${stadNaam}`,
                  desc: "Overzicht van onze diensten in de regio",
                  icon: "📍",
                },
                {
                  href: `/locaties/${content.stad}/uitzenden/`,
                  label: `Uitzenden in ${stadNaam}`,
                  desc: "Flexibele horeca uitzendkrachten",
                  icon: "⏱️",
                },
                {
                  href: "/diensten/uitzenden/",
                  label: "Horecapersoneel uitzenden",
                  desc: "Meer over onze uitzenddienst",
                  icon: "🤝",
                },
                {
                  href: "/diensten/detachering/",
                  label: "Horeca detachering",
                  desc: "Langdurige plaatsing zonder risico",
                  icon: "📋",
                },
              ].map((item, idx) => (
                <ScrollReveal key={item.href} delay={0.05 * idx} direction="up">
                  <Link
                    href={item.href}
                    className="group flex items-center gap-4 p-5 bg-neutral-50 rounded-2xl border border-neutral-100 hover:border-[#F97316]/30 hover:bg-white hover:shadow-lg transition-all duration-300"
                  >
                    <span className="w-10 h-10 rounded-xl bg-white group-hover:bg-orange-50 flex items-center justify-center text-lg shrink-0 border border-neutral-200 group-hover:border-[#F97316]/20 transition-colors">
                      {item.icon}
                    </span>
                    <div>
                      <span className="font-semibold text-neutral-900 group-hover:text-[#F97316] transition-colors block text-sm">
                        {item.label}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {item.desc}
                      </span>
                    </div>
                    <svg
                      className="w-5 h-5 text-neutral-300 group-hover:text-[#F97316] ml-auto shrink-0 transition-colors"
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
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </Section.Container>
        </Section>

        {/* ── Bronnen ── */}
        {content.bronnen && content.bronnen.length > 0 && (
          <section className="border-t border-neutral-100">
            <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                Bronnen
              </h3>
              <ul className="flex flex-wrap gap-x-6 gap-y-1">
                {content.bronnen.map(
                  (
                    bron: {
                      title: string;
                      url?: string;
                      type?: string;
                    },
                    idx: number,
                  ) => (
                    <li key={idx} className="text-sm text-neutral-500">
                      {bron.url ? (
                        <a
                          href={bron.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[#F97316] transition-colors"
                        >
                          {bron.title}
                        </a>
                      ) : (
                        bron.title
                      )}
                      {bron.type && (
                        <span className="text-neutral-300 ml-1">
                          ({bron.type})
                        </span>
                      )}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Utilities — markdown parsing + HTML conversion
   ───────────────────────────────────────────────────────────────────────────── */

interface MarkdownSection {
  heading: string | null;
  content: string;
}

/** Split markdown on H2 boundaries into discrete sections */
function parseMarkdownSections(markdown: string): MarkdownSection[] {
  if (!markdown) return [];

  const lines = markdown.split("\n");
  const sections: MarkdownSection[] = [];
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/);
    if (h2Match) {
      if (currentLines.length > 0 || currentHeading) {
        sections.push({
          heading: currentHeading,
          content: currentLines.join("\n").trim(),
        });
      }
      currentHeading = h2Match[1];
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0 || currentHeading) {
    sections.push({
      heading: currentHeading,
      content: currentLines.join("\n").trim(),
    });
  }

  return sections.filter((s) => s.content.length > 0 || s.heading);
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:")
  ) {
    return "#";
  }
  return url;
}

function sanitizeHtmlOutput(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(
      /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
      "",
    )
    .replace(
      /<\s*\/?\s*(iframe|object|embed|form|input|textarea|button)\b[^>]*>/gi,
      "",
    )
    .replace(
      /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
      "",
    );
}

function markdownToHtml(markdown: string): string {
  if (!markdown) return "";

  let html = markdown
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_, text, url) =>
        `<a href="${sanitizeUrl(url)}">${text}</a>`,
    )
    .replace(/^[*-] (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Table support
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match
        .split("|")
        .filter((c) => c.trim())
        .map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) return "<!--table-sep-->";
      return cells.map((c) => `<td>${c}</td>`).join("");
    })
    .replace(/^---$/gm, "<hr />")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />");

  html = `<p>${html}</p>`;

  html = html.replace(
    /(<li>.*?<\/li>(?:<br \/>)?)+/g,
    (match) => {
      const items = match.replace(/<br \/>/g, "");
      return `<ul>${items}</ul>`;
    },
  );

  // Wrap table rows
  html = html.replace(
    /(<td>.*?<\/td>)+/g,
    (match) => `<tr>${match}</tr>`,
  );
  html = html.replace(
    /(<tr>.*?<\/tr>(?:<!--table-sep-->)?<tr>.*?<\/tr>(?:<br \/>)?)+/g,
    (match) => {
      const cleaned = match
        .replace(/<!--table-sep-->/g, "")
        .replace(/<br \/>/g, "");
      const rows = cleaned.match(/<tr>.*?<\/tr>/g) || [];
      if (rows.length === 0) return match;
      const firstRow = rows[0];
      if (!firstRow) return match;
      const header = firstRow
        .replace(/<td>/g, "<th>")
        .replace(/<\/td>/g, "</th>");
      const body = rows.slice(1).join("");
      return `<table><thead>${header}</thead><tbody>${body}</tbody></table>`;
    },
  );

  html = html.replace(/<p>\s*<\/p>/g, "");
  html = html.replace(/<p>\s*<(h[1-3]|ul|ol|hr|table)/g, "<$1");
  html = html.replace(
    /<\/(h[1-3]|ul|ol|table)>\s*<\/p>/g,
    "</$1>",
  );

  return sanitizeHtmlOutput(html);
}
