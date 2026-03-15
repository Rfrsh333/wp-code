"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Mail, Phone, MessageCircle, HelpCircle } from "lucide-react";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import { toast } from "sonner";

export default function HelpClient() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "Hoe kan ik mijn diensten bekijken?",
      answer: "Ga naar 'Mijn diensten' in het menu. Hier zie je al je aangeboden, bevestigde en voltooide diensten.",
    },
    {
      question: "Hoe registreer ik mijn gewerkte uren?",
      answer: "Ga naar 'Uren' in het menu. Klik op een voltooide dienst en vul de gewerkte uren in. De klant moet deze goedkeuren voordat ze worden uitbetaald.",
    },
    {
      question: "Wanneer krijg ik mijn salaris uitbetaald?",
      answer: "Uitbetalingen vinden plaats aan het einde van elke maand. Je kunt je verdiensten bekijken bij 'Financieel overzicht'.",
    },
    {
      question: "Hoe wijzig ik mijn beschikbaarheid?",
      answer: "Ga naar 'Beschikbaarheid' in het menu. Hier kun je aangeven wanneer je beschikbaar bent om te werken.",
    },
    {
      question: "Wat moet ik doen bij een probleem tijdens mijn dienst?",
      answer: "Neem direct contact op met TopTalent via telefoon of chat. We helpen je graag verder!",
    },
    {
      question: "Hoe kan ik vrienden werven?",
      answer: "Ga naar 'Vrienden werven' in je account. Deel je persoonlijke referral link en verdien extra voor elke vriend die via jou begint te werken.",
    },
  ];

  const contactOptions = [
    {
      icon: Phone,
      label: "Bel ons",
      value: "020 123 4567",
      action: () => window.open("tel:+31201234567"),
    },
    {
      icon: Mail,
      label: "Email ons",
      value: "info@toptalent.nl",
      action: () => window.open("mailto:info@toptalent.nl"),
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: "Chat met ons",
      action: () => toast.info("WhatsApp chat opent..."),
    },
  ];

  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        {/* Header */}
        <div className="bg-gradient-to-br from-[var(--mp-accent)] to-[var(--mp-accent-dark)] pt-4 pb-6 px-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white mb-4 transition-opacity active:opacity-70"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Terug</span>
            </button>
            <h1 className="text-2xl font-bold text-white">Help & Support</h1>
            <p className="text-white/80 text-sm mt-1">We helpen je graag verder</p>
          </div>
        </div>

        {/* Contact Options */}
        <div className="max-w-2xl mx-auto px-4 -mt-2 mb-6">
          <h2 className="text-lg font-semibold text-[var(--mp-text-primary)] mb-4">
            Contact opnemen
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {contactOptions.map((option, idx) => {
              const Icon = option.icon;
              return (
                <button
                  key={idx}
                  onClick={option.action}
                  className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)] flex items-center gap-4 transition-all active:scale-[0.98]"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--mp-accent)] to-[var(--mp-accent-dark)] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-[var(--mp-text-primary)]">
                      {option.label}
                    </div>
                    <div className="text-sm text-[var(--mp-text-secondary)]">
                      {option.value}
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-[var(--mp-text-tertiary)] -rotate-90" />
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-lg font-semibold text-[var(--mp-text-primary)] mb-4">
            Veelgestelde vragen
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] overflow-hidden shadow-[var(--mp-shadow)]"
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full px-4 py-4 flex items-center gap-3 text-left transition-colors active:bg-[var(--mp-bg)]"
                  >
                    <HelpCircle className="w-5 h-5 text-[var(--mp-accent)] flex-shrink-0" />
                    <span className="flex-1 font-medium text-[var(--mp-text-primary)]">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-[var(--mp-text-tertiary)] transition-transform flex-shrink-0 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0">
                      <p className="text-sm text-[var(--mp-text-secondary)] pl-8">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Spacing */}
        <div className="h-8" />
      </div>
    </MedewerkerResponsiveLayout>
  );
}
