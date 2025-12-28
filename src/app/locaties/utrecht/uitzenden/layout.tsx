import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Horeca uitzenden Utrecht | flexibel personeel",
  description:
    "Horeca uitzenden in Utrecht? Wij leveren snel en flexibel tijdelijk horecapersoneel voor restaurants, hotels en evenementen.",
  alternates: {
    canonical: "https://toptalentjobs.nl/locaties/utrecht/uitzenden",
  },
};

export default function UitzendenUtrechtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
