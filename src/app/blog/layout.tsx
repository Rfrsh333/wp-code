import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog - Tips & Nieuws over Horeca Personeel",
  description: "Lees het laatste nieuws en tips over horeca personeel, recruitment en de uitzendbranche. Blijf op de hoogte met TopTalent Jobs.",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
