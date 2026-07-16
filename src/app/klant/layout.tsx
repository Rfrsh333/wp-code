import { Metadata, Viewport } from "next";
import RegisterSW from "./components/RegisterSW";
import KlantPWAInstallPrompt from "./components/PWAInstallPrompt";
import AIChatWidget from "@/components/shared/AIChatbot/AIChatWidgetLazy";
import QueryProvider from "@/components/QueryProvider";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
  manifest: "/manifest-klant.json",
  icons: {
    icon: "/favicon-icon.png",
    apple: "/icons/icon-klant-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TopTalent Business",
  },
  other: {
    "mobile-web-app-capable": "yes",
    // Nodig voor iOS-standalone (Next 16 emit dit niet meer via appleWebApp.capable).
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e3a5f" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1f33" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function KlantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // PWA-/apple-meta (incl. apple-touch-icon) komt uit de metadata-export hierboven;
  // een handmatige <head> in een geneste layout gaf hydration-errors — verwijderd.
  return (
    <QueryProvider>
      <RegisterSW />
      <KlantPWAInstallPrompt />
      {children}
      <AIChatWidget userType="klant" />
    </QueryProvider>
  );
}
