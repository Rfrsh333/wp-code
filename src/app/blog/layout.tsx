import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog - Tips & Nieuws over Horeca Personeel | TopTalent Jobs",
  description: "Praktische tips en nieuws over horecapersoneel inhuren, recruitment trends en de uitzendbranche. Blijf op de hoogte met TopTalent Jobs.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/blog",
  },
  openGraph: {
    title: "Blog | TopTalent Jobs - Horeca Personeel Insights",
    description: "Tips over horecapersoneel inhuren, kosten, trends en meer. Alles wat horeca-ondernemers moeten weten.",
    url: "https://www.toptalentjobs.nl/blog",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        "name": "Blog",
        "item": "https://www.toptalentjobs.nl/blog"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
