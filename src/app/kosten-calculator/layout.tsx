import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kosten Calculator",
  description: "Bereken direct de tarieven voor horecapersoneel. Vergelijk kosten van vast personeel, uitzendkrachten en ZZP'ers met de gratis calculator van TopTalent Jobs.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
