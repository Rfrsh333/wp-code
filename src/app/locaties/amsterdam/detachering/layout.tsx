import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detachering horeca personeel Amsterdam | TopTalent Jobs",
  description:
    "Detachering van horecapersoneel in Amsterdam. Een vaste kracht in uw team zonder werkgeversrisico, met heldere afspraken en begeleiding.",
  alternates: {
    canonical: "https://toptalentjobs.nl/locaties/amsterdam/detachering",
  },
};

export default function DetacheringAmsterdamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
