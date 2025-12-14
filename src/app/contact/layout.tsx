import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact - Neem Direct Contact Op",
  description: "Neem contact op met TopTalent Jobs. Bel +31 6 49 20 04 12 of stuur een bericht. Wij reageren binnen 24 uur. 7 dagen per week bereikbaar.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
