import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inschrijven als Medewerker",
  description: "Wil je werken via TopTalent Jobs? Schrijf je in als horecamedewerker en ontvang flexibele opdrachten bij restaurants, hotels en evenementen in jouw regio.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/inschrijven",
  },
  openGraph: {
    title: "Inschrijven als Medewerker | TopTalent Jobs",
    description: "Wil je werken via TopTalent Jobs? Schrijf je in als horecamedewerker en ontvang flexibele opdrachten bij restaurants, hotels en evenementen in jouw regio.",
    url: "https://www.toptalentjobs.nl/inschrijven",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
