import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ervaringen & Reviews",
  description: "Lees klantervaringen en reviews van horecabedrijven die samenwerken met TopTalent Jobs. Ontdek hoe restaurants, hotels en eventbedrijven hun personeel regelen.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
