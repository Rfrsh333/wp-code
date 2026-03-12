"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClickSparkWrapper from "@/components/ClickSparkWrapper";

const GradientBackground = dynamic(() => import("@/components/animations/GradientBackground"), { ssr: false });
const WhatsAppButton = dynamic(() => import("@/components/WhatsAppButton"), { ssr: false });

const PORTAL_PREFIXES = ["/admin", "/klant", "/medewerker", "/kandidaat", "/spoeddienst"];

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
