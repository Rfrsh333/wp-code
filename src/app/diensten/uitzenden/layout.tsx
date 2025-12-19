import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Uitzenden - Flexibel Horeca Personeel",
  description: "Tijdelijk horeca personeel nodig? TopTalent Jobs levert flexibele uitzendkrachten voor piekdrukte, evenementen of ziektevervanging. Binnen 24 uur geregeld.",
  alternates: {
    canonical: "https://toptalentjobs.nl/diensten/uitzenden",
  },
};

export default function UitzendenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Hoe snel kan ik personeel krijgen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Vaak binnen 24 uur. Bij spoedinzet kunnen we soms zelfs dezelfde dag personeel leveren, afhankelijk van beschikbaarheid."
        }
      },
      {
        "@type": "Question",
        "name": "Wat zijn de kosten van uitzendpersoneel?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Tarieven variëren per functie en ervaring. Gebruik onze kosten calculator voor een indicatie of neem contact op voor een offerte op maat."
        }
      },
      {
        "@type": "Question",
        "name": "Kan ik zelf het personeel kiezen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, wij sturen cv's en profielen door. U beslist uiteindelijk wie er start. Bij vaste samenwerking leren we uw voorkeuren kennen."
        }
      },
      {
        "@type": "Question",
        "name": "Wat als het personeel niet bevalt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "U kunt altijd vervanging aanvragen. Wij blijven betrokken tijdens de hele samenwerking en zorgen voor passende alternatieven."
        }
      },
      {
        "@type": "Question",
        "name": "Hoe zit het met verzekeringen en administratie?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Volledig geregeld. Het personeel is via ons verzekerd en wij verzorgen alle administratie, loonadministratie en belastingen."
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
        "name": "Uitzenden",
        "item": "https://toptalentjobs.nl/diensten/uitzenden"
      }
    ]
  };

  return (
    <>
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
