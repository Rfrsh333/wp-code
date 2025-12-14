"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";

/* ==========================================================================
   Calculator Types & Data
   ========================================================================== */

type FunctieType = "bediening" | "bar" | "keuken" | "afwas" | "allround";
type ErvaringType = "starter" | "ervaren" | "senior";
type InzetType = "regulier" | "spoed";
type VergelijkingType = "vast" | "uitzend" | "zzp";

interface CalculatorInputs {
  functie: FunctieType;
  aantalMedewerkers: number;
  ervaring: ErvaringType;
  urenPerDienst: number;
  dagenPerWeek: number[];
  inzetType: InzetType;
  vergelijkingen: VergelijkingType[];
}

interface KostenResultaat {
  perDienst: number;
  perWeek: number;
  perMaand: number;
}

interface Resultaten {
  vast?: KostenResultaat;
  uitzend?: KostenResultaat;
  zzp?: KostenResultaat;
}

// Basis uurtarieven per functie (ervaren niveau)
const basisTarieven: Record<FunctieType, { vast: number; uitzend: number; zzp: number }> = {
  bediening: { vast: 18.5, uitzend: 27.0, zzp: 25.5 },
  bar: { vast: 18.5, uitzend: 27.0, zzp: 25.5 },
  keuken: { vast: 19.5, uitzend: 28.0, zzp: 26.5 },
  afwas: { vast: 17.0, uitzend: 25.0, zzp: 23.5 },
  allround: { vast: 18.5, uitzend: 27.0, zzp: 25.5 },
};

// Ervaringsmultiplier
const ervaringsMultiplier: Record<ErvaringType, number> = {
  starter: 0.85,
  ervaren: 1.0,
  senior: 1.2,
};

// Spoed toeslag
const spoedToeslag = 0.15;

// Functie labels met iconen
const functieOpties: { value: FunctieType; label: string; icon: string }[] = [
  { value: "bediening", label: "Bediening", icon: "🍽️" },
  { value: "bar", label: "Bar", icon: "🍸" },
  { value: "keuken", label: "Keuken", icon: "👨‍🍳" },
  { value: "afwas", label: "Afwas / Spoelkeuken", icon: "🧽" },
  { value: "allround", label: "Allround horeca", icon: "📋" },
];

const dagen = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

/* ==========================================================================
   Calculator Component
   ========================================================================== */

export default function CalculatorPage() {
  const [isDesktop, setIsDesktop] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [inputs, setInputs] = useState<CalculatorInputs>({
    functie: "bediening",
    aantalMedewerkers: 2,
    ervaring: "ervaren",
    urenPerDienst: 6,
    dagenPerWeek: [4, 5, 6], // Vr, Za, Zo (0-indexed)
    inzetType: "regulier",
    vergelijkingen: ["vast", "uitzend"],
  });

  const [resultaten, setResultaten] = useState<Resultaten>({});

  const [leadForm, setLeadForm] = useState({
    naam: "",
    bedrijfsnaam: "",
    email: "",
    akkoord: false,
  });

  // Check for desktop on mount and resize
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Calculate costs
  const berekenKosten = () => {
    setIsCalculating(true);

    setTimeout(() => {
      const nieuwResultaten: Resultaten = {};
      const multiplier = ervaringsMultiplier[inputs.ervaring];
      const spoedMultiplier = inputs.inzetType === "spoed" ? 1 + spoedToeslag : 1;
      const aantalDagen = inputs.dagenPerWeek.length;

      inputs.vergelijkingen.forEach((type) => {
        const basisTarief = basisTarieven[inputs.functie][type];
        const uurtarief = basisTarief * multiplier * spoedMultiplier;

        const perDienst = uurtarief * inputs.urenPerDienst * inputs.aantalMedewerkers;
        const perWeek = perDienst * aantalDagen;
        const perMaand = perWeek * 4.33;

        nieuwResultaten[type] = {
          perDienst: Math.round(perDienst),
          perWeek: Math.round(perWeek),
          perMaand: Math.round(perMaand),
        };
      });

      setResultaten(nieuwResultaten);
      setIsCalculating(false);
      setShowResults(true);
    }, 1500);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead: leadForm,
          inputs,
          resultaten,
        }),
      });

      if (response.ok) {
        setShowLeadModal(false);
        setShowSuccessModal(true);
      } else {
        alert("Er is iets misgegaan. Probeer het opnieuw.");
      }
    } catch {
      alert("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getVergelijkingLabel = (type: VergelijkingType) => {
    switch (type) {
      case "vast": return "Vast personeel";
      case "uitzend": return "Uitzendkracht";
      case "zzp": return "ZZP'er";
    }
  };

  const getFunctieLabel = () => {
    return functieOpties.find(f => f.value === inputs.functie)?.label || "";
  };

  const getDagenLabel = () => {
    return inputs.dagenPerWeek.map(d => dagen[d]).join(", ");
  };

  // Mobile fallback view
  if (!isDesktop) {
    return (
      <>
        <Section variant="white" spacing="large">
          <Section.Container>
            <div className="min-h-[60vh] flex items-center justify-center">
              <FadeIn>
                <div className="text-center max-w-md mx-auto px-4">
                  {/* Icon */}
                  <div className="w-20 h-20 bg-[#FFF7F1] rounded-2xl flex items-center justify-center mx-auto mb-8">
                    <svg className="w-10 h-10 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>

                  <h1 className="text-2xl font-bold text-neutral-900 mb-4">
                    Calculator beschikbaar op desktop
                  </h1>

                  <p className="text-neutral-600 mb-8 leading-relaxed">
                    Onze kosten calculator werkt het beste op een groter scherm.
                    Open deze pagina op uw computer voor de volledige ervaring.
                  </p>

                  <div className="space-y-4">
                    <Link
                      href="/contact"
                      className="block w-full bg-[#F97316] text-white px-6 py-4 rounded-xl font-semibold
                      shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                      hover:bg-[#EA580C] transition-all duration-300 text-center"
                    >
                      Direct contact opnemen
                    </Link>

                    <Link
                      href="/personeel-aanvragen"
                      className="block w-full border-2 border-neutral-200 text-neutral-700 px-6 py-4 rounded-xl font-semibold
                      hover:border-[#F97316] hover:text-[#F97316] transition-all duration-300 text-center"
                    >
                      Personeel aanvragen
                    </Link>
                  </div>

                  <p className="text-sm text-neutral-500 mt-8">
                    Wij maken graag een persoonlijke berekening voor u.
                  </p>
                </div>
              </FadeIn>
            </div>
          </Section.Container>
        </Section>
      </>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <section
        className="pt-32 pb-16"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF7F1 100%)'
        }}
      >
        <div className="max-w-4xl mx-auto px-6 text-center">
          <FadeIn>
            <span className="inline-block bg-orange-100 text-[#F97316] text-xs font-semibold px-4 py-2 rounded-full uppercase tracking-wide mb-6">
              Gratis tool
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
              Wat kost horecapersoneel <span className="text-[#F97316]">écht</span>?
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto mb-10">
              Bereken in 2 minuten uw personeelskosten. Vergelijk vast personeel,
              uitzendkrachten en ZZP'ers — en ontvang een helder kostenoverzicht.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Calculator Section */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <div className="max-w-3xl mx-auto">
            {!showResults ? (
              <FadeIn>
                {/* Progress Bar */}
                <div className="flex items-center justify-center gap-4 mb-12">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                          currentStep === step
                            ? "bg-[#F97316] text-white"
                            : currentStep > step
                            ? "bg-[#F97316] text-white"
                            : "bg-neutral-100 text-neutral-400"
                        }`}
                      >
                        {currentStep > step ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          step
                        )}
                      </div>
                      {step < 3 && (
                        <div
                          className={`w-24 h-1 mx-2 rounded transition-all duration-300 ${
                            currentStep > step ? "bg-[#F97316]" : "bg-neutral-200"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Calculator Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-neutral-900/5 border border-neutral-100 p-8 lg:p-12">

                  {/* Step 1: Personeel */}
                  {currentStep === 1 && (
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                          Welk personeel heeft u nodig?
                        </h2>
                        <p className="text-neutral-500">Stap 1 van 3</p>
                      </div>

                      {/* Functie */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-3">
                          Functie
                        </label>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                          {functieOpties.map((optie) => (
                            <button
                              key={optie.value}
                              type="button"
                              onClick={() => setInputs({ ...inputs, functie: optie.value })}
                              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 ${
                                inputs.functie === optie.value
                                  ? "border-[#F97316] bg-[#FFF7F1]"
                                  : "border-neutral-200 hover:border-[#F97316]/50"
                              }`}
                            >
                              <span className="text-2xl">{optie.icon}</span>
                              <span className="font-medium text-neutral-900">{optie.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Aantal medewerkers */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-3">
                          Aantal medewerkers per dienst: <span className="text-[#F97316] font-bold">{inputs.aantalMedewerkers}</span>
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={inputs.aantalMedewerkers}
                          onChange={(e) => setInputs({ ...inputs, aantalMedewerkers: parseInt(e.target.value) })}
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

                      {/* Ervaringsniveau */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-3">
                          Ervaringsniveau
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { value: "starter", label: "Starter", desc: "Weinig/geen ervaring" },
                            { value: "ervaren", label: "Ervaren", desc: "1-3 jaar ervaring" },
                            { value: "senior", label: "Senior", desc: "3+ jaar, zelfstandig" },
                          ].map((optie) => (
                            <button
                              key={optie.value}
                              type="button"
                              onClick={() => setInputs({ ...inputs, ervaring: optie.value as ErvaringType })}
                              className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                                inputs.ervaring === optie.value
                                  ? "border-[#F97316] bg-[#FFF7F1]"
                                  : "border-neutral-200 hover:border-[#F97316]/50"
                              }`}
                            >
                              <span className="block font-semibold text-neutral-900">{optie.label}</span>
                              <span className="text-sm text-neutral-500">{optie.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => setCurrentStep(2)}
                        className="w-full bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                        shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                        hover:bg-[#EA580C] transition-all duration-300 flex items-center justify-center gap-2"
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
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                          Wanneer en hoe vaak?
                        </h2>
                        <p className="text-neutral-500">Stap 2 van 3</p>
                      </div>

                      {/* Uren per dienst */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-3">
                          Gemiddeld aantal uren per dienst: <span className="text-[#F97316] font-bold">{inputs.urenPerDienst}</span>
                        </label>
                        <input
                          type="range"
                          min="4"
                          max="12"
                          step="0.5"
                          value={inputs.urenPerDienst}
                          onChange={(e) => setInputs({ ...inputs, urenPerDienst: parseFloat(e.target.value) })}
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
                        <div className="flex gap-2">
                          {dagen.map((dag, index) => (
                            <button
                              key={dag}
                              type="button"
                              onClick={() => {
                                const newDagen = inputs.dagenPerWeek.includes(index)
                                  ? inputs.dagenPerWeek.filter(d => d !== index)
                                  : [...inputs.dagenPerWeek, index].sort();
                                setInputs({ ...inputs, dagenPerWeek: newDagen });
                              }}
                              className={`flex-1 py-3 rounded-xl font-medium transition-all duration-300 ${
                                inputs.dagenPerWeek.includes(index)
                                  ? "bg-[#F97316] text-white"
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
                          <button
                            type="button"
                            onClick={() => setInputs({ ...inputs, inzetType: "regulier" })}
                            className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                              inputs.inzetType === "regulier"
                                ? "border-[#F97316] bg-[#FFF7F1]"
                                : "border-neutral-200 hover:border-[#F97316]/50"
                            }`}
                          >
                            <span className="block font-semibold text-neutral-900">Regulier</span>
                            <span className="text-sm text-neutral-500">Minimaal 48 uur vooraf</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setInputs({ ...inputs, inzetType: "spoed" })}
                            className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                              inputs.inzetType === "spoed"
                                ? "border-[#F97316] bg-[#FFF7F1]"
                                : "border-neutral-200 hover:border-[#F97316]/50"
                            }`}
                          >
                            <span className="block font-semibold text-neutral-900">Spoed</span>
                            <span className="text-sm text-neutral-500">Binnen 48 uur (+15%)</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button
                          onClick={() => setCurrentStep(1)}
                          className="flex-1 border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
                          hover:border-neutral-300 transition-all duration-300 flex items-center justify-center gap-2"
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
                          hover:bg-[#EA580C] transition-all duration-300 flex items-center justify-center gap-2
                          disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                          Welke opties wilt u vergelijken?
                        </h2>
                        <p className="text-neutral-500">Stap 3 van 3</p>
                      </div>

                      <div className="space-y-3">
                        {[
                          { value: "vast", label: "Vast personeel", desc: "Eigen medewerker in loondienst, inclusief werkgeverslasten" },
                          { value: "uitzend", label: "Uitzendkracht", desc: "Flexibel via TopTalent, all-in uurtarief" },
                          { value: "zzp", label: "ZZP'er", desc: "Zelfstandige professional, exclusief BTW" },
                        ].map((optie) => (
                          <button
                            key={optie.value}
                            type="button"
                            onClick={() => {
                              const newVergelijkingen = inputs.vergelijkingen.includes(optie.value as VergelijkingType)
                                ? inputs.vergelijkingen.filter(v => v !== optie.value)
                                : [...inputs.vergelijkingen, optie.value as VergelijkingType];
                              setInputs({ ...inputs, vergelijkingen: newVergelijkingen });
                            }}
                            className={`w-full p-5 rounded-xl border-2 text-left transition-all duration-300 flex items-start gap-4 ${
                              inputs.vergelijkingen.includes(optie.value as VergelijkingType)
                                ? "border-[#F97316] bg-[#FFF7F1]"
                                : "border-neutral-200 hover:border-[#F97316]/50"
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300 ${
                                inputs.vergelijkingen.includes(optie.value as VergelijkingType)
                                  ? "bg-[#F97316] border-[#F97316]"
                                  : "border-neutral-300"
                              }`}
                            >
                              {inputs.vergelijkingen.includes(optie.value as VergelijkingType) && (
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <span className="block font-semibold text-neutral-900">{optie.label}</span>
                              <span className="text-sm text-neutral-500">{optie.desc}</span>
                            </div>
                          </button>
                        ))}
                      </div>

                      {inputs.vergelijkingen.length === 0 && (
                        <p className="text-red-500 text-sm">Selecteer minimaal 1 optie</p>
                      )}

                      <div className="flex gap-4">
                        <button
                          onClick={() => setCurrentStep(2)}
                          className="flex-1 border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
                          hover:border-neutral-300 transition-all duration-300 flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          Terug
                        </button>
                        <button
                          onClick={berekenKosten}
                          disabled={inputs.vergelijkingen.length === 0 || isCalculating}
                          className="flex-1 bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                          shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                          hover:bg-[#EA580C] transition-all duration-300 flex items-center justify-center gap-2
                          disabled:opacity-50 disabled:cursor-not-allowed"
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
              </FadeIn>
            ) : (
              /* Results View */
              <FadeIn>
                <div className="space-y-8">
                  {/* Results Header */}
                  <div className="text-center">
                    <h2 className="text-3xl font-bold text-neutral-900 mb-4">
                      Uw kostenoverzicht
                    </h2>
                    <p className="text-neutral-600">
                      Op basis van: {inputs.aantalMedewerkers} medewerker{inputs.aantalMedewerkers > 1 ? 's' : ''} · {getFunctieLabel()} · {inputs.ervaring.charAt(0).toUpperCase() + inputs.ervaring.slice(1)}
                      <br />
                      {inputs.urenPerDienst} uur per dienst · {inputs.dagenPerWeek.length} dagen per week ({getDagenLabel()}) · {inputs.inzetType === "regulier" ? "Reguliere" : "Spoed"} inzet
                    </p>
                  </div>

                  {/* Results Cards */}
                  <div className={`grid gap-6 ${inputs.vergelijkingen.length === 3 ? 'grid-cols-3' : inputs.vergelijkingen.length === 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-md mx-auto'}`}>
                    {inputs.vergelijkingen.map((type, index) => {
                      const result = resultaten[type];
                      const isUitzend = type === "uitzend";

                      return (
                        <div
                          key={type}
                          className={`bg-white rounded-2xl p-6 border-2 transition-all duration-500 ${
                            isUitzend ? "border-[#F97316] shadow-xl shadow-orange-500/10" : "border-neutral-200"
                          }`}
                          style={{
                            animationDelay: `${index * 100}ms`,
                          }}
                        >
                          {isUitzend && (
                            <span className="inline-block bg-[#F97316] text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                              Aanbevolen
                            </span>
                          )}

                          <h3 className="text-lg font-bold text-neutral-900 mb-6">
                            {getVergelijkingLabel(type)}
                          </h3>

                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-neutral-500 mb-1">Per dienst</p>
                              <p className="text-2xl font-bold text-neutral-900">{formatCurrency(result?.perDienst || 0)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-500 mb-1">Per week</p>
                              <p className="text-2xl font-bold text-neutral-900">{formatCurrency(result?.perWeek || 0)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-500 mb-1">Per maand</p>
                              <p className="text-3xl font-bold text-[#F97316]">{formatCurrency(result?.perMaand || 0)}</p>
                            </div>
                          </div>

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
                                  <span>−</span> Schijnzelfstandigheid risico
                                </li>
                              </ul>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-center text-sm text-neutral-500">
                    * Berekening op basis van gemiddelde tarieven 2024/2025. Exacte kosten kunnen afwijken per situatie.
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <button
                      onClick={() => setShowLeadModal(true)}
                      className="bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                      shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                      hover:bg-[#EA580C] transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download als PDF
                    </button>
                    <button
                      onClick={() => {
                        setShowResults(false);
                        setCurrentStep(1);
                        setResultaten({});
                      }}
                      className="border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
                      hover:border-neutral-300 transition-all duration-300"
                    >
                      Nieuwe berekening
                    </button>
                  </div>
                </div>
              </FadeIn>
            )}
          </div>
        </Section.Container>
      </Section>

      {/* Trust Section */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-neutral-900 mb-4">
                Hoe wij rekenen
              </h2>
            </div>
          </FadeIn>

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
              <FadeIn key={index} delay={index * 0.1}>
                <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-neutral-100">
                  <div className="w-16 h-16 bg-[#FFF7F1] rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#F97316]">
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-3">{item.title}</h3>
                  <p className="text-neutral-600">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Section.Container>
      </Section>

      {/* CTA Section */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <FadeIn>
            <div
              className="text-center max-w-2xl mx-auto py-12 px-8 rounded-3xl"
              style={{
                background: 'linear-gradient(180deg, #FFF7F1 0%, #FFFFFF 100%)'
              }}
            >
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
                Liever persoonlijk advies?
              </h2>
              <p className="text-neutral-600 mb-8">
                Elke horecazaak is anders. Wij denken graag mee over een personeelsoplossing
                die past bij uw situatie en budget.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                  shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                  hover:bg-[#EA580C] transition-all duration-300 text-center"
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
          </FadeIn>
        </Section.Container>
      </Section>

      {/* Lead Capture Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            onClick={() => setShowLeadModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 max-h-[90vh] overflow-y-auto">
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
                  placeholder="Uw naam"
                  required
                  value={leadForm.naam}
                  onChange={(e) => setLeadForm({ ...leadForm, naam: e.target.value })}
                  className="w-full px-4 py-3.5 border border-neutral-200 rounded-xl
                  focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]
                  outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Bedrijfsnaam"
                  required
                  value={leadForm.bedrijfsnaam}
                  onChange={(e) => setLeadForm({ ...leadForm, bedrijfsnaam: e.target.value })}
                  className="w-full px-4 py-3.5 border border-neutral-200 rounded-xl
                  focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]
                  outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                />
              </div>
              <div>
                <input
                  type="email"
                  placeholder="E-mailadres"
                  required
                  value={leadForm.email}
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                  className="w-full px-4 py-3.5 border border-neutral-200 rounded-xl
                  focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]
                  outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                />
              </div>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="akkoord"
                  required
                  checked={leadForm.akkoord}
                  onChange={(e) => setLeadForm({ ...leadForm, akkoord: e.target.checked })}
                  className="mt-1 w-5 h-5 rounded border-neutral-300 text-[#F97316] focus:ring-[#F97316]"
                />
                <label htmlFor="akkoord" className="text-sm text-neutral-600">
                  Ik ga akkoord met het{" "}
                  <Link href="/privacy" className="text-[#F97316] hover:underline">
                    privacybeleid
                  </Link>
                </label>
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
              Wij delen uw gegevens nooit met derden.
            </p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            onClick={() => setShowSuccessModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-2xl font-bold text-neutral-900 mb-2">
              Uw kostenoverzicht is onderweg
            </h3>
            <p className="text-neutral-600 mb-8">
              Check uw inbox voor de PDF. Niet ontvangen? Kijk in uw spam-folder.
            </p>

            <div className="space-y-4">
              <Link
                href="/contact"
                className="block w-full bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                hover:bg-[#EA580C] transition-all duration-300"
              >
                Neem contact op voor advies
              </Link>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="block w-full border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
                hover:border-neutral-300 transition-all duration-300"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
