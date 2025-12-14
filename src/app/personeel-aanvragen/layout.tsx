import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personeel Aanvragen - Horeca Personeel Binnen 24 Uur",
  description: "Vraag direct horeca personeel aan bij TopTalent Jobs. Binnen 24 uur ervaren bediening, koks of barista's. Flexibel en betrouwbaar. Vraag nu aan!",
};

export default function PersoneelAanvragenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
