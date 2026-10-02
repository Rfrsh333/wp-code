import type { Metadata } from "next";

// Deze URL bestaat al (links/advertenties kunnen ernaar wijzen). Vroeger stond
// hier content van een ander bedrijf; nu is het een TopTalent-pagina voor
// horeca-opdrachtgevers die (meer) personeel nodig hebben.
export const metadata: Metadata = {
  title: "Meer Horecapersoneel Nodig? | TopTalent Jobs",
  description:
    "Extra handen nodig in uw zaak? Vraag horecapersoneel aan via TopTalent Jobs. Persoonlijke matching en vaak binnen 24 uur een voorstel op maat.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/meer-aanvragen/",
  },
  openGraph: {
    title: "Meer Horecapersoneel Nodig? | TopTalent Jobs",
    description:
      "Vraag horecapersoneel aan via TopTalent Jobs. Vul het formulier in en ontvang vaak binnen 24 uur een voorstel op maat.",
    url: "https://www.toptalentjobs.nl/meer-aanvragen",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
    images: [
      {
        url: "https://www.toptalentjobs.nl/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Horecapersoneel aanvragen | TopTalent Jobs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Meer Horecapersoneel Nodig? | TopTalent Jobs",
    description: "Vraag horecapersoneel aan via TopTalent Jobs. Vaak binnen 24 uur een voorstel op maat.",
    images: ["https://www.toptalentjobs.nl/opengraph-image"],
  },
};

export default function MeerAanvragenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
