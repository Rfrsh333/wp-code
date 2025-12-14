import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Uitzenden - Flexibel Horeca Personeel",
  description: "Tijdelijk horeca personeel nodig? TopTalent Jobs levert flexibele uitzendkrachten voor piekdrukte, evenementen of ziektevervanging. Binnen 24 uur geregeld.",
};

export default function UitzendenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
