"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClickSparkWrapper from "@/components/ClickSparkWrapper";
import GradientBackground from "@/components/animations/GradientBackground";
import WhatsAppButton from "@/components/WhatsAppButton";

const PORTAL_PREFIXES = ["/admin", "/klant", "/medewerker", "/kandidaat"];

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal = PORTAL_PREFIXES.some((p) => pathname.startsWith(p));

  if (isPortal) {
    return <>{children}</>;
  }

  return (
    <>
      <GradientBackground />
      <ClickSparkWrapper>
        <Header />
        <main>{children}</main>
        <Footer />
      </ClickSparkWrapper>
      <WhatsAppButton />
    </>
  );
}
