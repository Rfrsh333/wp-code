"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type {
  CalculatorInputs,
  Resultaten,
  FunctieType,
  ErvaringType,
  InzetType,
  VergelijkingType,
  LeadFormData,
} from "@/lib/calculator/types";
import {
  berekenKosten,
  formatCurrency,
  formatCurrencyDecimal,
} from "@/lib/calculator/calculate";
import {
  functieLabels,
  functieIcons,
  ervaringLabels,
  vergelijkingLabels,
  dagen,
} from "@/lib/calculator/tarieven";

// ============================================================================
// Analytics Helpers
// ============================================================================

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function trackEvent(eventName: string, params?: Record<string, unknown>) {
  // GA4
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
  // Meta Pixel
  if (typeof window !== "undefined" && window.fbq) {
    if (eventName === "calculator_lead") {
      window.fbq("track", "Lead", params);
    }
  }
}

// ============================================================================
// Animated Counter Component
// ============================================================================

function AnimatedCounter({ value, prefix = "€", duration = 800 }: {
  value: number;
  prefix?: string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function for smooth animation
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <span>
      {prefix} {displayValue.toLocaleString("nl-NL")}
    </span>
  );
}

// ============================================================================
// Step Indicator Component
// ============================================================================

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-10">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
              transition-all duration-500 ${
              currentStep === step
                ? "bg-[#F97316] text-white scale-110 shadow-lg shadow-orange-500/30"
                : currentStep > step
                ? "bg-[#F97316] text-white"
                : "bg-neutral-100 text-neutral-400"
            }`}
          >
            {currentStep > step ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              step
            )}
          </div>
          {step < totalSteps && (
            <div
              className={`w-16 sm:w-24 h-1 mx-2 rounded-full transition-all duration-500 ${
                currentStep > step ? "bg-[#F97316]" : "bg-neutral-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Calculator Page
// ============================================================================

export default function KostenCalculatorPage() {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfToken, setPdfToken] = useState<string | null>(null);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  const [inputs, setInputs] = useState<CalculatorInputs>({
    functie: "bediening",
    aantalMedewerkers: 2,
    ervaring: "ervaren",
    urenPerDienst: 6,
    dagenPerWeek: [4, 5, 6], // Vr, Za, Zo
    inzetType: "regulier",
    vergelijkingen: ["vast", "uitzend"],
  });

  const [resultaten, setResultaten] = useState<Resultaten>({});

  const [leadForm, setLeadForm] = useState<LeadFormData>({
    naam: "",
    bedrijfsnaam: "",
    email: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Track page view on mount
  useEffect(() => {
    trackEvent("calculator_view");
  }, []);

  // Track when user starts calculator
  const handleStart = useCallback(() => {
    trackEvent("calculator_start");
  }, []);

  // Calculate costs
  const handleCalculate = () => {
    setIsCalculating(true);

    // Simulate calculation delay for UX
    setTimeout(() => {
      const results = berekenKosten(inputs);
      setResultaten(results);
      setIsCalculating(false);
      setShowResults(true);
    }, 1200);
  };

  // Validate lead form
  const validateLeadForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!leadForm.naam.trim()) {
      errors.naam = "Naam is verplicht";
    }

    if (!leadForm.bedrijfsnaam.trim()) {
      errors.bedrijfsnaam = "Bedrijfsnaam is verplicht";
    }

    if (!leadForm.email.trim()) {
      errors.email = "E-mail is verplicht";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadForm.email)) {
      errors.email = "Ongeldig e-mailadres";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit lead form
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateLeadForm()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/calculator/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead: leadForm,
          inputs,
          resultaten,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPdfToken(data.pdfToken);
        trackEvent("calculator_lead", {
          functie: inputs.functie,
          aantalMedewerkers: inputs.aantalMedewerkers,
        });
        setShowLeadModal(false);
      } else {
        alert(data.error || "Er is iets misgegaan. Probeer het opnieuw.");
      }
    } catch {
      alert("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!pdfToken) return;

    setIsPdfDownloading(true);

    try {
      const response = await fetch(`/api/calculator/pdf?token=${pdfToken}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `kostenoverzicht-${leadForm.bedrijfsnaam.replace(/\s+/g, "-").toLowerCase()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        trackEvent("calculator_pdf_download");
      } else {
        alert("PDF kon niet worden gedownload. Probeer het opnieuw.");
      }
    } catch {
      alert("Er is iets misgegaan bij het downloaden.");
    } finally {
      setIsPdfDownloading(false);
    }
  };

  // Reset calculator
  const handleReset = () => {
    setShowResults(false);
    setCurrentStep(1);
    setResultaten({});
    setPdfToken(null);
    setLeadForm({ naam: "", bedrijfsnaam: "", email: "" });
  };

  // Helper functions
  const getDagenLabel = () => inputs.dagenPerWeek.map((d) => dagen[d]).join(", ");
  const getFunctieLabel = () => functieLabels[inputs.functie] || inputs.functie;

  return (
    <>
      {/* Hero Section */}
      <section
        className="pt-32 pb-16"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #FFF7F1 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="inline-block bg-orange-100 text-[#F97316] text-xs font-semibold px-4 py-2 rounded-full uppercase tracking-wide mb-6">
            Gratis tool
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
            Wat kost horecapersoneel <span className="text-[#F97316]">écht</span>?
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Bereken in 2 minuten uw personeelskosten. Vergelijk vast personeel,
            uitzendkrachten en ZZP'ers — en ontvang een helder kostenoverzicht.
          </p>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          {!showResults ? (
            <div
              className="opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
              style={{ animationDelay: "0.1s" }}
            >
              {/* Progress Steps */}
              <StepIndicator currentStep={currentStep} totalSteps={3} />

              {/* Calculator Card */}
              <div className="bg-white rounded-3xl shadow-xl shadow-neutral-900/5 border border-neutral-100 p-8 lg:p-12">
                {/* Step 1: Personeel */}
                {currentStep === 1 && (
                  <div className="space-y-8 animate-[slideIn_0.3s_ease-out]">
                    <div>
                      <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                        Welk personeel heeft u nodig?
                      </h2>
                      <p className="text-neutral-500">Stap 1 van 3</p>
                    </div>

                    {/* Functie Selection */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-3">
                        Functie
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {(Object.keys(functieLabels) as FunctieType[]).map((functie) => (
                          <button
                            key={functie}
                            type="button"
                            onClick={() => {
                              setInputs({ ...inputs, functie });
                              if (currentStep === 1) handleStart();
                            }}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 ${
                              inputs.functie === functie
                                ? "border-[#F97316] bg-[#FFF7F1] shadow-md"
                                : "border-neutral-200 hover:border-[#F97316]/50 hover:bg-neutral-50"
                            }`}
                          >
                            <span className="text-2xl">{functieIcons[functie]}</span>
                            <span className="font-medium text-neutral-900">
                              {functieLabels[functie]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Aantal Medewerkers */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-3">
                        Aantal medewerkers per dienst:{" "}
                        <span className="text-[#F97316] font-bold text-lg">
                          {inputs.aantalMedewerkers}
                        </span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={inputs.aantalMedewerkers}
                        onChange={(e) =>
                          setInputs({ ...inputs, aantalMedewerkers: parseInt(e.target.value) })
                        }
                        className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                          [&::-webkit-slider-thumb]:bg-[#F97316] [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                      />
                      <div className="flex justify-between text-sm text-neutral-400 mt-2">
                        <span>1</span>
                        <span>20</span>
                      </div>
                    </div>

                    {/* Ervaring Selection */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-3">
                        Ervaringsniveau
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {(["starter", "ervaren", "senior"] as ErvaringType[]).map((ervaring) => (
                          <button
                            key={ervaring}
                            type="button"
                            onClick={() => setInputs({ ...inputs, ervaring })}
                            className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                              inputs.ervaring === ervaring
                                ? "border-[#F97316] bg-[#FFF7F1] shadow-md"
                                : "border-neutral-200 hover:border-[#F97316]/50"
                            }`}
                          >
                            <span className="block font-semibold text-neutral-900">
                              {ervaringLabels[ervaring]}
                            </span>
                            <span className="text-xs text-neutral-500">
                              {ervaring === "starter" && "Weinig/geen ervaring"}
                              {ervaring === "ervaren" && "1-3 jaar ervaring"}
                              {ervaring === "senior" && "3+ jaar, zelfstandig"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="w-full bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                        shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                        hover:bg-[#EA580C] hover:-translate-y-0.5 active:translate-y-0
                        transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      Volgende
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Step 2: Inzet */}
                {currentStep === 2 && (
                  <div className="space-y-8 animate-[slideIn_0.3s_ease-out]">
                    <div>
                      <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                        Wanneer en hoe vaak?
                      </h2>
                      <p className="text-neutral-500">Stap 2 van 3</p>
                    </div>

                    {/* Uren per dienst */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-3">
                        Uren per dienst:{" "}
                        <span className="text-[#F97316] font-bold text-lg">
                          {inputs.urenPerDienst}
                        </span>
                      </label>
                      <input
                        type="range"
                        min="4"
                        max="12"
                        step="0.5"
                        value={inputs.urenPerDienst}
                        onChange={(e) =>
                          setInputs({ ...inputs, urenPerDienst: parseFloat(e.target.value) })
                        }
                        className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                          [&::-webkit-slider-thumb]:bg-[#F97316] [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                      />
                      <div className="flex justify-between text-sm text-neutral-400 mt-2">
                        <span>4 uur</span>
                        <span>12 uur</span>
                      </div>
                    </div>

                    {/* Dagen per week */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-3">
                        Dagen per week
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {dagen.map((dag, index) => (
                          <button
                            key={dag}
                            type="button"
                            onClick={() => {
                              const newDagen = inputs.dagenPerWeek.includes(index)
                                ? inputs.dagenPerWeek.filter((d) => d !== index)
                                : [...inputs.dagenPerWeek, index].sort();
                              setInputs({ ...inputs, dagenPerWeek: newDagen });
                            }}
                            className={`flex-1 min-w-[3rem] py-3 rounded-xl font-medium transition-all duration-300 ${
                              inputs.dagenPerWeek.includes(index)
                                ? "bg-[#F97316] text-white shadow-md"
                                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                            }`}
                          >
                            {dag}
                          </button>
                        ))}
                      </div>
                      {inputs.dagenPerWeek.length === 0 && (
                        <p className="text-red-500 text-sm mt-2">Selecteer minimaal 1 dag</p>
                      )}
                    </div>

                    {/* Type inzet */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-3">
                        Type inzet
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {(["regulier", "spoed"] as InzetType[]).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setInputs({ ...inputs, inzetType: type })}
                            className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                              inputs.inzetType === type
                                ? "border-[#F97316] bg-[#FFF7F1] shadow-md"
                                : "border-neutral-200 hover:border-[#F97316]/50"
                            }`}
                          >
                            <span className="block font-semibold text-neutral-900">
                              {type === "regulier" ? "Regulier" : "Spoed"}
                            </span>
                            <span className="text-sm text-neutral-500">
                              {type === "regulier"
                                ? "Minimaal 48 uur vooraf"
                                : "Binnen 48 uur (+15%)"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex gap-4">
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="flex-1 border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
                          hover:border-neutral-300 hover:bg-neutral-50 transition-all duration-300
                          flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Terug
                      </button>
                      <button
                        onClick={() => setCurrentStep(3)}
                        disabled={inputs.dagenPerWeek.length === 0}
                        className="flex-1 bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                          shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                          hover:bg-[#EA580C] hover:-translate-y-0.5 active:translate-y-0
                          transition-all duration-300 flex items-center justify-center gap-2
                          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      >
                        Volgende
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Vergelijking */}
                {currentStep === 3 && (
                  <div className="space-y-8 animate-[slideIn_0.3s_ease-out]">
                    <div>
                      <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                        Welke opties wilt u vergelijken?
                      </h2>
                      <p className="text-neutral-500">Stap 3 van 3</p>
                    </div>

                    {/* Vergelijking Options */}
                    <div className="space-y-3">
                      {(["vast", "uitzend", "zzp"] as VergelijkingType[]).map((type) => {
                        const descriptions: Record<VergelijkingType, string> = {
                          vast: "Eigen medewerker in loondienst, inclusief werkgeverslasten",
                          uitzend: "Flexibel via TopTalent, all-in uurtarief",
                          zzp: "Zelfstandige professional, exclusief BTW",
                        };

                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              const newVergelijkingen = inputs.vergelijkingen.includes(type)
                                ? inputs.vergelijkingen.filter((v) => v !== type)
                                : [...inputs.vergelijkingen, type];
                              setInputs({ ...inputs, vergelijkingen: newVergelijkingen });
                            }}
                            className={`w-full p-5 rounded-xl border-2 text-left transition-all duration-300 flex items-start gap-4 ${
                              inputs.vergelijkingen.includes(type)
                                ? "border-[#F97316] bg-[#FFF7F1] shadow-md"
                                : "border-neutral-200 hover:border-[#F97316]/50 hover:bg-neutral-50"
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300 ${
                                inputs.vergelijkingen.includes(type)
                                  ? "bg-[#F97316] border-[#F97316]"
                                  : "border-neutral-300"
                              }`}
                            >
                              {inputs.vergelijkingen.includes(type) && (
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <span className="block font-semibold text-neutral-900">
                                {vergelijkingLabels[type]}
                              </span>
                              <span className="text-sm text-neutral-500">{descriptions[type]}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {inputs.vergelijkingen.length === 0 && (
                      <p className="text-red-500 text-sm">Selecteer minimaal 1 optie</p>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex gap-4">
                      <button
                        onClick={() => setCurrentStep(2)}
                        className="flex-1 border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
                          hover:border-neutral-300 hover:bg-neutral-50 transition-all duration-300
                          flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Terug
                      </button>
                      <button
                        onClick={handleCalculate}
                        disabled={inputs.vergelijkingen.length === 0 || isCalculating}
                        className="flex-1 bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                          shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                          hover:bg-[#EA580C] hover:-translate-y-0.5 active:translate-y-0
                          transition-all duration-300 flex items-center justify-center gap-2
                          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      >
                        {isCalculating ? (
                          <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Berekenen...
                          </>
                        ) : (
                          <>
                            Bereken kosten
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Results View */
            <div className="animate-[fadeIn_0.5s_ease-out]">
              {/* Results Header */}
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-neutral-900 mb-4">Uw kostenoverzicht</h2>
                <p className="text-neutral-600 max-w-xl mx-auto">
                  Op basis van: {inputs.aantalMedewerkers} medewerker{inputs.aantalMedewerkers > 1 ? "s" : ""} ·{" "}
                  {getFunctieLabel()} · {ervaringLabels[inputs.ervaring]}
                  <br />
                  {inputs.urenPerDienst} uur per dienst · {inputs.dagenPerWeek.length} dagen ({getDagenLabel()}) ·{" "}
                  {inputs.inzetType === "regulier" ? "Regulier" : "Spoed"}
                </p>
              </div>

              {/* Results Cards */}
              <div
                className={`grid gap-6 mb-8 ${
                  inputs.vergelijkingen.length === 3
                    ? "grid-cols-1 md:grid-cols-3"
                    : inputs.vergelijkingen.length === 2
                    ? "grid-cols-1 md:grid-cols-2"
                    : "grid-cols-1 max-w-md mx-auto"
                }`}
              >
                {inputs.vergelijkingen.map((type, index) => {
                  const result = resultaten[type];
                  const isUitzend = type === "uitzend";

                  return (
                    <div
                      key={type}
                      className={`bg-white rounded-2xl p-6 border-2 transition-all duration-500 animate-[slideUp_0.5s_ease-out_forwards] opacity-0 ${
                        isUitzend
                          ? "border-[#F97316] shadow-xl shadow-orange-500/10"
                          : "border-neutral-200"
                      }`}
                      style={{ animationDelay: `${index * 150}ms` }}
                    >
                      {isUitzend && (
                        <span className="inline-block bg-[#F97316] text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                          Aanbevolen
                        </span>
                      )}

                      <h3 className="text-lg font-bold text-neutral-900 mb-2">
                        {vergelijkingLabels[type]}
                      </h3>

                      <p className="text-sm text-neutral-500 mb-6">
                        {formatCurrencyDecimal(result?.uurtarief || 0)} per uur
                      </p>

                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-neutral-500 mb-1">Per dienst</p>
                          <p className="text-2xl font-bold text-neutral-900">
                            <AnimatedCounter value={result?.perDienst || 0} duration={1000} />
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-500 mb-1">Per week</p>
                          <p className="text-2xl font-bold text-neutral-900">
                            <AnimatedCounter value={result?.perWeek || 0} duration={1200} />
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-500 mb-1">Per maand</p>
                          <p className="text-3xl font-bold text-[#F97316]">
                            <AnimatedCounter value={result?.perMaand || 0} duration={1400} />
                          </p>
                        </div>
                      </div>

                      {/* Pros/Cons */}
                      <div className="border-t border-neutral-100 mt-6 pt-6">
                        {type === "vast" && (
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2 text-neutral-600">
                              <span className="text-orange-500">+</span> Werving & selectie
                            </li>
                            <li className="flex items-center gap-2 text-neutral-600">
                              <span className="text-orange-500">+</span> Administratie
                            </li>
                            <li className="flex items-center gap-2 text-neutral-600">
                              <span className="text-orange-500">+</span> Risico bij uitval
                            </li>
                          </ul>
                        )}
                        {type === "uitzend" && (
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2 text-green-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Werving inclusief
                            </li>
                            <li className="flex items-center gap-2 text-green-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Vervanging bij uitval
                            </li>
                            <li className="flex items-center gap-2 text-green-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Volledige flexibiliteit
                            </li>
                          </ul>
                        )}
                        {type === "zzp" && (
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2 text-neutral-600">
                              <span className="text-orange-500">+</span> Werving zelf
                            </li>
                            <li className="flex items-center gap-2 text-red-500">
                              <span>−</span> Geen garanties
                            </li>
                            <li className="flex items-center gap-2 text-red-500">
                              <span>−</span> Schijnzelfstandigheid
                            </li>
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Disclaimer */}
              <p className="text-center text-sm text-neutral-500 mb-8">
                * Berekening op basis van gemiddelde tarieven 2024/2025. Exacte kosten kunnen afwijken.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {pdfToken ? (
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isPdfDownloading}
                    className="bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                      shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                      hover:bg-[#EA580C] hover:-translate-y-0.5 active:translate-y-0
                      transition-all duration-300 flex items-center justify-center gap-2
                      disabled:opacity-50"
                  >
                    {isPdfDownloading ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Downloaden...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download PDF
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowLeadModal(true)}
                    className="bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                      shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                      hover:bg-[#EA580C] hover:-translate-y-0.5 active:translate-y-0
                      transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download als PDF
                  </button>
                )}

                <button
                  onClick={handleReset}
                  className="border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
                    hover:border-neutral-300 hover:bg-neutral-50 transition-all duration-300"
                >
                  Nieuwe berekening
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-neutral-900 text-center mb-12">
            Hoe wij rekenen
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: "Actuele tarieven",
                desc: "Gebaseerd op marktgemiddelden en onze eigen ervaring in de horeca.",
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: "CAO-conform",
                desc: "Onze tarieven voldoen aan de CAO Horeca en alle wettelijke verplichtingen.",
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
                title: "Transparante opbouw",
                desc: "Geen verborgen kosten. Wat u ziet is wat u betaalt.",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 text-center shadow-sm border border-neutral-100
                  hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-[#FFF7F1] rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#F97316]">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-3">{item.title}</h3>
                <p className="text-neutral-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div
            className="py-12 px-8 rounded-3xl"
            style={{
              background: "linear-gradient(180deg, #FFF7F1 0%, #FFFFFF 100%)",
            }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
              Liever persoonlijk advies?
            </h2>
            <p className="text-neutral-600 mb-8">
              Elke horecazaak is anders. Wij denken graag mee over een personeelsoplossing die past bij uw situatie.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                  shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                  hover:bg-[#EA580C] hover:-translate-y-0.5 transition-all duration-300 text-center"
              >
                Neem contact op
              </Link>
              <Link
                href="/diensten"
                className="border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
                  hover:border-[#F97316] hover:text-[#F97316] transition-all duration-300 text-center"
              >
                Bekijk onze diensten
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Capture Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
            onClick={() => setShowLeadModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 max-h-[90vh] overflow-y-auto animate-[scaleIn_0.3s_ease-out]">
            <button
              onClick={() => setShowLeadModal(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center
                hover:bg-neutral-200 transition-colors duration-300"
            >
              <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#FFF7F1] rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-2">
                Ontvang uw kostenoverzicht
              </h3>
              <p className="text-neutral-600">
                Wij sturen u een overzichtelijke PDF met uw volledige berekening.
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                "Uw volledige berekening",
                "Vergelijking vast / uitzend / ZZP",
                "Uitleg over de tarieven",
                "Besparingstips voor uw situatie",
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-neutral-700">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Uw naam *"
                  value={leadForm.naam}
                  onChange={(e) => setLeadForm({ ...leadForm, naam: e.target.value })}
                  className={`w-full px-4 py-3.5 border rounded-xl outline-none transition-all duration-300 bg-neutral-50 focus:bg-white
                    ${formErrors.naam ? "border-red-400 focus:ring-red-200" : "border-neutral-200 focus:ring-[#F97316]/20 focus:border-[#F97316]"} focus:ring-2`}
                />
                {formErrors.naam && <p className="text-red-500 text-sm mt-1">{formErrors.naam}</p>}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Bedrijfsnaam *"
                  value={leadForm.bedrijfsnaam}
                  onChange={(e) => setLeadForm({ ...leadForm, bedrijfsnaam: e.target.value })}
                  className={`w-full px-4 py-3.5 border rounded-xl outline-none transition-all duration-300 bg-neutral-50 focus:bg-white
                    ${formErrors.bedrijfsnaam ? "border-red-400 focus:ring-red-200" : "border-neutral-200 focus:ring-[#F97316]/20 focus:border-[#F97316]"} focus:ring-2`}
                />
                {formErrors.bedrijfsnaam && <p className="text-red-500 text-sm mt-1">{formErrors.bedrijfsnaam}</p>}
              </div>
              <div>
                <input
                  type="email"
                  placeholder="E-mailadres *"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                  className={`w-full px-4 py-3.5 border rounded-xl outline-none transition-all duration-300 bg-neutral-50 focus:bg-white
                    ${formErrors.email ? "border-red-400 focus:ring-red-200" : "border-neutral-200 focus:ring-[#F97316]/20 focus:border-[#F97316]"} focus:ring-2`}
                />
                {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                  shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                  hover:bg-[#EA580C] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Versturen..." : "Verstuur mijn kostenoverzicht"}
              </button>
            </form>

            <p className="text-center text-sm text-neutral-500 mt-6">
              Wij delen uw gegevens nooit met derden.{" "}
              <Link href="/privacy" className="text-[#F97316] hover:underline">
                Privacybeleid
              </Link>
            </p>
          </div>
        </div>
      )}

    </>
  );
}
