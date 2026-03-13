import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Neem contact op met TopTalent Jobs voor al uw vragen over horeca uitzendwerk. Bel, mail of WhatsApp ons. Wij zijn 24/7 bereikbaar en reageren binnen 15 minuten.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
