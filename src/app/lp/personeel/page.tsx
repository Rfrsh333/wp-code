"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import MiniTestimonialCarousel from "@/components/MiniTestimonialCarousel";
import HowWeWorkCarousel from "@/components/HowWeWorkCarousel";

interface LeadFormData {
  naam: string;
  bedrijfsnaam: string;
  email: string;
  telefoon: string;
  rol: string;
  bericht: string;
  // Lead tracking
  leadSource?: string;
  campaignName?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

const initialFormData: LeadFormData = {
  naam: "",
  bedrijfsnaam: "",
  email: "",
  telefoon: "",
  rol: "",
  bericht: "",
};

const testimonials = [
  {
    name: "Martijn de Vries",
    company: "Restaurant De Smaak",
    content:
      "TopTalent heeft ons enorm geholpen tijdens de drukke zomermaanden. Binnen een dag hadden we ervaren bediening op de vloer.",
  },
  {
    name: "Sophie Jansen",
    company: "Grand Hotel Amsterdam",
    content:
      "TopTalent onderscheidt zich door hun persoonlijke aanpak en het begrip van onze specifieke behoeften.",
  },
  {
    name: "Rick van den Berg",
    company: "Catering Company",
    content:
      "TopTalent begrijpt de dynamiek van de eventbranche en levert altijd betrouwbare, professionele medewerkers.",
  },
];

function PersoneelLandingPageContent() {
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<LeadFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { executeRecaptcha } = useRecaptcha();
  const searchParams = useSearchParams();

  // Read URL parameters for lead source tracking
  useEffect(() => {
    const source = searchParams.get('source') || 'website';
    const campaign = searchParams.get('campaign') || '';
    const utmSource = searchParams.get('utm_source') || '';
    const utmMedium = searchParams.get('utm_medium') || '';
    const utmCampaign = searchParams.get('utm_campaign') || '';

    setFormData(prev => ({
      ...prev,
      leadSource: source,
      campaignName: campaign,
      utmSource: utmSource,
      utmMedium: utmMedium,
      utmCampaign: utmCampaign,
    }));
  }, [searchParams]);

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

      // Parse rol veld naar typePersoneel array
      const typePersoneel = formData.rol
        ? formData.rol.split(/[,;\/]/).map(r => r.trim()).filter(Boolean)
        : ["Niet gespecificeerd"];

      const response = await fetch("/api/personeel-aanvragen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Basis velden
          bedrijfsnaam: formData.bedrijfsnaam,
          contactpersoon: formData.naam,
          email: formData.email,
          telefoon: formData.telefoon,
          // Personeel velden (met defaults voor landingspagina)
          typePersoneel: typePersoneel,
          aantalPersonen: "Niet opgegeven",
          contractType: ["uitzendkracht"],
          gewenstUurtarief: "",
          // Planning velden (met defaults)
          startDatum: "Zo snel mogelijk",
          eindDatum: "",
          werkdagen: ["Niet gespecificeerd"],
          werktijden: "Niet gespecificeerd",
          // Extra info
          locatie: "Niet opgegeven",
          opmerkingen: formData.bericht || "Aanvraag via landingspagina",
          recaptchaToken,
          // Lead tracking
          leadSource: formData.leadSource,
          campaignName: formData.campaignName,
          utmSource: formData.utmSource,
          utmMedium: formData.utmMedium,
          utmCampaign: formData.utmCampaign,
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {[
                  "Reactie binnen 24 uur",
                  "Geselecteerde kandidaten",
                  "Flexibel inzetbaar",
                  "Transparante tarieven",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-neutral-700">
                    <div className="w-9 h-9 bg-green-50 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="px-4 py-2 rounded-full bg-neutral-900 text-white text-xs font-semibold tracking-wide">
                  100+ klanten
                </div>
                <div className="px-4 py-2 rounded-full bg-[#FFF7F1] text-[#F97316] text-xs font-semibold tracking-wide">
                  Reactie binnen 24 uur
                </div>
              </div>
              <div className="mb-6">
                <MiniTestimonialCarousel testimonials={testimonials} />
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

      <HowWeWorkCarousel />

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
                className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#F97316]/30 hover:shadow-lg hover:shadow-orange-500/10"
              >
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  {item.title}
                </h3>
                {item.title === "24/7 bereikbaar" ? (
                  <p className="text-sm text-neutral-600">
                    Direct contact via telefoon en{" "}
                    <a
                      href="https://wa.me/31649200412"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-green-600 font-medium hover:text-green-700 transition-colors"
                    >
                      WhatsApp
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </a>
                    .
                  </p>
                ) : (
                  <p className="text-sm text-neutral-600">{item.text}</p>
                )}
              </div>
            ))}
          </div>
        </Section.Container>
      </Section>
    </>
  );
}

export default function PersoneelLandingPage() {
  return (
    <Suspense fallback={
      <Section variant="white" spacing="default">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="animate-pulse">
              <div className="h-8 bg-neutral-200 rounded w-3/4 mb-4"></div>
              <div className="h-12 bg-neutral-200 rounded w-full mb-6"></div>
              <div className="h-4 bg-neutral-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-neutral-200 rounded w-5/6"></div>
            </div>
            <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-lg animate-pulse">
              <div className="h-6 bg-neutral-200 rounded w-1/2 mb-8"></div>
              <div className="space-y-4">
                <div className="h-12 bg-neutral-200 rounded"></div>
                <div className="h-12 bg-neutral-200 rounded"></div>
                <div className="h-12 bg-neutral-200 rounded"></div>
              </div>
            </div>
          </div>
        </Section.Container>
      </Section>
    }>
      <PersoneelLandingPageContent />
    </Suspense>
  );
}
