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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#F27501] focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Ga naar inhoud
      </a>
      <GradientBackground />
      <ClickSparkWrapper>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
      </ClickSparkWrapper>
      <WhatsAppButton />
    </>
  );
}
