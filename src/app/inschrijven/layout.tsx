import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inschrijven als Horecamedewerker | TopTalent Jobs",
  description: "Schrijf je gratis in bij TopTalent Jobs en vind werk in de horeca. Flexibele uren, eerlijk loon en opdrachten bij restaurants, hotels en evenementen in heel Nederland.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/inschrijven",
  },
  openGraph: {
    title: "Werken in de Horeca? Schrijf je in | TopTalent Jobs",
    description: "Gratis inschrijven, flexibele uren en eerlijk loon. Vind horecawerk dat bij jou past via TopTalent Jobs.",
    url: "https://www.toptalentjobs.nl/inschrijven",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
};

export default function InschrijvenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
