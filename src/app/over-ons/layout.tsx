import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Over Ons - Horeca Uitzendbureau met Persoonlijke Aanpak",
  description: "Leer TopTalent Jobs kennen. Wij zijn een horeca uitzendbureau in Utrecht met passie voor gastvrijheid. 7 dagen per week bereikbaar, persoonlijke service.",
};

export default function OverOnsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
