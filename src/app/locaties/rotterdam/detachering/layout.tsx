import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detachering horeca personeel Rotterdam | TopTalent Jobs",
  description:
    "Detachering van horecapersoneel in Rotterdam. Een vaste kracht in uw team zonder werkgeversrisico, met heldere afspraken en begeleiding.",
  alternates: {
    canonical: "https://toptalentjobs.nl/locaties/rotterdam/detachering",
  },
};

export default function DetacheringRotterdamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
