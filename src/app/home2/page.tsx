import Link from "next/link";
import { Section, Container } from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";
import PremiumImage from "@/components/PremiumImage/PremiumImage";
import FAQ from "@/components/FAQ";
import TrackedLink from "@/components/TrackedLink";

const trustItems = [
  "Binnen 24 uur inzetbaar",
  "Gescreend op horeca-ervaring",
  "Snelle vervanging bij uitval",
  "Actief in meerdere regio's",
];

const services = [
  {
    title: "Uitzenden",
    description: "Voor ziekte, pieken en events",
    href: "/diensten/uitzenden",
  },
  {
    title: "Detachering",
    description: "Voor tijdelijke versterking (1-6 maanden)",
    href: "/diensten/detachering",
  },
  {
    title: "Recruitment",
    description: "Voor vaste sleutelrollen",
    href: "/diensten/recruitment",
  },
];

const steps = [
  {
    title: "Intake",
    description: "Binnen 10 minuten duidelijkheid",
  },
  {
    title: "Matching",
    description: "Alleen horeca-ervaren krachten",
  },
  {
    title: "Inzet",
    description: "Vandaag of morgen inzetbaar",
  },
  {
    title: "Nazorg",
    description: "Wij blijven bereikbaar",
  },
];

const testimonials = [
  {
    context: "Zomerdrukte in het restaurant",
    result: "Binnen 24 uur extra bediening op de vloer.",
    name: "Martijn de Vries",
    role: "Eigenaar",
    company: "Restaurant De Smaak",
  },
  {
    context: "Hotel met wisselende roosters",
    result: "Altijd passend personeel zonder gedoe.",
    name: "Sophie Jansen",
    role: "HR Manager",
    company: "Grand Hotel Amsterdam",
  },
  {
    context: "Events met piekbelasting",
    result: "Betrouwbare teams die meteen meedraaien.",
    name: "Rick van den Berg",
    role: "Operations Manager",
    company: "Catering Company",
  },
];

const faqItems = [
  {
    question: "Wat als iemand niet komt opdagen?",
    answer:
      "Dan schakelen we direct. We zoeken zo snel mogelijk vervanging en houden je op de hoogte.",
  },
  {
    question: "Kan ik voor één dienst personeel aanvragen?",
    answer:
      "Ja, ook voor een enkele dienst of korte inzet kun je personeel aanvragen.",
  },
  {
    question: "Hoe snel kunnen jullie écht leveren?",
    answer:
      "Vaak binnen 24 uur. Bij spoed kijken we direct naar de snelste match.",
  },
  {
    question: "Zijn er vaste kosten of verrassingen?",
    answer:
      "Nee, je krijgt vooraf duidelijke afspraken en transparante tarieven.",
  },
];

export default function Home2Page() {
  return (
    <div data-page-variant="home2">
      <Section variant="white" spacing="large">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeIn direction="left">
              <span className="inline-flex items-center gap-2 text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                Werkgevers in de horeca
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
                Personeeltekort? Binnen 24 uur ervaren{" "}
                <span className="text-[#F97316]">horecapersoneel</span> op de vloer.
              </h1>
              <p className="text-neutral-600 text-lg leading-relaxed mb-8">
                Ziekmelding, piekdrukte of last-minute uitval? Wij leveren gescreend horecapersoneel
                dat direct meedraait - zonder gedoe.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <TrackedLink
                  href="/personeel-aanvragen"
                  pageVariant="home2"
                  label="hero_primary"
                  className="bg-[#F97316] text-white px-8 py-4 rounded-xl text-base font-semibold
                  shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                  hover:bg-[#EA580C] transition-all duration-300"
                >
                  Vraag personeel aan
                </TrackedLink>
                <TrackedLink
                  href="/inschrijven"
                  pageVariant="home2"
                  label="hero_secondary"
                  className="border border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl text-base font-semibold
                  hover:border-[#F97316] hover:text-[#F97316] transition-all duration-300"
                >
                  Ik zoek werk
                </TrackedLink>
              </div>
              <p className="text-sm text-neutral-500 mb-8">
                Reactie binnen 15 minuten tijdens openingstijden.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trustItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm font-medium text-neutral-700"
                  >
                    <span className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn direction="right" delay={0.1}>
              <div className="relative">
                <PremiumImage
                  src="/images/barista.png"
                  alt="Ervaren horecapersoneel klaar voor inzet"
                  width={240}
                  height={320}
                  priority
                />
              </div>
            </FadeIn>
          </div>
        </Container>
      </Section>

      <Section variant="tinted" spacing="default">
        <Container>
          <FadeIn>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
                Altijd een back-up plan voor personeel
              </h2>
              <p className="text-neutral-600 text-lg leading-relaxed">
                Personeel dat uitvalt kost omzet, energie en reviews. Wij zorgen dat je altijd kunt
                doorschakelen - snel, betrouwbaar en zonder stress.
              </p>
            </div>
          </FadeIn>
        </Container>
      </Section>

      <Section variant="white" spacing="large">
        <Container>
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                Diensten voor werkgevers
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">
                Kies de inzet die bij je planning past
              </h2>
              <p className="text-neutral-600">
                Tijdelijk, structureel of vast. We regelen de juiste oplossing zonder omwegen.
              </p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((service) => (
              <FadeIn key={service.title}>
                <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                  <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                    {service.title}
                  </h3>
                  <p className="text-sm text-neutral-600 mb-4">{service.description}</p>
                  <Link
                    href={service.href}
                    className="text-[#F97316] font-semibold text-sm hover:text-[#EA580C] transition-colors mt-auto"
                  >
                    Lees meer
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </Container>
      </Section>

      <Section variant="tinted" spacing="default">
        <Container>
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                Hoe het werkt
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">
                Zekerheid in elke stap
              </h2>
              <p className="text-neutral-600">
                Je weet precies wanneer we leveren en wat je kunt verwachten.
              </p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <FadeIn key={step.title}>
                <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm h-full">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-neutral-600">{step.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Container>
      </Section>

      <Section variant="white" spacing="large">
        <Container>
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                Ervaringen uit de praktijk
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">
                Resultaat dat je merkt op de vloer
              </h2>
              <p className="text-neutral-600">
                Horeca-ondernemers die snel moesten schakelen en weer grip kregen.
              </p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((item) => (
              <FadeIn key={item.name}>
                <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm h-full">
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 mb-3">
                    {item.context}
                  </p>
                  <p className="text-sm text-neutral-700 mb-4">{item.result}</p>
                  <p className="text-sm font-semibold text-neutral-900">
                    {item.name} · {item.role}, {item.company}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Container>
      </Section>

      <Section variant="tinted" spacing="default">
        <Container>
          <FAQ items={faqItems} title="Veelgestelde vragen" />
        </Container>
      </Section>

      <Section variant="white" spacing="large">
        <Container>
          <FadeIn>
            <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-60 h-60 border border-white/20 rounded-full translate-x-1/3 translate-y-1/3"></div>
              </div>

              <div className="relative z-10 max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                  Direct personeel nodig? Wij denken meteen met je mee.
                </h2>
                <p className="text-white/90 text-lg leading-relaxed mb-10">
                  Bel ons direct of stuur je aanvraag door. We reageren snel en regelen de inzet.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <TrackedLink
                    href="/personeel-aanvragen"
                    pageVariant="home2"
                    label="cta_primary"
                    className="bg-white text-[#F97316] px-8 py-4 rounded-xl text-base font-semibold
                    hover:bg-neutral-100 transition-all duration-300"
                  >
                    Vraag personeel aan
                  </TrackedLink>
                  <TrackedLink
                    href="tel:+31649200412"
                    pageVariant="home2"
                    label="cta_phone"
                    className="border-2 border-white/30 text-white px-8 py-4 rounded-xl text-base font-semibold
                    hover:bg-white/10 transition-all duration-300"
                  >
                    Bel direct: +31 6 49 20 04 12
                  </TrackedLink>
                </div>
              </div>
            </div>
          </FadeIn>
        </Container>
      </Section>
    </div>
  );
}
