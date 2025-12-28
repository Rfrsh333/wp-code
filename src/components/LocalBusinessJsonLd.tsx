"use client";

import { usePathname } from "next/navigation";

const BASE_URL = "https://www.toptalentjobs.nl";

function toTitleCase(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getCityFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "locaties" || !segments[1]) {
    return null;
  }
  return toTitleCase(segments[1]);
}

export default function LocalBusinessJsonLd() {
  const pathname = usePathname() || "/";
  const city = getCityFromPath(pathname);

  if (!city) {
    return null;
  }

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "EmploymentAgency",
    name: "TopTalent Jobs",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    telephone: "+31649200412",
    email: "info@toptalentjobs.nl",
    areaServed: {
      "@type": "City",
      name: city,
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "NL",
      addressLocality: city,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
    />
  );
}
