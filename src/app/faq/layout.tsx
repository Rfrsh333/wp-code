import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Veelgestelde Vragen (FAQ)",
  description: "Antwoorden op veelgestelde vragen over TopTalent Jobs. Hoe werkt uitzenden? Wat zijn de kosten? Hoe snel kan ik personeel krijgen? Lees het hier.",
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
