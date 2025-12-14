import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onze Diensten - Uitzenden, Detachering & Recruitment",
  description: "TopTalent Jobs biedt uitzenden, detachering en recruitment voor de horeca. Flexibel personeel binnen 24 uur. Bekijk onze diensten en tarieven.",
};

export default function DienstenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
