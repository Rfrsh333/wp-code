import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Horecapersoneel Aanvragen - Binnen 24 Uur | TopTalent Jobs",
  description: "Vraag direct gescreend horecapersoneel aan bij TopTalent Jobs. Binnen 24 uur ervaren bediening, koks of barista's. Geen verplichtingen, matchscore in 15 minuten.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/personeel-aanvragen",
  },
  openGraph: {
    title: "Horecapersoneel Aanvragen | TopTalent Jobs",
    description: "Gescreend horecapersoneel binnen 24 uur. Vul het formulier in en ontvang binnen 15 minuten een matchscore.",
    url: "https://www.toptalentjobs.nl/personeel-aanvragen",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
};

export default function PersoneelAanvragenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
