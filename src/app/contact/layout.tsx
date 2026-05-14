import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact TopTalent Jobs — Horeca Personeel Aanvragen",
  description: "Neem contact op met TopTalent Jobs. Horeca personeel binnen 24 uur. Bel +31 6 17 17 79 39, mail of WhatsApp. Wij reageren snel.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/contact/",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "ContactPage"],
    "@id": "https://www.toptalentjobs.nl/#localbusiness",
    "name": "TopTalent Jobs",
    "image": "https://www.toptalentjobs.nl/logo.png",
    "url": "https://www.toptalentjobs.nl",
    "telephone": "+31617177939",
    "email": "info@toptalentjobs.nl",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Kanaalstraat 15",
      "postalCode": "3531 CJ",
      "addressLocality": "Utrecht",
      "addressRegion": "Utrecht",
      "addressCountry": "NL"
    },
    "priceRange": "$$"
  };

  const contactFaqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Hoe snel kan ik horecapersoneel inhuren?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Bij TopTalent Jobs kunt u binnen 24 uur gekwalificeerd horecapersoneel inhuren. Of u nu een bartender, kok, of bedienend personeel nodig heeft - wij leveren snel en betrouwbaar."
        }
      },
      {
        "@type": "Question",
        "name": "Wat kost het om horecapersoneel in te huren via een uitzendbureau?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "De kosten zijn afhankelijk van de functie, ervaring en inzetduur. TopTalent Jobs hanteert transparante uurtarieven zonder verborgen kosten. Vraag vrijblijvend een offerte aan."
        }
      },
      {
        "@type": "Question",
        "name": "Hoe selecteert TopTalent Jobs horecamedewerkers?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Alle kandidaten doorlopen een uitgebreid selectieproces: cv-screening, persoonlijke gesprekken en referentiechecks. We beoordelen vakkennis, ervaring, betrouwbaarheid en gastvrijheid."
        }
      },
      {
        "@type": "Question",
        "name": "Voor welke horecafuncties kan ik personeel inhuren?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "TopTalent Jobs levert personeel voor alle horecafuncties: bediening, bar, keuken (van afwasser tot sous-chef), gastheer/gastvrouw, receptie, banqueting, catering en evenementenpersoneel."
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
        "item": "https://www.toptalentjobs.nl/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Contact",
        "item": "https://www.toptalentjobs.nl/contact/"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactFaqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
