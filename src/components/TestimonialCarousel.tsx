"use client";

import Link from "next/link";
import FadeIn from "@/components/animations/FadeIn";
import { Section, Container } from "@/components/Section";

interface Testimonial {
  context: string;
  result: string;
  name: string;
  role: string;
  company: string;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
}

export default function TestimonialCarousel({ testimonials }: TestimonialCarouselProps) {
  return (
    <Section variant="tinted" spacing="large">
      <Container>
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
              Ervaringen uit de praktijk
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4 leading-tight">
              Resultaat dat je merkt op de vloer
            </h2>
            <p className="text-lg text-neutral-600">
              Horeca-ondernemers die snel moesten schakelen en weer grip kregen.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((item, index) => (
            <FadeIn key={item.name} delay={0.1 * index}>
              <div className="bg-white rounded-2xl p-8 border border-neutral-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 h-full group relative overflow-hidden">
                {/* Subtle gradient accent on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"></div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Quote icon */}
                  <div className="w-8 h-8 bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </div>

                  {/* Context tag */}
                  <div className="inline-flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-full mb-3 border border-orange-100">
                    <span className="w-1.5 h-1.5 bg-[#F97316] rounded-full"></span>
                    <span className="text-xs font-medium text-[#F97316] uppercase tracking-wide">
                      {item.context}
                    </span>
                  </div>

                  {/* Result quote */}
                  <p className="text-base font-medium text-neutral-900 mb-5 leading-relaxed">
                    "{item.result}"
                  </p>

                  {/* Attribution */}
                  <div className="pt-5 border-t border-neutral-100">
                    <p className="font-semibold text-neutral-900 mb-1 text-sm">
                      {item.name}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {item.role} · {item.company}
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.3}>
          <div className="text-center mt-12 lg:mt-16">
            <Link
              href="/testimonials"
              className="inline-flex items-center gap-2 text-neutral-700 hover:text-[#F97316] transition-colors font-medium group"
            >
              Bekijk alle ervaringen
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
      </Container>
    </Section>
  );
}
