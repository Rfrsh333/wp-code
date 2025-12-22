"use client";

import { useEffect, useState } from "react";

interface Testimonial {
  name: string;
  company: string;
  content: string;
}

interface MiniTestimonialCarouselProps {
  testimonials: Testimonial[];
}

export default function MiniTestimonialCarousel({
  testimonials,
}: MiniTestimonialCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  if (testimonials.length === 0) {
    return null;
  }

  const active = testimonials[activeIndex];

  return (
    <div className="bg-white border border-neutral-100 rounded-2xl p-5 shadow-sm max-w-md">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7A00] to-[#EA580C] text-white flex items-center justify-center text-xs font-semibold">
          {active.name
            .split(" ")
            .map((part) => part[0])
            .join("")}
        </div>
        <div className="flex-1">
          <p className="text-sm text-neutral-600 leading-relaxed mb-3">
            "{active.content}"
          </p>
          <p className="text-xs font-semibold text-neutral-900">
            {active.name} · {active.company}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            aria-label={`Bekijk testimonial ${index + 1}`}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              index === activeIndex
                ? "bg-[#FF7A00] w-6"
                : "bg-neutral-200 hover:bg-neutral-300 w-2.5"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
