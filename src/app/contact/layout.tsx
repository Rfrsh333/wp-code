import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact - Horeca Uitzendbureau | TopTalent Jobs",
  description: "Neem contact op met TopTalent Jobs. Bel +31 6 49 71 37 66, mail info@toptalentjobs.nl of vul het formulier in. 24/7 bereikbaar voor horecapersoneel aanvragen.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/contact",
  },
  openGraph: {
    title: "Contact TopTalent Jobs - 24/7 bereikbaar",
    description: "Direct horecapersoneel nodig? Neem contact op met TopTalent Jobs. Reactie binnen 15 minuten.",
    url: "https://www.toptalentjobs.nl/contact",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
};

export default function ContactLayout({
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
          "text": "De kosten zijn afhankelijk van de functie, ervaring en inzetduur. TopTalent Jobs hanteert transparante uurtarieven zonder verborgen kosten."
        }
      },
      {
        "@type": "Question",
        "name": "Hoe selecteert TopTalent Jobs horecamedewerkers?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Alle kandidaten doorlopen een uitgebreid selectieproces: cv-screening, persoonlijke gesprekken en referentiechecks."
        }
      },
      {
        "@type": "Question",
        "name": "Wat als de ingehuurde medewerker niet voldoet?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Klanttevredenheid staat voorop. Voldoet een medewerker niet? Wij regelen kosteloos vervanging."
        }
      },
      {
        "@type": "Question",
        "name": "Voor welke horecafuncties kan ik personeel inhuren?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "TopTalent Jobs levert personeel voor alle horecafuncties: bediening, bar, keuken, gastheer/gastvrouw, receptie, banqueting, catering en evenementenpersoneel."
        }
      },
      {
        "@type": "Question",
        "name": "Wat is het verschil tussen uitzenden en detacheren?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Bij uitzenden betaalt u per gewerkt uur voor tijdelijke inzet. Bij detachering wordt een medewerker voor langere tijd exclusief bij u geplaatst met meer binding aan uw organisatie."
        }
      },
      {
        "@type": "Question",
        "name": "In welke steden en regio's is TopTalent Jobs actief?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "TopTalent Jobs is actief in heel Nederland, met focus op Utrecht, Amsterdam, Rotterdam, Den Haag en Eindhoven."
        }
      },
      {
        "@type": "Question",
        "name": "Waarom kiezen voor TopTalent Jobs als horeca uitzendbureau?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "TopTalent Jobs is 100% gespecialiseerd in de horeca. Persoonlijke aanpak, 24/7 bereikbaar, snelle service en focus op kwaliteit."
        }
      },
      {
        "@type": "Question",
        "name": "Hoe neem ik contact op met TopTalent Jobs?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Via telefoon (+31 6 49 71 37 66), e-mail (info@toptalentjobs.nl) of WhatsApp. 7 dagen per week bereikbaar, reactie doorgaans binnen enkele uren."
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
        "name": "Contact",
        "item": "https://www.toptalentjobs.nl/contact"
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
