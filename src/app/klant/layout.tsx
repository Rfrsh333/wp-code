import { Metadata, Viewport } from "next";

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
    statusBarStyle: "default",
    title: "TT Beheer",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a5f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TT Beheer" />
      </head>
      {children}
    </>
  );
}
