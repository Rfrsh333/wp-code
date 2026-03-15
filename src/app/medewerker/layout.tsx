import { Metadata, Viewport } from "next";
import ThemeProvider from "@/components/medewerker/ThemeProvider";
import ServiceWorkerRegister from "@/components/medewerker/ServiceWorkerRegister";
import PWAInstallPrompt from "@/components/medewerker/PWAInstallPrompt";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon-icon.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TopTalent Hub",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function MedewerkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <ThemeProvider>
        <ServiceWorkerRegister />
        <PWAInstallPrompt />
        {children}
      </ThemeProvider>
    </>
  );
}
