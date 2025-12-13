"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Hero from "@/components/Hero";
import ServicesSection from "@/components/ServicesSection";
import WhyTopTalent from "@/components/WhyTopTalent";
import HowWeWorkCarousel from "@/components/HowWeWorkCarousel";
import MarqueeBanner from "@/components/MarqueeBanner";
import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";

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
  { name: "Restaurants", icon: "🍽️", count: "150+" },
  { name: "Hotels", icon: "🏨", count: "80+" },
  { name: "Catering", icon: "🍴", count: "60+" },
  { name: "Evenementen", icon: "🎉", count: "200+" },
  { name: "Cafés & Bars", icon: "☕", count: "90+" },
  { name: "Festivals", icon: "🎪", count: "40+" },
];

export default function Home() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // Auto-rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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
        <Section.Container>
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
        </Section.Container>
      </Section>

      {/* Testimonials Section - Light, Warm & Premium */}
      <section
        className="py-20 lg:py-28 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF7F1 18%, #FFF7F1 82%, #FFFFFF 100%)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header */}
          <FadeIn>
            <div className="text-center mb-14 lg:mb-16">
              <span className="inline-block text-[#FF7A00] font-semibold text-xs tracking-wider uppercase mb-4 bg-white px-4 py-2 rounded-full border border-orange-100 shadow-sm">
                Testimonials
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1F1F1F]">
                Wat onze klanten zeggen
              </h2>
            </div>
          </FadeIn>

          {/* Testimonial Card with Profile Photo */}
          <FadeIn delay={0.15}>
            <div className="max-w-3xl mx-auto">
              {/* Card Container with Profile Photo */}
              <div className="relative">
                {/* Profile Photo - Overlapping on Desktop */}
                <div className="flex justify-center lg:block lg:absolute lg:-left-8 lg:top-1/2 lg:-translate-y-1/2 mb-[-28px] lg:mb-0 z-10">
                  <div
                    className="w-14 h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden border-[3px] border-white relative"
                    style={{
                      boxShadow: '0 8px 20px rgba(0,0,0,0.12)'
                    }}
                  >
                    {/* Fallback Avatar with Initials */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FF7A00] to-[#EA580C] flex items-center justify-center text-white font-bold text-lg lg:text-xl">
                      {testimonials[activeTestimonial].name.split(' ').map(n => n[0]).join('')}
                    </div>
                  </div>
                </div>

                {/* Testimonial Card */}
                <div
                  className="bg-white rounded-[20px] p-8 lg:p-12 lg:pl-16 relative"
                  style={{
                    boxShadow: '0 20px 50px rgba(0,0,0,0.06)'
                  }}
                >
                  {/* Quote Icon - Subtle */}
                  <div className="absolute top-6 right-6 lg:top-8 lg:right-8">
                    <svg className="w-8 h-8 lg:w-10 lg:h-10 text-[#FF7A00] opacity-30" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="transition-all duration-500">
                    <p className="text-lg lg:text-xl xl:text-2xl text-[#1F1F1F] leading-relaxed mb-8 pr-8 lg:pr-12">
                      &ldquo;{testimonials[activeTestimonial].content}&rdquo;
                    </p>

                    {/* Author Info */}
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-semibold text-[#1F1F1F] text-base lg:text-lg">
                          {testimonials[activeTestimonial].name}
                        </h4>
                        <span className="text-sm text-neutral-500">
                          {testimonials[activeTestimonial].role}, {testimonials[activeTestimonial].company}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dots Navigation */}
                  <div className="flex justify-center gap-2 mt-8 lg:mt-10">
                    {testimonials.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveTestimonial(index)}
                        aria-label={`Bekijk testimonial ${index + 1}`}
                        className={`h-2.5 rounded-full transition-all duration-300 ${
                          index === activeTestimonial
                            ? "bg-[#FF7A00] w-8"
                            : "bg-neutral-200 hover:bg-neutral-300 w-2.5"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* View All Link - Subtle */}
          <FadeIn delay={0.25}>
            <div className="text-center mt-10 lg:mt-12">
              <Link
                href="/testimonials"
                className="inline-flex items-center gap-2 text-neutral-600 hover:text-[#FF7A00] transition-colors font-medium group"
              >
                Bekijk alle testimonials
                <svg
                  className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA Section - White background */}
      <Section variant="white" spacing="large">
        <Section.Container>
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
        </Section.Container>
      </Section>
    </>
  );
}
