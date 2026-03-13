import "server-only";

import type { EditorialDraftRecord } from "@/lib/content/types";

export function buildEditorialDraftPath(slug: string): string {
  return `/blog/editorial/${slug}`;
}

export function buildEditorialMetadata(draft: Pick<EditorialDraftRecord, "title" | "excerpt" | "slug" | "publishedAt">) {
  const canonical = `https://www.toptalentjobs.nl${buildEditorialDraftPath(draft.slug)}`;

  return {
    title: `${draft.title} | TopTalent Jobs Editorial`,
    description: draft.excerpt,
    alternates: {
      canonical,
    },
    openGraph: {
      title: draft.title,
      description: draft.excerpt,
      type: "article",
      publishedTime: draft.publishedAt ?? undefined,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: draft.title,
      description: draft.excerpt,
    },
  };
}

export function renderMarkdownParagraphs(markdown: string): string[] {
  return markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}
