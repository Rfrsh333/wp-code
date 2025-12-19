import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recruitment - Vaste Horeca Medewerkers Werven",
  description: "Op zoek naar vast horeca personeel? TopTalent Jobs helpt u de perfecte kandidaat te vinden. Recruitment en werving voor restaurants, hotels en catering.",
  alternates: {
    canonical: "https://toptalentjobs.nl/diensten/recruitment",
  },
};

export default function RecruitmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://toptalentjobs.nl"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Diensten",
        "item": "https://toptalentjobs.nl/diensten"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Recruitment",
        "item": "https://toptalentjobs.nl/diensten/recruitment"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
