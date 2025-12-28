import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Horeca uitzenden Rotterdam | flexibel personeel",
  description:
    "Horeca uitzenden in Rotterdam? Wij leveren snel en flexibel tijdelijk horecapersoneel voor restaurants, hotels, havenlocaties en evenementen.",
  alternates: {
    canonical: "https://toptalentjobs.nl/locaties/rotterdam/uitzenden",
  },
};

export default function UitzendenRotterdamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
