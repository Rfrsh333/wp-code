import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Horeca Uitzendbureau Utrecht | TopTalent Jobs",
  description: "Snel en betrouwbaar horeca personeel in Utrecht. Ervaren krachten voor restaurants, hotels en evenementen. Binnen 24 uur beschikbaar.",
  alternates: {
    canonical: "https://toptalentjobs.nl/locaties/utrecht",
  },
};

export default function UtrechtLayout({
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
        "name": "Utrecht",
        "item": "https://toptalentjobs.nl/locaties/utrecht"
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
