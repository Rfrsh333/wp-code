export default function StructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://toptalentjobs.nl/#organization",
    "name": "TopTalent Jobs",
    "alternateName": "TopTalent",
    "url": "https://toptalentjobs.nl",
    "logo": "https://toptalentjobs.nl/logo.png",
    "description": "Horeca uitzendbureau in Utrecht, Amsterdam en Rotterdam. Snel en betrouwbaar personeel voor restaurants, hotels en evenementen.",
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

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://toptalentjobs.nl/#website",
    "name": "TopTalent Jobs",
    "url": "https://toptalentjobs.nl",
    "publisher": {
      "@id": "https://toptalentjobs.nl/#organization"
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
