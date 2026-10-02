import { Metadata } from "next";

export const metadata: Metadata = {
  // absolute: de root-template voegt anders nogmaals "| TopTalent Jobs" toe.
  title: { absolute: "Cookiebeleid | TopTalent Jobs" },
  description: "Lees het cookiebeleid van TopTalent Jobs. Wij gebruiken cookies om de website te verbeteren en uw ervaring te personaliseren.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/cookies/",
  },
};

export default function CookiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
