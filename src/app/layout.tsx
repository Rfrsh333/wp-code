import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClickSparkWrapper from "@/components/ClickSparkWrapper";
import GradientBackground from "@/components/animations/GradientBackground";

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
  title: "TopTalent Jobs - Jouw Personeel, Onze Missie",
  description: "Flexibel en kwalitatief personeel voor horeca en evenementen. Uitzenden, detachering en recruitment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body
        className={`${inter.variable} ${plusJakarta.variable} antialiased`}
      >
        <GradientBackground />
        <ClickSparkWrapper>
          <Header />
          <main>{children}</main>
          <Footer />
        </ClickSparkWrapper>
      </body>
    </html>
  );
}
