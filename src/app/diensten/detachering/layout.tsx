import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detachering - Langdurig Horeca Personeel",
  description: "Zoekt u horeca personeel voor langere periode? TopTalent Jobs detacheert ervaren medewerkers bij uw bedrijf. Vast team, flexibele voorwaarden.",
};

export default function DetacheringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
