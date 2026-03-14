import { supabaseAdmin } from "@/lib/supabase";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Veelgestelde vragen over horecapersoneel inhuren | TopTalent",
  description:
    "Antwoorden op veelgestelde vragen over horecapersoneel inhuren via TopTalent. Kosten, contracten, beschikbaarheid en meer.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/veelgestelde-vragen/",
  },
};

export const revalidate = 3600;

interface FAQRow {
  question: string;
  answer: string;
}

export default async function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch published FAQs server-side for JSON-LD
  const { data: faqs } = await supabaseAdmin
    .from("faq_items")
    .select("question, answer")
    .eq("status", "published")
    .order("category")
    .order("priority", { ascending: true })
    .limit(100);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (faqs as FAQRow[] | null)?.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })) ?? [],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
