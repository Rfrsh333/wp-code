import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detachering horeca personeel voor werkgevers",
  description: "Detachering van horecapersoneel voor structurele bezetting. Een vaste horecakracht in uw team, zonder werkgeversrisico en met heldere afspraken.",
  alternates: {
    canonical: "https://toptalentjobs.nl/diensten/detachering",
  },
};

export default function DetacheringLayout({
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
        "item": "https://toptalentjobs.nl"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Diensten",
        "item": "https://toptalentjobs.nl/diensten"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Detachering",
        "item": "https://toptalentjobs.nl/diensten/detachering"
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
