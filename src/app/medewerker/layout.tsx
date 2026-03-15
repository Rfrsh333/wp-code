import { Metadata, Viewport } from "next";
import ThemeProvider from "@/components/medewerker/ThemeProvider";
import ServiceWorkerRegister from "@/components/medewerker/ServiceWorkerRegister";

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
    title: "TopTalent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F5F7" },
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <ThemeProvider>
        <ServiceWorkerRegister />
        {children}
      </ThemeProvider>
    </>
  );
}
