"use client";

import { useState, useRef, useEffect } from "react";
import { useRecaptcha } from "@/hooks/useRecaptcha";

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

// Card component for sections
function FormCard({
  children,
  title,
  subtitle,
  icon,
  index,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  index: number;
}) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm shadow-neutral-900/5 border border-neutral-100 overflow-hidden animate-fade-in"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="px-6 py-5 border-b border-neutral-100 bg-gradient-to-r from-neutral-50 to-white">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#F27501]/10 flex items-center justify-center text-[#F27501]">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
            {subtitle && (
              <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// Input component with premium styling
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
        {label} {required && <span className="text-[#F27501]">*</span>}
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
            ${error
              ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
              : isFocused
              ? "border-[#F27501] ring-4 ring-[#F27501]/10"
              : "border-neutral-200 hover:border-neutral-300"
            }
            focus:outline-none
          `}
        />
        {error && (
          <p className="text-red-500 text-sm mt-2 flex items-center gap-1.5 animate-fade-in">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// Select component with premium styling
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
        {label} {required && <span className="text-[#F27501]">*</span>}
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
            ${error
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
      {error && (
        <p className="text-red-500 text-sm mt-2 flex items-center gap-1.5 animate-fade-in">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// Textarea component with premium styling
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
        {label} {required && <span className="text-[#F27501]">*</span>}
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
          ${error
            ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
            : isFocused
            ? "border-[#F27501] ring-4 ring-[#F27501]/10"
            : "border-neutral-200 hover:border-neutral-300"
          }
          focus:outline-none
        `}
      />
      {error && (
        <p className="text-red-500 text-sm mt-2 flex items-center gap-1.5 animate-fade-in">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// File upload component with premium styling
function FileUpload({
  label,
  subtitle,
  accept,
  file,
  onFileChange,
  error,
  required,
  icon,
  multiple = false,
  files,
  onFilesChange,
  onRemoveFile,
}: {
  label: string;
  subtitle?: string;
  accept: string;
  file?: File | null;
  onFileChange?: (file: File | null) => void;
  error?: boolean;
  required?: boolean;
  icon: "document" | "image" | "folder";
  multiple?: boolean;
  files?: File[];
  onFilesChange?: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const icons = {
    document: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    image: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    folder: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (multiple && onFilesChange) {
      onFilesChange([...(files || []), ...droppedFiles]);
    } else if (onFileChange && droppedFiles[0]) {
      onFileChange(droppedFiles[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (multiple && onFilesChange) {
      onFilesChange([...(files || []), ...selectedFiles]);
    } else if (onFileChange && selectedFiles[0]) {
      onFileChange(selectedFiles[0]);
    }
  };

  const hasFile = file || (files && files.length > 0);

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        {label} {required && <span className="text-[#F27501]">*</span>}
        {subtitle && <span className="text-neutral-400 font-normal ml-1">({subtitle})</span>}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200 ease-out
          ${hasFile
            ? "border-green-400 bg-green-50/50"
            : error
            ? "border-red-300 bg-red-50/50"
            : isDragging
            ? "border-[#F27501] bg-[#F27501]/5 scale-[1.02]"
            : "border-neutral-200 hover:border-[#F27501]/50 hover:bg-neutral-50"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />

        {!hasFile ? (
          <div className="space-y-3">
            <div className={`mx-auto w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
              isDragging ? "bg-[#F27501]/10 text-[#F27501]" : "bg-neutral-100 text-neutral-400"
            }`}>
              {icons[icon]}
            </div>
            <div>
              <p className="text-neutral-700 font-medium">
                Sleep bestand hierheen of <span className="text-[#F27501]">klik om te uploaden</span>
              </p>
              <p className="text-neutral-400 text-sm mt-1">
                {accept.includes("pdf") ? "PDF bestanden" : "JPG of PNG"} tot 5MB
              </p>
            </div>
          </div>
        ) : file ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-neutral-900 font-medium">{file.name}</p>
              <p className="text-neutral-500 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFileChange?.(null);
              }}
              className="ml-auto p-2 text-neutral-400 hover:text-red-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>

      {/* Multiple files list */}
      {multiple && files && files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((doc, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-neutral-50 px-4 py-3 rounded-xl border border-neutral-100 animate-fade-in"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F27501]/10 flex items-center justify-center text-[#F27501]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-sm text-neutral-700 font-medium">{doc.name}</span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveFile?.(index)}
                className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-2 flex items-center gap-1.5 animate-fade-in">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Dit veld is verplicht
        </p>
      )}
    </div>
  );
}

export default function InschrijfFormulier() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | "cv", string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [profielFoto, setProfielFoto] = useState<File | null>(null);
  const [extraDocumenten, setExtraDocumenten] = useState<File[]>([]);
  const [mounted, setMounted] = useState(false);
  const { executeRecaptcha } = useRecaptcha();

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData | "cv", string>> = {};

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
    if (!cvFile) newErrors.cv = "CV uploaden is verplicht";
    if (formData.uitbetalingswijze === "zzp" && !formData.kvkNummer.trim()) {
      newErrors.kvkNummer = "KVK nummer is verplicht voor ZZP";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await executeRecaptcha("inschrijven");

      const submitData = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, String(value));
      });

      if (recaptchaToken) {
        submitData.append("recaptchaToken", recaptchaToken);
      }

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
        const data = await response.json();
        alert(data.error || "Er is iets misgegaan. Probeer het opnieuw.");
      }
    } catch {
      alert("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeExtraDocument = (index: number) => {
    setExtraDocumenten((prev) => prev.filter((_, i) => i !== index));
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
          Bedankt voor je inschrijving bij TopTalent. Wij nemen zo snel mogelijk contact met je op voor de volgende stappen.
        </p>
        <button
          onClick={() => {
            setFormData(initialFormData);
            setCvFile(null);
            setProfielFoto(null);
            setExtraDocumenten([]);
            setIsSubmitted(false);
          }}
          className="inline-flex items-center gap-2 bg-neutral-100 text-neutral-700 px-6 py-3 rounded-xl font-medium
          hover:bg-neutral-200 transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nieuwe inschrijving
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-10 animate-fade-in">
        <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">
          Inschrijven bij TopTalent
        </h2>
        <p className="text-neutral-600 max-w-xl mx-auto">
          Leuk dat je je wilt inschrijven! Vul onderstaand formulier in en wij nemen spoedig contact met je op.
        </p>
      </div>

      {/* Toestemming */}
      <div
        className={`animate-fade-in
          bg-gradient-to-r from-neutral-50 to-white rounded-2xl p-5 border-2 transition-colors duration-200
          ${errors.toestemming ? "border-red-200" : formData.toestemming ? "border-green-200" : "border-neutral-100"}
        `}
      >
        <label className="flex items-start gap-4 cursor-pointer">
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={formData.toestemming}
              onChange={(e) => updateField("toestemming", e.target.checked)}
              className="sr-only"
            />
            <div className={`
              w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200
              ${formData.toestemming
                ? "bg-[#F27501] border-[#F27501]"
                : "bg-white border-neutral-300 hover:border-neutral-400"
              }
            `}>
              {formData.toestemming && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-neutral-600 leading-relaxed">
            Door het invullen van dit formulier, geef ik toestemming voor verwerking van persoonsgegevens die door TopTalent worden verkregen.
            <span className="text-[#F27501] ml-1">*</span>
          </span>
        </label>
        {errors.toestemming && (
          <p className="text-red-500 text-sm mt-3 flex items-center gap-1.5 animate-fade-in">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errors.toestemming}
          </p>
        )}
      </div>

      {/* Section 1: Persoonlijke gegevens */}
      <FormCard
        index={1}
        title="Persoonlijke gegevens"
        subtitle="Je basis contactinformatie"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormInput
              label="Voornaam"
              value={formData.voornaam}
              onChange={(e) => updateField("voornaam", e.target.value)}
              placeholder="Je voornaam"
              error={errors.voornaam}
              required
            />
            <FormInput
              label="Tussenvoegsel"
              value={formData.tussenvoegsel}
              onChange={(e) => updateField("tussenvoegsel", e.target.value)}
              placeholder="van, de, etc."
            />
            <FormInput
              label="Achternaam"
              value={formData.achternaam}
              onChange={(e) => updateField("achternaam", e.target.value)}
              placeholder="Je achternaam"
              error={errors.achternaam}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="E-mailadres"
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="naam@voorbeeld.nl"
              error={errors.email}
              required
            />
            <FormInput
              label="Telefoonnummer"
              type="tel"
              value={formData.telefoon}
              onChange={(e) => updateField("telefoon", e.target.value)}
              placeholder="06 12345678"
              error={errors.telefoon}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormInput
              label="Stad"
              value={formData.stad}
              onChange={(e) => updateField("stad", e.target.value)}
              placeholder="Woonplaats"
              error={errors.stad}
              required
            />
            <FormInput
              label="Geboortedatum"
              type="date"
              value={formData.geboortedatum}
              onChange={(e) => updateField("geboortedatum", e.target.value)}
              error={errors.geboortedatum}
              required
            />
            <FormSelect
              label="Geslacht"
              value={formData.geslacht}
              onChange={(e) => updateField("geslacht", e.target.value)}
              options={[
                { value: "man", label: "Man" },
                { value: "vrouw", label: "Vrouw" },
                { value: "anders", label: "Anders" },
                { value: "zeg-ik-liever-niet", label: "Zeg ik liever niet" },
              ]}
              error={errors.geslacht}
              required
            />
          </div>
        </div>
      </FormCard>

      {/* Section 2: Motivatie & Achtergrond */}
      <FormCard
        index={2}
        title="Motivatie & Achtergrond"
        subtitle="Vertel ons meer over jezelf"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        }
      >
        <div className="space-y-5">
          <FormTextarea
            label="Waarom wil je bij ons werken?"
            value={formData.motivatie}
            onChange={(e) => updateField("motivatie", e.target.value)}
            placeholder="Vertel ons kort over je motivatie en wat je zoekt in een baan..."
            error={errors.motivatie}
            required
            rows={4}
          />
          <FormInput
            label="Hoe heb je ons gevonden?"
            value={formData.hoeGekomen}
            onChange={(e) => updateField("hoeGekomen", e.target.value)}
            placeholder="Bijv. Google, Instagram, via een vriend (naam)..."
            error={errors.hoeGekomen}
            required
          />
        </div>
      </FormCard>

      {/* Section 3: Werkvoorkeuren */}
      <FormCard
        index={3}
        title="Werkvoorkeuren"
        subtitle="Hoe wil je werken?"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-3">
              Uitbetalingswijze <span className="text-[#F27501]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "loondienst", label: "Loondienst", desc: "Wij regelen alles" },
                { value: "zzp", label: "ZZP'er", desc: "Je factureert zelf" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateField("uitbetalingswijze", option.value)}
                  className={`
                    p-4 rounded-xl border-2 text-left transition-all duration-200
                    ${formData.uitbetalingswijze === option.value
                      ? "border-[#F27501] bg-[#F27501]/5 ring-4 ring-[#F27501]/10"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-semibold ${
                      formData.uitbetalingswijze === option.value ? "text-[#F27501]" : "text-neutral-900"
                    }`}>
                      {option.label}
                    </span>
                    <div className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                      ${formData.uitbetalingswijze === option.value
                        ? "border-[#F27501] bg-[#F27501]"
                        : "border-neutral-300"
                      }
                    `}>
                      {formData.uitbetalingswijze === option.value && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-neutral-500">{option.desc}</span>
                </button>
              ))}
            </div>
            {errors.uitbetalingswijze && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1.5 animate-fade-in">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.uitbetalingswijze}
              </p>
            )}
          </div>

          {formData.uitbetalingswijze === "zzp" && (
            <div className="animate-fade-in">
              <FormInput
                label="KVK nummer"
                value={formData.kvkNummer}
                onChange={(e) => updateField("kvkNummer", e.target.value)}
                placeholder="Je KVK registratienummer"
                error={errors.kvkNummer}
                required
              />
            </div>
          )}
        </div>
      </FormCard>

      {/* Section 4: Documenten */}
      <FormCard
        index={4}
        title="Documenten"
        subtitle="Upload je bestanden"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      >
        <div className="space-y-5">
          <FileUpload
            label="Curriculum Vitae (CV)"
            subtitle="PDF, max 5MB"
            accept=".pdf"
            file={cvFile}
            onFileChange={setCvFile}
            error={!!errors.cv}
            required
            icon="document"
          />

          <FileUpload
            label="Profielfoto"
            subtitle="JPG of PNG, max 2MB"
            accept="image/jpeg,image/png"
            file={profielFoto}
            onFileChange={setProfielFoto}
            icon="image"
          />

          <FileUpload
            label="Aanvullende documenten"
            subtitle="Certificaten, diploma's etc."
            accept=".pdf"
            multiple
            files={extraDocumenten}
            onFilesChange={setExtraDocumenten}
            onRemoveFile={removeExtraDocument}
            icon="folder"
          />
        </div>
      </FormCard>

      {/* Submit Button */}
      <div className="pt-4 animate-fade-in" style={{ animationDelay: "0.5s" }}>
        <button
          type="submit"
          disabled={isSubmitting}
          className="
            w-full bg-[#F27501] text-white px-8 py-4 rounded-xl font-semibold text-lg
            shadow-lg shadow-[#F27501]/25
            hover:bg-[#d96800] hover:shadow-xl hover:shadow-[#F27501]/30 hover:-translate-y-0.5
            active:translate-y-0
            transition-all duration-200 ease-out
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg
            flex items-center justify-center gap-2
          "
        >
          {isSubmitting ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Verzenden...
            </>
          ) : (
            <>
              Inschrijving versturen
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>

        <p className="text-center text-sm text-neutral-500 mt-4">
          Door in te schrijven ga je akkoord met onze{" "}
          <a href="/voorwaarden" className="text-[#F27501] hover:underline">voorwaarden</a>
          {" "}en{" "}
          <a href="/privacy" className="text-[#F27501] hover:underline">privacybeleid</a>.
        </p>
      </div>
    </form>
  );
}
