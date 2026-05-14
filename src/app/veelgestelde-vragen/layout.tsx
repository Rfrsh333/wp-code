import type { Metadata } from "next";
import { getFaqs } from "./getFaqs";

export const metadata: Metadata = {
  title: "Veelgestelde vragen over horecapersoneel inhuren | TopTalent",
  description:
    "Antwoorden op veelgestelde vragen over horecapersoneel inhuren via TopTalent. Kosten, contracten, beschikbaarheid en meer.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/veelgestelde-vragen/",
  },
};

export const revalidate = 3600;

export default async function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const faqs = await getFaqs();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
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
