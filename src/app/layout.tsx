import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClickSparkWrapper from "@/components/ClickSparkWrapper";
import GradientBackground from "@/components/animations/GradientBackground";
import WhatsAppButton from "@/components/WhatsAppButton";
import StructuredData from "@/components/StructuredData";
import GtmLoader from "@/components/GtmLoader";
import CookieConsent from "@/components/CookieConsent";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://toptalentjobs.nl"),
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
    url: "https://toptalentjobs.nl",
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
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <head>
        <StructuredData />
      </head>
      <body
        className={`${inter.variable} ${plusJakarta.variable} antialiased`}
      >
        <GtmLoader />
        <GradientBackground />
        <ClickSparkWrapper>
          <Header />
          <main>{children}</main>
          <Footer />
        </ClickSparkWrapper>
        <WhatsAppButton />
        <CookieConsent />
      </body>
    </html>
  );
}
