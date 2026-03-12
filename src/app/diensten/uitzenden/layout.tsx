import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Uitzenden horeca personeel | diensten voor werkgevers",
  description: "Uitzenden van horecapersoneel voor restaurants, hotels en events. Snel tijdelijke inzet bij piekdrukte of uitval, met één contactpunt en duidelijke tarieven.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/diensten/uitzenden",
  },
};

export default function UitzendenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": "https://www.toptalentjobs.nl/diensten/uitzenden/#service",
    "name": "Horeca Uitzenden",
    "serviceType": "Uitzenden horecapersoneel",
    "description": "Tijdelijke inzet van gescreend horecapersoneel (koks, bediening, bar, afwas) binnen 24 uur. Flexibel inzetbaar bij piekdrukte, seizoensdrukte of personeelsuitval.",
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
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Uitzendpersoneel horeca",
      "itemListElement": [
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Kok / Sous-chef uitzenden" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Bediening uitzenden" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Barmedewerker uitzenden" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Afwas uitzenden" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Evenementenpersoneel uitzenden" } }
      ]
    },
    "termsOfService": "https://www.toptalentjobs.nl/voorwaarden"
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Hoe snel kan ik personeel krijgen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Vaak binnen 24 uur. Bij spoedinzet kunnen we soms dezelfde dag horecapersoneel leveren, afhankelijk van beschikbaarheid."
        }
      },
      {
        "@type": "Question",
        "name": "Wat zijn de kosten van uitzendpersoneel?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Tarieven variëren per functie en ervaring. Gebruik onze kosten calculator voor een indicatie of neem contact op voor een prijs op maat."
        }
      },
      {
        "@type": "Question",
        "name": "Kan ik zelf het personeel kiezen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, wij sturen cv's en profielen door. U beslist uiteindelijk wie er start. Bij vaste samenwerking kennen we uw voorkeuren beter."
        }
      },
      {
        "@type": "Question",
        "name": "Wat als het personeel niet bevalt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "U kunt altijd vervanging aanvragen. Wij blijven betrokken tijdens de samenwerking en zorgen voor passende alternatieven."
        }
      },
      {
        "@type": "Question",
        "name": "Hoe zit het met verzekeringen en administratie?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Volledig geregeld. De medewerkers zijn via ons verzekerd en wij verzorgen alle administratie, loonadministratie en belastingen."
        }
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
        "name": "Uitzenden",
        "item": "https://www.toptalentjobs.nl/diensten/uitzenden"
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
