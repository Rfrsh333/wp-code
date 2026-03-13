import type { IngestedFeedItem, ParsedFeed } from "@/lib/content/types";

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function stripCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function extractTag(block: string, tagNames: string[]): string | null {
  for (const tag of tagNames) {
    // Standard opening+closing tag: <tag>content</tag>
    const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (match?.[1]) {
      return decodeXmlEntities(stripCdata(match[1].trim()));
    }

    // Atom self-closing link: <link href="..." /> or <link rel="alternate" href="..." />
    if (tag === "link") {
      const hrefMatch = block.match(/<link[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/i);
      if (hrefMatch?.[1]) {
        return decodeXmlEntities(hrefMatch[1].trim());
      }
    }
  }

  return null;
}

function parseItemBlock(block: string): IngestedFeedItem | null {
  const link = extractTag(block, ["link", "id"]);
  const title = extractTag(block, ["title"]);

  if (!link || !title) {
    return null;
  }

  return {
    guid: extractTag(block, ["guid", "id"]),
    link,
    title,
    excerpt: extractTag(block, ["description", "summary", "content:encoded"]),
    author: extractTag(block, ["author", "dc:creator"]),
    publishedAt: extractTag(block, ["pubDate", "published", "updated"]),
  };
}

export function parseFeedXml(xml: string): ParsedFeed {
  const itemBlocks = [
    ...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi),
  ];

  return {
    title: extractTag(xml, ["title"]),
    description: extractTag(xml, ["description", "subtitle"]),
    items: itemBlocks
      .map((match) => parseItemBlock(match[0]))
      .filter((item): item is IngestedFeedItem => Boolean(item)),
  };
}
