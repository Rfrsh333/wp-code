"use client";

type FaqService = "uitzenden" | "detachering";

type FaqJsonLdProps = {
  city: string;
  service: FaqService;
};

function getFaqEntries(city: string, service: FaqService) {
  if (service === "detachering") {
    return [
      {
        question: "Wat is detachering van horecapersoneel?",
        answer: `Detachering is een structurele inzet van horecakrachten in ${city}, waarbij de medewerker bij ons in dienst blijft.`,
      },
      {
        question: "Wat is het verschil tussen detachering en uitzenden?",
        answer: "Detachering is bedoeld voor langere inzet en continuiteit; uitzenden is flexibeler voor tijdelijke pieken.",
      },
      {
        question: "Voor welke functies is detachering geschikt?",
        answer: `Detachering in ${city} is geschikt voor bediening, keuken, bar en andere functies met vaste bezetting.`,
      },
      {
        question: "Hoe snel kan detachering starten?",
        answer: `We kunnen detachering in ${city} vaak snel opstarten, afhankelijk van de functie en gewenste startdatum.`,
      },
      {
        question: "Is detachering flexibel?",
        answer: "Ja, de inzet en duur worden afgestemd op uw planning en bezetting.",
      },
    ];
  }

  return [
    {
      question: "Wanneer kies ik voor uitzenden?",
      answer: `Uitzenden is geschikt bij tijdelijke pieken, uitval of events in ${city}.`,
    },
    {
      question: "Hoe snel leveren jullie personeel?",
      answer: `In ${city} kunnen we vaak binnen 24 uur passende medewerkers inzetten.`,
    },
    {
      question: "Welke horecafuncties zijn beschikbaar?",
      answer: `We leveren in ${city} onder andere bediening, bar, keuken en eventpersoneel.`,
    },
    {
      question: "Wie regelt administratie en verloning?",
      answer: "TopTalent Jobs regelt administratie, contracten en verloning.",
    },
  ];
}

export default function FaqJsonLd({ city, service }: FaqJsonLdProps) {
  const entries = getFaqEntries(city, service);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
    />
  );
}
