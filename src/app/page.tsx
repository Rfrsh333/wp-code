import type { Metadata } from "next";
import Link from "next/link";
import Hero from "@/components/Hero";
import ServicesSection from "@/components/ServicesSection";
import WhyTopTalent from "@/components/WhyTopTalent";
import HowWeWorkCarousel from "@/components/HowWeWorkCarousel";
import MarqueeBanner from "@/components/MarqueeBanner";
import { Section, Container } from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";
import TestimonialCarousel from "@/components/TestimonialCarousel";

/* ==========================================================================
   Testimonials Data
   ========================================================================== */
const testimonials = [
  {
    name: "Martijn de Vries",
    role: "Eigenaar",
    company: "Restaurant De Smaak",
    content: "TopTalent heeft ons enorm geholpen tijdens de drukke zomermaanden. Binnen een dag hadden we ervaren bediening op de vloer.",
    image: "/images/testimonials/martijn.jpg",
  },
  {
    name: "Sophie Jansen",
    role: "HR Manager",
    company: "Grand Hotel Amsterdam",
    content: "TopTalent onderscheidt zich door hun persoonlijke aanpak en het begrip van onze specifieke behoeften.",
    image: "/images/testimonials/sophie.jpg",
  },
  {
    name: "Rick van den Berg",
    role: "Operations Manager",
    company: "Catering Company",
    content: "TopTalent begrijpt de dynamiek van de eventbranche en levert altijd betrouwbare, professionele medewerkers.",
    image: "/images/testimonials/rick.jpg",
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
  alternates: {
    canonical: "https://toptalentjobs.nl/",
  },
};

export default function Home() {
  return (
    <>
      {/* ============================================================
          SECTION FLOW (Jobaway Style):
          Hero (white) → Clients (tinted) → HowWeWork (white) →
          WhyTopTalent (tinted) → FunFacts (white) → Services (tinted) →
          Industries (white) → Testimonials (dark) → Values (tinted) → CTA (white)
          ============================================================ */}

      {/* Hero Section - White background (BEHOUDEN) */}
      <Hero />

      {/* Service Banner - Premium Marquee */}
      <MarqueeBanner />

      {/* How We Work - White section */}
      <HowWeWorkCarousel />

      {/* Why TopTalent - Tinted background */}
      <WhyTopTalent />

      {/* Services - Tinted section */}
      <ServicesSection />

      {/* Industries Section - Jobaway Style */}
      <Section variant="white" spacing="large">
        <Container>
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                Branches
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
                Wij leveren aan alle <span className="text-[#F97316]">horecabranches</span>
              </h2>
              <p className="text-neutral-600 max-w-2xl mx-auto">
                Van fine dining tot festivals - wij hebben ervaring in alle segmenten van de horeca.
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
                  <span className="text-sm text-[#F97316] font-medium">{industry.count} klanten</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </Container>
      </Section>

      {/* Testimonials Section */}
      <TestimonialCarousel testimonials={testimonials} />

      {/* CTA Section - White background */}
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
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                  Klaar om samen te werken?
                </h2>
                <p className="text-white/90 text-lg leading-relaxed mb-10">
                  Of u nu personeel zoekt of een nieuwe carrière wilt starten in de horeca,
                  wij helpen u graag verder. Neem vandaag nog contact met ons op.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/contact"
                    className="bg-white text-[#F97316] px-8 py-4 rounded-xl text-base font-semibold
                    hover:bg-neutral-100 transition-all duration-300"
                  >
                    Neem contact op
                  </Link>
                  <Link
                    href="tel:+31649200412"
                    className="border-2 border-white/30 text-white px-8 py-4 rounded-xl text-base font-semibold
                    hover:bg-white/10 transition-all duration-300"
                  >
                    Bel direct: +31 6 49 20 04 12
                  </Link>
                </div>
              </div>
            </div>
          </FadeIn>
        </Container>
      </Section>
    </>
  );
}
