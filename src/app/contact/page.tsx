"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";
import { useRecaptcha } from "@/hooks/useRecaptcha";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // Voor Opdrachtgevers
  {
    category: "Voor Opdrachtgevers",
    question: "Hoe snel kan ik horecapersoneel inhuren?",
    answer: "Bij TopTalent Jobs kunt u binnen 24 uur gekwalificeerd horecapersoneel inhuren. Of u nu een bartender, kok, of bedienend personeel nodig heeft - wij leveren snel en betrouwbaar. Voor grotere aanvragen of gespecialiseerde functies plannen we graag een kort gesprek om uw wensen te bespreken."
  },
  {
    category: "Voor Opdrachtgevers",
    question: "Wat kost het om horecapersoneel in te huren via een uitzendbureau?",
    answer: "De kosten voor het inhuren van horecapersoneel zijn afhankelijk van de functie, ervaring en inzetduur. TopTalent Jobs hanteert transparante uurtarieven zonder verborgen kosten. Vraag vrijblijvend een offerte aan en ontvang binnen 24 uur een persoonlijk voorstel."
  },
  {
    category: "Voor Opdrachtgevers",
    question: "Hoe selecteert TopTalent Jobs horecamedewerkers?",
    answer: "Alle kandidaten doorlopen een uitgebreid selectieproces: cv-screening, persoonlijke gesprekken en referentiechecks. We beoordelen niet alleen vakkennis en ervaring, maar ook persoonlijkheid, betrouwbaarheid en gastvrijheid. Zo garanderen we dat u personeel krijgt dat past bij uw bedrijf."
  },
  {
    category: "Voor Opdrachtgevers",
    question: "Wat als de ingehuurde medewerker niet voldoet?",
    answer: "Klanttevredenheid staat voorop bij TopTalent Jobs. Voldoet een medewerker niet aan uw verwachtingen? Wij regelen kosteloos vervanging. Bij werving en selectie bieden we een plaatsingsgarantie gedurende de proefperiode."
  },
  {
    category: "Voor Opdrachtgevers",
    question: "Voor welke horecafuncties kan ik personeel inhuren?",
    answer: "TopTalent Jobs levert personeel voor alle horecafuncties: bediening, bar, keuken (van afwasser tot souschef), gastheer/gastvrouw, receptie, banqueting, catering en evenementenpersoneel. Of het nu gaat om restaurants, hotels, cafés, festivals of bedrijfsevenementen - wij hebben de juiste mensen."
  },
  {
    category: "Voor Opdrachtgevers",
    question: "Kan ik personeel inhuren voor een evenement of festival?",
    answer: "Ja, TopTalent Jobs is gespecialiseerd in het leveren van evenementenpersoneel. Van kleine bedrijfsfeesten tot grote festivals - wij leveren ervaren horecamedewerkers die gewend zijn aan drukte en piekmoment. Neem minimaal 1 week van tevoren contact op voor de beste beschikbaarheid."
  },
  {
    category: "Voor Opdrachtgevers",
    question: "Wat is het verschil tussen uitzenden en detacheren?",
    answer: "Bij uitzenden werkt het personeel op basis van een uitzendovereenkomst en betaalt u per gewerkt uur. Ideaal voor tijdelijke inzet of piekperiodes. Bij detachering wordt een medewerker voor langere tijd exclusief bij u geplaatst, met meer binding aan uw organisatie. Wij adviseren graag welke vorm het beste bij uw situatie past."
  },
  // Voor Werkzoekenden
  {
    category: "Voor Werkzoekenden",
    question: "Hoe schrijf ik me in als horecamedewerker?",
    answer: "Inschrijven bij TopTalent Jobs is gratis en eenvoudig. Vul het online inschrijfformulier in, upload je cv en wij nemen binnen 48 uur contact op voor een kennismakingsgesprek. Na goedkeuring kun je direct aan de slag bij onze opdrachtgevers."
  },
  {
    category: "Voor Werkzoekenden",
    question: "Heb ik ervaring nodig om in de horeca te werken?",
    answer: "Ervaring is een plus, maar niet altijd vereist. TopTalent Jobs zoekt vooral gemotiveerde mensen met een gastvrije instelling en werkhouding. Voor bepaalde functies bieden we training en begeleiding aan. Starters zijn welkom!"
  },
  {
    category: "Voor Werkzoekenden",
    question: "Hoe en wanneer word ik betaald als uitzendkracht?",
    answer: "Je ontvangt wekelijks of maandelijks je salaris, afhankelijk van je voorkeur. Alle betalingen verlopen via TopTalent Jobs en je krijgt altijd een duidelijke loonstrook. Wij zorgen voor correcte afdracht van belastingen, premies en pensioenopbouw."
  },
  {
    category: "Voor Werkzoekenden",
    question: "Kan ik als uitzendkracht zelf mijn werktijden kiezen?",
    answer: "Ja, flexibiliteit is een groot voordeel van werken via TopTalent Jobs. Je geeft je beschikbaarheid door en wij matchen dit met passende opdrachten. Of je nu fulltime, parttime, in het weekend of alleen avonden wilt werken - er is altijd werk dat bij je past."
  },
  {
    category: "Voor Werkzoekenden",
    question: "Wat verdien ik als horecamedewerker via TopTalent Jobs?",
    answer: "Het salaris hangt af van je functie, ervaring en de cao Horeca. Als uitzendkracht ontvang je minimaal hetzelfde loon als vaste medewerkers in dezelfde functie (inlenersbeloning). Daarnaast bouw je vakantiegeld, vakantiedagen en pensioen op."
  },
  {
    category: "Voor Werkzoekenden",
    question: "Kan ik via TopTalent Jobs een vast contract krijgen?",
    answer: "Zeker! Veel van onze opdrachtgevers nemen goed presterende uitzendkrachten in vaste dienst. Ook bieden wij recruitment diensten waarbij we je direct koppelen aan werkgevers die zoeken naar vast personeel. Geef bij inschrijving aan wat je voorkeur heeft."
  },
  // Over TopTalent
  {
    category: "Over TopTalent",
    question: "In welke steden en regio's is TopTalent Jobs actief?",
    answer: "TopTalent Jobs is actief in heel Nederland, met een sterke focus op de Randstad (Amsterdam, Rotterdam, Den Haag, Utrecht), maar ook in steden als Eindhoven, Arnhem, Groningen en Maastricht. We breiden continu uit om werkgevers en horecamedewerkers in heel Nederland te bedienen."
  },
  {
    category: "Over TopTalent",
    question: "Waarom kiezen voor TopTalent Jobs als horeca uitzendbureau?",
    answer: "TopTalent Jobs is 100% gespecialiseerd in de horeca. Wij kennen de branche, begrijpen de uitdagingen en weten welk type personeel bij welke gelegenheid past. Onze persoonlijke aanpak, snelle service (24/7 bereikbaar) en focus op kwaliteit maken ons de ideale partner voor horecabedrijven."
  },
  {
    category: "Over TopTalent",
    question: "Is TopTalent Jobs een betrouwbaar uitzendbureau?",
    answer: "Ja, TopTalent Jobs is een betrouwbaar en professioneel uitzendbureau. Wij werken volgens de wet- en regelgeving voor uitzendorganisaties, zorgen voor correcte verloning en zijn transparant in onze werkwijze. Onze vele tevreden klanten en medewerkers bevestigen dit."
  },
  {
    category: "Over TopTalent",
    question: "Hoe neem ik contact op met TopTalent Jobs?",
    answer: "U kunt TopTalent Jobs bereiken via telefoon (+31 6 49 71 37 66), e-mail (info@toptalentjobs.nl) of WhatsApp. Wij zijn 7 dagen per week bereikbaar en reageren doorgaans binnen enkele uren. U kunt ook het contactformulier op deze pagina invullen."
  },
];

const categories = ["Alle", "Voor Opdrachtgevers", "Voor Werkzoekenden", "Over TopTalent"];

function ContactPageContent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState("Alle");
  const [trackingData, setTrackingData] = useState({
    leadSource: '',
    campaignName: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: ''
  });
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

    setTrackingData({
      leadSource: source,
      campaignName: campaign,
      utmSource: utmSource,
      utmMedium: utmMedium,
      utmCampaign: utmCampaign,
    });
  }, [searchParams]);

  const filteredFAQ = activeCategory === "Alle"
    ? faqData
    : faqData.filter(item => item.category === activeCategory);

  const toggleAccordion = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await executeRecaptcha("contact");

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: formData.get("naam"),
          email: formData.get("email"),
          telefoon: formData.get("telefoon"),
          onderwerp: formData.get("onderwerp"),
          bericht: formData.get("bericht"),
          recaptchaToken,
          // Lead tracking
          leadSource: trackingData.leadSource,
          campaignName: trackingData.campaignName,
          utmSource: trackingData.utmSource,
          utmMedium: trackingData.utmMedium,
          utmCampaign: trackingData.utmCampaign,
        }),
      });

      if (response.ok) {
        router.push("/bedankt/contact");
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
      {/* ============================================================
          SECTION FLOW (Design System):
          Hero (white) → Contact Form (tinted)
          ============================================================ */}

      {/* Hero Section - White */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
                Contact
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
                Neem contact met ons op
              </h1>
              <p className="text-neutral-600 text-lg leading-relaxed">
                Heeft u vragen over onze diensten of wilt u direct personeel aanvragen?
                Wij staan 24/7 voor u klaar.
              </p>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>

      {/* Contact Section - Tinted */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Contact Form */}
            <FadeIn direction="left" className="lg:col-span-3">
              <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-sm border border-neutral-100">
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Stuur ons een bericht</h2>
                <p className="text-neutral-600 mb-8">
                  Vul het formulier in en wij nemen binnen 24 uur contact met u op.
                </p>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="naam" className="block text-sm font-medium text-neutral-700 mb-2">
                        Naam *
                      </label>
                      <input
                        type="text"
                        id="naam"
                        name="naam"
                        required
                        className="w-full px-4 py-3.5 border border-neutral-200 rounded-xl
                        focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]
                        outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                        placeholder="Uw naam"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                        E-mail *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        className="w-full px-4 py-3.5 border border-neutral-200 rounded-xl
                        focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]
                        outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                        placeholder="uw@email.nl"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="telefoon" className="block text-sm font-medium text-neutral-700 mb-2">
                      Telefoonnummer
                    </label>
                    <input
                      type="tel"
                      id="telefoon"
                      name="telefoon"
                      className="w-full px-4 py-3.5 border border-neutral-200 rounded-xl
                      focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]
                      outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                      placeholder="+31 6 12345678"
                    />
                  </div>

                  <div>
                    <label htmlFor="onderwerp" className="block text-sm font-medium text-neutral-700 mb-2">
                      Onderwerp *
                    </label>
                    <select
                      id="onderwerp"
                      name="onderwerp"
                      required
                      className="w-full px-4 py-3.5 border border-neutral-200 rounded-xl
                      focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]
                      outline-none transition-all duration-300 bg-neutral-50 focus:bg-white"
                    >
                      <option value="">Selecteer een onderwerp</option>
                      <option value="werkgever">Ik zoek personeel (werkgever)</option>
                      <option value="werknemer">Ik zoek werk (werknemer)</option>
                      <option value="uitzenden">Vraag over uitzenden</option>
                      <option value="detachering">Vraag over detachering</option>
                      <option value="recruitment">Vraag over recruitment</option>
                      <option value="anders">Anders</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="bericht" className="block text-sm font-medium text-neutral-700 mb-2">
                      Bericht *
                    </label>
                    <textarea
                      id="bericht"
                      name="bericht"
                      rows={5}
                      required
                      className="w-full px-4 py-3.5 border border-neutral-200 rounded-xl
                      focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]
                      outline-none transition-all duration-300 bg-neutral-50 focus:bg-white resize-none"
                      placeholder="Uw bericht..."
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                    shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                    hover:bg-[#EA580C] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Verzenden..." : "Verstuur bericht"}
                  </button>
                </form>
              </div>
            </FadeIn>

            {/* Contact Info */}
            <FadeIn direction="right" delay={0.2} className="lg:col-span-2">
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-100">
                  <h2 className="text-xl font-bold text-neutral-900 mb-6">Contactgegevens</h2>

                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[#FEF3E7] rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-900 mb-1">Adres</h3>
                        <p className="text-neutral-600">Utrecht, Nederland</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[#FEF3E7] rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-900 mb-1">Telefoon</h3>
                        <a href="tel:+31649713766" className="text-[#F97316] hover:text-[#EA580C] transition-colors duration-300">
                          +31 6 49 71 37 66
                        </a>
                        <p className="text-neutral-500 text-sm mt-1">24/7 bereikbaar</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[#FEF3E7] rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-900 mb-1">E-mail</h3>
                        <a href="mailto:info@toptalentjobs.nl" className="text-[#F97316] hover:text-[#EA580C] transition-colors duration-300">
                          info@toptalentjobs.nl
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-900 mb-1">WhatsApp</h3>
                        <a
                          href="https://wa.me/31649713766"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700 transition-colors duration-300"
                        >
                          Stuur een WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </FadeIn>
          </div>
        </Section.Container>
      </Section>

      {/* FAQ Section */}
      <Section variant="white" spacing="large" id="faq">
        <Section.Container>
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                Veelgestelde Vragen
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                Antwoord op uw vragen
              </h2>
              <p className="text-neutral-600 max-w-2xl mx-auto">
                Heeft u vragen over onze diensten? Hieronder vindt u antwoorden op de meest gestelde vragen.
              </p>
            </div>
          </FadeIn>

          {/* Category Tabs */}
          <FadeIn delay={0.1}>
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setActiveCategory(category);
                    setActiveIndex(0);
                  }}
                  className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                    activeCategory === category
                      ? "bg-[#F97316] text-white shadow-lg shadow-orange-500/25"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </FadeIn>

          {/* Accordion */}
          <div className="max-w-3xl mx-auto space-y-4">
            {filteredFAQ.map((item, index) => (
              <FadeIn key={index} delay={0.05 * index}>
                <div
                  className={`bg-neutral-50 rounded-2xl border transition-all duration-300 ${
                    activeIndex === index
                      ? "border-[#F97316] shadow-lg shadow-orange-500/10"
                      : "border-neutral-200 hover:border-[#F97316]/50"
                  }`}
                >
                  <button
                    onClick={() => toggleAccordion(index)}
                    className="w-full flex items-center gap-4 p-5 text-left"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        activeIndex === index
                          ? "bg-[#F97316] text-white rotate-180"
                          : "bg-orange-100 text-[#F97316]"
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <h4
                      className={`font-semibold text-lg transition-colors duration-300 ${
                        activeIndex === index ? "text-[#F97316]" : "text-neutral-900"
                      }`}
                    >
                      {item.question}
                    </h4>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      activeIndex === index ? "max-h-96" : "max-h-0"
                    }`}
                  >
                    <div className="px-5 pb-5 pl-[4.5rem]">
                      <p className="text-neutral-600 leading-relaxed">{item.answer}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </Section.Container>
      </Section>
    </>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={
      <Section variant="white" spacing="default">
        <Section.Container>
          <div className="animate-pulse">
            <div className="h-8 bg-neutral-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-12 bg-neutral-200 rounded w-2/3 mx-auto mb-6"></div>
            <div className="h-4 bg-neutral-200 rounded w-1/2 mx-auto"></div>
          </div>
        </Section.Container>
      </Section>
    }>
      <ContactPageContent />
    </Suspense>
  );
}
