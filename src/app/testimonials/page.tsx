"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";

// ============================================================================
// DATA STRUCTURE - Optimized for CRO
// ============================================================================

interface FeaturedCase {
  name: string;
  role: string;
  company: string;
  segment: "restaurant" | "hotel" | "event";
  challenge: string;
  solution: string;
  outcome: string;
  stats?: string;
  image?: string;
}

interface ShortQuote {
  name: string;
  role: string;
  company: string;
  quote: string;
  segment: "restaurant" | "hotel" | "event";
  rating: number;
}

const featuredCases: FeaturedCase[] = [
  {
    name: "Martijn de Vries",
    role: "Eigenaar",
    company: "Restaurant De Smaak",
    segment: "restaurant",
    challenge: "Acute personeelstekort tijdens hoogseizoen. Restaurant moest tijdelijk minder tafels aannemen.",
    solution: "TopTalent leverde binnen 18 uur 3 ervaren bedieners die direct inzetbaar waren.",
    outcome: "Volledig capaciteit hersteld zonder kwaliteitsverlies. Geen gemiste omzet meer.",
    stats: "Binnen 18 uur opgelost",
  },
  {
    name: "Sophie Jansen",
    role: "HR Manager",
    company: "Grand Hotel Amsterdam",
    segment: "hotel",
    challenge: "Wisselende bezetting door vakantieperiodes en pieken. Interne planning was een maandelijkse hoofdpijn.",
    solution: "Vaste samenwerking met flexpool van 12 getrainde medewerkers die het hotel kennen.",
    outcome: "95% minder planningsstress. Altijd passend personeel beschikbaar zonder lange doorlooptijd.",
    stats: "12 vaste flexkrachten",
  },
  {
    name: "Rick van den Berg",
    role: "Operations Manager",
    company: "Catering Company",
    segment: "event",
    challenge: "Events vragen telkens ander aantal medewerkers. Last-minute wijzigingen zijn normaal.",
    solution: "On-demand schaalbaar team. Van 5 tot 50 medewerkers binnen 48 uur regelbaar.",
    outcome: "Geen enkel event meer afgezegd door personeelstekort. Volledige flexibiliteit zonder risico.",
    stats: "Tot 50 medewerkers binnen 48u",
  },
];

const shortQuotes: ShortQuote[] = [
  {
    name: "Emma Bakker",
    role: "Bedrijfsleider",
    company: "Brasserie Het Plein",
    quote: "Ze voelen niet als uitzendkrachten, maar als échte teamleden die het concept snappen.",
    segment: "restaurant",
    rating: 5,
  },
  {
    name: "Thomas Vermeer",
    role: "F&B Director",
    company: "Hotel Group Nederland",
    quote: "Recruitment én flexkrachten via één partner. Dat scheelt enorm veel tijd en gedoe.",
    segment: "hotel",
    rating: 5,
  },
  {
    name: "Lisa de Groot",
    role: "Eventmanager",
    company: "Premium Events",
    quote: "Representatief, ervaren, en altijd op tijd. Precies wat je nodig hebt bij high-end events.",
    segment: "event",
    rating: 5,
  },
  {
    name: "Peter Claassen",
    role: "Eigenaar",
    company: "Grand Café Utrecht",
    quote: "Binnen 24 uur vervanging bij ziekmelding. Dat is pas service die werkt.",
    segment: "restaurant",
    rating: 5,
  },
  {
    name: "Maria Koopman",
    role: "Hospitality Manager",
    company: "Boutique Hotel Rotterdam",
    quote: "De kwaliteit van screening is merkbaar. Geen verrassingen, alleen goede mensen.",
    segment: "hotel",
    rating: 5,
  },
  {
    name: "Jasper Mulder",
    role: "Projectleider",
    company: "Festival Productions",
    quote: "Ook bij grote volumes blijft de kwaliteit consistent. Dat is zeldzaam in deze branche.",
    segment: "event",
    rating: 5,
  },
];

// ============================================================================
// ICONS
// ============================================================================

const StarIcon = ({ filled = true }: { filled?: boolean }) => (
  <svg className={`w-5 h-5 ${filled ? "text-amber-400 fill-current" : "text-neutral-300"}`} viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TestimonialsPage() {
  const [activeSegment, setActiveSegment] = useState<"all" | "restaurant" | "hotel" | "event">("all");

  const filteredCases = activeSegment === "all"
    ? featuredCases
    : featuredCases.filter(c => c.segment === activeSegment);

  const filteredQuotes = activeSegment === "all"
    ? shortQuotes
    : shortQuotes.filter(q => q.segment === activeSegment);

  const segments = [
    { id: "all" as const, label: "Alle branches", icon: "🏢" },
    { id: "restaurant" as const, label: "Restaurants", icon: "🍽️" },
    { id: "hotel" as const, label: "Hotels", icon: "🏨" },
    { id: "event" as const, label: "Events", icon: "🎉" },
  ];

  return (
    <>
      {/* ================================================================
          1. HERO SECTION - Trust Hook + Social Proof
          ================================================================ */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-white via-orange-50/30 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center max-w-4xl mx-auto">
              {/* Trust badge */}
              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-green-200">
                <CheckCircleIcon />
                <span>Vertrouwd door 100+ horecabedrijven</span>
              </div>

              {/* Headline - Positioning as proven solution */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 leading-tight">
                Horeca-ondernemers die <span className="text-[#F97316]">nooit meer</span> vastlopen op personeel
              </h1>

              {/* Subheadline with credibility */}
              <p className="text-xl text-neutral-600 mb-8 leading-relaxed">
                Van acute ziekmelding tot seizoenspiek: bekijk hoe restaurants, hotels en eventbedrijven hun personeelsstress omzetten in voorspelbare zekerheid.
              </p>

              {/* Social proof summary */}
              <div className="flex flex-wrap items-center justify-center gap-8 mb-10">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} />
                    ))}
                  </div>
                  <span className="font-semibold text-neutral-900">4.9/5</span>
                  <span className="text-neutral-500 text-sm">(120+ reviews)</span>
                </div>
                <div className="h-8 w-px bg-neutral-300"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-neutral-900">18u</div>
                  <div className="text-sm text-neutral-600">Gemiddelde reactietijd</div>
                </div>
                <div className="h-8 w-px bg-neutral-300"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-neutral-900">95%</div>
                  <div className="text-sm text-neutral-600">Herhaalbeslissing</div>
                </div>
              </div>

              {/* Soft CTA */}
              <Link
                href="#featured-cases"
                className="inline-flex items-center gap-2 bg-white text-neutral-700 px-8 py-4 rounded-xl font-semibold border-2 border-neutral-200 hover:border-[#F97316] hover:text-[#F97316] transition-all duration-300 shadow-sm hover:shadow-md"
              >
                Bekijk hoe wij horeca helpen
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ================================================================
          2. SEGMENTED FILTERS (Tabs)
          ================================================================ */}
      <section className="py-12 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="flex flex-wrap justify-center gap-3">
              {segments.map((segment) => (
                <button
                  key={segment.id}
                  onClick={() => setActiveSegment(segment.id)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    activeSegment === segment.id
                      ? "bg-[#F97316] text-white shadow-lg shadow-orange-500/25"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  }`}
                >
                  <span className="mr-2">{segment.icon}</span>
                  {segment.label}
                </button>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ================================================================
          3. FEATURED CASE TESTIMONIALS - Challenge → Solution → Outcome
          ================================================================ */}
      <section id="featured-cases" className="py-20 lg:py-28 bg-gradient-to-b from-white to-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                Bewezen resultaten
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4">
                Van probleem naar oplossing
              </h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                Echte verhalen van horecabedrijven die hun personeelsprobleem definitief oplosten.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {filteredCases.map((testimonial, index) => (
              <FadeIn key={index} delay={0.1 * index}>
                <div className="bg-white rounded-2xl p-8 border border-neutral-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 h-full flex flex-col">
                  {/* Stats badge */}
                  {testimonial.stats && (
                    <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium mb-6 self-start border border-green-200">
                      <CheckCircleIcon />
                      {testimonial.stats}
                    </div>
                  )}

                  {/* Challenge */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-[#F97316] uppercase tracking-wider mb-2">
                      Situatie
                    </h4>
                    <p className="text-neutral-700 leading-relaxed">
                      {testimonial.challenge}
                    </p>
                  </div>

                  {/* Solution */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-[#F97316] uppercase tracking-wider mb-2">
                      Aanpak
                    </h4>
                    <p className="text-neutral-700 leading-relaxed">
                      {testimonial.solution}
                    </p>
                  </div>

                  {/* Outcome */}
                  <div className="mb-8">
                    <h4 className="text-sm font-semibold text-green-600 uppercase tracking-wider mb-2">
                      Resultaat
                    </h4>
                    <p className="text-neutral-900 font-medium leading-relaxed">
                      {testimonial.outcome}
                    </p>
                  </div>

                  {/* Attribution */}
                  <div className="mt-auto pt-6 border-t border-neutral-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-neutral-900">{testimonial.name}</p>
                        <p className="text-sm text-neutral-600">{testimonial.role}</p>
                        <p className="text-sm text-neutral-500">{testimonial.company}</p>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          4. SHORT QUOTE GRID - Skimmable Social Proof
          ================================================================ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
                Wat anderen zeggen
              </h2>
              <p className="text-neutral-600">
                Direct uit de praktijk, zonder opsmuk.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuotes.map((quote, index) => (
              <FadeIn key={index} delay={0.05 * index}>
                <div className="bg-neutral-50 rounded-xl p-6 hover:bg-orange-50 transition-all duration-300 border border-neutral-100 hover:border-orange-200">
                  {/* Rating */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} filled={i < quote.rating} />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-neutral-900 font-medium mb-4 leading-relaxed">
                    "{quote.quote}"
                  </p>

                  {/* Attribution */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {quote.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900 text-sm">{quote.name}</p>
                      <p className="text-xs text-neutral-600">{quote.role}, {quote.company}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          5. VIDEO TESTIMONIAL PLACEHOLDER
          ================================================================ */}
      <section className="py-20 bg-gradient-to-b from-neutral-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                Video testimonials
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
                Zie het zelf
              </h2>
              <p className="text-neutral-600 max-w-2xl mx-auto">
                Horecabedrijven vertellen hun verhaal: van stress naar zekerheid.
              </p>
            </div>
          </FadeIn>

          <div className="max-w-4xl mx-auto">
            <FadeIn delay={0.2}>
              <div className="relative aspect-video bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-2xl overflow-hidden group cursor-pointer border-2 border-neutral-300 hover:border-[#F97316] transition-all duration-300">
                {/* Placeholder background */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-[#F97316] shadow-xl group-hover:scale-110 transition-transform duration-300">
                      <PlayIcon />
                    </div>
                    <p className="text-neutral-600 font-medium">
                      Video testimonial: Restaurant De Smaak
                    </p>
                    <p className="text-sm text-neutral-500 mt-2">
                      "Hoe we ons personeelsprobleem in 24 uur oplosten"
                    </p>
                  </div>
                </div>

                {/* Coming soon badge */}
                <div className="absolute top-4 right-4 bg-[#F97316] text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                  Binnenkort beschikbaar
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ================================================================
          6. STRONG CTA SECTION - Value-driven
          ================================================================ */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-60 h-60 border border-white/20 rounded-full translate-x-1/3 translate-y-1/3"></div>
              </div>

              <div className="relative z-10 max-w-3xl mx-auto">
                {/* Trust indicator */}
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Vaak binnen 24 uur beschikbaar
                </div>

                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                  Klaar om <span className="underline decoration-white/40">nooit meer</span> vast te lopen op personeel?
                </h2>

                <p className="text-white/90 text-lg leading-relaxed mb-10">
                  Of het nu gaat om acute ziekmelding, seizoensdrukte of structurele versterking: wij zorgen dat je altijd de juiste mensen hebt. Binnen 24 uur opgestart, zonder gedoe.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/personeel-aanvragen"
                    className="inline-flex items-center justify-center bg-white text-[#F97316] px-8 py-4 rounded-xl text-base font-semibold hover:bg-neutral-100 transition-all duration-300 shadow-xl"
                  >
                    Vraag nu personeel aan
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center border-2 border-white/30 text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-white/10 transition-all duration-300"
                  >
                    Plan een gesprek
                  </Link>
                </div>

                {/* Trust reassurance */}
                <p className="text-white/70 text-sm mt-8">
                  ✓ Geen inschrijfkosten  ✓ Geen verplichtingen  ✓ Direct contact met je vaste accountmanager
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
