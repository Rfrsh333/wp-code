import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Veelgestelde Vragen",
  description: "Antwoorden op veelgestelde vragen over horecapersoneel inhuren via TopTalent Jobs. Alles over kosten, contracten, functies en hoe uitzendwerk in de horeca werkt.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
