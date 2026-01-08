export default function StructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://www.toptalentjobs.nl/#organization",
    "name": "TopTalent Jobs",
    "alternateName": "TopTalent",
    "url": "https://www.toptalentjobs.nl",
    "logo": "https://www.toptalentjobs.nl/logo.png",
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
      "telephone": "+31649713766",
      "contactType": "customer service",
      "availableLanguage": ["Dutch", "English"],
      "areaServed": "NL"
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
