"use client";

import Link from "next/link";
import FadeIn from "@/components/animations/FadeIn";
import { Section, Container } from "@/components/Section";

export default function ResultStories() {
  const stories = [
    {
      company: "Restaurant De Smaak",
      result: "+15% servicekwaliteit binnen 24 u",
      icon: "🍽️",
      highlight: "+15%",
    },
    {
      company: "Grand Hotel Amsterdam",
      result: "40 diensten ingevuld in één week",
      icon: "🏨",
      highlight: "40 diensten",
    },
    {
      company: "Cateringbedrijf",
      result: "100% inzetbaarheid tijdens piekweekend",
      icon: "🎉",
      highlight: "100%",
    },
  ];

  return (
    <Section variant="white" spacing="large">
      <Container>
        <FadeIn>
          <div className="text-center mb-12">
            <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
              Resultaatstories
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Meetbare impact voor jouw horeca
            </h2>
            <p className="text-neutral-600 max-w-2xl mx-auto">
              Geen vage beloftes — dit zijn de concrete resultaten die onze klanten behaalden.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stories.map((story, index) => (
            <FadeIn key={index} delay={0.1 * index}>
              <div className="bg-gradient-to-br from-green-50 to-orange-50 rounded-2xl p-8 border border-neutral-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                <div className="text-5xl mb-4">{story.icon}</div>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-[#F97316] block mb-2">
                    {story.highlight}
                  </span>
                  <p className="text-lg font-semibold text-neutral-900">
                    {story.result}
                  </p>
                </div>
                <p className="text-sm text-neutral-600 font-medium">
                  {story.company}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.3}>
          <div className="text-center mt-10">
            <Link
              href="/testimonials"
              className="inline-flex items-center gap-2 text-neutral-700 hover:text-[#F97316] transition-colors font-medium group"
            >
              Bekijk alle succesverhalen
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
