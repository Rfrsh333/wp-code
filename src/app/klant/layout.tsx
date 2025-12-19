import { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function KlantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
