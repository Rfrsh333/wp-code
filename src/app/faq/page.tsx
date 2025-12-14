"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // Voor Opdrachtgevers
  {
    category: "Voor Opdrachtgevers",
    question: "Hoe snel kan ik personeel krijgen?",
    answer: "In de meeste gevallen kunnen wij binnen 24 uur gekwalificeerd horecapersoneel leveren. Voor grotere aanvragen of specifieke functies kan dit iets langer duren, maar we streven altijd naar de snelst mogelijke oplossing voor uw personeelsbehoefte."
  },
  {
    category: "Voor Opdrachtgevers",
    question: "Wat zijn de kosten voor het inhuren van personeel?",
    answer: "Onze tarieven zijn afhankelijk van de functie, ervaring en de duur van de inzet. Wij hanteren transparante uurtarieven zonder verborgen kosten. Neem contact met ons op voor een vrijblijvende offerte op maat."
  },
  {
    category: "Voor Opdrachtgevers",
    question: "Hoe werkt het selectieproces?",
    answer: "Alle kandidaten doorlopen een uitgebreid selectieproces inclusief cv-screening, persoonlijke gesprekken en referentiechecks. We kijken niet alleen naar ervaring en vaardigheden, maar ook naar persoonlijkheid en cultuurfit met uw organisatie."
  },
  {
    category: "Voor Opdrachtgevers",
    question: "Wat als het personeel niet bevalt?",
    answer: "Klanttevredenheid staat bij ons voorop. Als een medewerker niet aan uw verwachtingen voldoet, zorgen wij kosteloos voor vervanging. Bij recruitment bieden wij een plaatsingsgarantie tijdens de proefperiode."
  },
  {
    category: "Voor Opdrachtgevers",
    question: "Welke functies kunnen jullie invullen?",
    answer: "Wij leveren personeel voor alle horecafuncties: van bediening, bar en keuken tot management, receptie en evenementenpersoneel. Of het nu gaat om restaurants, hotels, catering of evenementen - wij hebben de juiste mensen."
  },
  // Voor Werkzoekenden
  {
    category: "Voor Werkzoekenden",
    question: "Hoe kan ik mij inschrijven?",
    answer: "Inschrijven kan eenvoudig via onze website. Vul het inschrijfformulier in, upload je cv en we nemen zo snel mogelijk contact met je op voor een kennismakingsgesprek."
  },
  {
    category: "Voor Werkzoekenden",
    question: "Moet ik ervaring hebben in de horeca?",
    answer: "Ervaring is een plus, maar niet altijd vereist. We zoeken vooral gemotiveerde mensen met de juiste instelling. Voor bepaalde functies bieden we training en begeleiding aan."
  },
  {
    category: "Voor Werkzoekenden",
    question: "Hoe word ik betaald?",
    answer: "Je ontvangt wekelijks of maandelijks je salaris, afhankelijk van je voorkeur. Alle betalingen verlopen via ons en je ontvangt een duidelijke loonstrook. We zorgen voor correcte afdracht van belastingen en premies."
  },
  {
    category: "Voor Werkzoekenden",
    question: "Kan ik zelf mijn werktijden bepalen?",
    answer: "Flexibiliteit is een van onze kernwaarden. Je geeft je beschikbaarheid door en wij matchen dit met passende opdrachten. Of je nu fulltime wilt werken of alleen in het weekend - er is altijd werk dat bij je past."
  },
  // Over TopTalent
  {
    category: "Over TopTalent",
    question: "In welke regio's zijn jullie actief?",
    answer: "TopTalent Jobs is actief in heel Nederland, met een focus op de Randstad en grote steden. We breiden continu uit om onze klanten en kandidaten nog beter van dienst te kunnen zijn."
  },
  {
    category: "Over TopTalent",
    question: "Wat onderscheidt TopTalent van andere uitzendbureaus?",
    answer: "Onze focus ligt 100% op de horeca, waardoor we de branche door en door kennen. We bieden persoonlijke service, snelle responstijden en investeren in langdurige relaties met zowel klanten als medewerkers."
  },
];

const categories = ["Alle", "Voor Opdrachtgevers", "Voor Werkzoekenden", "Over TopTalent"];

export default function FAQPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState("Alle");

  const filteredFAQ = activeCategory === "Alle"
    ? faqData
    : faqData.filter(item => item.category === activeCategory);

  const toggleAccordion = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <>
      {/* Page Title */}
      <section className="pt-28 pb-16 bg-gradient-to-b from-white to-neutral-50 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
              Veelgestelde vragen
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              FAQ
            </h1>
            <nav className="flex justify-center items-center gap-3 text-sm text-neutral-500">
              <Link href="/" className="hover:text-[#F97316] transition-colors">Home</Link>
              <span>-</span>
              <span className="text-[#F97316]">FAQ</span>
            </nav>
          </FadeIn>
        </div>
      </section>

      {/* About Section with Image Grid */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Image Grid */}
            <FadeIn direction="left">
              <div className="relative">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="rounded-2xl overflow-hidden">
                      <Image
                        src="/images/dienst-uitzenden.png"
                        alt="TopTalent Service"
                        width={280}
                        height={320}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                    <div className="rounded-2xl overflow-hidden">
                      <Image
                        src="/images/dienst-detachering.png"
                        alt="TopTalent Detachering"
                        width={280}
                        height={200}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  </div>
                  <div className="space-y-4 pt-8">
                    <div className="rounded-2xl overflow-hidden">
                      <Image
                        src="/images/dienst-recruitment.png"
                        alt="TopTalent Recruitment"
                        width={280}
                        height={200}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                    <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#F97316] to-[#EA580C] p-6 text-white">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium opacity-90">Online Support</span>
                      </div>
                      <a href="tel:+31649200412" className="text-xl font-bold hover:underline">
                        +31 6 49 20 04 12
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Content */}
            <FadeIn direction="right" delay={0.2}>
              <div>
                <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                  Over ons
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                  Het meest geliefde <span className="text-[#F97316]">Horeca Uitzendbureau</span>
                </h2>
                <p className="text-neutral-600 mb-8 leading-relaxed">
                  Verkozen tot de snelste oplossing voor uw personeelsbehoefte en de makkelijkste partner voor uw HR-uitdagingen.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: "🏆", title: "Beste Service", subtitle: "2024" },
                    { icon: "❤️", title: "Klanten zijn fan", subtitle: "Winter 2024" },
                    { icon: "⭐", title: "Marktleider", subtitle: "Horeca" },
                    { icon: "🤝", title: "Beste Support", subtitle: "24/7" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-neutral-50 rounded-xl">
                      <div className="text-2xl">{item.icon}</div>
                      <div>
                        <h4 className="font-semibold text-neutral-900 text-sm">{item.title}</h4>
                        <span className="text-xs text-neutral-500">{item.subtitle}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </Section.Container>
      </Section>

      {/* FAQ Section */}
      <Section variant="tinted" spacing="large">
        <Section.Container>
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-white px-4 py-2 rounded-full border border-orange-100">
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
                      : "bg-white text-neutral-600 hover:bg-neutral-100"
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
                  className={`bg-white rounded-2xl border transition-all duration-300 ${
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
                          : "bg-orange-50 text-[#F97316]"
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

      {/* Still Have Questions CTA */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <FadeIn>
            <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-60 h-60 border border-white/20 rounded-full translate-x-1/3 translate-y-1/3"></div>
              </div>

              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Nog vragen?
                </h2>
                <p className="text-white/90 text-lg leading-relaxed mb-10">
                  Staat uw vraag er niet tussen? Neem gerust contact met ons op.
                  We helpen u graag verder!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/contact"
                    className="bg-white text-[#F97316] px-8 py-4 rounded-xl text-base font-semibold hover:bg-neutral-100 transition-all duration-300"
                  >
                    Contact opnemen
                  </Link>
                  <Link
                    href="tel:+31649200412"
                    className="border-2 border-white/30 text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-white/10 transition-all duration-300"
                  >
                    Bel: +31 6 49 20 04 12
                  </Link>
                </div>
              </div>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>
    </>
  );
}
