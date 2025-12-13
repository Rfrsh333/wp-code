"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Thank You Page - Business Clients
 * Professional confirmation page after form submission
 */
export default function BedanktZakelijkPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const steps = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      title: "Intake & afstemming",
      description: "We bespreken uw wensen en planning",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Matching",
      description: "Wij selecteren geschikt personeel uit ons netwerk",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Inzet",
      description: "Snel geregeld, flexibel inzetbaar",
    },
  ];

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
          Bedankt voor uw aanvraag
        </h1>

        {/* Intro text */}
        <p
          className={`text-lg text-neutral-600 text-center mb-12 leading-relaxed max-w-xl mx-auto transition-all duration-700 delay-150 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Wij hebben uw aanvraag succesvol ontvangen.
          <br />
          Ons team neemt binnen 24 uur contact met u op om de details te bespreken.
        </p>

        {/* Steps Section */}
        <div
          className={`bg-white rounded-2xl p-8 mb-10 transition-all duration-700 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{
            boxShadow: "0 20px 50px rgba(0,0,0,0.06)"
          }}
        >
          <h2 className="text-lg font-semibold text-[#1F1F1F] mb-6 text-center">
            Wat gebeurt er nu?
          </h2>

          <div className="space-y-6">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-4"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-[#FFF7F1] rounded-full flex items-center justify-center text-[#FF7A00]">
                  {step.icon}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 bg-[#FF7A00] rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <h3 className="font-semibold text-[#1F1F1F]">{step.title}</h3>
                  </div>
                  <p className="text-neutral-500 text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust message */}
        <p
          className={`text-center text-neutral-500 mb-10 transition-all duration-700 delay-250 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Wij zijn 7 dagen per week bereikbaar en staan bekend om snelle schakeling.
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
            href="/contact"
            className="inline-flex items-center gap-2 text-neutral-500 hover:text-[#FF7A00] transition-colors duration-300 font-medium group"
          >
            Direct contact opnemen
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
