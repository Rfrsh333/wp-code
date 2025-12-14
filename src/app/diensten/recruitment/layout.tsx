import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recruitment - Vaste Horeca Medewerkers Werven",
  description: "Op zoek naar vast horeca personeel? TopTalent Jobs helpt u de perfecte kandidaat te vinden. Recruitment en werving voor restaurants, hotels en catering.",
};

export default function RecruitmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
