export default function StructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "TopTalent Jobs",
    "alternateName": "TopTalent",
    "url": "https://toptalentjobs.nl",
    "logo": "https://toptalentjobs.nl/logo.png",
    "description": "Horeca uitzendbureau in Utrecht. Snel en betrouwbaar personeel voor restaurants, hotels en evenementen.",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Kanaalstraat 15",
      "postalCode": "3531 CJ",
      "addressLocality": "Utrecht",
      "addressCountry": "NL"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+31649200412",
      "contactType": "customer service",
      "availableLanguage": ["Dutch", "English"],
      "areaServed": "NL"
    },
    "sameAs": [
      "https://wa.me/31649200412"
    ]
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "EmploymentAgency",
    "name": "TopTalent Jobs",
    "image": "https://toptalentjobs.nl/logo.png",
    "url": "https://toptalentjobs.nl",
    "telephone": "+31649200412",
    "email": "info@toptalentjobs.nl",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Kanaalstraat 15",
      "postalCode": "3531 CJ",
      "addressLocality": "Utrecht",
      "addressRegion": "Utrecht",
      "addressCountry": "NL"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 52.0907,
      "longitude": 5.1214
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
      ],
      "opens": "00:00",
      "closes": "23:59"
    },
    "priceRange": "$$",
    "serviceArea": {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        "latitude": 52.0907,
        "longitude": 5.1214
      },
      "geoRadius": "50000"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Personeelsdiensten",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Uitzenden",
            "description": "Flexibel horeca personeel voor tijdelijke inzet"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Detachering",
            "description": "Langdurige personeelsoplossingen voor de horeca"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Recruitment",
            "description": "Werving en selectie van vast horeca personeel"
          }
        }
      ]
    }
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "TopTalent Jobs",
    "url": "https://toptalentjobs.nl"
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
    </>
  );
}
