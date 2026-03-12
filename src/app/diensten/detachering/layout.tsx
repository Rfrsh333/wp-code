import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detachering horeca personeel voor werkgevers",
  description: "Detachering van horecapersoneel voor structurele bezetting. Een vaste horecakracht in uw team, zonder werkgeversrisico en met heldere afspraken.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/diensten/detachering",
  },
};

export default function DetacheringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": "https://www.toptalentjobs.nl/diensten/detachering/#service",
    "name": "Horeca Detachering",
    "serviceType": "Detachering horecapersoneel",
    "description": "Langdurige plaatsing van ervaren horecamedewerkers in uw team. Een vaste kracht zonder werkgeversrisico, volledig geïntegreerd in uw organisatie voor 3 tot 12 maanden.",
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
        "name": "Detachering",
        "item": "https://www.toptalentjobs.nl/diensten/detachering"
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
