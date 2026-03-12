import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kosten Calculator - Wat Kost Horecapersoneel? | TopTalent Jobs",
  description: "Bereken in 60 seconden wat horecapersoneel kost via TopTalent Jobs. Transparante tarieven voor uitzendkrachten: bediening, koks, bar en meer.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/kosten-calculator",
  },
  openGraph: {
    title: "Wat Kost Horecapersoneel? | TopTalent Jobs Calculator",
    description: "Bereken direct de kosten voor horecapersoneel. Transparante uurtarieven, geen verborgen kosten.",
    url: "https://www.toptalentjobs.nl/kosten-calculator",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
};

export default function KostenCalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.toptalentjobs.nl"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Kosten Calculator",
        "item": "https://www.toptalentjobs.nl/kosten-calculator"
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
