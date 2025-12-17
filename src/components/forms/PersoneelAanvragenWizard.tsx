"use client";

import { useState } from "react";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { basisTarieven } from "@/lib/calculator/tarieven";

type ContractType = "zzp" | "loondienst" | "uitzendkracht";

interface FormData {
  // Stap 1: Bedrijfsgegevens
  bedrijfsnaam: string;
  contactpersoon: string;
  email: string;
  telefoon: string;
  // Stap 2: Personeelsbehoefte
  typePersoneel: string[];
  aantalPersonen: string;
  contractType: ContractType[];
  gewenstUurtarief: string;
  // Stap 3: Planning
  startDatum: string;
  eindDatum: string;
  werkdagen: string[];
  werktijden: string;
  // Stap 4: Extra informatie
  locatie: string;
  opmerkingen: string;
}

const initialFormData: FormData = {
  bedrijfsnaam: "",
  contactpersoon: "",
  email: "",
  telefoon: "",
  typePersoneel: [],
  aantalPersonen: "",
  contractType: [],
  gewenstUurtarief: "",
  startDatum: "",
  eindDatum: "",
  werkdagen: [],
  werktijden: "",
  locatie: "",
  opmerkingen: "",
};

const typePersoneelOptions = [
  "Barista",
  "Ober/Serveerster",
  "Bartender",
  "Kok",
  "Sous-chef",
  "Afwasser",
  "Gastheer/Gastvrouw",
  "Evenement medewerker",
  "Runner",
  "Anders",
];

const werkdagenOptions = [
  "Maandag",
  "Dinsdag",
  "Woensdag",
  "Donderdag",
  "Vrijdag",
  "Zaterdag",
  "Zondag",
];

const aantalOptions = ["1", "2-3", "4-5", "6-10", "10+"];

const contractTypeOptions: { value: ContractType; label: string; description: string }[] = [
  { value: "zzp", label: "ZZP'er", description: "Zelfstandige zonder personeel" },
  { value: "loondienst", label: "Loondienst", description: "Vast of tijdelijk contract" },
  { value: "uitzendkracht", label: "Uitzendkracht", description: "Via uitzendbureau" },
];

// Map personeel types naar calculator functie types voor richtprijzen
const getRelevantTarieven = (typePersoneel: string[]): { min: number; max: number } | null => {
  if (typePersoneel.length === 0) return null;

  const functieMapping: Record<string, keyof typeof basisTarieven> = {
    "Barista": "bar",
    "Bartender": "bar",
    "Ober/Serveerster": "bediening",
    "Gastheer/Gastvrouw": "bediening",
    "Runner": "bediening",
    "Evenement medewerker": "bediening",
    "Kok": "keuken",
    "Sous-chef": "keuken",
    "Afwasser": "afwas",
  };

  let minTarief = Infinity;
  let maxTarief = 0;

  typePersoneel.forEach(type => {
    const functie = functieMapping[type];
    if (functie) {
      const tarieven = basisTarieven[functie];
      // Gebruik het laagste (vast) en hoogste (uitzend) tarief
      minTarief = Math.min(minTarief, tarieven.vast);
      maxTarief = Math.max(maxTarief, tarieven.uitzend);
    }
  });

  if (minTarief === Infinity) return null;
  return { min: minTarief, max: maxTarief };
};

export default function PersoneelAanvragenWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [direction, setDirection] = useState(1);
  const { executeRecaptcha } = useRecaptcha();

  const totalSteps = 4;

  const updateField = (field: keyof FormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const toggleArrayField = (field: "typePersoneel" | "werkdagen" | "contractType", value: string) => {
    setFormData((prev) => {
      const current = prev[field] as string[];
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<FormData> = {};

    switch (step) {
      case 0:
        if (!formData.bedrijfsnaam.trim()) newErrors.bedrijfsnaam = "Bedrijfsnaam is verplicht";
        if (!formData.contactpersoon.trim()) newErrors.contactpersoon = "Contactpersoon is verplicht";
        if (!formData.email.trim()) {
          newErrors.email = "E-mail is verplicht";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = "Voer een geldig e-mailadres in";
        }
        if (!formData.telefoon.trim()) newErrors.telefoon = "Telefoonnummer is verplicht";
        break;
      case 1:
        if (formData.typePersoneel.length === 0) newErrors.typePersoneel = [] as unknown as string[];
        if (!formData.aantalPersonen) newErrors.aantalPersonen = "Selecteer aantal personen";
        if (formData.contractType.length === 0) newErrors.contractType = [] as unknown as ContractType[];
        break;
      case 2:
        if (!formData.startDatum) newErrors.startDatum = "Startdatum is verplicht";
        if (formData.werkdagen.length === 0) newErrors.werkdagen = [] as unknown as string[];
        if (!formData.werktijden.trim()) newErrors.werktijden = "Werktijden zijn verplicht";
        break;
      case 3:
        if (!formData.locatie.trim()) newErrors.locatie = "Locatie is verplicht";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setDirection(1);
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    }
  };

  const prevStep = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await executeRecaptcha("personeel_aanvragen");

      const response = await fetch("/api/personeel-aanvragen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          recaptchaToken,
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        const data = await response.json();
        alert(data.error || "Er is iets misgegaan. Probeer het opnieuw.");
      }
    } catch {
      alert("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center max-w-2xl mx-auto animate-fade-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
          Aanvraag verzonden!
        </h2>
        <p className="text-neutral-600 mb-8">
          Bedankt voor uw aanvraag. Wij nemen binnen 24 uur contact met u op om uw personeelsbehoefte te bespreken.
        </p>
        <button
          onClick={() => {
            setFormData(initialFormData);
            setCurrentStep(0);
            setIsSubmitted(false);
          }}
          className="bg-[#F27501] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#d96800] transition-colors"
        >
          Nieuwe aanvraag
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="bg-neutral-50 px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map((step, index) => (
            <div key={step} className="flex items-center">
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
                  step
                )}
              </div>
              {index < 3 && (
                <div
                  className={`w-16 md:w-24 h-1 mx-2 rounded transition-colors duration-300 ${
                    index < currentStep ? "bg-[#F27501]" : "bg-neutral-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-neutral-500">
          <span>Bedrijf</span>
          <span>Personeel</span>
          <span>Planning</span>
          <span>Details</span>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6 md:p-8 min-h-[400px] relative overflow-hidden">
        <div key={currentStep} className="animate-fade-in">
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900 mb-2">Bedrijfsgegevens</h2>
                  <p className="text-neutral-500">Vertel ons meer over uw bedrijf</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Bedrijfsnaam *
                    </label>
                    <input
                      type="text"
                      value={formData.bedrijfsnaam}
                      onChange={(e) => updateField("bedrijfsnaam", e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.bedrijfsnaam ? "border-red-500" : "border-neutral-200"
                      } focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors`}
                      placeholder="Uw bedrijfsnaam"
                    />
                    {errors.bedrijfsnaam && (
                      <p className="text-red-500 text-sm mt-1">{errors.bedrijfsnaam}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Contactpersoon *
                    </label>
                    <input
                      type="text"
                      value={formData.contactpersoon}
                      onChange={(e) => updateField("contactpersoon", e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.contactpersoon ? "border-red-500" : "border-neutral-200"
                      } focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors`}
                      placeholder="Uw naam"
                    />
                    {errors.contactpersoon && (
                      <p className="text-red-500 text-sm mt-1">{errors.contactpersoon}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      E-mailadres *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.email ? "border-red-500" : "border-neutral-200"
                      } focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors`}
                      placeholder="email@voorbeeld.nl"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Telefoonnummer *
                    </label>
                    <input
                      type="tel"
                      value={formData.telefoon}
                      onChange={(e) => updateField("telefoon", e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.telefoon ? "border-red-500" : "border-neutral-200"
                      } focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors`}
                      placeholder="06 12345678"
                    />
                    {errors.telefoon && (
                      <p className="text-red-500 text-sm mt-1">{errors.telefoon}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900 mb-2">Personeelsbehoefte</h2>
                  <p className="text-neutral-500">Welk type personeel zoekt u?</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">
                    Type personeel * <span className="text-neutral-400 font-normal">(meerdere mogelijk)</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {typePersoneelOptions.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleArrayField("typePersoneel", type)}
                        className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all duration-200 ${
                          formData.typePersoneel.includes(type)
                            ? "bg-[#F27501] border-[#F27501] text-white"
                            : "bg-white border-neutral-200 text-neutral-700 hover:border-[#F27501] hover:text-[#F27501]"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  {errors.typePersoneel !== undefined && formData.typePersoneel.length === 0 && (
                    <p className="text-red-500 text-sm mt-2">Selecteer minimaal één type personeel</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">
                    Aantal personen nodig *
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {aantalOptions.map((aantal) => (
                      <button
                        key={aantal}
                        type="button"
                        onClick={() => updateField("aantalPersonen", aantal)}
                        className={`px-6 py-3 rounded-lg border text-sm font-medium transition-all duration-200 ${
                          formData.aantalPersonen === aantal
                            ? "bg-[#F27501] border-[#F27501] text-white"
                            : "bg-white border-neutral-200 text-neutral-700 hover:border-[#F27501] hover:text-[#F27501]"
                        }`}
                      >
                        {aantal}
                      </button>
                    ))}
                  </div>
                  {errors.aantalPersonen && (
                    <p className="text-red-500 text-sm mt-2">{errors.aantalPersonen}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">
                    Contractvorm * <span className="text-neutral-400 font-normal">(meerdere mogelijk)</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {contractTypeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleArrayField("contractType", option.value)}
                        className={`px-4 py-4 rounded-lg border text-left transition-all duration-200 ${
                          formData.contractType.includes(option.value)
                            ? "bg-[#F27501] border-[#F27501] text-white"
                            : "bg-white border-neutral-200 text-neutral-700 hover:border-[#F27501]"
                        }`}
                      >
                        <span className="block font-medium">{option.label}</span>
                        <span className={`block text-xs mt-1 ${
                          formData.contractType.includes(option.value)
                            ? "text-white/80"
                            : "text-neutral-400"
                        }`}>
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                  {errors.contractType !== undefined && formData.contractType.length === 0 && (
                    <p className="text-red-500 text-sm mt-2">Selecteer minimaal één contractvorm</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Gewenst uurtarief <span className="text-neutral-400 font-normal">(optioneel)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">€</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={formData.gewenstUurtarief}
                      onChange={(e) => updateField("gewenstUurtarief", e.target.value)}
                      className="w-full pl-8 pr-16 py-3 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                      placeholder="Bijv. 25"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">per uur</span>
                  </div>
                </div>

                {/* Richtprijzen info box */}
                {formData.typePersoneel.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1">Richtprijzen</h4>
                        <p className="text-sm text-blue-700 mb-2">
                          Op basis van uw selectie liggen marktconforme uurtarieven tussen:
                        </p>
                        {(() => {
                          const tarieven = getRelevantTarieven(formData.typePersoneel);
                          if (!tarieven) return null;
                          return (
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div className="bg-white/60 rounded-lg px-3 py-2">
                                <span className="text-blue-600 font-medium">Loondienst:</span>
                                <span className="text-blue-900 ml-1">€{tarieven.min.toFixed(2)} - €{(tarieven.min * 1.2).toFixed(2)}</span>
                              </div>
                              <div className="bg-white/60 rounded-lg px-3 py-2">
                                <span className="text-blue-600 font-medium">ZZP:</span>
                                <span className="text-blue-900 ml-1">€{(tarieven.max * 0.94).toFixed(2)} - €{tarieven.max.toFixed(2)}</span>
                              </div>
                              <div className="bg-white/60 rounded-lg px-3 py-2">
                                <span className="text-blue-600 font-medium">Uitzendkracht:</span>
                                <span className="text-blue-900 ml-1">€{(tarieven.max * 0.95).toFixed(2)} - €{(tarieven.max * 1.1).toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })()}
                        <p className="text-xs text-blue-600 mt-2">
                          * Tarieven zijn indicatief en afhankelijk van ervaring en beschikbaarheid
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900 mb-2">Planning</h2>
                  <p className="text-neutral-500">Wanneer heeft u personeel nodig?</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Startdatum *
                    </label>
                    <input
                      type="date"
                      value={formData.startDatum}
                      onChange={(e) => updateField("startDatum", e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.startDatum ? "border-red-500" : "border-neutral-200"
                      } focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors`}
                    />
                    {errors.startDatum && (
                      <p className="text-red-500 text-sm mt-1">{errors.startDatum}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Einddatum <span className="text-neutral-400 font-normal">(optioneel)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.eindDatum}
                      onChange={(e) => updateField("eindDatum", e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">
                    Werkdagen * <span className="text-neutral-400 font-normal">(meerdere mogelijk)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {werkdagenOptions.map((dag) => (
                      <button
                        key={dag}
                        type="button"
                        onClick={() => toggleArrayField("werkdagen", dag)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                          formData.werkdagen.includes(dag)
                            ? "bg-[#F27501] border-[#F27501] text-white"
                            : "bg-white border-neutral-200 text-neutral-700 hover:border-[#F27501] hover:text-[#F27501]"
                        }`}
                      >
                        {dag}
                      </button>
                    ))}
                  </div>
                  {errors.werkdagen !== undefined && formData.werkdagen.length === 0 && (
                    <p className="text-red-500 text-sm mt-2">Selecteer minimaal één werkdag</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Werktijden *
                  </label>
                  <input
                    type="text"
                    value={formData.werktijden}
                    onChange={(e) => updateField("werktijden", e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.werktijden ? "border-red-500" : "border-neutral-200"
                    } focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors`}
                    placeholder="Bijv. 09:00 - 17:00 of avonddienst"
                  />
                  {errors.werktijden && (
                    <p className="text-red-500 text-sm mt-1">{errors.werktijden}</p>
                  )}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900 mb-2">Extra informatie</h2>
                  <p className="text-neutral-500">Laatste details over uw aanvraag</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Werklocatie *
                  </label>
                  <input
                    type="text"
                    value={formData.locatie}
                    onChange={(e) => updateField("locatie", e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.locatie ? "border-red-500" : "border-neutral-200"
                    } focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors`}
                    placeholder="Stad of volledig adres"
                  />
                  {errors.locatie && (
                    <p className="text-red-500 text-sm mt-1">{errors.locatie}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Opmerkingen <span className="text-neutral-400 font-normal">(optioneel)</span>
                  </label>
                  <textarea
                    value={formData.opmerkingen}
                    onChange={(e) => updateField("opmerkingen", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors resize-none"
                    placeholder="Eventuele extra wensen of informatie..."
                  />
                </div>

                {/* Summary */}
                <div className="bg-neutral-50 rounded-xl p-4">
                  <h3 className="font-semibold text-neutral-900 mb-3">Samenvatting</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-neutral-500">Bedrijf:</span>
                    <span className="text-neutral-900">{formData.bedrijfsnaam}</span>
                    <span className="text-neutral-500">Type personeel:</span>
                    <span className="text-neutral-900">{formData.typePersoneel.join(", ")}</span>
                    <span className="text-neutral-500">Aantal:</span>
                    <span className="text-neutral-900">{formData.aantalPersonen} personen</span>
                    <span className="text-neutral-500">Contractvorm:</span>
                    <span className="text-neutral-900">
                      {formData.contractType.map(ct =>
                        contractTypeOptions.find(o => o.value === ct)?.label
                      ).join(", ")}
                    </span>
                    {formData.gewenstUurtarief && (
                      <>
                        <span className="text-neutral-500">Gewenst uurtarief:</span>
                        <span className="text-neutral-900">€{formData.gewenstUurtarief} per uur</span>
                      </>
                    )}
                    <span className="text-neutral-500">Startdatum:</span>
                    <span className="text-neutral-900">{formData.startDatum}</span>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 md:px-8 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-between">
        <button
          type="button"
          onClick={prevStep}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            currentStep === 0
              ? "invisible"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
          }`}
        >
          &larr; Vorige
        </button>

        {currentStep < totalSteps - 1 ? (
          <button
            type="button"
            onClick={nextStep}
            className="bg-[#F27501] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#d96800] transition-colors shadow-lg shadow-orange-500/20"
          >
            Volgende &rarr;
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#F27501] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#d96800] transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Verzenden..." : "Aanvraag versturen"}
          </button>
        )}
      </div>
    </div>
  );
}
