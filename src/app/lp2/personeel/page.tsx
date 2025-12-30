"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Section from "@/components/Section";
import PersoneelLandingBase from "@/components/lp/PersoneelLandingBase";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import MiniTestimonialCarousel from "@/components/MiniTestimonialCarousel";

interface LeadFormData {
  naam: string;
  bedrijfsnaam: string;
  email: string;
  telefoon: string;
  rol: string;
  bericht: string;
  // Lead tracking
  leadSource: string;
  campaignName: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
}

const initialFormData: LeadFormData = {
  naam: "",
  bedrijfsnaam: "",
  email: "",
  telefoon: "",
  rol: "",
  bericht: "",
  // Lead tracking
  leadSource: "website",
  campaignName: "",
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
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

const benefitItems = [
  "Gescreend en horeca-ervaren",
  "Snel inzetbaar bij ziekte of piekmomenten",
  "Persoonlijke matching op type zaak en tempo",
  "Heldere afspraken en korte lijnen",
];

const trustItems = [
  "100+ klanten",
  "Reactie binnen 24 uur",
  "Actief in Utrecht, Amsterdam en Rotterdam",
  "Persoonlijke matching",
];

const miniCases = [
  {
    title: "Zomerdrukte zonder stress",
    context: "Drukke zomermaanden bij Restaurant De Smaak.",
    result: "Binnen een dag ervaren bediening op de vloer.",
    quote: testimonials[0].content,
    name: testimonials[0].name,
    company: testimonials[0].company,
  },
  {
    title: "Persoonlijke match voor hotelteams",
    context: "Specifieke wensen voor service en uitstraling.",
    result: "Een team dat direct aansloot op de werkwijze.",
    quote: testimonials[1].content,
    name: testimonials[1].name,
    company: testimonials[1].company,
  },
  {
    title: "Betrouwbare teams voor events",
    context: "Snel schakelen voor wisselende eventlocaties.",
    result: "Altijd professionele medewerkers op de vloer.",
    quote: testimonials[2].content,
    name: testimonials[2].name,
    company: testimonials[2].company,
  },
];

const steps = [
  {
    title: "Intake en planning",
    description:
      "We brengen planning, type zaak en gewenste inzet scherp in kaart, zodat je precies krijgt wat je nodig hebt.",
  },
  {
    title: "Selectie op tempo",
    description:
      "We matchen horecakrachten die passen bij jouw team, tempo en servicelevel.",
  },
  {
    title: "Bevestiging en start",
    description:
      "Je ontvangt snel bevestiging. Wij regelen de inzet en communiceren helder over de start.",
  },
  {
    title: "Begeleiding tijdens inzet",
    description:
      "We blijven bereikbaar en sturen bij wanneer dat nodig is.",
  },
];

const highlights = [
  {
    title: "24/7 bereikbaar",
    text: "Direct contact via telefoon of WhatsApp.",
  },
  {
    title: "Geselecteerde kandidaten",
    text: "Screening op ervaring, tempo en gastvrijheid.",
  },
  {
    title: "Schaalbaar inzetbaar",
    text: "Van 1 persoon tot complete teams.",
  },
];

function PersoneelLandingVariantAContent() {
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<LeadFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { executeRecaptcha } = useRecaptcha();

  // Capture URL parameters for lead tracking
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

      // Parse rol field to typePersoneel array
      const typePersoneel = formData.rol
        ? formData.rol.split(/[,;\/]/).map(r => r.trim()).filter(Boolean)
        : ["Niet gespecificeerd"];

      // Calculate tomorrow's date for start_datum
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startDatumFormatted = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

      const response = await fetch("/api/personeel-aanvragen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedrijfsnaam: formData.bedrijfsnaam,
          contactpersoon: formData.naam,
          email: formData.email,
          telefoon: formData.telefoon,
          typePersoneel: typePersoneel,
          aantalPersonen: "1-2",
          contractType: ["uitzendkracht"],
          gewenstUurtarief: "",
          startDatum: startDatumFormatted,
          eindDatum: "",
          werkdagen: ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"],
          werktijden: "Flexibel / In overleg",
          locatie: "Zie contactgegevens",
          opmerkingen: `Via landingspagina LP2 (Variant A)\n${formData.bericht || "Geen extra opmerkingen"}`,
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
          lp_variant: "A",
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
    <div data-lp-variant="A">
      <PersoneelLandingBase
        left={
          <>
            <span className="inline-flex items-center gap-2 text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.2)]" />
              Binnen 24 uur personeel
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
              Geen stress door personeelstekort - ervaren{" "}
              <span className="text-[#F97316]">horecapersoneel</span> binnen 24 uur.
            </h1>
            <p className="text-neutral-600 text-lg leading-relaxed mb-8">
              Ziekmelding, piekdrukte of uitval op het laatste moment? Wij regelen gescreend
              personeel dat direct meedraait, zodat jouw zaak blijft draaien.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {benefitItems.map((item) => (
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
            <div className="flex flex-wrap items-center gap-3 mb-8">
              {trustItems.map((item) => (
                <div
                  key={item}
                  className="px-4 py-2 rounded-full bg-neutral-900 text-white text-xs font-semibold tracking-wide"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="mb-8">
              <MiniTestimonialCarousel testimonials={testimonials} />
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="tel:+31649200412"
                className="inline-flex items-center gap-2 text-[#F97316] font-semibold hover:text-[#EA580C] transition-colors"
              >
                Bel direct voor spoed
              </Link>
            </div>
          </>
        }
        right={
          <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-lg shadow-neutral-900/10 border border-neutral-100">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Korte aanvraag</h2>
            <p className="text-neutral-600 mb-2">Vul het formulier in en we nemen contact op.</p>
            <p className="text-sm text-neutral-500 mb-8">
              Binnen 15 minuten reactie tijdens openingstijden.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5" data-lp-variant="A">
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
                {isSubmitting ? "Versturen..." : "Vraag direct personeel aan"}
              </button>
            </form>

            <p className="text-center text-sm text-neutral-500 mt-4">
              Geen spam. Alleen contact over je aanvraag.
            </p>
            <p className="text-center text-sm text-neutral-500 mt-2">
              Door te versturen ga je akkoord met ons{" "}
              <Link href="/privacy" className="text-[#F97316] hover:underline">
                privacybeleid
              </Link>
              .
            </p>
          </div>
        }
      />

      <Section variant="tinted" spacing="default">
        <Section.Container>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-[#F97316] font-semibold mb-3">
              Praktijkvoorbeelden
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">
              Zo helpen we horeca teams snel vooruit
            </h2>
            <p className="text-neutral-600">
              Concrete ervaringen van horecaondernemers die snel moesten schakelen.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {miniCases.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">{item.title}</h3>
                <p className="text-sm text-neutral-600 mb-3">{item.context}</p>
                <p className="text-sm font-medium text-neutral-900 mb-4">{item.result}</p>
                <p className="text-sm text-neutral-600 leading-relaxed mb-4">"{item.quote}"</p>
                <p className="text-xs font-semibold text-neutral-900">
                  {item.name} · {item.company}
                </p>
              </div>
            ))}
          </div>
        </Section.Container>
      </Section>

      <Section variant="white" spacing="default">
        <Section.Container>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-[#F97316] font-semibold mb-3">
              Hoe we werken
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">
              Duidelijke stappen, snel resultaat
            </h2>
            <p className="text-neutral-600">
              Je weet precies waar je aan toe bent en wanneer we leveren.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step) => (
              <div
                key={step.title}
                className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">{step.title}</h3>
                <p className="text-sm text-neutral-600">{step.description}</p>
              </div>
            ))}
          </div>
        </Section.Container>
      </Section>

      <Section variant="tinted" spacing="default">
        <Section.Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#F97316]/30 hover:shadow-lg hover:shadow-orange-500/10"
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
    </div>
  );
}

// Loading fallback component
function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div>
    </div>
  );
}

// Suspense wrapper required for useSearchParams()
export default function PersoneelLandingVariantA() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PersoneelLandingVariantAContent />
    </Suspense>
  );
}
