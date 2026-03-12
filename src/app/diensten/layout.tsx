import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diensten horeca uitzendbureau | Uitzenden, detachering, recruitment",
  description: "Overzicht van de diensten van TopTalent Jobs: uitzenden, detachering en recruitment van horecapersoneel. Kies de oplossing die past bij uw situatie.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/diensten",
  },
  openGraph: {
    title: "Onze Diensten | TopTalent Jobs - Horeca Uitzendbureau",
    description: "Uitzenden, detachering of recruitment? TopTalent Jobs biedt drie manieren om horecapersoneel in te zetten. Ontdek welke dienst bij u past.",
    url: "https://www.toptalentjobs.nl/diensten",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
};

export default function DienstenLayout({
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
        "name": "Diensten",
        "item": "https://www.toptalentjobs.nl/diensten"
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
