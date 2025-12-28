import { LocationData } from "@/data/locations";

export function generateLocalBusinessSchema(location: LocationData) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "EmploymentAgency",
    "@id": `https://toptalentjobs.nl/locaties/${location.slug}#business`,
    "name": `TopTalent Jobs ${location.name}`,
    "image": "https://toptalentjobs.nl/logo.png",
    "url": `https://toptalentjobs.nl/locaties/${location.slug}`,
    "telephone": "+31649200412",
    "email": "info@toptalentjobs.nl",
    "priceRange": "$$",
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      "opens": "00:00",
      "closes": "23:59",
    },
    "areaServed": {
      "@type": "City",
      "name": location.name,
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
            "description": "Flexibel horeca personeel voor tijdelijke inzet",
          },
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Detachering",
            "description": "Langdurige personeelsoplossingen voor de horeca",
          },
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Recruitment",
            "description": "Werving en selectie van vast horeca personeel",
          },
        },
      ],
    },
    "parentOrganization": {
      "@id": "https://toptalentjobs.nl/#organization",
    },
  };

  // Add address if available
  if (location.address) {
    schema.address = {
      "@type": "PostalAddress",
      "streetAddress": location.address.street,
      "postalCode": location.address.postalCode,
      "addressLocality": location.address.city,
      "addressRegion": location.name,
      "addressCountry": "NL",
    };
  }

  // Add geo coordinates if available
  if (location.geo) {
    schema.geo = {
      "@type": "GeoCoordinates",
      "latitude": location.geo.latitude,
      "longitude": location.geo.longitude,
    };
  }

  return schema;
}

export function generateLocationFAQSchema(location: LocationData) {
  const cityName = location.name;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `https://toptalentjobs.nl/locaties/${location.slug}#faq`,
    "mainEntity": [
      {
        "@type": "Question",
        "name": `Leveren jullie horeca personeel in heel ${cityName}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Ja, wij leveren personeel in ${location.serviceAreas.slice(0, 5).join(", ")} en omgeving. Ons bereik omvat de hele regio ${cityName}.`,
        },
      },
      {
        "@type": "Question",
        "name": `Hoe snel kan ik personeel krijgen in ${cityName}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Vaak binnen 24 uur. Bij spoedinzet kunnen we in ${cityName} soms zelfs dezelfde dag personeel leveren, afhankelijk van beschikbaarheid en de specifieke functie.`,
        },
      },
      {
        "@type": "Question",
        "name": `Welke type horeca personeel leveren jullie in ${cityName}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Wij leveren diverse functies: ${location.functions.join(", ")}. Ook voor evenementen en festivals in ${cityName} kunnen wij personeel leveren.`,
        },
      },
      {
        "@type": "Question",
        "name": `Wat zijn de kosten voor uitzendpersoneel in ${cityName}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Tarieven variëren per functie en ervaring. Gebruik onze kosten calculator voor een indicatie of neem contact op voor een offerte op maat voor uw situatie.",
        },
      },
      {
        "@type": "Question",
        "name": `Hebben jullie ervaring met evenementen in ${cityName}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Ja, wij hebben ruime ervaring met grote evenementen zoals ${location.localEvents.slice(0, 3).join(", ")}. Wij begrijpen de specifieke eisen van evenementen in ${cityName}.`,
        },
      },
    ],
  };
}
