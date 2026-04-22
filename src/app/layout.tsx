import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import PublicShell from "@/components/PublicShell";
import StructuredData from "@/components/StructuredData";
import GtmLoader from "@/components/GtmLoader";
import CookieConsent from "@/components/CookieConsent";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import ConsentAnalytics from "@/components/ConsentAnalytics";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.toptalentjobs.nl"),
  title: {
    default: "TopTalent Jobs - Horeca Uitzendbureau Utrecht",
    template: "%s | TopTalent Jobs",
  },
  description: "Snel en betrouwbaar horeca personeel nodig? TopTalent Jobs levert binnen 24 uur ervaren krachten voor restaurants, hotels en evenementen in Utrecht en omgeving.",
  keywords: ["horeca uitzendbureau", "personeel horeca", "uitzendbureau utrecht", "horeca vacatures", "evenementen personeel", "catering personeel"],
  authors: [{ name: "TopTalent Jobs" }],
  openGraph: {
    title: "TopTalent Jobs - Horeca Uitzendbureau Utrecht",
    description: "Snel en betrouwbaar horeca personeel nodig? TopTalent Jobs levert binnen 24 uur ervaren krachten voor restaurants, hotels en evenementen.",
    url: "https://www.toptalentjobs.nl",
    siteName: "TopTalent Jobs",
    locale: "nl_NL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TopTalent Jobs - Horeca Uitzendbureau Utrecht",
    description: "Snel en betrouwbaar horeca personeel nodig? TopTalent Jobs levert binnen 24 uur ervaren krachten.",
  },
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large" as const,
    "max-video-preview": -1,
  },
  alternates: {
    types: {
      "application/rss+xml": "https://www.toptalentjobs.nl/feed.xml",
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-icon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  other: {
    "geo.region": "NL",
    "geo.placename": "Utrecht",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://nntxpyoyrpquzghsnwxj.supabase.co" />
        <link rel="dns-prefetch" href="https://nntxpyoyrpquzghsnwxj.supabase.co" />
        <link rel="preconnect" href="https://vitals.vercel-insights.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <StructuredData />
      </head>
      <body
        className={`${inter.variable} ${plusJakarta.variable} antialiased`}
        suppressHydrationWarning
      >
        <GtmLoader />
        <ToastProvider>
          <ConfirmProvider>
            <PublicShell>{children}</PublicShell>
            <CookieConsent />
          </ConfirmProvider>
        </ToastProvider>
        <ConsentAnalytics />
      </body>
    </html>
  );
}
