"use client";

import { useState, useRef } from "react";

interface FormData {
  voornaam: string;
  tussenvoegsel: string;
  achternaam: string;
  email: string;
  telefoon: string;
  stad: string;
  geboortedatum: string;
  geslacht: string;
  motivatie: string;
  hoeGekomen: string;
  uitbetalingswijze: string;
  kvkNummer: string;
  toestemming: boolean;
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
  motivatie: "",
  hoeGekomen: "",
  uitbetalingswijze: "",
  kvkNummer: "",
  toestemming: false,
};

export default function InschrijfFormulier() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | "cv", string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [profielFoto, setProfielFoto] = useState<File | null>(null);
  const [extraDocumenten, setExtraDocumenten] = useState<File[]>([]);

  const cvInputRef = useRef<HTMLInputElement>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.voornaam.trim()) newErrors.voornaam = "Voornaam is verplicht";
    if (!formData.achternaam.trim()) newErrors.achternaam = "Achternaam is verplicht";
    if (!formData.email.trim()) {
      newErrors.email = "E-mail is verplicht";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Voer een geldig e-mailadres in";
    }
    if (!formData.telefoon.trim()) newErrors.telefoon = "Telefoonnummer is verplicht";
    if (!formData.stad.trim()) newErrors.stad = "Stad is verplicht";
    if (!formData.geboortedatum) newErrors.geboortedatum = "Geboortedatum is verplicht";
    if (!formData.geslacht) newErrors.geslacht = "Selecteer een optie";
    if (!formData.motivatie.trim()) newErrors.motivatie = "Motivatie is verplicht";
    if (!formData.hoeGekomen.trim()) newErrors.hoeGekomen = "Dit veld is verplicht";
    if (!formData.uitbetalingswijze) newErrors.uitbetalingswijze = "Selecteer een optie";
    if (!formData.toestemming) newErrors.toestemming = "Je moet toestemming geven om door te gaan";
    if (!cvFile) {
      setErrors((prev) => ({ ...prev, cv: "CV uploaden is verplicht" }));
      newErrors.voornaam = newErrors.voornaam || ""; // trigger error state
    }
    if (formData.uitbetalingswijze === "zzp" && !formData.kvkNummer.trim()) {
      newErrors.kvkNummer = "KVK nummer is verplicht voor ZZP";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && cvFile !== null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const submitData = new FormData();

      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, String(value));
      });

      // Add files
      if (cvFile) submitData.append("cv", cvFile);
      if (profielFoto) submitData.append("profielfoto", profielFoto);
      extraDocumenten.forEach((doc, index) => {
        submitData.append(`document_${index}`, doc);
      });

      const response = await fetch("/api/inschrijven", {
        method: "POST",
        body: submitData,
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        alert("Er is iets misgegaan. Probeer het opnieuw.");
      }
    } catch {
      alert("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void
  ) => {
    const file = e.target.files?.[0] || null;
    setter(file);
  };

  const handleMultipleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setExtraDocumenten((prev) => [...prev, ...files]);
  };

  const removeExtraDocument = (index: number) => {
    setExtraDocumenten((prev) => prev.filter((_, i) => i !== index));
  };

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center max-w-2xl mx-auto">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
          Inschrijving ontvangen!
        </h2>
        <p className="text-neutral-600 mb-8">
          Bedankt voor je inschrijving bij TopTalent! Wij nemen zo snel mogelijk contact met je op.
        </p>
        <button
          onClick={() => {
            setFormData(initialFormData);
            setCvFile(null);
            setProfielFoto(null);
            setExtraDocumenten([]);
            setIsSubmitted(false);
          }}
          className="bg-[#F27501] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#d96800] transition-colors"
        >
          Nieuwe inschrijving
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 md:p-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Inschrijven</h2>
        <p className="text-neutral-600">
          Leuk dat je je wilt inschrijven voor TopTalent! Vul de onderstaande informatie in en wij nemen spoedig contact met je op.
        </p>
      </div>

      {/* Toestemming checkbox bovenaan */}
      <div className="mb-8 p-4 bg-neutral-50 rounded-lg">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.toestemming}
            onChange={(e) => updateField("toestemming", e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-neutral-300 text-[#F27501] focus:ring-[#F27501]"
          />
          <span className="text-sm text-neutral-600">
            Door het invullen van dit formulier, geef ik toestemming voor verwerking van persoonsgegevens die door TopTalent worden verkregen.
          </span>
        </label>
        {errors.toestemming && (
          <p className="text-red-500 text-sm mt-2">{errors.toestemming}</p>
        )}
      </div>

      {/* Persoonlijke gegevens */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-neutral-900 border-b border-neutral-200 pb-2">
          Persoonlijke gegevens
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Voornaam *
            </label>
            <input
              type="text"
              value={formData.voornaam}
              onChange={(e) => updateField("voornaam", e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.voornaam ? "border-red-500" : "border-neutral-200"
              } focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors`}
              placeholder="Voornaam"
            />
            {errors.voornaam && (
              <p className="text-red-500 text-sm mt-1">{errors.voornaam}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Tussenvoegsel
            </label>
            <input
              type="text"
              value={formData.tussenvoegsel}
              onChange={(e) => updateField("tussenvoegsel", e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
              placeholder="van, de, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Achternaam *
            </label>
            <input
              type="text"
              value={formData.achternaam}
              onChange={(e) => updateField("achternaam", e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.achternaam ? "border-red-500" : "border-neutral-200"
              } focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors`}
              placeholder="Achternaam"
            />
            {errors.achternaam && (
              <p className="text-red-500 text-sm mt-1">{errors.achternaam}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Stad *
            </label>
            <input
              type="text"
              value={formData.stad}
              onChange={(e) => updateField("stad", e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.stad ? "border-red-500" : "border-neutral-200"
              } focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors`}
              placeholder="Stad"
            />
            {errors.stad && (
              <p className="text-red-500 text-sm mt-1">{errors.stad}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Geboortedatum *
            </label>
            <input
              type="date"
              value={formData.geboortedatum}
              onChange={(e) => updateField("geboortedatum", e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.geboortedatum ? "border-red-500" : "border-neutral-200"
              } focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors`}
            />
            {errors.geboortedatum && (
              <p className="text-red-500 text-sm mt-1">{errors.geboortedatum}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Geslacht *
            </label>
            <select
              value={formData.geslacht}
              onChange={(e) => updateField("geslacht", e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.geslacht ? "border-red-500" : "border-neutral-200"
              } focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors bg-white`}
            >
              <option value="">Selecteer...</option>
              <option value="man">Man</option>
              <option value="vrouw">Vrouw</option>
              <option value="anders">Anders</option>
              <option value="zeg-ik-liever-niet">Zeg ik liever niet</option>
            </select>
            {errors.geslacht && (
              <p className="text-red-500 text-sm mt-1">{errors.geslacht}</p>
            )}
          </div>
        </div>
      </div>

      {/* Motivatie & Achtergrond */}
      <div className="space-y-6 mt-10">
        <h3 className="text-lg font-semibold text-neutral-900 border-b border-neutral-200 pb-2">
          Motivatie & Achtergrond
        </h3>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Leg kort je motivatie uit om bij ons te werken? *
          </label>
          <textarea
            value={formData.motivatie}
            onChange={(e) => updateField("motivatie", e.target.value)}
            rows={4}
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.motivatie ? "border-red-500" : "border-neutral-200"
            } focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors resize-none`}
            placeholder="Vertel ons waarom je bij TopTalent wilt werken..."
          />
          {errors.motivatie && (
            <p className="text-red-500 text-sm mt-1">{errors.motivatie}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Hoe ben je bij ons gekomen? (Wanneer via een vriend, vertel ons vooral wie!) *
          </label>
          <input
            type="text"
            value={formData.hoeGekomen}
            onChange={(e) => updateField("hoeGekomen", e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.hoeGekomen ? "border-red-500" : "border-neutral-200"
            } focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors`}
            placeholder="Bijv. Google, Instagram, via een vriend (naam)..."
          />
          {errors.hoeGekomen && (
            <p className="text-red-500 text-sm mt-1">{errors.hoeGekomen}</p>
          )}
        </div>
      </div>

      {/* Werkvoorkeuren */}
      <div className="space-y-6 mt-10">
        <h3 className="text-lg font-semibold text-neutral-900 border-b border-neutral-200 pb-2">
          Werkvoorkeuren
        </h3>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-3">
            Wil je als ZZP&apos;er of in loondienst uitbetaald worden? *
          </label>
          <div className="flex flex-wrap gap-3">
            {[
              { value: "loondienst", label: "Loondienst" },
              { value: "zzp", label: "ZZP'er" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateField("uitbetalingswijze", option.value)}
                className={`px-6 py-3 rounded-lg border text-sm font-medium transition-all duration-200 ${
                  formData.uitbetalingswijze === option.value
                    ? "bg-[#F27501] border-[#F27501] text-white"
                    : "bg-white border-neutral-200 text-neutral-700 hover:border-[#F27501] hover:text-[#F27501]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {errors.uitbetalingswijze && (
            <p className="text-red-500 text-sm mt-2">{errors.uitbetalingswijze}</p>
          )}
        </div>

        {formData.uitbetalingswijze === "zzp" && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              KVK nummer *
            </label>
            <input
              type="text"
              value={formData.kvkNummer}
              onChange={(e) => updateField("kvkNummer", e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.kvkNummer ? "border-red-500" : "border-neutral-200"
              } focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors`}
              placeholder="Je KVK nummer"
            />
            {errors.kvkNummer && (
              <p className="text-red-500 text-sm mt-1">{errors.kvkNummer}</p>
            )}
          </div>
        )}
      </div>

      {/* Documenten uploaden */}
      <div className="space-y-6 mt-10">
        <h3 className="text-lg font-semibold text-neutral-900 border-b border-neutral-200 pb-2">
          Documenten
        </h3>

        {/* CV Upload */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            CV uploaden * <span className="text-neutral-400 font-normal">(PDF, max 5MB)</span>
          </label>
          <div
            onClick={() => cvInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              cvFile
                ? "border-green-500 bg-green-50"
                : errors.cv
                ? "border-red-500 bg-red-50"
                : "border-neutral-300 hover:border-[#F27501] hover:bg-orange-50"
            }`}
          >
            <input
              ref={cvInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, setCvFile)}
              className="hidden"
            />
            {cvFile ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">{cvFile.name}</span>
              </div>
            ) : (
              <div className="text-neutral-500">
                <svg className="w-10 h-10 mx-auto mb-2 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Klik om je CV te uploaden</span>
              </div>
            )}
          </div>
          {errors.cv && (
            <p className="text-red-500 text-sm mt-1">CV uploaden is verplicht</p>
          )}
        </div>

        {/* Profielfoto Upload */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Profielfoto <span className="text-neutral-400 font-normal">(JPG/PNG, max 2MB)</span>
          </label>
          <div
            onClick={() => fotoInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              profielFoto
                ? "border-green-500 bg-green-50"
                : "border-neutral-300 hover:border-[#F27501] hover:bg-orange-50"
            }`}
          >
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => handleFileChange(e, setProfielFoto)}
              className="hidden"
            />
            {profielFoto ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">{profielFoto.name}</span>
              </div>
            ) : (
              <div className="text-neutral-500">
                <svg className="w-10 h-10 mx-auto mb-2 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Klik om een profielfoto te uploaden</span>
              </div>
            )}
          </div>
        </div>

        {/* Extra documenten */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Aanvullende documenten <span className="text-neutral-400 font-normal">(certificaten, diploma&apos;s etc.)</span>
          </label>
          <div
            onClick={() => docInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors border-neutral-300 hover:border-[#F27501] hover:bg-orange-50"
          >
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleMultipleFiles}
              className="hidden"
            />
            <div className="text-neutral-500">
              <svg className="w-10 h-10 mx-auto mb-2 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Klik om extra documenten te uploaden</span>
            </div>
          </div>
          {extraDocumenten.length > 0 && (
            <div className="mt-3 space-y-2">
              {extraDocumenten.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-neutral-50 px-4 py-2 rounded-lg"
                >
                  <span className="text-sm text-neutral-700">{doc.name}</span>
                  <button
                    type="button"
                    onClick={() => removeExtraDocument(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-10">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#F27501] text-white px-8 py-4 rounded-lg font-semibold text-lg
          shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
          hover:bg-[#d96800] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Verzenden..." : "Inschrijving versturen"}
        </button>
      </div>
    </form>
  );
}
