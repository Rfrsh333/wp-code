"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Premium Sticky Mobile CTA Bar
 *
 * A conversion-optimized sticky bottom bar for mobile devices.
 * Features:
 * - WhatsApp, Call, and "Personeel aanvragen" buttons
 * - Glassmorphism effect for premium feel
 * - Safe area inset handling for iOS devices
 * - Appears after scrolling past first viewport
 * - Mobile-only (hidden on tablet/desktop)
 * - 44px touch targets for accessibility
 */
export default function StickyMobileCTA() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show CTA after user scrolls past first viewport
    const handleScroll = () => {
      const scrolled = window.scrollY > window.innerHeight * 0.5;
      setIsVisible(scrolled);
    };

    // Initial check
    handleScroll();

    // Listen for scroll events (throttled with RAF)
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-40
        md:hidden
        transition-transform duration-500 ease-out
        ${isVisible ? "translate-y-0" : "translate-y-full"}
      `}
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      {/* Glassmorphism container */}
      <div className="mx-3 mb-3 rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-neutral-200/50">
        <div className="grid grid-cols-3 gap-2 p-2">
          {/* WhatsApp Button */}
          <a
            href="https://wa.me/31617177939?text=Hallo!%20Ik%20heb%20een%20vraag%20over%20TopTalent%20Jobs."
            target="_blank"
            rel="noopener noreferrer"
            className="
              flex flex-col items-center justify-center gap-1
              min-h-[60px] rounded-xl
              bg-gradient-to-br from-green-50 to-green-100/50
              text-green-700
              hover:from-green-100 hover:to-green-200/50
              active:scale-95
              transition-all duration-200
              group
            "
            aria-label="Chat op WhatsApp"
          >
            <svg
              className="w-6 h-6 group-hover:scale-110 transition-transform duration-200"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span className="text-xs font-semibold">WhatsApp</span>
          </a>

          {/* Call Button */}
          <a
            href="tel:+31617177939"
            className="
              flex flex-col items-center justify-center gap-1
              min-h-[60px] rounded-xl
              bg-gradient-to-br from-blue-50 to-blue-100/50
              text-blue-700
              hover:from-blue-100 hover:to-blue-200/50
              active:scale-95
              transition-all duration-200
              group
            "
            aria-label="Bel ons"
          >
            <svg
              className="w-6 h-6 group-hover:scale-110 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <span className="text-xs font-semibold">Bel direct</span>
          </a>

          {/* Personeel aanvragen Button - Primary CTA */}
          <Link
            href="/personeel-aanvragen/"
            className="
              flex flex-col items-center justify-center gap-1
              min-h-[60px] rounded-xl
              bg-gradient-to-br from-[#F27501] to-[#d96800]
              text-white
              hover:from-[#d96800] hover:to-[#c25e00]
              active:scale-95
              transition-all duration-200
              shadow-lg shadow-orange-500/25
              group
            "
            aria-label="Personeel aanvragen"
          >
            <svg
              className="w-6 h-6 group-hover:scale-110 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="text-xs font-bold">Aanvragen</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
