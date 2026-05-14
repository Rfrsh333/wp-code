import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kennismakingsgesprek Plannen | TopTalent Jobs",
  description:
    "Plan een gratis kennismakingsgesprek met TopTalent Jobs. Ontdek hoe wij uw horecabedrijf helpen met betrouwbaar en flexibel personeel.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/kennismaking-plannen",
  },
  openGraph: {
    title: "Kennismakingsgesprek Plannen | TopTalent Jobs",
    description:
      "Plan een gratis kennismakingsgesprek met TopTalent Jobs. Ontdek hoe wij uw horecabedrijf helpen met betrouwbaar personeel.",
    url: "https://www.toptalentjobs.nl/kennismaking-plannen",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
};

export default function KennismakingPlannenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
