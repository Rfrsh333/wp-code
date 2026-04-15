import "server-only";

/**
 * Structured Data generatie voor GEO content
 * Genereert JSON-LD schema's die AI zoekmachines helpen content te begrijpen
 */

import type { GeoContent, FaqItem } from "./types";

const TOPTALENT = {
  name: "TopTalent Jobs",
  url: "https://toptalentjobs.nl",
  logo: "https://toptalentjobs.nl/images/logo.png",
  telephone: "+31617177939",
  email: "info@toptalentjobs.nl",
  address: {
    streetAddress: "Kanaalstraat 15",
    addressLocality: "Utrecht",
    postalCode: "3531 CJ",
    addressCountry: "NL",
  },
};

/**
 * Genereer FAQPage JSON-LD
 */
export function buildFaqSchema(faqItems: FaqItem[]): object {
  if (!faqItems || faqItems.length === 0) return {};

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/**
 * Genereer Article JSON-LD
 */
export function buildArticleSchema(content: GeoContent): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: content.title,
    description: content.meta_description || content.excerpt || "",
    author: {
      "@type": "Organization",
      name: TOPTALENT.name,
      url: TOPTALENT.url,
    },
    publisher: {
      "@type": "Organization",
      name: TOPTALENT.name,
      url: TOPTALENT.url,
      logo: {
        "@type": "ImageObject",
        url: TOPTALENT.logo,
      },
    },
    datePublished: content.gepubliceerd_op || content.created_at,
    dateModified: content.updated_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${TOPTALENT.url}/geo/${content.slug}`,
    },
    keywords: [...(content.primary_keywords || []), ...(content.secondary_keywords || [])].join(", "),
  };
}

/**
 * Genereer LocalBusiness JSON-LD voor stad-specifieke pagina's
 */
export function buildLocalBusinessSchema(stadNaam: string): object {
  return {
    "@context": "https://schema.org",
    "@type": "EmploymentAgency",
    name: `${TOPTALENT.name} ${stadNaam}`,
    description: `Horeca uitzendbureau in ${stadNaam}. Snel, betrouwbaar en flexibel horeca personeel.`,
    url: TOPTALENT.url,
    telephone: TOPTALENT.telephone,
    email: TOPTALENT.email,
    address: {
      "@type": "PostalAddress",
      ...TOPTALENT.address,
    },
    areaServed: {
      "@type": "City",
      name: stadNaam,
    },
    serviceType: ["Uitzenden", "Detachering", "Recruitment"],
    knowsAbout: ["Horeca personeel", "Uitzendwerk", "Hospitality staffing"],
    sameAs: [
      "https://www.linkedin.com/company/toptalentjobs",
    ],
  };
}

/**
 * Genereer BreadcrumbList JSON-LD
 */
export function buildBreadcrumbSchema(content: GeoContent): object {
  const stadNaam = content.stad === "den-haag" ? "Den Haag" : content.stad.charAt(0).toUpperCase() + content.stad.slice(1);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: TOPTALENT.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: `Horeca ${stadNaam}`,
        item: `${TOPTALENT.url}/geo/${content.slug}`,
      },
    ],
  };
}

/**
 * Combineer alle structured data voor een GEO pagina
 */
export function buildAllStructuredData(content: GeoContent): object[] {
  const stadNaam = content.stad === "den-haag" ? "Den Haag" : content.stad.charAt(0).toUpperCase() + content.stad.slice(1);

  const schemas: object[] = [
    buildArticleSchema(content),
    buildBreadcrumbSchema(content),
  ];

  // FAQ schema (als er FAQ items zijn)
  if (content.faq_items && content.faq_items.length >= 2) {
    schemas.push(buildFaqSchema(content.faq_items));
  }

  // LocalBusiness voor stadspagina's
  if (content.content_type === "city_page") {
    schemas.push(buildLocalBusinessSchema(stadNaam));
  }

  // Voeg eventuele gegenereerde structured data toe
  if (content.structured_data && Array.isArray(content.structured_data)) {
    for (const sd of content.structured_data) {
      if (sd && typeof sd === "object" && "@type" in sd) {
        schemas.push(sd);
      }
    }
  }

  return schemas;
}
