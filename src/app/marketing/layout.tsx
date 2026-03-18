import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketing Dashboard - TopTalent",
  robots: "noindex, nofollow",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
