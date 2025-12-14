"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Thank You Page - Contact Form
 * Confirmation page after contact form submission
 */
export default function BedanktContactPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      className="min-h-[calc(100vh-200px)] flex items-center justify-center py-20"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF7F1 50%, #FFFFFF 100%)'
      }}
    >
      <div className="max-w-3xl mx-auto px-6">
        {/* Success Icon */}
        <div
          className={`flex justify-center mb-8 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="w-20 h-20 bg-[#FFF7F1] rounded-full flex items-center justify-center">
            <div className="w-14 h-14 bg-[#FF7A00] rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1
          className={`text-3xl md:text-4xl lg:text-5xl font-bold text-[#1F1F1F] text-center mb-6 transition-all duration-700 delay-100 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Bedankt voor je bericht!
        </h1>

        {/* Intro text */}
        <p
          className={`text-lg text-neutral-600 text-center mb-12 leading-relaxed max-w-xl mx-auto transition-all duration-700 delay-150 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          We hebben je bericht goed ontvangen.
          <br />
          Ons team neemt zo snel mogelijk contact met je op.
        </p>

        {/* Info Card */}
        <div
          className={`bg-white rounded-2xl p-8 mb-10 transition-all duration-700 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{
            boxShadow: "0 20px 50px rgba(0,0,0,0.06)"
          }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-[#FFF7F1] rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-[#FF7A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-[#1F1F1F]">Reactietijd</h2>
              <p className="text-neutral-500 text-sm">Meestal binnen 24 uur</p>
            </div>
          </div>

          <p className="text-neutral-600 leading-relaxed">
            We doen ons best om zo snel mogelijk te reageren. Heb je een dringende vraag?
            Bel ons gerust op <a href="tel:+31649200412" className="text-[#FF7A00] font-semibold hover:underline">+31 6 49 20 04 12</a>.
          </p>
        </div>

        {/* Trust message */}
        <p
          className={`text-center text-neutral-500 mb-10 transition-all duration-700 delay-250 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Wij zijn 7 dagen per week bereikbaar.
        </p>

        {/* CTAs */}
        <div
          className={`flex flex-col sm:flex-row gap-4 justify-center mb-8 transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-[#FF7A00] text-white px-8 py-4 rounded-xl font-semibold
            shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
            hover:bg-[#E66E00] hover:-translate-y-0.5 active:scale-[0.98]
            transition-all duration-300"
          >
            Terug naar home
          </Link>

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
          className={`text-center transition-all duration-700 delay-350 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <Link
            href="/contact#faq"
            className="inline-flex items-center gap-2 text-neutral-500 hover:text-[#FF7A00] transition-colors duration-300 font-medium group"
          >
            Bekijk veelgestelde vragen
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
      </div>
    </section>
  );
}
