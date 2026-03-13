import Link from "next/link";
import { getGeneratedImageById, listPublishedDrafts } from "@/lib/content/repository";
import { buildEditorialDraftPath } from "@/lib/content/publishing";
import { createEditorialImageSignedUrl } from "@/lib/images/storage";
import { formatEditorialLabel } from "@/lib/content/presentation";

export const metadata = {
  title: "Editorial Blog | TopTalent Jobs",
  description: "AI-assisted en redactioneel beoordeelde inzichten voor horeca, hospitality staffing, werkgevers en medewerkers.",
};

export default async function EditorialBlogIndexPage() {
  const drafts = await listPublishedDrafts(24);
  const draftCards = await Promise.all(
    drafts.map(async (draft) => {
      const heroImage = draft.heroImageId ? await getGeneratedImageById(draft.heroImageId) : null;
      const heroImageUrl =
        heroImage?.storagePathBranded
          ? await createEditorialImageSignedUrl(heroImage.storagePathBranded)
          : null;

      return {
        ...draft,
        heroImageUrl,
      };
    }),
  );

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-white to-neutral-50 px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <span className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#F27501]">
            Editorial Intelligence
          </span>
          <h1 className="mt-5 text-4xl font-bold text-neutral-900 md:text-5xl">Inzichten voor horeca en hospitality</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">
            Redactioneel beoordeelde artikelen over arbeidsmarkt, regelgeving, staffing, hospitality operations en ondernemersimpact.
          </p>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 xl:grid-cols-3">
          {draftCards.map((draft) => (
            <article key={draft.id} className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              {draft.heroImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.heroImageUrl} alt={draft.title} className="aspect-[16/10] w-full object-cover" />
              ) : (
                <div className="aspect-[16/10] w-full bg-gradient-to-br from-orange-100 via-amber-50 to-white" />
              )}
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F27501]">
                  {formatEditorialLabel(draft.primaryAudience ?? "Editorial")}
                </p>
                <h2 className="mt-4 text-2xl font-semibold text-neutral-900">
                <Link href={buildEditorialDraftPath(draft.slug)}>{draft.title}</Link>
                </h2>
                <p className="mt-3 text-sm leading-7 text-neutral-600">{draft.excerpt}</p>
                <div className="mt-6 flex items-center justify-between text-sm text-neutral-500">
                  <span>{draft.publishedAt ? new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(new Date(draft.publishedAt)) : "Nog niet gepubliceerd"}</span>
                  <Link href={buildEditorialDraftPath(draft.slug)} className="font-semibold text-[#F27501]">Lees meer</Link>
                </div>
              </div>
            </article>
          ))}
          {!draftCards.length ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-sm text-neutral-500">
              Nog geen gepubliceerde editorial drafts. Na review verschijnen ze hier automatisch.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
