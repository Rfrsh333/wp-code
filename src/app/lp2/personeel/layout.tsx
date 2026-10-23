import { Metadata } from "next";

import { OG_IMAGE } from "@/lib/og-image";
const title = "Binnen 24 uur horecapersoneel aanvragen | TopTalent Jobs";
const description =
  "Snel betrouwbaar horecapersoneel nodig? TopTalent Jobs regelt gescreende krachten binnen 24 uur. Vraag direct personeel aan.";

export const metadata: Metadata = {
  title,
  description,
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: "https://www.toptalentjobs.nl/lp/personeel/",
  },
  openGraph: {
    images: [OG_IMAGE],
    title,
    description,
    url: "https://www.toptalentjobs.nl/lp/personeel",
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

export default function Lp2PersoneelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
