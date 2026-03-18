"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { useToast } from "@/components/ui/Toast";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const functieOpties = [
  "Bediening",
  "Bartender",
  "Barista",
  "Runner",
  "Host(ess)",
  "Keukenhulp",
  "Zelfstandig werkend kok",
  "Event staff",
] as const;

const taalOpties = ["Nederlands", "Engels"] as const;

interface FormData {
  voornaam: string;
  tussenvoegsel: string;
  achternaam: string;
  email: string;
  telefoon: string;
  stad: string;
  geboortedatum: string;
  geslacht: string;
  horecaErvaring: string;
  motivatie: string;
  hoeGekomen: string;
  uitbetalingswijze: string;
  kvkNummer: string;
  beschikbaarheid: string;
  beschikbaarVanaf: string;
  maxUrenPerWeek: string;
  toestemming: boolean;
  eigenVervoer: boolean;
  functies: string[];
  talen: string[];
}

const initialFormData: FormData = {
  voornaam: "",
  tussenvoegsel: "",
  achternaam: "",
  email: "",
  telefoon: "",
  stad: "",
  geboortedatum: "",
  geslacht: "",
  horecaErvaring: "",
  motivatie: "",
  hoeGekomen: "",
  uitbetalingswijze: "",
  kvkNummer: "",
  beschikbaarheid: "",
  beschikbaarVanaf: "",
  maxUrenPerWeek: "",
  toestemming: false,
  eigenVervoer: false,
  functies: [],
  talen: [],
};

const AUTOSAVE_KEY = "toptalent_inschrijf_draft";

function FormInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  required,
  className = "",
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  className?: string;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        {label} {required ? <span className="text-[#F27501]">*</span> : null}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3.5 rounded-xl border-2 bg-white
            text-neutral-900 placeholder:text-neutral-400
            transition-all duration-200 ease-out
            ${
              error
                ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                : isFocused
                  ? "border-[#F27501] ring-4 ring-[#F27501]/10"
                  : "border-neutral-200 hover:border-neutral-300"
            }
            focus:outline-none
          `}
        />
      </div>
      {error ? (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      ) : null}
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        {label} {required ? <span className="text-[#F27501]">*</span> : null}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full px-4 py-3.5 rounded-xl border-2 bg-white appearance-none
            text-neutral-900 cursor-pointer
            transition-all duration-200 ease-out
            ${
              error
                ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                : isFocused
                  ? "border-[#F27501] ring-4 ring-[#F27501]/10"
                  : "border-neutral-200 hover:border-neutral-300"
            }
            focus:outline-none
          `}
        >
          <option value="">Selecteer...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error ? <p className="text-red-500 text-sm mt-2">{error}</p> : null}
    </div>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  rows?: number;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        {label} {required ? <span className="text-[#F27501]">*</span> : null}
      </label>
      <textarea
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        rows={rows}
        className={`
          w-full px-4 py-3.5 rounded-xl border-2 bg-white resize-none
          text-neutral-900 placeholder:text-neutral-400
          transition-all duration-200 ease-out
          ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
              : isFocused
                ? "border-[#F27501] ring-4 ring-[#F27501]/10"
                : "border-neutral-200 hover:border-neutral-300"
          }
          focus:outline-none
        `}
      />
      {error ? <p className="text-red-500 text-sm mt-2">{error}</p> : null}
    </div>
  );
}

function ToggleGroup({
  label,
  options,
  values,
  onToggle,
  error,
  required,
}: {
  label: string;
  options: readonly string[];
  values: string[];
  onToggle: (value: string) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-3">
        {label} {required ? <span className="text-[#F27501]">*</span> : null}
      </label>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => {
          const active = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                active
                  ? "border-[#F27501] bg-[#F27501] text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-red-500 text-sm mt-2">{error}</p> : null}
    </div>
  );
}

const stepTitles = [
  "Persoonlijke gegevens",
  "Werkprofiel",
  "Beschikbaarheid",
  "Extra context",
];

const stepDescriptions = [
  "De basis om contact met je op te nemen",
  "Hiermee kunnen we snel beoordelen of er een match is",
  "Zodat we direct weten wanneer je inzetbaar kunt zijn",
  "Dit helpt bij de eerste selectie",
];

export default function InschrijfFormulier() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [draftRestored, setDraftRestored] = useState(false);
  const { executeRecaptcha } = useRecaptcha();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const refCode = searchParams.get("ref") || "";
  const totalSteps = 4;

  // Restore draft from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      // Gebruik sessionStorage, migreer oud localStorage draft
      const saved = sessionStorage.getItem(AUTOSAVE_KEY) || localStorage.getItem(AUTOSAVE_KEY);
      if (localStorage.getItem(AUTOSAVE_KEY)) localStorage.removeItem(AUTOSAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) {
          setFormData(prev => ({ ...prev, ...parsed.formData }));
          setCurrentStep(parsed.step || 0);
          setDraftRestored(true);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Autosave to localStorage
  const saveDraft = useCallback(() => {
    try {
      // Sla alleen niet-gevoelige velden op (geen PII zoals naam, email, telefoon, geboortedatum)
      const safeDraft = {
        stad: formData.stad,
        horecaErvaring: formData.horecaErvaring,
        motivatie: formData.motivatie,
        hoeGekomen: formData.hoeGekomen,
        uitbetalingswijze: formData.uitbetalingswijze,
        beschikbaarheid: formData.beschikbaarheid,
        beschikbaarVanaf: formData.beschikbaarVanaf,
        maxUrenPerWeek: formData.maxUrenPerWeek,
        eigenVervoer: formData.eigenVervoer,
        functies: formData.functies,
        talen: formData.talen,
      };
      sessionStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
        formData: safeDraft,
        step: currentStep,
        savedAt: new Date().toISOString(),
      }));
    } catch {
      // ignore storage errors
    }
  }, [formData, currentStep]);

  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timer);
  }, [formData, currentStep, mounted, saveDraft]);

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(AUTOSAVE_KEY);
      localStorage.removeItem(AUTOSAVE_KEY); // Clean up oude data
    } catch {
      // ignore
    }
  };

  const updateField = (field: keyof FormData, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const toggleArrayValue = (field: "functies" | "talen", value: string) => {
    updateField(
      field,
      formData[field].includes(value)
        ? formData[field].filter((item) => item !== value)
        : [...formData[field], value]
    );
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    switch (step) {
      case 0: // Persoonlijke gegevens + toestemming
        if (!formData.toestemming) newErrors.toestemming = "Je moet toestemming geven om door te gaan";
        if (!formData.voornaam.trim()) newErrors.voornaam = "Voornaam is verplicht";
        if (!formData.achternaam.trim()) newErrors.achternaam = "Achternaam is verplicht";
        if (!formData.email.trim()) {
          newErrors.email = "E-mail is verplicht";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = "Voer een geldig e-mailadres in";
        }
        if (!formData.telefoon.trim()) newErrors.telefoon = "Telefoonnummer is verplicht";
        if (!formData.stad.trim()) newErrors.stad = "Woonplaats is verplicht";
        if (!formData.geboortedatum) newErrors.geboortedatum = "Geboortedatum is verplicht";
        break;
      case 1: // Werkprofiel
        if (!formData.geslacht) newErrors.geslacht = "Selecteer een optie";
        if (!formData.horecaErvaring) newErrors.horecaErvaring = "Selecteer je ervaringsniveau";
        if (formData.functies.length === 0) newErrors.functies = "Kies minimaal 1 functie";
        if (formData.talen.length === 0) newErrors.talen = "Kies minimaal 1 taal";
        break;
      case 2: // Beschikbaarheid
        if (!formData.beschikbaarheid) newErrors.beschikbaarheid = "Selecteer je beschikbaarheid";
        if (!formData.beschikbaarVanaf) newErrors.beschikbaarVanaf = "Kies wanneer je kunt starten";
        if (!formData.uitbetalingswijze) newErrors.uitbetalingswijze = "Selecteer een optie";
        if (formData.uitbetalingswijze === "zzp" && !formData.kvkNummer.trim()) {
          newErrors.kvkNummer = "KVK nummer is verplicht voor ZZP";
        }
        break;
      case 3: // Extra context
        if (!formData.hoeGekomen.trim()) newErrors.hoeGekomen = "Dit veld is verplicht";
        // Motivatie is now OPTIONAL
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);

    try {
      const recaptchaToken = await executeRecaptcha("inschrijven");
      const submitData = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item) => submitData.append(key, item));
          return;
        }
        submitData.append(key, String(value));
      });

      if (recaptchaToken) {
        submitData.append("recaptchaToken", recaptchaToken);
      }
      if (refCode) {
        submitData.append("referralCode", refCode);
      }

      const response = await fetch("/api/inschrijven", {
        method: "POST",
        body: submitData,
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Er is iets misgegaan. Probeer het opnieuw.");
        return;
      }

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "lead_submit",
        form: "inschrijven",
      });

      clearDraft();
      setIsSubmitted(true);
      router.push("/bedankt/kandidaat");
    } catch {
      toast.error("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-2xl shadow-xl shadow-neutral-900/5 border border-neutral-100 p-10 md:p-14 text-center max-w-2xl mx-auto animate-fade-in">
        <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-3">
          Inschrijving ontvangen!
        </h2>
        <p className="text-neutral-600 mb-8 max-w-md mx-auto">
          Bedankt voor je inschrijving. We bekijken eerst je intake en vragen documenten later pas op als we verder gaan.
        </p>
        <button
          onClick={() => {
            setFormData(initialFormData);
            setCurrentStep(0);
            setIsSubmitted(false);
          }}
          className="inline-flex items-center gap-2 bg-neutral-100 text-neutral-700 px-6 py-3 rounded-xl font-medium hover:bg-neutral-200 transition-colors duration-200"
        >
          Nieuwe inschrijving
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10 animate-fade-in">
        <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">
          Inschrijven bij TopTalent
        </h2>
        <p className="text-neutral-600 max-w-2xl mx-auto">
          Dit is je eerste intake. We houden het bewust kort en vragen documenten pas later op als je profiel aansluit.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 px-6 py-5 mb-6">
        <div className="flex items-center justify-between">
          {stepTitles.map((title, index) => (
            <div key={index} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors duration-300 ${
                    index <= currentStep
                      ? "bg-[#F27501] text-white"
                      : "bg-neutral-200 text-neutral-500"
                  }`}
                >
                  {index < currentStep ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="hidden md:block text-xs mt-2 text-neutral-500 font-medium max-w-[80px] text-center">
                  {title}
                </span>
              </div>
              {index < 3 && (
                <div
                  className={`w-12 md:w-20 h-1 mx-2 rounded transition-colors duration-300 ${
                    index < currentStep ? "bg-[#F27501]" : "bg-neutral-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Draft restored indicator */}
        {draftRestored && currentStep > 0 && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-neutral-500">
            <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Concept hersteld
          </div>
        )}
      </div>

      {/* Step header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-neutral-900">{stepTitles[currentStep]}</h3>
        <p className="text-sm text-neutral-500 mt-1">{stepDescriptions[currentStep]}</p>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl shadow-sm shadow-neutral-900/5 border border-neutral-100 p-6 animate-fade-in">
        {/* Step 1: Persoonlijke gegevens */}
        {currentStep === 0 && (
          <div className="space-y-6">
            {/* Toestemming checkbox */}
            <div
              className={`bg-gradient-to-r from-neutral-50 to-white rounded-2xl p-5 border-2 transition-colors duration-200 ${
                errors.toestemming ? "border-red-200" : formData.toestemming ? "border-green-200" : "border-neutral-100"
              }`}
            >
              <label className="flex items-start gap-4 cursor-pointer">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={formData.toestemming}
                    onChange={(e) => updateField("toestemming", e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-6 h-6 rounded-md border-2 transition-colors ${
                      formData.toestemming ? "bg-[#F27501] border-[#F27501]" : "bg-white border-neutral-300"
                    }`}
                  >
                    {formData.toestemming ? (
                      <svg className="w-4 h-4 text-white m-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : null}
                  </div>
                </div>
                <div>
                  <span className="text-neutral-700 font-medium">
                    Ik geef toestemming voor het verwerken van mijn gegevens voor werving en selectie.
                  </span>
                  <p className="text-sm text-neutral-500 mt-1">
                    Documenten zoals ID, cv of KvK vragen we later apart op wanneer je onboarding start.
                  </p>
                  {errors.toestemming ? (
                    <p className="text-red-500 text-sm mt-2">{errors.toestemming}</p>
                  ) : null}
                </div>
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <FormInput label="Voornaam" value={formData.voornaam} onChange={(e) => updateField("voornaam", e.target.value)} error={errors.voornaam} required />
              <FormInput label="Tussenvoegsel" value={formData.tussenvoegsel} onChange={(e) => updateField("tussenvoegsel", e.target.value)} />
              <FormInput label="Achternaam" value={formData.achternaam} onChange={(e) => updateField("achternaam", e.target.value)} error={errors.achternaam} required />
              <FormInput label="E-mail" type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} error={errors.email} required />
              <FormInput label="Telefoon" type="tel" value={formData.telefoon} onChange={(e) => updateField("telefoon", e.target.value)} error={errors.telefoon} required />
              <FormInput label="Woonplaats" value={formData.stad} onChange={(e) => updateField("stad", e.target.value)} error={errors.stad} required />
              <FormInput label="Geboortedatum" type="date" value={formData.geboortedatum} onChange={(e) => updateField("geboortedatum", e.target.value)} error={errors.geboortedatum} required />
            </div>
          </div>
        )}

        {/* Step 2: Werkprofiel */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <FormSelect
              label="Geslacht"
              value={formData.geslacht}
              onChange={(e) => updateField("geslacht", e.target.value)}
              error={errors.geslacht}
              required
              options={[
                { value: "man", label: "Man" },
                { value: "vrouw", label: "Vrouw" },
                { value: "anders", label: "Anders / wil ik niet zeggen" },
              ]}
            />
            <FormSelect
              label="Horeca-ervaring"
              value={formData.horecaErvaring}
              onChange={(e) => updateField("horecaErvaring", e.target.value)}
              error={errors.horecaErvaring}
              required
              options={[
                { value: "geen", label: "Geen of weinig ervaring" },
                { value: "basis", label: "Basiservaring" },
                { value: "ervaren", label: "Ervaren" },
                { value: "senior", label: "Senior / zelfstandig inzetbaar" },
              ]}
            />
            <ToggleGroup
              label="Welke functies kun je doen?"
              options={functieOpties}
              values={formData.functies}
              onToggle={(value) => toggleArrayValue("functies", value)}
              error={errors.functies}
              required
            />
            <ToggleGroup
              label="Welke talen spreek je?"
              options={taalOpties}
              values={formData.talen}
              onToggle={(value) => toggleArrayValue("talen", value)}
              error={errors.talen}
              required
            />
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.eigenVervoer}
                  onChange={(e) => updateField("eigenVervoer", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#F27501] focus:ring-[#F27501]"
                />
                <div>
                  <p className="font-medium text-neutral-800">Ik heb eigen vervoer</p>
                  <p className="text-sm text-neutral-500">Handig voor vroege diensten, evenementen en locaties buiten het centrum.</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Step 3: Beschikbaarheid */}
        {currentStep === 2 && (
          <div className="grid md:grid-cols-2 gap-5">
            <FormSelect
              label="Beschikbaarheid"
              value={formData.beschikbaarheid}
              onChange={(e) => updateField("beschikbaarheid", e.target.value)}
              error={errors.beschikbaarheid}
              required
              options={[
                { value: "flexibel", label: "Flexibel inzetbaar" },
                { value: "weekenden", label: "Vooral weekenden" },
                { value: "avonden", label: "Vooral avonden" },
                { value: "parttime", label: "Parttime vaste dagen" },
                { value: "oproep", label: "Oproep / wisselend" },
              ]}
            />
            <FormInput
              label="Beschikbaar vanaf"
              type="date"
              value={formData.beschikbaarVanaf}
              onChange={(e) => updateField("beschikbaarVanaf", e.target.value)}
              error={errors.beschikbaarVanaf}
              required
            />
            <FormInput
              label="Max uren per week"
              type="number"
              value={formData.maxUrenPerWeek}
              onChange={(e) => updateField("maxUrenPerWeek", e.target.value)}
              placeholder="Bijvoorbeeld 24"
              error={errors.maxUrenPerWeek}
            />
            <FormSelect
              label="Voorkeur uitbetaling"
              value={formData.uitbetalingswijze}
              onChange={(e) => updateField("uitbetalingswijze", e.target.value)}
              error={errors.uitbetalingswijze}
              required
              options={[
                { value: "loondienst", label: "Loondienst" },
                { value: "zzp", label: "ZZP" },
              ]}
            />
            {formData.uitbetalingswijze === "zzp" ? (
              <div className="md:col-span-2">
                <FormInput
                  label="KVK nummer"
                  value={formData.kvkNummer}
                  onChange={(e) => updateField("kvkNummer", e.target.value)}
                  placeholder="Alleen invullen als je als ZZP werkt"
                  error={errors.kvkNummer}
                  required
                />
              </div>
            ) : null}
          </div>
        )}

        {/* Step 4: Extra context */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <FormTextarea
              label="Vertel kort iets over jezelf (optioneel)"
              value={formData.motivatie}
              onChange={(e) => updateField("motivatie", e.target.value)}
              placeholder="Bijvoorbeeld waar je ervaring ligt, waar je energie van krijgt en wat voor soort diensten je zoekt."
              error={errors.motivatie}
              rows={5}
            />
            <FormInput
              label="Hoe ben je bij TopTalent terechtgekomen?"
              value={formData.hoeGekomen}
              onChange={(e) => updateField("hoeGekomen", e.target.value)}
              placeholder="Google, Instagram, via-via, event, etc."
              error={errors.hoeGekomen}
              required
            />
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6">
        {currentStep > 0 ? (
          <button
            type="button"
            onClick={prevStep}
            className="inline-flex items-center gap-2 text-neutral-600 font-medium hover:text-neutral-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Vorige
          </button>
        ) : (
          <div />
        )}

        {currentStep < totalSteps - 1 ? (
          <button
            type="button"
            onClick={nextStep}
            className="inline-flex items-center gap-2 bg-[#F27501] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#d96800] transition-colors"
          >
            Volgende
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 bg-[#F27501] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#d96800] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Bezig met versturen..." : "Inschrijving versturen"}
          </button>
        )}
      </div>

      {/* Autosave indicator */}
      <div className="text-center mt-4">
        <p className="text-xs text-neutral-400">
          Je voortgang wordt automatisch opgeslagen
        </p>
      </div>
    </div>
  );
}
