import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meer Aanvragen voor jouw Servicebedrijf | ZenithZoom",
  description:
    "Ontvang een gratis analyse en ontdek hoe jouw installatie- of servicebedrijf meer klanten kan krijgen. Vrijblijvend, binnen 48 uur reactie.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Meer Aanvragen voor jouw Servicebedrijf",
    description:
      "Meer klanten zonder dat jij zelf met marketing bezig hoeft te zijn. Vraag een gratis analyse aan.",
    type: "website",
  },
};

export default function MeerAanvragenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
