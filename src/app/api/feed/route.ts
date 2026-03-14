import { NextResponse } from "next/server";
import { listPublishedDrafts } from "@/lib/content/repository";

const SITE_URL = "https://www.toptalentjobs.nl";
const FEED_TITLE = "TopTalent Jobs - Nieuws & Insights";
const FEED_DESCRIPTION = "Het laatste nieuws over horeca, uitzendwerk, arbeidsmarkt en ondernemen in Nederland.";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  try {
    const drafts = await listPublishedDrafts(20);

    const items = drafts.map((draft) => {
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

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>nl-NL</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/api/feed" rel="self" type="application/rss+xml" />
${items.join("\n")}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("[feed] Error generating RSS:", error);
    return NextResponse.json({ error: "Failed to generate feed" }, { status: 500 });
  }
}
