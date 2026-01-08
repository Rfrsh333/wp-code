import { Metadata } from "next";

const title = "Spoed personeel horeca binnen 24 uur | TopTalent Jobs";
const description =
  "Last-minute personeelstekort? Vraag spoed horecapersoneel aan en ontvang snel bevestiging. Binnen 24 uur inzetbaar via TopTalent Jobs.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "https://www.toptalentjobs.nl/lp3/personeel",
  },
  openGraph: {
    title,
    description,
    url: "https://www.toptalentjobs.nl/lp3/personeel",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function Lp3PersoneelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
