import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Horecapersoneel Aanvragen binnen 24 uur | TopTalent Jobs",
  description:
    "Direct horecapersoneel nodig? Vraag gescreende krachten aan bij TopTalent Jobs. Bevestiging binnen 24 uur voor restaurants, hotels en evenementen.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/lp/personeel/",
  },
  openGraph: {
    title: "Horecapersoneel Aanvragen | TopTalent Jobs",
    description:
      "Direct horecapersoneel nodig? Vraag gescreende krachten aan bij TopTalent Jobs. Bevestiging binnen 24 uur.",
    url: "https://www.toptalentjobs.nl/lp/personeel",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
    images: [
      {
        url: "https://www.toptalentjobs.nl/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Horecapersoneel Aanvragen | TopTalent Jobs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Horecapersoneel Aanvragen | TopTalent Jobs",
    description: "Direct horecapersoneel nodig? Vraag gescreende krachten aan bij TopTalent Jobs. Bevestiging binnen 24 uur.",
    images: ["https://www.toptalentjobs.nl/opengraph-image"],
  },
};

export default function LpPersoneelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
