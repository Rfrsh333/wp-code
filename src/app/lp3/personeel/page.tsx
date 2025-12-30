"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Section from "@/components/Section";
import PersoneelLandingBase from "@/components/lp/PersoneelLandingBase";
import { useRecaptcha } from "@/hooks/useRecaptcha";

interface LeadFormData {
  naam: string;
  bedrijfsnaam: string;
  email: string;
  telefoon: string;
  rol: string;
  inzet: string;
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
  inzet: "",
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
      "Binnen een dag hadden we ervaren bediening op de vloer. Dat gaf ons direct rust in de operatie.",
  },
  {
    name: "Sophie Jansen",
    company: "Grand Hotel Amsterdam",
    content:
      "De persoonlijke aanpak en het begrip van onze behoeften maken het verschil.",
  },
  {
    name: "Rick van den Berg",
    company: "Catering Company",
    content:
      "Altijd betrouwbare, professionele medewerkers die meteen kunnen meedraaien.",
  },
];

const proofPoints = [
  {
    title: "Gescreend op horeca-ervaring",
    text: "Geen beginners op je vloer. We sturen mensen die direct kunnen draaien.",
  },
  {
    title: "Spoed en planning",
    text: "We schakelen snel bij uitval, pieken of last-minute aanvragen.",
  },
  {
    title: "Een vast aanspreekpunt",
    text: "Korte lijnen en heldere afspraken tijdens de hele inzet.",
  },
];

const steps = [
  {
    title: "Jouw aanvraag in beeld",
    text: "Je geeft aan wat je vandaag of deze week nodig hebt. Wij checken direct beschikbaarheid.",
  },
  {
    title: "Snel bevestiging",
    text: "Je ontvangt snel bevestiging met de juiste match en planning.",
  },
  {
    title: "Start zonder gedoe",
    text: "Wij regelen administratie en blijven bereikbaar tijdens de inzet.",
  },
];

function PersoneelLandingVariantBContent() {
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<LeadFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
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

  const urgencyLine = useMemo(() => {
    const now = new Date();
    const cutoffHour = 16;
    if (now.getHours() < cutoffHour) {
      return `Voor inzet vandaag: dien je aanvraag uiterlijk om ${cutoffHour}:00 in.`;
    }
    return "Tip: voor inzet vandaag is sneller beter - aanvragen worden op volgorde verwerkt.";
  }, []);

  const updateField = (field: keyof LeadFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateStepOne = () => {
    const newErrors: Partial<LeadFormData> = {};
    if (!formData.rol.trim()) newErrors.rol = "Functie is verplicht";
    if (!formData.telefoon.trim()) newErrors.telefoon = "Telefoonnummer is verplicht";
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateStepTwo = () => {
    const newErrors: Partial<LeadFormData> = {};
    if (!formData.naam.trim()) newErrors.naam = "Naam is verplicht";
    if (!formData.bedrijfsnaam.trim()) newErrors.bedrijfsnaam = "Bedrijfsnaam is verplicht";
    if (!formData.email.trim()) {
      newErrors.email = "E-mail is verplicht";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Voer een geldig e-mailadres in";
    }
    if (!formData.inzet.trim()) newErrors.inzet = "Inzetdatum of urgentie is verplicht";
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStepOne()) return;
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateStepTwo()) return;

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
          opmerkingen: `Via landingspagina LP3 (Variant B - 2-step)\nInzetdatum/urgentie: ${formData.inzet}\n${formData.bericht || "Geen extra opmerkingen"}`,
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
          lp_variant: "B",
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
    <div data-lp-variant="B">
      <PersoneelLandingBase
        left={
          <>
            <span className="inline-flex items-center gap-2 text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.2)]" />
              Spoed inzet mogelijk
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
              Vandaag nog personeel nodig? Wij fixen ervaren{" "}
              <span className="text-[#F97316]">horecakrachten</span> binnen 24 uur.
            </h1>
            <p className="text-neutral-600 text-lg leading-relaxed mb-4">
              Geen gedoe met ongeschikte krachten. Jij geeft door wat je nodig hebt - wij regelen de
              match en bevestigen snel.
            </p>
            <p className="text-sm text-neutral-500 mb-6">{urgencyLine}</p>
            <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-5 mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-2">
                Personeel valt uit? Tafels leeg? Reviews op het spel?
              </h2>
              <p className="text-sm text-neutral-600">
                Wij nemen de stress over en zetten binnen 24 uur iemand op de vloer die wel kan
                draaien.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {proofPoints.map((item) => (
                <div key={item.title} className="flex items-start gap-3 text-neutral-700">
                  <div className="w-9 h-9 bg-green-50 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{item.title}</p>
                    <p className="text-xs text-neutral-600">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="tel:+31649200412"
                className="inline-flex items-center gap-2 text-[#F97316] font-semibold hover:text-[#EA580C] transition-colors"
              >
                Bel direct: +31 6 49 20 04 12
              </Link>
            </div>
          </>
        }
        right={
          <div
            id="lp3-form"
            className="bg-white rounded-2xl p-8 lg:p-10 shadow-lg shadow-neutral-900/10 border border-neutral-100"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-neutral-900">Check beschikbaarheid</h2>
              <span className="text-xs font-semibold text-neutral-500">Stap {step} / 2</span>
            </div>
            <p className="text-neutral-600 mb-8">
              Laat je nummer achter en we reageren snel tijdens openingstijden.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5" data-lp-variant="B">
              {step === 1 ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Functie(s) nodig *
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
                    {errors.rol && <p className="text-red-500 text-sm mt-1">{errors.rol}</p>}
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

                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                    shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                    hover:bg-[#EA580C] transition-all duration-300"
                  >
                    Check beschikbaarheid
                  </button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-5">
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
                      {errors.naam && (
                        <p className="text-red-500 text-sm mt-1">{errors.naam}</p>
                      )}
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
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Inzetdatum of urgentie *
                      </label>
                      <input
                        type="text"
                        value={formData.inzet}
                        onChange={(e) => updateField("inzet", e.target.value)}
                        className="w-full px-4 py-3.5 border border-neutral-200 rounded-xl
                        focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]
                        outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                        placeholder="Bijv. vandaag, dit weekend, vanaf maandag"
                      />
                      {errors.inzet && (
                        <p className="text-red-500 text-sm mt-1">{errors.inzet}</p>
                      )}
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
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-sm font-semibold text-neutral-500 hover:text-neutral-700 transition-colors"
                    >
                      Terug
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                      shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                      hover:bg-[#EA580C] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Versturen..." : "Vraag direct personeel aan"}
                    </button>
                  </div>
                </>
              )}
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
              Bewijs uit de praktijk
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">
              Horeca teams die op ons rekenen
            </h2>
            <p className="text-neutral-600">
              Snelle inzet, duidelijke afspraken en een team dat direct draait.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((item) => (
              <div
                key={item.name}
                className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm"
              >
                <p className="text-sm text-neutral-600 leading-relaxed mb-4">"{item.content}"</p>
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
              Zo regelen we het
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">
              Snel en duidelijk naar inzet
            </h2>
            <p className="text-neutral-600">
              Een korte intake, snelle bevestiging en we blijven betrokken.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((stepItem) => (
              <div
                key={stepItem.title}
                className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  {stepItem.title}
                </h3>
                <p className="text-sm text-neutral-600">{stepItem.text}</p>
              </div>
            ))}
          </div>
        </Section.Container>
      </Section>

      <Section variant="tinted" spacing="default">
        <Section.Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {proofPoints.map((item) => (
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

      <div className="fixed bottom-24 left-4 right-4 md:hidden z-40">
        <a
          href="#lp3-form"
          className="flex items-center justify-center gap-2 bg-[#F97316] text-white px-6 py-3 rounded-full font-semibold shadow-lg shadow-orange-500/30 hover:bg-[#EA580C] transition-colors"
        >
          Vraag direct personeel aan
        </a>
      </div>
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
export default function PersoneelLandingVariantB() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PersoneelLandingVariantBContent />
    </Suspense>
  );
}
