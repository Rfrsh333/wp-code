import type { TemplateDraft, TemplateSection } from "@/lib/ai/template-schema";
import type { ContentBlock, AudienceType } from "@/lib/content/types";

const INTERNAL_LINK_MAP: Record<string, { href: string; text: string }> = {
  uitzend: { href: "/diensten/uitzenden", text: "uitzendservice" },
  personeel: { href: "/personeel-aanvragen", text: "personeel aanvragen" },
  vacatur: { href: "/vacatures", text: "vacatures" },
  recruitment: { href: "/diensten/recruitment", text: "recruitment" },
  detacher: { href: "/diensten", text: "onze diensten" },
};

function addInternalLinks(text: string): string {
  let result = text;
  let linksAdded = 0;

  for (const [keyword, link] of Object.entries(INTERNAL_LINK_MAP)) {
    if (linksAdded >= 2) break;

    const regex = new RegExp(`\\b(\\w*${keyword}\\w*)\\b`, "i");
    const match = result.match(regex);
    if (match && !result.includes(`<a href="${link.href}"`)) {
      result = result.replace(regex, `<a href="${link.href}">${match[1]}</a>`);
      linksAdded++;
    }
  }

  return result;
}

function getCtaForAudience(audience: AudienceType, variant: "orange" | "dark"): ContentBlock {
  if (audience === "medewerkers") {
    return {
      type: "cta",
      title: variant === "orange" ? "Op zoek naar een baan in de horeca?" : "Klaar voor je volgende stap?",
      description: variant === "orange"
        ? "Bekijk onze actuele vacatures en solliciteer direct via TopTalent."
        : "Schrijf je in bij TopTalent en ontvang passende vacatures op basis van jouw ervaring en wensen.",
      primaryLink: { href: "/vacatures", text: "Bekijk vacatures" },
      secondaryLink: { href: "/contact", text: "Neem contact op" },
      variant,
    };
  }

  return {
    type: "cta",
    title: variant === "orange" ? "Personeel nodig?" : "Direct aan de slag met TopTalent",
    description: variant === "orange"
      ? "TopTalent levert betrouwbaar horecapersoneel — flexibel, snel en met persoonlijke begeleiding."
      : "Neem vandaag nog contact op en ontdek hoe wij uw personeelsbehoefte kunnen invullen.",
    primaryLink: { href: "/personeel-aanvragen", text: "Personeel aanvragen" },
    secondaryLink: { href: "/contact", text: "Neem contact op" },
    variant,
  };
}

function buildSectionBlocks(section: TemplateSection, index: number): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  blocks.push({ type: "heading2", content: section.heading });

  // Paragraphs — add internal links to the first paragraph of first 2 sections
  for (let i = 0; i < section.paragraphs.length; i++) {
    const text = (index < 2 && i === 0)
      ? addInternalLinks(section.paragraphs[i])
      : section.paragraphs[i];
    blocks.push({ type: "paragraph", content: text });
  }

  // Subsections
  for (const sub of section.subsections) {
    blocks.push({ type: "heading3", content: sub.heading });
    for (const p of sub.paragraphs) {
      blocks.push({ type: "paragraph", content: p });
    }
  }

  // Highlight box
  if (section.highlight) {
    blocks.push({
      type: "highlight",
      title: section.highlight.title,
      content: section.highlight.content,
      variant: section.highlight.variant,
    });
  }

  // Checklist
  if (section.checklistItems && section.checklistItems.length > 0) {
    blocks.push({
      type: "checklist",
      title: section.checklistTitle ?? "Checklist",
      variant: index === 0 ? "benefits" : "steps",
      items: section.checklistItems.map((text) => ({ text, checked: false })),
    });
  }

  // Quote
  if (section.quoteText) {
    blocks.push({
      type: "quote",
      quote: section.quoteText,
      variant: "insight",
    });
  }

  // Comparison table
  if (section.comparisonHeaders && section.comparisonRows && section.comparisonRows.length > 0) {
    blocks.push({
      type: "comparison",
      title: section.comparisonHeaders[0],
      headers: section.comparisonHeaders,
      rows: section.comparisonRows.map((row) => ({
        feature: row.feature,
        optionA: row.optionA,
        optionB: row.optionB,
      })),
    });
  }

  // Data table
  if (section.tableHeaders && section.tableRows && section.tableRows.length > 0) {
    blocks.push({
      type: "table",
      headers: section.tableHeaders,
      rows: section.tableRows,
    });
  }

  return blocks;
}

export function buildBodyBlocksFromTemplate(
  draft: TemplateDraft,
  audience: AudienceType,
): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // 1. Intro paragraphs
  const introParagraphs = draft.introText.split(/\n\n+/).filter(Boolean);
  for (const p of introParagraphs) {
    blocks.push({ type: "paragraph", content: addInternalLinks(p) });
  }

  // 2. Context highlight
  blocks.push({
    type: "highlight",
    title: draft.contextHighlight.title,
    content: draft.contextHighlight.content,
    variant: "info",
  });

  // 3. Divider
  blocks.push({ type: "divider" });

  // 4. Sections with CTAs and related links interspersed
  for (let i = 0; i < draft.sections.length; i++) {
    const section = draft.sections[i];
    blocks.push(...buildSectionBlocks(section, i));

    // Geen tussentijdse CTA's — alleen 1x aan het eind

    // Related link after section 1
    if (i === 1) {
      blocks.push({
        type: "relatedLink",
        href: "/blog",
        text: "Lees meer artikelen op ons blog",
      });
    }

    // Divider between sections (not after the last one)
    if (i < draft.sections.length - 1) {
      blocks.push({ type: "divider" });
    }
  }

  // 5. Stats block
  if (draft.stats.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "stats",
      stats: draft.stats,
    });
  }

  // 6. Summary with key takeaways
  blocks.push({ type: "divider" });
  blocks.push({
    type: "summary",
    title: "Samenvatting",
    points: draft.keyTakeaways,
  });

  // 7. Final CTA (dark)
  blocks.push(getCtaForAudience(audience, "dark"));

  return blocks;
}

export function buildBodyMarkdownFromTemplate(draft: TemplateDraft): string {
  const parts: string[] = [];

  parts.push(draft.introText);
  parts.push("");

  for (const section of draft.sections) {
    parts.push(`## ${section.heading}`);
    parts.push("");
    for (const p of section.paragraphs) {
      parts.push(p);
      parts.push("");
    }
  }

  if (draft.keyTakeaways.length > 0) {
    parts.push("## Samenvatting");
    parts.push("");
    for (const point of draft.keyTakeaways) {
      parts.push(`- ${point}`);
    }
  }

  // Trim to ~300 words
  const fullText = parts.join("\n");
  const words = fullText.split(/\s+/);
  if (words.length > 350) {
    return words.slice(0, 300).join(" ") + "…";
  }

  return fullText;
}
