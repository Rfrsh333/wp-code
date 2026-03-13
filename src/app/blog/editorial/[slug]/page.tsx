import { notFound } from "next/navigation";
import Link from "next/link";
import EditorialMarkdown from "@/components/blog/EditorialMarkdown";
import { buildEditorialMetadata } from "@/lib/content/publishing";
import { getGeneratedImageById, getPublishedDraftBySlug } from "@/lib/content/repository";
import { createEditorialImageSignedUrl } from "@/lib/images/storage";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const draft = await getPublishedDraftBySlug(slug);

  if (!draft) {
    return { title: "Artikel niet gevonden | TopTalent Jobs" };
  }

  return buildEditorialMetadata(draft);
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

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-white to-neutral-50 px-4 pb-12 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <nav className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
            <Link href="/" className="transition hover:text-[#F27501]">Home</Link>
            <span>/</span>
            <Link href="/blog" className="transition hover:text-[#F27501]">Blog</Link>
            <span>/</span>
            <Link href="/blog/editorial" className="transition hover:text-[#F27501]">Editorial</Link>
          </nav>

          <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#F27501]">
            {draft.primaryAudience ?? "Editorial"}
          </span>
          <h1 className="mt-5 text-4xl font-bold text-neutral-900 md:text-5xl">{draft.title}</h1>
          <p className="mt-4 text-lg leading-8 text-neutral-600">{draft.excerpt}</p>
          <div className="mt-6 flex flex-wrap gap-6 text-sm text-neutral-500">
            <span>Gepubliceerd: {draft.publishedAt ? new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(new Date(draft.publishedAt)) : "Nog niet gepubliceerd"}</span>
            <span>Status: {draft.reviewStatus}</span>
          </div>
        </div>
      </section>

      {heroImageUrl ? (
        <section className="px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImageUrl} alt={heroImage?.altText ?? draft.title} className="h-auto w-full object-cover" />
          </div>
        </section>
      ) : null}

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article className="rounded-3xl bg-white p-0">
            <EditorialMarkdown markdown={draft.bodyMarkdown} />
          </article>
          <aside className="space-y-6">
            <div className="rounded-2xl bg-neutral-50 p-6">
              <h2 className="text-lg font-semibold text-neutral-900">Belangrijkste punten</h2>
              <ul className="mt-4 space-y-3 text-sm text-neutral-700">
                {draft.keyTakeaways.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-6">
              <h2 className="text-lg font-semibold text-neutral-900">Bronnen</h2>
              <ul className="mt-4 space-y-3 text-sm text-neutral-700">
                {draft.sourceList.map((source) => (
                  <li key={`${source.sourceName}-${source.url}`}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-[#F27501] underline-offset-2 hover:underline">
                      {source.sourceName}
                    </a>
                    <p className="mt-1 text-neutral-500">{source.title}</p>
                  </li>
                ))}
              </ul>
            </div>
            {draft.factCheckFlags.length ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="text-lg font-semibold text-amber-900">Fact-check aandachtspunten</h2>
                <ul className="mt-4 space-y-2 text-sm text-amber-900">
                  {draft.factCheckFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </div>
  );
}
