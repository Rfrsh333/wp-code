import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Over Ons - Horeca Uitzendbureau met Persoonlijke Aanpak",
  description: "Leer TopTalent Jobs kennen: een horeca uitzendbureau in Utrecht met passie voor gastvrijheid. 24/7 bereikbaar, persoonlijke service, gescreend personeel binnen 24 uur.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/over-ons",
  },
  openGraph: {
    title: "Over TopTalent Jobs - Uw Horeca Uitzendbureau",
    description: "TopTalent Jobs is 100% gespecialiseerd in horecapersoneel. Ontdek wie wij zijn en waarom klanten voor ons kiezen.",
    url: "https://www.toptalentjobs.nl/over-ons",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
    images: [
      {
        url: "https://www.toptalentjobs.nl/opengraph-image",
        width: 1200,
        height: 630,
        alt: "TopTalent Jobs - Horeca Uitzendbureau",
      },
    ],
  },
};

export default function OverOnsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const aboutPageSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": "https://www.toptalentjobs.nl/over-ons#aboutpage",
    "name": "Over TopTalent Jobs",
    "description": "TopTalent Jobs is een gespecialiseerd horeca uitzendbureau in Utrecht. KvK 73401161, WAADI-geregistreerd. Wij leveren gescreend horecapersoneel voor restaurants, hotels, catering en evenementen.",
    "url": "https://www.toptalentjobs.nl/over-ons",
    "mainEntity": {
      "@id": "https://www.toptalentjobs.nl/#organization"
    }
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
        "name": "Over Ons",
        "item": "https://www.toptalentjobs.nl/over-ons"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
