import { listPublishedDrafts } from "@/lib/content/repository";
import { blogArticles, getAllBlogSlugs } from "@/data/blogArticles";

const SITE_URL = "https://www.toptalentjobs.nl";
const FEED_TITLE = "TopTalent Jobs - Nieuws & Insights";
const FEED_DESCRIPTION =
  "Het laatste nieuws over horeca, uitzendwerk, arbeidsmarkt en ondernemen in Nederland.";

export const revalidate = 3600;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  // Editorial drafts from Supabase
  let editorialItems: string[] = [];
  try {
    const drafts = await listPublishedDrafts(50);
    editorialItems = drafts.map((draft) => {
      const pubDate = draft.publishedAt
        ? new Date(draft.publishedAt).toUTCString()
        : new Date(draft.createdAt).toUTCString();

      return `    <item>
      <title>${escapeXml(draft.title)}</title>
      <link>${SITE_URL}/blog/editorial/${escapeXml(draft.slug)}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/editorial/${escapeXml(draft.slug)}</guid>
      <description>${escapeXml(draft.excerpt)}</description>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(draft.draftType)}</category>
    </item>`;
    });
  } catch {
    // Continue with blog articles only
  }

  // Static blog articles
  const blogSlugs = getAllBlogSlugs();
  const blogItems = blogSlugs.map((slug) => {
    const article = blogArticles[slug];
    const pubDate = new Date(article.datePublished).toUTCString();

    return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${SITE_URL}/blog/${escapeXml(slug)}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${escapeXml(slug)}</guid>
      <description>${escapeXml(article.excerpt)}</description>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(article.category)}</category>
    </item>`;
  });

  const allItems = [...editorialItems, ...blogItems];

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>nl-NL</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${allItems.join("\n")}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
