import type { Metadata } from "next";
import Link from "next/link";
import Hero from "@/components/Hero";
import ServicesSection from "@/components/ServicesSection";
import WhyTopTalent from "@/components/WhyTopTalent";
import HowWeWorkCarousel from "@/components/HowWeWorkCarousel";
import MarqueeBanner from "@/components/MarqueeBanner";
import TestimonialCarousel from "@/components/TestimonialCarousel";
import FAQObjections from "@/components/FAQObjections";
import DynamicCTA from "@/components/DynamicCTA";
import { Section, Container } from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";

/* ==========================================================================
   Testimonials Data
   ========================================================================== */
const testimonials = [
  {
    context: "Zomerdrukte in het restaurant",
    result: "Binnen 24 uur extra bediening op de vloer.",
    name: "Martijn de Vries",
    role: "Eigenaar",
    company: "Restaurant De Smaak",
  },
  {
    context: "Hotel met wisselende roosters",
    result: "Altijd passend personeel zonder gedoe.",
    name: "Sophie Jansen",
    role: "HR Manager",
    company: "Grand Hotel Amsterdam",
  },
  {
    context: "Events met piekbelasting",
    result: "Betrouwbare teams die meteen meedraaien.",
    name: "Rick van den Berg",
    role: "Operations Manager",
    company: "Catering Company",
  },
];

/* ==========================================================================
   Industries Data
   ========================================================================== */
const industries = [
  { name: "Restaurants", icon: "🍽️", count: "25+" },
  { name: "Hotels", icon: "🏨", count: "15+" },
  { name: "Catering", icon: "🍴", count: "10+" },
  { name: "Evenementen", icon: "🎉", count: "30+" },
  { name: "Cafés & Bars", icon: "☕", count: "15+" },
  { name: "Festivals", icon: "🎪", count: "5+" },
];

export const metadata: Metadata = {
  title: "Extra horecapersoneel binnen 24 u | Stop omzetverlies | TopTalent",
  description:
    "Geen paniek meer bij ziekte of last-minute uitval. TopTalent levert gescreend horecapersoneel binnen 24 uur voor restaurants, hotels en events in Utrecht en omstreken.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/",
  },
  openGraph: {
    title: "Extra horecapersoneel binnen 24 u | TopTalent",
    description: "Stop omzetverlies door personeelsuitval. Gescreend horecapersoneel binnen 24 uur. 95% van onze klanten heeft direct personeel.",
    type: "website",
    url: "https://www.toptalentjobs.nl/",
  },
};

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <Hero />

      {/* Service Banner - Premium Marquee */}
      <MarqueeBanner />

      {/* How We Work - Outcome-driven steps */}
      <HowWeWorkCarousel />

      {/* Why TopTalent - Tinted background */}
      <WhyTopTalent />

      {/* Services - Tinted section */}
      <ServicesSection />

      {/* Testimonials Section */}
      <TestimonialCarousel testimonials={testimonials} />

      {/* Industries Section */}
      <Section variant="white" spacing="large">
        <Container>
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                Horecabranches
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
                Horecapersoneel voor elke <span className="text-[#F97316]">branche</span>
              </h2>
              <p className="text-neutral-600 max-w-2xl mx-auto">
                Van fine dining tot festivals: wij leveren ervaren{" "}
                <Link href="/diensten/detachering" className="text-[#F97316] hover:underline">horecapersoneel</Link> dat past bij uw tempo en service.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {industries.map((industry, index) => (
              <FadeIn key={index} delay={0.05 * index}>
                <div className="bg-neutral-50 rounded-2xl p-6 text-center hover:bg-orange-50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer border border-neutral-100 hover:border-[#F97316]/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                    {industry.icon}
                  </div>
                  <h3 className="font-semibold text-neutral-900 mb-1">{industry.name}</h3>
                  <span className="text-sm text-[#F97316] font-medium">{industry.count} bedrijven</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </Container>
      </Section>

      {/* Locations Section - Internal Linking */}
      <Section variant="tinted" spacing="large">
        <Container>
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-white px-4 py-2 rounded-full border border-orange-100 shadow-sm">
                Actief in heel Nederland
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
                Horecapersoneel in <span className="text-[#F97316]">jouw stad</span>
              </h2>
              <p className="text-neutral-600 max-w-2xl mx-auto">
                TopTalent Jobs levert lokaal horecapersoneel in alle grote steden van Nederland.
                Kies je stad en ontdek onze diensten.
              </p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Utrecht */}
            <FadeIn delay={0}>
              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 group border border-neutral-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-neutral-900 mb-2 group-hover:text-[#F97316] transition-colors">
                      Utrecht
                    </h3>
                    <p className="text-sm text-neutral-600 mb-4">
                      Horecapersoneel voor Utrecht en omstreken
                    </p>
                  </div>
                  <span className="text-3xl">🏛️</span>
                </div>
                <div className="space-y-2">
                  <Link
                    href="/locaties/utrecht/"
                    className="block text-neutral-700 hover:text-[#F97316] font-medium transition-colors text-sm"
                  >
                    → Meer over Utrecht
                  </Link>
                  <Link
                    href="/locaties/utrecht/uitzenden/"
                    className="block text-neutral-700 hover:text-[#F97316] transition-colors text-sm"
                  >
                    → Horecapersoneel Uitzenden
                  </Link>
                  <Link
                    href="/locaties/utrecht/detachering/"
                    className="block text-neutral-700 hover:text-[#F97316] transition-colors text-sm"
                  >
                    → Horecapersoneel Detacheren
                  </Link>
                </div>
              </div>
            </FadeIn>

            {/* Den Haag */}
            <FadeIn delay={0.1}>
              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 group border border-neutral-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-neutral-900 mb-2 group-hover:text-[#F97316] transition-colors">
                      Den Haag
                    </h3>
                    <p className="text-sm text-neutral-600 mb-4">
                      Horecapersoneel voor Den Haag en regio
                    </p>
                  </div>
                  <span className="text-3xl">🏛️</span>
                </div>
                <div className="space-y-2">
                  <Link
                    href="/locaties/den-haag/"
                    className="block text-neutral-700 hover:text-[#F97316] font-medium transition-colors text-sm"
                  >
                    → Meer over Den Haag
                  </Link>
                  <Link
                    href="/locaties/den-haag/uitzenden/"
                    className="block text-neutral-700 hover:text-[#F97316] transition-colors text-sm"
                  >
                    → Horecapersoneel Uitzenden
                  </Link>
                  <Link
                    href="/locaties/den-haag/detachering/"
                    className="block text-neutral-700 hover:text-[#F97316] transition-colors text-sm"
                  >
                    → Horecapersoneel Detacheren
                  </Link>
                </div>
              </div>
            </FadeIn>

            {/* Eindhoven */}
            <FadeIn delay={0.2}>
              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 group border border-neutral-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-neutral-900 mb-2 group-hover:text-[#F97316] transition-colors">
                      Eindhoven
                    </h3>
                    <p className="text-sm text-neutral-600 mb-4">
                      Horecapersoneel voor Eindhoven en Brabant
                    </p>
                  </div>
                  <span className="text-3xl">💡</span>
                </div>
                <div className="space-y-2">
                  <Link
                    href="/locaties/eindhoven/"
                    className="block text-neutral-700 hover:text-[#F97316] font-medium transition-colors text-sm"
                  >
                    → Meer over Eindhoven
                  </Link>
                  <Link
                    href="/locaties/eindhoven/uitzenden/"
                    className="block text-neutral-700 hover:text-[#F97316] transition-colors text-sm"
                  >
                    → Horecapersoneel Uitzenden
                  </Link>
                  <Link
                    href="/locaties/eindhoven/detachering/"
                    className="block text-neutral-700 hover:text-[#F97316] transition-colors text-sm"
                  >
                    → Horecapersoneel Detacheren
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.3}>
            <div className="text-center">
              <Link
                href="/locaties/"
                className="inline-flex items-center gap-2 text-[#F97316] font-semibold hover:gap-3 transition-all duration-300"
              >
                Bekijk alle locaties
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </FadeIn>
        </Container>
      </Section>

      {/* FAQ Objections Section */}
      <FAQObjections />

      {/* CTA Section - Action-driven */}
      <Section variant="white" spacing="large">
        <Container>
          <FadeIn>
            <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-60 h-60 border border-white/20 rounded-full translate-x-1/3 translate-y-1/3"></div>
              </div>

              <div className="relative z-10 max-w-3xl mx-auto">
                {/* Trust indicator */}
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  95% van klanten heeft binnen 24 u personeel
                </div>

                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                  Klaar om nooit meer omzet te verliezen door personeelstekort?
                </h2>
                <p className="text-white/90 text-lg leading-relaxed mb-10">
                  Stop met hopen dat het goedkomt. Krijg binnen 15 minuten een realtime matchscore en weet zeker dat je morgen personeel hebt.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/personeel-aanvragen"
                    className="inline-flex items-center justify-center bg-white text-[#F97316] px-8 py-4 rounded-xl text-base font-semibold hover:bg-neutral-100 transition-all duration-300 shadow-xl"
                  >
                    Bekijk hoeveel personeel ik kan krijgen
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  <Link
                    href="/kosten-calculator"
                    className="border-2 border-white/30 text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-white/10 transition-all duration-300"
                  >
                    Bereken je kosten in 60 sec
                  </Link>
                </div>
                <p className="text-white/70 text-sm mt-6">
                  ✓ Geen inschrijfkosten  ✓ Reactie binnen 15 min  ✓ Vaak morgen al personeel
                </p>
              </div>
            </div>
          </FadeIn>
        </Container>
      </Section>

      {/* Dynamic Contextual CTA */}
      <DynamicCTA />
    </>
  );
}
