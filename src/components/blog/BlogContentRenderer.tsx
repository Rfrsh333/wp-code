"use client";

import { ReactNode } from "react";
import Link from "next/link";
import {
  HighlightBox,
  ChecklistBlock,
  QuoteBlock,
  StatCard,
  SummaryCard,
  CTABox,
  ProcessTimeline,
  PriceTable,
  ComparisonTable,
} from "./BlogComponents";

// ============================================================
// Content Block Types
// ============================================================
type ContentBlock =
  | { type: "paragraph"; content: string }
  | { type: "heading2"; content: string }
  | { type: "heading3"; content: string }
  | { type: "list"; items: string[] }
  | { type: "highlight"; title?: string; content: string; variant?: "info" | "tip" | "warning" | "definition" }
  | { type: "checklist"; title?: string; items: Array<{ text: string; checked?: boolean }>; variant?: "checklist" | "steps" | "benefits" }
  | { type: "quote"; quote: string; author?: string; role?: string; variant?: "testimonial" | "insight" | "highlight" }
  | { type: "stats"; stats: Array<{ value: string; label: string }> }
  | { type: "summary"; title?: string; points: string[] }
  | { type: "cta"; title: string; description: string; primaryLink: { href: string; text: string }; secondaryLink?: { href: string; text: string }; variant?: "orange" | "dark" }
  | { type: "timeline"; title?: string; steps: Array<{ title: string; description: string }> }
  | { type: "priceTable"; title?: string; rows: Array<{ item: string; price: string; note?: string }>; footer?: string }
  | { type: "comparison"; title?: string; headers: [string, string, string]; rows: Array<{ feature: string; optionA: string | boolean; optionB: string | boolean }> }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "divider" }
  | { type: "relatedLink"; href: string; text: string };

// ============================================================
// Blog Content Renderer
// ============================================================
interface BlogContentRendererProps {
  blocks: ContentBlock[];
}

export function BlogContentRenderer({ blocks }: BlogContentRendererProps) {
  return (
    <div className="prose prose-lg prose-neutral max-w-none prose-headings:text-neutral-900 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-neutral-600 prose-p:leading-relaxed prose-li:text-neutral-600 prose-strong:text-neutral-900 prose-a:text-[#F97316] prose-a:no-underline hover:prose-a:underline">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

function renderBlock(block: ContentBlock, key: number): ReactNode {
  switch (block.type) {
    case "paragraph":
      return (
        <p key={key} dangerouslySetInnerHTML={{ __html: formatInlineContent(block.content) }} />
      );

    case "heading2":
      return <h2 key={key}>{block.content}</h2>;

    case "heading3":
      return <h3 key={key}>{block.content}</h3>;

    case "list":
      return (
        <ul key={key}>
          {block.items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInlineContent(item) }} />
          ))}
        </ul>
      );

    case "highlight":
      return (
        <HighlightBox key={key} title={block.title} variant={block.variant}>
          <div dangerouslySetInnerHTML={{ __html: formatInlineContent(block.content) }} />
        </HighlightBox>
      );

    case "checklist":
      return (
        <ChecklistBlock
          key={key}
          title={block.title}
          items={block.items}
          variant={block.variant}
        />
      );

    case "quote":
      return (
        <QuoteBlock
          key={key}
          quote={block.quote}
          author={block.author}
          role={block.role}
          variant={block.variant}
        />
      );

    case "stats":
      return <StatCard key={key} stats={block.stats} />;

    case "summary":
      return <SummaryCard key={key} title={block.title} points={block.points} />;

    case "cta":
      return (
        <CTABox
          key={key}
          title={block.title}
          description={block.description}
          primaryLink={block.primaryLink}
          secondaryLink={block.secondaryLink}
          variant={block.variant}
        />
      );

    case "timeline":
      return <ProcessTimeline key={key} title={block.title} steps={block.steps} />;

    case "priceTable":
      return (
        <PriceTable
          key={key}
          title={block.title}
          rows={block.rows}
          footer={block.footer}
        />
      );

    case "comparison":
      return (
        <ComparisonTable
          key={key}
          title={block.title}
          headers={block.headers}
          rows={block.rows}
        />
      );

    case "table":
      return (
        <div key={key} className="my-6 overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-100">
                {block.headers.map((header, i) => (
                  <th key={i} className="px-4 py-3 text-sm font-semibold text-neutral-700 text-left">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-neutral-50"}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-3 text-neutral-600">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "divider":
      return <hr key={key} className="my-10 border-neutral-200" />;

    case "relatedLink":
      return (
        <div key={key} className="my-4 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
          <Link
            href={block.href}
            className="inline-flex items-center gap-2 text-[#F97316] font-medium hover:underline group"
          >
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            {block.text}
          </Link>
        </div>
      );

    default:
      return null;
  }
}

// Format inline content (bold, links, etc.)
function formatInlineContent(content: string): string {
  return content
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Links - already in HTML format
    .replace(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g, '<a href="$1" class="text-[#F97316] hover:underline">$2</a>');
}

// ============================================================
// Export helper type for article definitions
// ============================================================
export type { ContentBlock };
