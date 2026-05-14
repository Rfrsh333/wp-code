import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Klantervaringen — Reviews van Horecabedrijven",
  description: "Lees ervaringen van restaurants, hotels en eventbedrijven die horecapersoneel inhuren via TopTalent Jobs. Ontdek hoe zij personeelstekorten oplossen.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/testimonials/",
  },
  openGraph: {
    title: "Klantervaringen — Reviews van Horecabedrijven",
    description: "Lees ervaringen van restaurants, hotels en eventbedrijven die horecapersoneel inhuren via TopTalent Jobs.",
    url: "https://www.toptalentjobs.nl/testimonials/",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "EmploymentAgency",
    "@id": "https://www.toptalentjobs.nl/#organization",
    "name": "TopTalent Jobs",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5",
      "reviewCount": "3",
      "bestRating": "5",
      "worstRating": "1"
    },
    "review": [
      {
        "@type": "Review",
        "author": { "@type": "Person", "name": "Martijn de Vries" },
        "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
        "reviewBody": "TopTalent leverde binnen 18 uur 3 ervaren bedieners die direct inzetbaar waren. Volledig capaciteit hersteld zonder kwaliteitsverlies.",
        "datePublished": "2024-11-15"
      },
      {
        "@type": "Review",
        "author": { "@type": "Person", "name": "Sophie Jansen" },
        "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
        "reviewBody": "Vaste samenwerking met flexpool van 12 getrainde medewerkers die het hotel kennen. 95% minder planningsstress.",
        "datePublished": "2024-10-20"
      },
      {
        "@type": "Review",
        "author": { "@type": "Person", "name": "Rick van den Berg" },
        "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
        "reviewBody": "On-demand schaalbaar team. Van 5 tot 50 medewerkers binnen 48 uur regelbaar. Geen enkel event meer afgezegd door personeelstekort.",
        "datePublished": "2024-09-10"
      }
    ]
  };

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
        "name": "Klantervaringen",
        "item": "https://www.toptalentjobs.nl/testimonials/"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
