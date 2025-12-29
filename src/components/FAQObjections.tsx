"use client";

import Link from "next/link";
import FadeIn from "@/components/animations/FadeIn";
import { Section, Container } from "@/components/Section";

export default function FAQObjections() {
  const faqs = [
    {
      question: "Wat als het personeel niet past?",
      answer: "We bieden directe vervanging binnen 24 uur. Geen gedoe, geen extra kosten. Je betaalt alleen voor personeel dat werkt.",
    },
    {
      question: "Hoe zit het met last-minute shifts?",
      answer: "Onze flexpool staat klaar voor acute uitval. Vaak kunnen we nog dezelfde dag personeel leveren als je belt voor 12:00 uur.",
    },
    {
      question: "Hoe snel kan het écht geregeld zijn?",
      answer: "Na intake krijg je binnen 15 minuten een matchscore. Bij beschikbaarheid start het personeel binnen 24 uur — vaak zelfs sneller.",
    },
  ];

  return (
    <Section variant="tinted" spacing="large">
      <Container>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* FAQ Content */}
            <FadeIn>
              <div>
                <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                  Veelgestelde vragen
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-8">
                  Geen verrassingen, alleen duidelijkheid
                </h2>

                <div className="space-y-6">
                  {faqs.map((faq, index) => (
                    <div key={index} className="bg-white rounded-xl p-6 border border-neutral-200 shadow-sm">
                      <h3 className="font-semibold text-neutral-900 mb-2 flex items-start gap-3">
                        <span className="text-[#F97316] text-xl flex-shrink-0">•</span>
                        {faq.question}
                      </h3>
                      <p className="text-neutral-600 text-sm leading-relaxed ml-8">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* CTA Box */}
            <FadeIn delay={0.2}>
              <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">
                  Nog twijfels?
                </h3>
                <p className="text-white/90 mb-6 leading-relaxed">
                  Laat ons je situatie beoordelen. We geven je binnen 15 minuten een eerlijk antwoord of we kunnen helpen.
                </p>
                <Link
                  href="/personeel-aanvragen"
                  className="inline-flex items-center justify-center bg-white text-[#F97316] px-6 py-3 rounded-xl font-semibold hover:bg-neutral-100 transition-all duration-300 w-full sm:w-auto shadow-xl"
                >
                  Laat me de matchscore zien
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <p className="text-white/70 text-xs mt-4">
                  ✓ Geen verplichtingen  ✓ Reactie binnen 15 min
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </Container>
    </Section>
  );
}
