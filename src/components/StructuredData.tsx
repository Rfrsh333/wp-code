export default function StructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": ["Organization", "EmploymentAgency"],
    "@id": "https://www.toptalentjobs.nl/#organization",
    "name": "TopTalent Jobs",
    "alternateName": ["TopTalentJobs", "TopTalent"],
    "url": "https://www.toptalentjobs.nl",
    "logo": {
      "@type": "ImageObject",
      "url": "https://www.toptalentjobs.nl/logo.png",
      "width": 512,
      "height": 512
    },
    "image": "https://www.toptalentjobs.nl/logo.png",
    "description": "TopTalent Jobs is een gespecialiseerd horeca uitzendbureau in Nederland. Wij leveren gescreend en ervaren horecapersoneel binnen 24 uur voor restaurants, hotels, catering en evenementen.",
    "slogan": "Gescreend horecapersoneel binnen 24 uur",
    "foundingLocation": "Utrecht, Nederland",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Kanaalstraat 15",
      "postalCode": "3531 CJ",
      "addressLocality": "Utrecht",
      "addressRegion": "Utrecht",
      "addressCountry": "NL"
    },
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "telephone": "+31649713766",
        "email": "info@toptalentjobs.nl",
        "contactType": "customer service",
        "availableLanguage": ["Dutch", "English"],
        "areaServed": "NL",
        "hoursAvailable": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          "opens": "00:00",
          "closes": "23:59"
        }
      }
    ],
    "areaServed": [
      { "@type": "Country", "name": "Nederland" },
      { "@type": "City", "name": "Utrecht" },
      { "@type": "City", "name": "Amsterdam" },
      { "@type": "City", "name": "Rotterdam" },
      { "@type": "City", "name": "Den Haag" },
      { "@type": "City", "name": "Eindhoven" }
    ],
    "knowsAbout": [
      "horeca personeel",
      "uitzendwerk horeca",
      "horecapersoneel inhuren",
      "tijdelijk personeel horeca",
      "recruitment horeca",
      "horeca uitzendbureau",
      "detachering horeca",
      "evenementenpersoneel",
      "horecamedewerkers",
      "uitzendkrachten horeca"
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Horeca personeelsdiensten",
      "itemListElement": [
        {
          "@type": "OfferCatalog",
          "name": "Uitzenden",
          "description": "Tijdelijke inzet van horecapersoneel"
        },
        {
          "@type": "OfferCatalog",
          "name": "Detachering",
          "description": "Langdurige plaatsing van horecamedewerkers"
        },
        {
          "@type": "OfferCatalog",
          "name": "Recruitment",
          "description": "Werving en selectie van vast horecapersoneel"
        }
      ]
    },
    "sameAs": [
      "https://wa.me/31649713766"
    ]
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://www.toptalentjobs.nl/#website",
    "name": "TopTalent Jobs",
    "url": "https://www.toptalentjobs.nl",
    "publisher": {
      "@id": "https://www.toptalentjobs.nl/#organization"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
    </>
  );
}
