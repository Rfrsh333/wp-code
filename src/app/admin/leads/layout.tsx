import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leads Import - TopTalent Admin",
  robots: "noindex, nofollow",
};

export default function LeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
