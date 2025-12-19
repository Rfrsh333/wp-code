import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Horeca Uitzendbureau Amsterdam | TopTalent Jobs",
  description: "Horeca personeel Amsterdam. TopTalent Jobs levert betrouwbaar personeel voor restaurants, hotels en evenementen. Binnen 24 uur beschikbaar.",
  alternates: {
    canonical: "https://toptalentjobs.nl/locaties/amsterdam",
  },
};

export default function AmsterdamLayout({
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
        "name": "Locaties",
        "item": "https://toptalentjobs.nl/locaties"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Amsterdam",
        "item": "https://toptalentjobs.nl/locaties/amsterdam"
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
