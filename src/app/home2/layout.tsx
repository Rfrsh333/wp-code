import { Metadata } from "next";

const title = "Horecapersoneel binnen 24 uur | TopTalent Jobs";
const description =
  "Last-minute personeel nodig? TopTalent Jobs levert gescreend horecapersoneel binnen 24 uur. Vraag direct personeel aan.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "https://toptalentjobs.nl/home2",
  },
  openGraph: {
    title,
    description,
    url: "https://toptalentjobs.nl/home2",
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

export default function Home2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
