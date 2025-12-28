import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Horeca uitzenden Amsterdam | flexibel personeel",
  description:
    "Horeca uitzenden in Amsterdam? Wij leveren snel en flexibel tijdelijk horecapersoneel voor restaurants, hotels, events en festivals.",
  alternates: {
    canonical: "https://toptalentjobs.nl/locaties/amsterdam/uitzenden",
  },
};

export default function UitzendenAmsterdamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
