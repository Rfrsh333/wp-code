"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Section, Container } from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";
import { useToast } from "@/components/ui/Toast";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  slug: string;
}

const CATEGORIES = [
  "Kosten & Tarieven",
  "Hoe het werkt",
  "Functies & Personeel",
  "Contracten & Juridisch",
  "Locaties & Beschikbaarheid",
  "Voor horecamedewerkers",
  "Evenementen & Catering",
  "Kwaliteit & Screening",
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const toast = useToast();

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const res = await fetch("/api/faq");
        const { data } = await res.json();
        if (data) setFaqs(data);
      } catch {
        // Silently fail, empty state shown
      } finally {
        setIsLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const q = searchQuery.toLowerCase();
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q)
    );
  }, [faqs, searchQuery]);

  const faqsByCategory = useMemo(() => {
    const grouped: Record<string, FAQItem[]> = {};
    for (const cat of CATEGORIES) {
      const items = filteredFaqs.filter((f) => f.category === cat);
      if (items.length > 0) grouped[cat] = items;
    }
    // Catch any items with categories not in CATEGORIES
    const ungrouped = filteredFaqs.filter(
      (f) => !CATEGORIES.includes(f.category)
    );
    if (ungrouped.length > 0) grouped["Overig"] = ungrouped;
    return grouped;
  }, [filteredFaqs]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scrollToCategory = (category: string) => {
    setActiveCategory(category);
    setSearchQuery("");
    const el = sectionRefs.current[category];
    if (el) {
      const offset = 120;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Hero */}
      <Section variant="tinted" spacing="large">
        <Container>
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-white px-4 py-2 rounded-full border border-orange-100 shadow-sm">
                FAQ
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-6">
                Veelgestelde vragen over{" "}
                <span className="text-[#F97316]">horecapersoneel</span> inhuren
              </h1>
              <p className="text-neutral-600 text-lg leading-relaxed mb-8">
                Alles wat je wilt weten over uitzendwerk in de horeca — van
                kosten tot contracten
              </p>

              {/* Search */}
              <div className="relative max-w-xl mx-auto">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Zoek in alle vragen..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveCategory(null);
                  }}
                  className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316] shadow-sm"
                />
                {searchQuery && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                    {filteredFaqs.length} resultaten
                  </span>
                )}
              </div>
            </div>
          </FadeIn>
        </Container>
      </Section>

      {/* Category Nav */}
      <div className="sticky top-0 z-30 bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const count = faqs.filter((f) => f.category === cat).length;
              if (count === 0 && !isLoading) return null;
              return (
                <button
                  key={cat}
                  onClick={() => scrollToCategory(cat)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? "bg-[#F97316] text-white"
                      : "bg-neutral-100 text-neutral-700 hover:bg-orange-50 hover:text-[#F97316]"
                  }`}
                >
                  {cat}
                  {count > 0 && (
                    <span className="ml-1.5 text-xs opacity-70">({count})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <Section variant="white" spacing="large">
        <Container>
          {isLoading ? (
            <div className="max-w-3xl mx-auto space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-6 bg-neutral-200 rounded w-48 mb-4" />
                  <div className="space-y-3">
                    {[1, 2, 3].map((j) => (
                      <div
                        key={j}
                        className="h-14 bg-neutral-100 rounded-xl"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : Object.keys(faqsByCategory).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-500 text-lg">
                Geen vragen gevonden
                {searchQuery && (
                  <>
                    {" "}
                    voor &ldquo;{searchQuery}&rdquo;.{" "}
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-[#F97316] font-medium hover:underline"
                    >
                      Wis zoekopdracht
                    </button>
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-12">
              {Object.entries(faqsByCategory).map(([category, items]) => (
                <div
                  key={category}
                  ref={(el) => { sectionRefs.current[category] = el; }}
                  id={category.toLowerCase().replace(/[^a-z0-9]/g, "-")}
                >
                  <FadeIn>
                    <h2 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-3">
                      <span className="w-1.5 h-8 bg-[#F97316] rounded-full" />
                      {category}
                    </h2>
                  </FadeIn>

                  <div className="space-y-3">
                    {items.map((faq) => (
                      <div
                        key={faq.id}
                        className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:border-[#F97316]/30 transition-colors"
                      >
                        <button
                          onClick={() => toggleItem(faq.id)}
                          className="w-full px-6 py-5 text-left flex items-center justify-between gap-4"
                        >
                          <span className="font-semibold text-neutral-900">
                            {faq.question}
                          </span>
                          <svg
                            className={`w-5 h-5 text-[#F97316] flex-shrink-0 transition-transform ${
                              openItems.has(faq.id) ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        {openItems.has(faq.id) && (
                          <div className="px-6 pb-5">
                            <div className="text-neutral-600 leading-relaxed whitespace-pre-line">
                              {faq.answer}
                            </div>
                            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                              <Link
                                href={`/veelgestelde-vragen/${faq.slug}`}
                                className="text-sm text-[#F97316] hover:underline font-medium"
                              >
                                Lees meer over dit onderwerp →
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Container>
      </Section>

      {/* Submit Question Form */}
      <SubmitQuestionSection toast={toast} />

      {/* CTA */}
      <Section variant="white" spacing="large">
        <Container>
          <FadeIn>
            <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-60 h-60 border border-white/20 rounded-full translate-x-1/3 translate-y-1/3" />
              </div>
              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Direct horecapersoneel nodig?
                </h2>
                <p className="text-white/90 text-lg mb-8">
                  Vraag vrijblijvend personeel aan en ontvang binnen 15 minuten
                  een matchscore.
                </p>
                <Link
                  href="/personeel-aanvragen"
                  className="inline-flex items-center justify-center bg-white text-[#F97316] px-8 py-4 rounded-xl text-base font-semibold hover:bg-neutral-100 transition-all duration-300 shadow-xl"
                >
                  Personeel aanvragen
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </FadeIn>
        </Container>
      </Section>
    </>
  );
}

/* ==========================================================================
   Vraag-indienformulier
   ========================================================================== */

function SubmitQuestionSection({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [question, setQuestion] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || question.trim().length < 10) {
      toast.error("Stel een vraag van minimaal 10 tekens");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tickets/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          visitor_email: email.trim() || undefined,
          visitor_name: name.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error();

      setIsSubmitted(true);
      setQuestion("");
      setEmail("");
      setName("");
      toast.success("Vraag ingediend!");
    } catch {
      toast.error("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Section variant="tinted" spacing="large">
      <Container>
        <FadeIn>
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-white px-4 py-2 rounded-full border border-orange-100 shadow-sm">
              Stel je vraag
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Staat jouw vraag er niet bij?
            </h2>
            <p className="text-neutral-600 mb-8">
              Stel je vraag en wij beantwoorden deze zo snel mogelijk. Je vraag
              kan ook worden toegevoegd aan onze FAQ.
            </p>

            {isSubmitted ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-8">
                <svg
                  className="w-12 h-12 text-green-500 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-green-800 mb-2">
                  Bedankt voor je vraag!
                </h3>
                <p className="text-green-700">
                  We beantwoorden je vraag zo snel mogelijk.
                  {email && " Je ontvangt een bericht zodra het antwoord klaar is."}
                </p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="mt-4 text-green-700 font-medium hover:underline"
                >
                  Nog een vraag stellen
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div>
                  <label
                    htmlFor="faq-question"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    Je vraag *
                  </label>
                  <textarea
                    id="faq-question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={3}
                    maxLength={500}
                    required
                    placeholder="Bijv. Hoeveel kost een uitzendkracht kok per uur?"
                    className="w-full px-4 py-3 bg-white rounded-xl border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="faq-name"
                      className="block text-sm font-medium text-neutral-700 mb-1"
                    >
                      Naam <span className="text-neutral-400">(optioneel)</span>
                    </label>
                    <input
                      id="faq-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Je naam"
                      className="w-full px-4 py-3 bg-white rounded-xl border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="faq-email"
                      className="block text-sm font-medium text-neutral-700 mb-1"
                    >
                      E-mail{" "}
                      <span className="text-neutral-400">(optioneel)</span>
                    </label>
                    <input
                      id="faq-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="je@email.nl"
                      className="w-full px-4 py-3 bg-white rounded-xl border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                    />
                  </div>
                </div>
                <div className="text-center pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#F27501] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#d96800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Versturen..." : "Vraag insturen"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
