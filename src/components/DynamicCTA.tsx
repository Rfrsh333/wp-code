"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DynamicCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const [ctaVariant, setCtaVariant] = useState<"hero" | "services">("hero");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;

      // Show CTA after scrolling past hero (roughly 100vh)
      if (scrollPosition > windowHeight * 0.8) {
        setIsVisible(true);

        // Change variant based on scroll position
        // Services section is typically around 2-3x viewport height
        if (scrollPosition > windowHeight * 2.5) {
          setCtaVariant("services");
        } else {
          setCtaVariant("hero");
        }
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const variants = {
    hero: {
      text: "Geen personeel deze week?",
      cta: "Check beschikbare teams nu",
      href: "/personeel-aanvragen",
    },
    services: {
      text: "Bezig met diensten bekijken",
      cta: "Bereken je kosten in 60 sec",
      href: "/kosten-calculator",
    },
  };

  const currentVariant = variants[ctaVariant];

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
      }`}
      role="complementary"
      aria-label="Floating call-to-action"
    >
      <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C] rounded-full shadow-2xl shadow-orange-500/30 p-1">
        <div className="bg-white rounded-full px-6 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-neutral-900 hidden sm:block">
            {currentVariant.text}
          </span>
          <Link
            href={currentVariant.href}
            className="bg-[#F97316] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#EA580C] transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
          >
            {currentVariant.cta}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
