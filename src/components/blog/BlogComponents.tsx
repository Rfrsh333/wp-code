/**
 * Blog UI Components
 * Reusable visual components for blog articles
 * Design: Professional, calm, trust-focused for staffing/recruitment agency
 */

import Link from "next/link";

// ============================================================
// HighlightBox - For key takeaways, definitions, important info
// ============================================================
interface HighlightBoxProps {
  title?: string;
  children: React.ReactNode;
  variant?: "info" | "tip" | "warning" | "definition";
}

export function HighlightBox({ title, children, variant = "info" }: HighlightBoxProps) {
  const variants = {
    info: {
      bg: "bg-gradient-to-br from-[#FEF3E7] to-[#FFF7ED]",
      border: "border-[#F97316]/20",
      icon: (
        <svg className="w-5 h-5 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      titleColor: "text-[#C2410C]",
    },
    tip: {
      bg: "bg-gradient-to-br from-emerald-50 to-green-50",
      border: "border-emerald-200",
      icon: (
        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      titleColor: "text-emerald-800",
    },
    warning: {
      bg: "bg-gradient-to-br from-amber-50 to-yellow-50",
      border: "border-amber-200",
      icon: (
        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      titleColor: "text-amber-800",
    },
    definition: {
      bg: "bg-gradient-to-br from-slate-50 to-neutral-50",
      border: "border-slate-200",
      icon: (
        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      titleColor: "text-slate-800",
    },
  };

  const style = variants[variant];

  return (
    <div className={`${style.bg} ${style.border} border rounded-xl p-6 my-8`}>
      {title && (
        <div className="flex items-center gap-2 mb-3">
          {style.icon}
          <h4 className={`font-semibold ${style.titleColor}`}>{title}</h4>
        </div>
      )}
      <div className="text-neutral-700 leading-relaxed">{children}</div>
    </div>
  );
}

// ============================================================
// ChecklistBlock - For step-by-step processes, requirements
// ============================================================
interface ChecklistItem {
  text: string;
  checked?: boolean;
}

interface ChecklistBlockProps {
  title?: string;
  items: ChecklistItem[];
  variant?: "checklist" | "steps" | "benefits";
}

export function ChecklistBlock({ title, items, variant = "checklist" }: ChecklistBlockProps) {
  const icons = {
    checklist: (checked: boolean) => (
      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
        checked ? "bg-[#F97316] text-white" : "border-2 border-neutral-300"
      }`}>
        {checked && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    ),
    steps: (index: number) => (
      <div className="w-7 h-7 rounded-full bg-[#F97316] text-white text-sm font-semibold flex items-center justify-center flex-shrink-0">
        {index + 1}
      </div>
    ),
    benefits: () => (
      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    ),
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-100 p-6 my-8 shadow-sm">
      {title && (
        <h4 className="font-semibold text-neutral-900 mb-4 text-lg">{title}</h4>
      )}
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            {variant === "checklist" && icons.checklist(item.checked || false)}
            {variant === "steps" && icons.steps(index)}
            {variant === "benefits" && icons.benefits()}
            <span className="text-neutral-700 leading-relaxed">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// QuoteBlock - For testimonials, expert quotes, key statements
// ============================================================
interface QuoteBlockProps {
  quote: string;
  author?: string;
  role?: string;
  variant?: "testimonial" | "insight" | "highlight";
}

export function QuoteBlock({ quote, author, role, variant = "insight" }: QuoteBlockProps) {
  if (variant === "testimonial") {
    return (
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-xl p-8 my-8 text-white relative overflow-hidden">
        <div className="absolute top-4 left-6 text-6xl text-white/10 font-serif">&ldquo;</div>
        <blockquote className="relative z-10 text-lg leading-relaxed mb-4 italic">
          {quote}
        </blockquote>
        {(author || role) && (
          <div className="flex items-center gap-3 mt-6">
            <div className="w-10 h-10 rounded-full bg-[#F97316] flex items-center justify-center text-white font-semibold">
              {author ? author.charAt(0) : "T"}
            </div>
            <div>
              {author && <p className="font-semibold text-white">{author}</p>}
              {role && <p className="text-neutral-400 text-sm">{role}</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === "highlight") {
    return (
      <div className="border-l-4 border-[#F97316] bg-gradient-to-r from-[#FEF3E7] to-transparent pl-6 pr-4 py-4 my-8">
        <p className="text-lg text-neutral-800 font-medium italic">{quote}</p>
      </div>
    );
  }

  // Default: insight
  return (
    <div className="bg-neutral-50 rounded-xl p-6 my-8 border-l-4 border-[#F97316]">
      <div className="flex items-start gap-3">
        <svg className="w-6 h-6 text-[#F97316] flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <p className="text-neutral-700 leading-relaxed">{quote}</p>
      </div>
    </div>
  );
}

// ============================================================
// ComparisonTable - For comparing options, features
// ============================================================
interface ComparisonRow {
  feature: string;
  optionA: string | boolean;
  optionB: string | boolean;
}

interface ComparisonTableProps {
  title?: string;
  headers: [string, string, string];
  rows: ComparisonRow[];
}

export function ComparisonTable({ title, headers, rows }: ComparisonTableProps) {
  const renderCell = (value: string | boolean) => {
    if (typeof value === "boolean") {
      return value ? (
        <svg className="w-5 h-5 text-emerald-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-neutral-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }
    return value;
  };

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-neutral-200">
      {title && (
        <div className="bg-neutral-900 text-white px-6 py-4">
          <h4 className="font-semibold">{title}</h4>
        </div>
      )}
      <table className="w-full">
        <thead>
          <tr className="bg-neutral-100">
            {headers.map((header, i) => (
              <th key={i} className={`px-4 py-3 text-sm font-semibold text-neutral-700 ${i === 0 ? "text-left" : "text-center"}`}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-neutral-50"}>
              <td className="px-4 py-3 text-neutral-700 font-medium">{row.feature}</td>
              <td className="px-4 py-3 text-neutral-600 text-center">{renderCell(row.optionA)}</td>
              <td className="px-4 py-3 text-neutral-600 text-center">{renderCell(row.optionB)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// StatCard - For highlighting key numbers/statistics
// ============================================================
interface StatCardProps {
  stats: Array<{
    value: string;
    label: string;
  }>;
}

export function StatCard({ stats }: StatCardProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
      {stats.map((stat, i) => (
        <div key={i} className="bg-gradient-to-br from-[#F97316]/5 to-[#F97316]/10 rounded-xl p-5 text-center border border-[#F97316]/10">
          <div className="text-3xl font-bold text-[#F97316] mb-1">{stat.value}</div>
          <div className="text-sm text-neutral-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// SummaryCard - For article summaries, key takeaways
// ============================================================
interface SummaryCardProps {
  title?: string;
  points: string[];
}

export function SummaryCard({ title = "Samenvatting", points }: SummaryCardProps) {
  return (
    <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-xl p-8 my-8 text-white">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-[#F97316] flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h4 className="text-xl font-bold">{title}</h4>
      </div>
      <ul className="space-y-3">
        {points.map((point, i) => (
          <li key={i} className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[#F97316] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
            </svg>
            <span className="text-neutral-300 leading-relaxed">{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// CTABox - For call-to-action sections
// ============================================================
interface CTABoxProps {
  title: string;
  description: string;
  primaryLink: { href: string; text: string };
  secondaryLink?: { href: string; text: string };
  variant?: "orange" | "dark";
}

export function CTABox({ title, description, primaryLink, secondaryLink, variant = "orange" }: CTABoxProps) {
  const styles = {
    orange: {
      bg: "bg-gradient-to-br from-[#F97316] to-[#EA580C]",
      text: "text-white",
      subtext: "text-white/90",
      primaryBtn: "bg-white text-[#F97316] hover:bg-neutral-100",
      secondaryBtn: "border-2 border-white/30 text-white hover:bg-white/10",
    },
    dark: {
      bg: "bg-gradient-to-br from-neutral-900 to-neutral-800",
      text: "text-white",
      subtext: "text-neutral-300",
      primaryBtn: "bg-[#F97316] text-white hover:bg-[#EA580C]",
      secondaryBtn: "border-2 border-neutral-600 text-white hover:border-neutral-400",
    },
  };

  const style = styles[variant];

  return (
    <div className={`${style.bg} rounded-xl p-8 my-8 ${style.text} relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-40 h-40 border border-white/20 rounded-full translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-32 h-32 border border-white/20 rounded-full -translate-x-1/3 translate-y-1/3" />
      </div>
      <div className="relative z-10">
        <h4 className="text-xl font-bold mb-3">{title}</h4>
        <p className={`${style.subtext} mb-6`}>{description}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={primaryLink.href}
            className={`${style.primaryBtn} px-6 py-3 rounded-xl font-semibold text-center transition-colors`}
          >
            {primaryLink.text}
          </Link>
          {secondaryLink && (
            <Link
              href={secondaryLink.href}
              className={`${style.secondaryBtn} px-6 py-3 rounded-xl font-semibold text-center transition-colors`}
            >
              {secondaryLink.text}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// RelatedLink - For inline related article links
// ============================================================
interface RelatedLinkProps {
  href: string;
  text: string;
}

export function RelatedLink({ href, text }: RelatedLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-[#F97316] font-medium hover:underline group"
    >
      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
      {text}
    </Link>
  );
}

// ============================================================
// ProcessTimeline - For showing steps/phases
// ============================================================
interface TimelineStep {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface ProcessTimelineProps {
  title?: string;
  steps: TimelineStep[];
}

export function ProcessTimeline({ title, steps }: ProcessTimelineProps) {
  return (
    <div className="my-8">
      {title && (
        <h4 className="font-semibold text-neutral-900 mb-6 text-lg">{title}</h4>
      )}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-[15px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-[#F97316] to-[#F97316]/20" />

        <div className="space-y-6">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4 relative">
              <div className="w-8 h-8 rounded-full bg-[#F97316] text-white flex items-center justify-center flex-shrink-0 text-sm font-bold relative z-10">
                {i + 1}
              </div>
              <div className="bg-white rounded-xl border border-neutral-100 p-5 flex-1 shadow-sm">
                <h5 className="font-semibold text-neutral-900 mb-2">{step.title}</h5>
                <p className="text-neutral-600 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PriceTable - For showing pricing information
// ============================================================
interface PriceRow {
  item: string;
  price: string;
  note?: string;
}

interface PriceTableProps {
  title?: string;
  rows: PriceRow[];
  footer?: string;
}

export function PriceTable({ title, rows, footer }: PriceTableProps) {
  return (
    <div className="my-8 overflow-hidden rounded-xl border border-neutral-200">
      {title && (
        <div className="bg-[#F97316] text-white px-6 py-4">
          <h4 className="font-semibold">{title}</h4>
        </div>
      )}
      <table className="w-full">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-neutral-50"}>
              <td className="px-4 py-3 text-neutral-700">
                {row.item}
                {row.note && <span className="text-neutral-500 text-sm ml-2">({row.note})</span>}
              </td>
              <td className="px-4 py-3 text-neutral-900 font-semibold text-right">{row.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {footer && (
        <div className="bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
          {footer}
        </div>
      )}
    </div>
  );
}
