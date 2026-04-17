import { Metadata, Viewport } from "next";
import RegisterSW from "./components/RegisterSW";
import KlantPWAInstallPrompt from "./components/PWAInstallPrompt";
import AIChatWidget from "@/components/shared/AIChatbot/AIChatWidget";
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
  return (
    <>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TopTalent Business" />
        <link rel="apple-touch-icon" href="/icons/icon-klant-192.png" />
      </head>
      <QueryProvider>
        <RegisterSW />
        <KlantPWAInstallPrompt />
        {children}
        <AIChatWidget userType="klant" />
      </QueryProvider>
    </>
  );
}
