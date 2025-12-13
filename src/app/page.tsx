"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Hero from "@/components/Hero";
import ServicesSection from "@/components/ServicesSection";
import WhyTopTalent from "@/components/WhyTopTalent";
import HowWeWorkCarousel from "@/components/HowWeWorkCarousel";
import MarqueeBanner from "@/components/MarqueeBanner";
import StatsGrid from "@/components/StatsGrid";
import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";
import StaggerContainer, { StaggerItem } from "@/components/animations/StaggerContainer";

/* ==========================================================================
   Animated Counter Hook
   ========================================================================== */
function useCountUp(target: number, duration: number = 2000, startCounting: boolean = false) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!startCounting || hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      countRef.current = Math.round(easeOut * target);
      setCount(countRef.current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [target, duration, startCounting]);

  return count;
}

/* ==========================================================================
   Intersection Observer Hook
   ========================================================================== */
function useInView(options = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    }, { threshold: 0.2, ...options });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return [ref, isInView] as const;
}

/* ==========================================================================
   Stats Data
   ========================================================================== */
const stats = [
  { value: 100, suffix: "+", label: "Tevreden klanten" },
  { value: 24, suffix: "u", label: "Responstijd" },
  { value: 98, suffix: "%", label: "Klanttevredenheid" },
  { value: 500, suffix: "+", label: "Plaatsingen" },
];

/* ==========================================================================
   Testimonials Data
   ========================================================================== */
const testimonials = [
  {
    name: "Martijn de Vries",
    role: "Eigenaar",
    company: "Restaurant De Smaak",
    content: "TopTalent heeft ons enorm geholpen tijdens de drukke zomermaanden. Binnen een dag hadden we ervaren bediening op de vloer.",
  },
  {
    name: "Sophie Jansen",
    role: "HR Manager",
    company: "Grand Hotel Amsterdam",
    content: "TopTalent onderscheidt zich door hun persoonlijke aanpak en het begrip van onze specifieke behoeften.",
  },
  {
    name: "Rick van den Berg",
    role: "Operations Manager",
    company: "Catering Company",
    content: "TopTalent begrijpt de dynamiek van de eventbranche en levert altijd betrouwbare, professionele medewerkers.",
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
  const [statsRef, statsInView] = useInView();
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

      {/* Stats Grid - Social Proof */}
      <StatsGrid />

      {/* How We Work - White section */}
      <HowWeWorkCarousel />

      {/* Why TopTalent - Tinted background */}
      <WhyTopTalent />

      {/* Fun Facts / Stats Section - Jobaway Style */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <div ref={statsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {stats.map((stat, index) => {
              const count = useCountUp(stat.value, 2000, statsInView);
              return (
                <FadeIn key={index} delay={0.1 * index}>
                  <div className="text-center p-6 lg:p-8 bg-neutral-50 rounded-2xl border border-neutral-100 hover:border-[#F97316]/30 hover:shadow-lg transition-all duration-300 group">
                    <div className="text-4xl lg:text-5xl font-bold text-[#F97316] mb-2 group-hover:scale-110 transition-transform duration-300">
                      {count}{stat.suffix}
                    </div>
                    <p className="text-neutral-600 font-medium">{stat.label}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </Section.Container>
      </Section>

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

      {/* Testimonials Section - Jobaway Style Dark */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-[#1F2937] to-[#111827] relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-white/10 px-4 py-2 rounded-full border border-white/20">
                Testimonials
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Wat onze klanten zeggen
              </h2>
            </div>
          </FadeIn>

          {/* Testimonial Slider */}
          <FadeIn delay={0.2}>
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-3xl p-8 lg:p-12 relative">
                {/* Quote Icon */}
                <div className="absolute top-6 right-6 w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center text-[#F97316]">
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>

                {/* Content */}
                <div className="transition-all duration-500">
                  <p className="text-xl lg:text-2xl text-neutral-700 leading-relaxed mb-8">
                    &ldquo;{testimonials[activeTestimonial].content}&rdquo;
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {testimonials[activeTestimonial].name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900">{testimonials[activeTestimonial].name}</h4>
                      <span className="text-sm text-neutral-500">
                        {testimonials[activeTestimonial].role}, {testimonials[activeTestimonial].company}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dots Navigation */}
                <div className="flex justify-center gap-2 mt-8">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveTestimonial(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === activeTestimonial
                          ? "bg-[#F97316] w-8"
                          : "bg-neutral-200 hover:bg-neutral-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* View All Link */}
          <FadeIn delay={0.3}>
            <div className="text-center mt-8">
              <Link
                href="/testimonials"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors font-medium"
              >
                Bekijk alle testimonials
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Values Section - Tinted for contrast */}
      <Section variant="tinted" spacing="large">
        <Section.Container>
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-white px-4 py-2 rounded-full border border-orange-100">
                Onze Waarden
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-6">
                Waar wij voor staan
              </h2>
              <p className="text-neutral-600 text-lg leading-relaxed">
                Onze kernwaarden vormen de basis van alles wat wij doen.
                Ze sturen onze beslissingen en definiëren onze samenwerking.
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.1}>
            {[
              {
                title: "Betrouwbaarheid",
                desc: "Wij komen onze afspraken na. Altijd. Dat is de basis van elk succesvol partnership.",
                icon: "🤝",
              },
              {
                title: "Kwaliteit",
                desc: "Alleen het beste personeel draagt onze naam. Grondig gescreend en professioneel getraind.",
                icon: "⭐",
              },
              {
                title: "Snelheid",
                desc: "In de horeca telt elke minuut. Wij reageren snel en leveren nog sneller.",
                icon: "⚡",
              },
              {
                title: "Persoonlijk",
                desc: "Geen nummers, maar mensen. Wij kennen onze klanten én ons talent persoonlijk.",
                icon: "❤️",
              },
            ].map((value, index) => (
              <StaggerItem key={index}>
                <div className="bg-white rounded-2xl p-8 border border-neutral-100 hover:border-[#F97316]/30 hover:shadow-xl transition-all duration-300 h-full group">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{value.icon}</div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-4">{value.title}</h3>
                  <p className="text-neutral-600 leading-relaxed">{value.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </Section.Container>
      </Section>

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
