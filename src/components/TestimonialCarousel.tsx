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
    <Section variant="white" spacing="large">
      <Container>
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
              Ervaringen uit de praktijk
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">
              Resultaat dat je merkt op de vloer
            </h2>
            <p className="text-neutral-600">
              Horeca-ondernemers die snel moesten schakelen en weer grip kregen.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((item) => (
            <FadeIn key={item.name}>
              <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm h-full">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 mb-3">
                  {item.context}
                </p>
                <p className="text-sm text-neutral-700 mb-4">{item.result}</p>
                <p className="text-sm font-semibold text-neutral-900">
                  {item.name} · {item.role}, {item.company}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.2}>
          <div className="text-center mt-10 lg:mt-12">
            <Link
              href="/testimonials"
              className="inline-flex items-center gap-2 text-neutral-700 hover:text-[#FF7A00] transition-colors font-medium group"
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
