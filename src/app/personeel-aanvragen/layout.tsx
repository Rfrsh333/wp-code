import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personeel Aanvragen",
  description: "Bestel snel en eenvoudig horecapersoneel via TopTalent Jobs. Vul het formulier in en ontvang binnen 24 uur een voorstel op maat voor uw restaurant of evenement.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/personeel-aanvragen",
  },
  openGraph: {
    title: "Personeel Aanvragen | TopTalent Jobs",
    description: "Bestel snel en eenvoudig horecapersoneel via TopTalent Jobs. Vul het formulier in en ontvang binnen 24 uur een voorstel op maat voor uw restaurant of evenement.",
    url: "https://www.toptalentjobs.nl/personeel-aanvragen",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
