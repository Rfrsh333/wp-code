import { Metadata } from "next";
import { getLocation } from "@/data/locations";
import { generateBreadcrumbSchema } from "@/components/Breadcrumbs";
import {
  generateLocalBusinessSchema,
} from "@/lib/schema-helpers";

export const metadata: Metadata = {
  title: "Horeca Uitzendbureau Utrecht | TopTalent Jobs",
  description: "Snel en betrouwbaar horeca personeel in Utrecht. Ervaren krachten voor restaurants, hotels en evenementen. Binnen 24 uur beschikbaar.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/locaties/utrecht",
  },
  openGraph: {
    title: "Horeca Uitzendbureau Utrecht | TopTalent Jobs",
    description: "Snel en betrouwbaar horeca personeel in Utrecht. Ervaren krachten voor restaurants, hotels en evenementen. Binnen 24 uur beschikbaar.",
    url: "https://www.toptalentjobs.nl/locaties/utrecht",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
};

export default function UtrechtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = getLocation("utrecht");

  if (!location) {
    return children;
  }

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Locaties", href: "/locaties" },
    { label: location.name, href: `/locaties/${location.slug}` },
  ];

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);
  const localBusinessSchema = generateLocalBusinessSchema(location);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema),
        }}
      />
      {children}
    </>
  );
}
