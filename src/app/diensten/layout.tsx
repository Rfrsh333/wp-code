import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diensten horeca uitzendbureau | Uitzenden, detachering, recruitment",
  description: "Overzicht van de diensten van ons horeca uitzendbureau. Kies tussen uitzenden, detachering of recruitment voor uw locatie.",
};

export default function DienstenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
