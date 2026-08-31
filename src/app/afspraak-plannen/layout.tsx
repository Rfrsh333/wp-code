import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Afspraak Plannen | Vrijblijvend Gesprek | TopTalent Jobs",
  description:
    "Plan een vrijblijvende afspraak met TopTalent Jobs. Bespreek uw personeelsbehoefte en ontvang advies op maat voor uw horecabedrijf in Utrecht en omgeving.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/afspraak-plannen/",
  },
  openGraph: {
    title: "Afspraak Plannen | TopTalent Jobs",
    description:
      "Plan een vrijblijvende afspraak met TopTalent Jobs. Bespreek uw personeelsbehoefte en ontvang advies op maat.",
    url: "https://www.toptalentjobs.nl/afspraak-plannen",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
};

export default function AfspraakPlannenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
