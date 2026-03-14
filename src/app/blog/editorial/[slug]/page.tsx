import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Section, Container } from "@/components/Section";
import EditorialMarkdown from "@/components/blog/EditorialMarkdown";
import { BlogContentRenderer } from "@/components/blog/BlogContentRenderer";
import type { ContentBlock } from "@/components/blog/BlogContentRenderer";
import { buildEditorialMetadata } from "@/lib/content/publishing";
import { getGeneratedImageById, getPublishedDraftBySlug, listPublishedDrafts } from "@/lib/content/repository";
import { createEditorialImageSignedUrl } from "@/lib/images/storage";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const draft = await getPublishedDraftBySlug(slug);

  if (!draft) {
    return { title: "Artikel niet gevonden | TopTalent Jobs" };
  }

  return buildEditorialMetadata(draft);
}

function buildArticleJsonLd(draft: {
  title: string;
  excerpt: string;
  slug: string;
  publishedAt: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  keyTakeaways: string[];
}, heroImageUrl: string | null) {
  const articleUrl = `https://www.toptalentjobs.nl/blog/editorial/${draft.slug}`;

  const article: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: draft.seoTitle ?? draft.title,
    description: draft.metaDescription ?? draft.excerpt,
    url: articleUrl,
    publisher: {
      "@type": "Organization",
      name: "TopTalent Jobs",
      logo: {
        "@type": "ImageObject",
        url: "https://www.toptalentjobs.nl/logo.png",
      },
    },
    author: {
      "@type": "Organization",
      name: "TopTalent Jobs Redactie",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
  };

  if (draft.publishedAt) {
    article.datePublished = draft.publishedAt;
    article.dateModified = draft.publishedAt;
  }

  if (heroImageUrl) {
    article.image = heroImageUrl;
  }

  return article;
}

function buildFaqJsonLd(keyTakeaways: string[]) {
  if (keyTakeaways.length < 2) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: keyTakeaways.map((takeaway) => ({
      "@type": "Question",
      name: takeaway.endsWith("?") ? takeaway : `Wat betekent: ${takeaway}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: takeaway,
      },
    })),
  };
}

function buildBreadcrumbJsonLd(title: string, slug: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.toptalentjobs.nl" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.toptalentjobs.nl/blog" },
      { "@type": "ListItem", position: 3, name: "Editorial", item: "https://www.toptalentjobs.nl/blog/editorial" },
      { "@type": "ListItem", position: 4, name: title, item: `https://www.toptalentjobs.nl/blog/editorial/${slug}` },
    ],
  };
}

export default async function EditorialDraftPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const draft = await getPublishedDraftBySlug(slug);

  if (!draft) {
    notFound();
  }

  const heroImage = draft.heroImageId ? await getGeneratedImageById(draft.heroImageId) : null;
  const heroImageUrl =
    heroImage?.storagePathBranded
      ? await createEditorialImageSignedUrl(heroImage.storagePathBranded)
      : null;

  // Fetch related editorials
  const allPublished = await listPublishedDrafts(10);
  const relatedArticles = allPublished
    .filter((d) => d.slug !== slug)
    .slice(0, 2);

  const hasBodyBlocks = Array.isArray(draft.bodyBlocks) && draft.bodyBlocks.length > 0;
  const articleJsonLd = buildArticleJsonLd(draft, heroImageUrl);
  const faqJsonLd = buildFaqJsonLd(draft.keyTakeaways);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(draft.title, draft.slug);

  const publishedDate = draft.publishedAt
    ? new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(new Date(draft.publishedAt))
    : null;

  return (
    <>
      {/* Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      ) : null}

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-neutral-50 pb-12 pt-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <nav className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
            <Link href="/" className="transition-colors hover:text-[#F97316]">Home</Link>
            <span>/</span>
            <Link href="/blog" className="transition-colors hover:text-[#F97316]">Blog</Link>
            <span>/</span>
            <Link href="/blog/editorial" className="transition-colors hover:text-[#F97316]">Editorial</Link>
          </nav>

          <span className="mb-4 inline-block rounded-full bg-[#F97316] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
            {draft.primaryAudience ?? "Editorial"}
          </span>

          <h1 className="mb-6 text-3xl font-bold leading-tight text-neutral-900 md:text-4xl lg:text-5xl">
            {draft.title}
          </h1>

          <p className="mb-6 text-lg leading-8 text-neutral-600">{draft.excerpt}</p>

          <div className="flex items-center gap-6 text-sm text-neutral-500">
            <span className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              TopTalent Jobs Redactie
            </span>
            {publishedDate ? (
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {publishedDate}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {/* Featured Image */}
      {heroImageUrl ? (
        <div className="mx-auto -mt-4 mb-12 max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="relative aspect-[21/9] overflow-hidden rounded-2xl shadow-xl">
            <Image
              src={heroImageUrl}
              alt={heroImage?.altText ?? draft.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 90vw, 896px"
              className="object-cover"
              priority
              unoptimized
            />
          </div>
        </div>
      ) : null}

      {/* Article Content */}
      <Section variant="white" spacing="default">
        <Container>
          <div className="mx-auto max-w-3xl">
            <article>
              {hasBodyBlocks ? (
                <BlogContentRenderer blocks={draft.bodyBlocks as ContentBlock[]} />
              ) : (
                <EditorialMarkdown markdown={draft.bodyMarkdown} />
              )}
            </article>

            {/* Key Takeaways */}
            {draft.keyTakeaways.length > 0 ? (
              <div className="mt-10 rounded-2xl border border-orange-200 bg-orange-50 p-6">
                <h2 className="text-lg font-semibold text-neutral-900">Belangrijkste punten</h2>
                <ul className="mt-4 space-y-3 text-sm text-neutral-700">
                  {draft.keyTakeaways.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 text-[#F97316]">&#10003;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Sources */}
            {draft.sourceList.length > 0 ? (
              <div className="mt-8 rounded-2xl bg-neutral-50 p-6">
                <h2 className="text-lg font-semibold text-neutral-900">Bronnen</h2>
                <ul className="mt-4 space-y-3 text-sm text-neutral-700">
                  {draft.sourceList.map((source) => (
                    <li key={`${source.sourceName}-${source.url}`}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-[#F97316] underline-offset-2 hover:underline">
                        {source.sourceName}
                      </a>
                      <span className="ml-2 text-neutral-500">{source.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Fact Check Flags */}
            {draft.factCheckFlags.length > 0 ? (
              <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="text-lg font-semibold text-amber-900">Fact-check aandachtspunten</h2>
                <ul className="mt-4 space-y-2 text-sm text-amber-900">
                  {draft.factCheckFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Share Buttons */}
            <div className="mt-10 border-t border-neutral-200 pt-8">
              <p className="mb-4 text-sm font-medium text-neutral-600">Deel dit artikel:</p>
              <div className="flex gap-3">
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=https://www.toptalentjobs.nl/blog/editorial/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0077B5] text-white transition-opacity hover:opacity-90"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(draft.title + ' - https://www.toptalentjobs.nl/blog/editorial/' + slug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white transition-opacity hover:opacity-90"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(draft.title)}&body=${encodeURIComponent('Bekijk dit artikel: https://www.toptalentjobs.nl/blog/editorial/' + slug)}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-600 text-white transition-opacity hover:opacity-90"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Related Articles */}
      {relatedArticles.length > 0 ? (
        <Section variant="tinted" spacing="large">
          <Container>
            <h2 className="mb-8 text-center text-2xl font-bold text-neutral-900">
              Meer editorial artikelen
            </h2>
            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
              {relatedArticles.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/editorial/${related.slug}`}
                  className="group overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="p-6">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#F97316]">
                      {related.primaryAudience ?? "Editorial"}
                    </span>
                    <h3 className="mt-2 text-lg font-bold text-neutral-900 transition-colors group-hover:text-[#F97316]">
                      {related.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-neutral-500">{related.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}
