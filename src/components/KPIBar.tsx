"use client";

import FadeIn from "@/components/animations/FadeIn";

const StarIcon = () => (
  <svg className="w-5 h-5 text-amber-400 fill-current inline" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

export default function KPIBar() {
  const kpis = [
    {
      text: "95% van onze klanten heeft binnen 24 u personeel",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      text: "Gemiddelde klantbeoordeling:",
      rating: true,
      icon: <StarIcon />,
    },
    {
      text: "200+ horeca locaties geholpen in 2025",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-6 bg-gradient-to-r from-green-50 via-orange-50 to-green-50 border-y border-neutral-200 -mt-20 md:-mt-24 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
            {kpis.map((kpi, index) => (
              <div key={index} className="flex items-center gap-3 text-sm font-medium text-neutral-900">
                <span className="text-[#F97316] flex-shrink-0">
                  {kpi.icon}
                </span>
                <span>
                  {kpi.text}
                  {kpi.rating && (
                    <span className="ml-2 font-bold text-[#F97316]">★ 4.8/5</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
