import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personeel Aanvragen",
  description: "Bestel snel en eenvoudig horecapersoneel via TopTalent Jobs. Vul het formulier in en ontvang binnen 24 uur een voorstel op maat voor uw restaurant of evenement.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
