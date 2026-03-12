import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Veelgestelde vragen over horecapersoneel inhuren | TopTalent Jobs",
  description: "Antwoorden op 80+ vragen over horecapersoneel inhuren: kosten, proces, functies, contracten, locaties en meer. Alles wat u wilt weten over uitzendwerk in de horeca.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/veelgestelde-vragen",
  },
  openGraph: {
    title: "Veelgestelde vragen over horecapersoneel | TopTalent Jobs",
    description: "Van kosten tot contracten: antwoorden op alle vragen over horecapersoneel inhuren via een uitzendbureau.",
    url: "https://www.toptalentjobs.nl/veelgestelde-vragen",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function FAQLayout({
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
        "name": "Veelgestelde vragen",
        "item": "https://www.toptalentjobs.nl/veelgestelde-vragen"
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
