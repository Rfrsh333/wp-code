"use client";

import FadeIn from "@/components/animations/FadeIn";

export default function TrustBadges() {
  const badges = [
    {
      icon: "🏆",
      text: "Snelste horeca staffing Utrecht",
    },
    {
      icon: "🔎",
      text: "Gescreend personeel gegarandeerd",
    },
    {
      icon: "📍",
      text: "Actief in 5 grote regio's",
    },
  ];

  return (
    <section className="py-8 bg-white border-y border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            {badges.map((badge, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-3xl">{badge.icon}</span>
                <span className="text-sm font-semibold text-neutral-900">{badge.text}</span>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
