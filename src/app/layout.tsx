import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClickSparkWrapper from "@/components/ClickSparkWrapper";
import GradientBackground from "@/components/animations/GradientBackground";
import WhatsAppButton from "@/components/WhatsAppButton";
import StructuredData from "@/components/StructuredData";

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
        {/* Google Tag Manager */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-5X3QX6Z6');
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${plusJakarta.variable} antialiased`}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5X3QX6Z6"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <GradientBackground />
        <ClickSparkWrapper>
          <Header />
          <main>{children}</main>
          <Footer />
        </ClickSparkWrapper>
        <WhatsAppButton />
      </body>
    </html>
  );
}
