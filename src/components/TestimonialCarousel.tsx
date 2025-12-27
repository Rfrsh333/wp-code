"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import FadeIn from "@/components/animations/FadeIn";

interface Testimonial {
  name: string;
  role: string;
  company: string;
  content: string;
  image: string;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
}

export default function TestimonialCarousel({ testimonials }: TestimonialCarouselProps) {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  return (
    <section
      className="py-20 lg:py-28 relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF7F1 18%, #FFF7F1 82%, #FFFFFF 100%)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <FadeIn>
          <div className="text-center mb-14 lg:mb-16">
            <span className="inline-block text-[#FF7A00] font-semibold text-xs tracking-wider uppercase mb-4 bg-white px-4 py-2 rounded-full border border-orange-100 shadow-sm">
              Ervaringen
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1F1F1F]">
              Wat horeca-werkgevers zeggen
            </h2>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <div className="flex justify-center lg:block lg:absolute lg:-left-8 lg:top-1/2 lg:-translate-y-1/2 mb-[-28px] lg:mb-0 z-10">
                <div
                  className="w-14 h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden border-[3px] border-white relative"
                  style={{
                    boxShadow: '0 8px 20px rgba(0,0,0,0.12)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FF7A00] to-[#EA580C] flex items-center justify-center text-white font-bold text-lg lg:text-xl">
                    {testimonials[activeTestimonial].name.split(' ').map(n => n[0]).join('')}
                  </div>
                </div>
              </div>

              <div
                className="bg-white rounded-[20px] p-8 lg:p-12 lg:pl-16 relative"
                style={{
                  boxShadow: '0 20px 50px rgba(0,0,0,0.06)'
                }}
              >
                <div className="absolute top-6 right-6 lg:top-8 lg:right-8">
                  <svg className="w-8 h-8 lg:w-10 lg:h-10 text-[#FF7A00] opacity-30" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>

                <div className="transition-all duration-500">
                  <p className="text-lg lg:text-xl xl:text-2xl text-[#1F1F1F] leading-relaxed mb-8 pr-8 lg:pr-12">
                    &ldquo;{testimonials[activeTestimonial].content}&rdquo;
                  </p>

                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold text-[#1F1F1F] text-base lg:text-lg">
                        {testimonials[activeTestimonial].name}
                      </h3>
                      <span className="text-sm text-neutral-600">
                        {testimonials[activeTestimonial].role}, {testimonials[activeTestimonial].company}
                      </span>
                    </div>
                  </div>
                </div>

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

        <FadeIn delay={0.25}>
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
      </div>
    </section>
  );
}
