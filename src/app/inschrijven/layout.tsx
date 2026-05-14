import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Werken in de Horeca — Schrijf Je In",
  description: "Wil je werken via TopTalent Jobs? Persoonlijke begeleiding, eerlijke afspraken en flexibele opdrachten bij restaurants, hotels en evenementen in jouw regio.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/inschrijven",
  },
  openGraph: {
    title: "Inschrijven als Medewerker | TopTalent Jobs",
    description: "Wil je werken via TopTalent Jobs? Persoonlijke begeleiding, eerlijke afspraken en flexibele opdrachten bij restaurants, hotels en evenementen in jouw regio.",
    url: "https://www.toptalentjobs.nl/inschrijven",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
