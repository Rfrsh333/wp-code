"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";
import { useRecaptcha } from "@/hooks/useRecaptcha";

interface LeadFormData {
  naam: string;
  bedrijfsnaam: string;
  email: string;
  telefoon: string;
  rol: string;
  bericht: string;
}

const initialFormData: LeadFormData = {
  naam: "",
  bedrijfsnaam: "",
  email: "",
  telefoon: "",
  rol: "",
  bericht: "",
};

export default function PersoneelLandingPage() {
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<LeadFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { executeRecaptcha } = useRecaptcha();

  const updateField = (field: keyof LeadFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const newErrors: Partial<LeadFormData> = {};
    if (!formData.naam.trim()) newErrors.naam = "Naam is verplicht";
    if (!formData.bedrijfsnaam.trim()) newErrors.bedrijfsnaam = "Bedrijfsnaam is verplicht";
    if (!formData.email.trim()) {
      newErrors.email = "E-mail is verplicht";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Voer een geldig e-mailadres in";
    }
    if (!formData.telefoon.trim()) newErrors.telefoon = "Telefoonnummer is verplicht";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const recaptchaToken = await executeRecaptcha("b2b_landing");
      const onderwerp = "B2B landing - personeel aanvraag";
      const bericht = [
        `Bedrijfsnaam: ${formData.bedrijfsnaam}`,
        `Rol/functies: ${formData.rol || "-"}`,
        `Telefoon: ${formData.telefoon}`,
        formData.bericht ? `Bericht: ${formData.bericht}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: formData.naam,
          email: formData.email,
          telefoon: formData.telefoon,
          onderwerp,
          bericht,
          recaptchaToken,
        }),
      });

      if (response.ok) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: "lead_submit",
          form: "b2b_landing",
        });
        router.push("/bedankt/zakelijk");
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

  return (
    <>
      <Section variant="white" spacing="default">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeIn direction="left">
              <span className="inline-flex items-center gap-2 text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.2)]" />
                Binnen 24 uur personeel
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
                Snel betrouwbaar <span className="text-[#F97316]">horecapersoneel</span> nodig?
              </h1>
              <p className="text-neutral-600 text-lg leading-relaxed mb-8">
                TopTalent Jobs levert direct inzetbaar personeel voor restaurants, hotels,
                evenementen en catering. Vertel ons wat je nodig hebt en wij regelen de rest.
              </p>
              <p className="text-sm text-neutral-500 mb-6">
                Voor wie: restaurants, hotels, events en cateringbedrijven.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {[
                  "Reactie binnen 24 uur",
                  "Geselecteerde kandidaten",
                  "Flexibel inzetbaar",
                  "Transparante tarieven",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-neutral-700">
                    <div className="w-9 h-9 bg-[#FFF7F1] rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="px-4 py-2 rounded-full bg-neutral-900 text-white text-xs font-semibold tracking-wide">
                  500+ tevreden klanten
                </div>
                <div className="px-4 py-2 rounded-full bg-[#FFF7F1] text-[#F97316] text-xs font-semibold tracking-wide">
                  Reactie binnen 24 uur
                </div>
              </div>
              <div className="bg-white border border-neutral-100 rounded-2xl p-5 shadow-sm max-w-md mb-6">
                <p className="text-sm text-neutral-600 leading-relaxed mb-3">
                  “TopTalent heeft ons enorm geholpen tijdens de drukke zomermaanden.
                  Binnen een dag hadden we ervaren bediening op de vloer.”
                </p>
                <p className="text-xs font-semibold text-neutral-900">
                  Martijn de Vries · Restaurant De Smaak
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href="tel:+31649200412"
                  className="inline-flex items-center gap-2 text-[#F97316] font-semibold hover:text-[#EA580C] transition-colors"
                >
                  Bel direct: +31 6 49 20 04 12
                </Link>
              </div>
            </FadeIn>

            <FadeIn direction="right" delay={0.1}>
              <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-lg shadow-neutral-900/10 border border-neutral-100">
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Korte aanvraag</h2>
                <p className="text-neutral-600 mb-8">
                  Vul het formulier in en we nemen binnen 24 uur contact op.
                </p>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Naam *
                    </label>
                    <input
                      type="text"
                      value={formData.naam}
                      onChange={(e) => updateField("naam", e.target.value)}
                      className="w-full px-4 py-3.5 border border-neutral-200 rounded-xl
                      focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]
                      outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                      placeholder="Uw naam"
                    />
                    {errors.naam && <p className="text-red-500 text-sm mt-1">{errors.naam}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Bedrijfsnaam *
                    </label>
                    <input
                      type="text"
                      value={formData.bedrijfsnaam}
                      onChange={(e) => updateField("bedrijfsnaam", e.target.value)}
                      className="w-full px-4 py-3.5 border border-neutral-200 rounded-xl
                      focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]
                      outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                      placeholder="Uw bedrijf"
                    />
                    {errors.bedrijfsnaam && (
                      <p className="text-red-500 text-sm mt-1">{errors.bedrijfsnaam}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="w-full px-4 py-3.5 border border-neutral-200 rounded-xl
                      focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]
                      outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                      placeholder="uw@email.nl"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Telefoon *
                    </label>
                    <input
                      type="tel"
                      value={formData.telefoon}
                      onChange={(e) => updateField("telefoon", e.target.value)}
                      className="w-full px-4 py-3.5 border border-neutral-200 rounded-xl
                      focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]
                      outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                      placeholder="+31 6 12345678"
                    />
                    {errors.telefoon && (
                      <p className="text-red-500 text-sm mt-1">{errors.telefoon}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Functies (optioneel)
                    </label>
                    <input
                      type="text"
                      value={formData.rol}
                      onChange={(e) => updateField("rol", e.target.value)}
                      className="w-full px-4 py-3.5 border border-neutral-200 rounded-xl
                      focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]
                      outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                      placeholder="Bijv. bediening, bar, keuken"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Opmerking (optioneel)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.bericht}
                      onChange={(e) => updateField("bericht", e.target.value)}
                      className="w-full px-4 py-3.5 border border-neutral-200 rounded-xl
                      focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]
                      outline-none transition-all duration-300 bg-neutral-50 focus:bg-white resize-none"
                      placeholder="Extra details of planning"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                    shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                    hover:bg-[#EA580C] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Versturen..." : "Vrijblijvende aanvraag"}
                  </button>
                </form>

                <p className="text-center text-sm text-neutral-500 mt-6">
                  Door te versturen ga je akkoord met ons{" "}
                  <Link href="/privacy" className="text-[#F97316] hover:underline">
                    privacybeleid
                  </Link>
                  .
                </p>
              </div>
            </FadeIn>
          </div>
        </Section.Container>
      </Section>

      <Section variant="tinted" spacing="default">
        <Section.Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "24/7 bereikbaar",
                text: "Direct contact via telefoon en WhatsApp.",
              },
              {
                title: "Geselecteerde kandidaten",
                text: "Screening op ervaring en gastvrijheid.",
              },
              {
                title: "Schaalbaar inzetbaar",
                text: "Van 1 persoon tot complete teams.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-neutral-600">{item.text}</p>
              </div>
            ))}
          </div>
        </Section.Container>
      </Section>
    </>
  );
}
