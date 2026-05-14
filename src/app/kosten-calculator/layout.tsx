import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kosten Horecapersoneel Berekenen — Gratis Tool",
  description: "Bereken direct de kosten van horecapersoneel inhuren. Vergelijk tarieven van vast personeel, uitzendkrachten en ZZP'ers met de gratis calculator van TopTalent Jobs.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/kosten-calculator/",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.toptalentjobs.nl/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Kosten Calculator",
        "item": "https://www.toptalentjobs.nl/kosten-calculator/"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
