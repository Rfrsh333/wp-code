"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Custom 404 Page - TopTalent
 * Professional, trustworthy, and helpful error page
 */
export default function NotFound() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation after mount
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      className="min-h-[calc(100vh-200px)] flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF7F1 50%, #FFFFFF 100%)'
      }}
    >
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Abstract shape - top right */}
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle, #FF7A00 0%, transparent 70%)'
          }}
        />
        {/* Abstract shape - bottom left */}
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle, #FF7A00 0%, transparent 70%)'
          }}
        />
        {/* Subtle plate/serving tray illustration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04]">
          <svg
            width="400"
            height="400"
            viewBox="0 0 400 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-neutral-900"
          >
            {/* Serving tray / plate outline */}
            <ellipse cx="200" cy="220" rx="150" ry="40" stroke="currentColor" strokeWidth="3" fill="none" />
            <ellipse cx="200" cy="200" rx="120" ry="30" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M80 220 Q80 180 200 160 Q320 180 320 220" stroke="currentColor" strokeWidth="2" fill="none" />
            {/* Cloche handle */}
            <ellipse cx="200" cy="120" rx="20" ry="10" stroke="currentColor" strokeWidth="2" fill="none" />
            <line x1="200" y1="130" x2="200" y2="160" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div
        className={`relative z-10 max-w-2xl mx-auto px-6 text-center transition-all duration-700 ease-out ${
          isVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4"
        }`}
      >
        {/* 404 Badge */}
        <div
          className={`inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-orange-100 shadow-sm mb-8 transition-all duration-700 delay-100 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <span className="w-2 h-2 bg-[#FF7A00] rounded-full"></span>
          <span className="text-sm font-medium text-neutral-600">Pagina niet gevonden</span>
        </div>

        {/* Heading */}
        <h1
          className={`text-3xl md:text-4xl lg:text-5xl font-bold text-[#1F1F1F] mb-6 leading-tight transition-all duration-700 delay-150 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          Oeps... deze pagina bestaat niet (meer)
        </h1>

        {/* Subtext */}
        <p
          className={`text-lg text-neutral-600 mb-10 leading-relaxed max-w-xl mx-auto transition-all duration-700 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          De pagina die je zoekt is verplaatst, verwijderd of nooit aangemaakt.
          <br className="hidden sm:block" />
          Geen zorgen — we helpen je graag weer op weg.
        </p>

        {/* CTA Buttons */}
        <div
          className={`flex flex-col sm:flex-row gap-4 justify-center mb-12 transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          {/* Primary CTA */}
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-[#FF7A00] text-white px-8 py-4 rounded-xl font-semibold
            shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
            hover:bg-[#E66E00] hover:-translate-y-0.5 active:scale-[0.98]
            transition-all duration-300"
          >
            Terug naar home
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>

          {/* Secondary CTA */}
          <Link
            href="/diensten"
            className="inline-flex items-center justify-center border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
            hover:border-[#FF7A00] hover:text-[#FF7A00] hover:-translate-y-0.5 active:scale-[0.98]
            transition-all duration-300"
          >
            Bekijk onze diensten
          </Link>
        </div>

        {/* Tertiary link */}
        <div
          className={`transition-all duration-700 delay-400 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-neutral-500 hover:text-[#FF7A00] transition-colors duration-300 font-medium group"
          >
            <span>Neem contact op</span>
            <svg
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Trust message */}
        <p
          className={`mt-10 text-sm text-neutral-400 transition-all duration-700 delay-500 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          Wij reageren binnen 24 uur — zoals je van ons gewend bent.
        </p>
      </div>
    </section>
  );
}
