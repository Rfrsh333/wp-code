import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recruitment horeca personeel | vaste medewerkers",
  description: "Recruitment voor vast horecapersoneel. Wij werven en selecteren vaste medewerkers voor restaurants, hotels en catering met een helder proces en nazorg.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/diensten/recruitment",
  },
};

export default function RecruitmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": "https://www.toptalentjobs.nl/diensten/recruitment/#service",
    "name": "Horeca Recruitment",
    "serviceType": "Recruitment vast horecapersoneel",
    "description": "Werving en selectie van vast horecapersoneel. Van intake tot plaatsing in gemiddeld 14 dagen, met 95% retentie na 1 jaar en volledige plaatsingsgarantie.",
    "provider": {
      "@id": "https://www.toptalentjobs.nl/#organization"
    },
    "areaServed": [
      { "@type": "Country", "name": "Nederland" },
      { "@type": "City", "name": "Utrecht" },
      { "@type": "City", "name": "Amsterdam" },
      { "@type": "City", "name": "Rotterdam" },
      { "@type": "City", "name": "Den Haag" },
      { "@type": "City", "name": "Eindhoven" }
    ],
    "termsOfService": "https://www.toptalentjobs.nl/voorwaarden"
  };

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
        "name": "Diensten",
        "item": "https://www.toptalentjobs.nl/diensten"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Recruitment",
        "item": "https://www.toptalentjobs.nl/diensten/recruitment"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
