import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inschrijven - Werk in de Horeca",
  description: "Schrijf je in bij TopTalent Jobs en vind werk in de horeca. Flexibele uren, goede betaling en leuke opdrachten bij restaurants, hotels en evenementen.",
};

export default function InschrijvenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
