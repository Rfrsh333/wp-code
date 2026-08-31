import { Metadata, Viewport } from "next";
import ThemeProvider from "@/components/medewerker/ThemeProvider";
import ServiceWorkerRegister from "@/components/medewerker/ServiceWorkerRegister";
import AIChatWidget from "@/components/shared/AIChatbot/AIChatWidgetLazy";
import QueryProvider from "@/components/QueryProvider";

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
  other: {
    "mobile-web-app-capable": "yes",
    // Nodig voor iOS-standalone (Next 16 emit dit niet meer via appleWebApp.capable).
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Allow zoom for accessibility
  userScalable: true,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function MedewerkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // PWA-/apple-meta wordt door de metadata-export hierboven geleverd; een handmatige
  // <head> in een geneste layout veroorzaakt hydration-errors (head kan geen child van
  // body zijn) — daarom bewust verwijderd.
  return (
    <QueryProvider>
      <ThemeProvider>
        <ServiceWorkerRegister />
        {children}
        <AIChatWidget userType="medewerker" />
      </ThemeProvider>
    </QueryProvider>
  );
}
