import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detachering horeca personeel Utrecht | TopTalent Jobs",
  description:
    "Detachering van horecapersoneel in Utrecht. Een vaste kracht in uw team zonder werkgeversrisico, met heldere afspraken en begeleiding.",
  alternates: {
    canonical: "https://toptalentjobs.nl/locaties/utrecht/detachering",
  },
};

export default function DetacheringUtrechtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
