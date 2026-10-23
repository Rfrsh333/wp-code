import type { Metadata } from "next";

import { OG_IMAGE } from "@/lib/og-image";
export const metadata: Metadata = {
  title: "Horecapersoneel Aanvragen — Persoonlijke Matching",
  description: "Vraag horecapersoneel aan via TopTalent Jobs. Persoonlijke matching, duidelijke afspraken en vaak binnen 24 uur een voorstel op maat voor uw zaak.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/personeel-aanvragen/",
  },
  openGraph: {
    images: [OG_IMAGE],
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
