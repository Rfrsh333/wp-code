"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Thank You Page - Candidates
 * Warm, personal confirmation page after registration/application
 */
export default function BedanktKandidaatPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "lead_success",
      form: "inschrijven",
    });
    return () => clearTimeout(timer);
  }, []);

  const steps = [
    {
      emoji: "👀",
      title: "We bekijken je profiel",
      description: "Ons team neemt je gegevens en ervaring zorgvuldig door",
    },
    {
      emoji: "📞",
      title: "We nemen contact met je op",
      description: "Binnen 48 uur hoor je van ons voor een kennismaking",
    },
    {
      emoji: "🤝",
      title: "We matchen je met passende opdrachten",
      description: "Samen vinden we de perfecte match voor jouw talenten",
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
          Bedankt voor je inschrijving!
        </h1>

        {/* Intro text */}
        <p
          className={`text-lg text-neutral-600 text-center mb-12 leading-relaxed max-w-xl mx-auto transition-all duration-700 delay-150 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Super dat je je hebt aangemeld bij TopTalent!
          <br />
          We zijn blij dat je deel wilt uitmaken van ons team.
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
                <div className="flex-shrink-0 w-12 h-12 bg-[#FFF7F1] rounded-full flex items-center justify-center text-2xl">
                  {step.emoji}
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

        {/* Motivational message */}
        <p
          className={`text-center text-neutral-500 mb-10 transition-all duration-700 delay-250 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Wij geloven in jouw talent en kijken ernaar uit om samen te werken!
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
            href="/vacatures"
            className="inline-flex items-center justify-center border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
            hover:border-[#FF7A00] hover:text-[#FF7A00] hover:-translate-y-0.5 active:scale-[0.98]
            transition-all duration-300"
          >
            Bekijk vacatures
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
            Contact opnemen
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
