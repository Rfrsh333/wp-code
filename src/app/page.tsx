import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import Hero from "@/components/Hero";
import { Section, Container } from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";

const MarqueeBanner = dynamic(() => import("@/components/MarqueeBanner"));
const HowWeWorkCarousel = dynamic(() => import("@/components/HowWeWorkCarousel"));
const WhyTopTalent = dynamic(() => import("@/components/WhyTopTalent"));
const ServicesSection = dynamic(() => import("@/components/ServicesSection"));
const TestimonialCarousel = dynamic(() => import("@/components/TestimonialCarousel"));
const FAQObjections = dynamic(() => import("@/components/FAQObjections"));
const DynamicCTA = dynamic(() => import("@/components/DynamicCTA"));

/* ==========================================================================
   Testimonials Data
   ========================================================================== */
const testimonials = [
  {
    context: "We zochten een bureau dat echt meedenkt en bereikbaar is wanneer het nodig is.",
    result: "Vanaf dag één een vast contactpersoon. Het personeel paste direct bij ons team en de communicatie loopt soepel.",
    name: "M. de Vries",
    role: "Restaurant eigenaar",
    company: "Utrecht",
  },
  {
    context: "Transparantie was het belangrijkst voor ons — we wilden weten waar we aan toe zijn.",
    result: "Tarieven vooraf besproken, facturen klopten en we krijgen direct antwoord bij vragen.",
    name: "S. Jansen",
    role: "Hospitality manager",
    company: "Amsterdam",
  },
  {
    context: "Bij eerdere bureaus hadden we regelmatig no-shows en onervaren krachten.",
    result: "Via TopTalent verscheen iedereen op tijd en kende de horeca. Dat merken onze gasten.",
    name: "R. van den Berg",
    role: "Operationeel manager",
    company: "Rotterdam",
  },
];

/* ==========================================================================
   Industries Data
   ========================================================================== */
const industries = [
  { name: "Restaurants", icon: "🍽️", count: "25+" },
  { name: "Hotels", icon: "🏨", count: "15+" },
  { name: "Catering", icon: "🍴", count: "10+" },
  { name: "Evenementen", icon: "🎉", count: "30+" },
  { name: "Cafés & Bars", icon: "☕", count: "15+" },
  { name: "Festivals", icon: "🎪", count: "5+" },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Horecapersoneel met Persoonlijke Aanpak | Binnen 24 uur | TopTalent",
  description:
    "TopTalent levert zorgvuldig gescreend horecapersoneel met persoonlijke matching en duidelijke afspraken. Vaak binnen 24 uur inzetbaar voor restaurants, hotels en events.",
  alternates: {
    canonical: "https://www.toptalentjobs.nl/",
  },
  openGraph: {
    title: "Horecapersoneel met Persoonlijke Aanpak | TopTalent",
    description: "Zorgvuldig gescreend horecapersoneel met een vast aanspreekpunt en duidelijke afspraken. Vaak binnen 24 uur inzetbaar.",
    type: "website",
    url: "https://www.toptalentjobs.nl/",
  },
};

const homeFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Wat als het horecapersoneel niet past?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Uw contactpersoon regelt directe vervanging binnen 24 uur, zonder extra kosten. U betaalt alleen voor personeel dat werkt."
      }
    },
    {
      "@type": "Question",
      "name": "Hoe zit het met last-minute horecapersoneel?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Onze flexpool staat klaar voor acute uitval. Vaak kunnen we nog dezelfde dag personeel leveren als u belt voor 12:00 uur."
      }
    },
    {
      "@type": "Question",
      "name": "Hoe snel kan ik horecapersoneel krijgen?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Na intake krijgt u binnen 15 minuten een matchscore. Bij beschikbaarheid start het personeel binnen 24 uur — vaak zelfs sneller."
      }
    },
    {
      "@type": "Question",
      "name": "Hoe verloopt de communicatie na de plaatsing?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "U krijgt een vast aanspreekpunt dat uw zaak kent. Korte lijnen, snel schakelen — wij zijn bereikbaar wanneer u ons nodig heeft."
      }
    },
    {
      "@type": "Question",
      "name": "Hoe werken jullie tarieven en facturatie?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Onze tarieven worden vooraf besproken en vastgelegd. Geen verborgen kosten, geen verrassingen achteraf. U ontvangt overzichtelijke facturen die kloppen."
      }
    },
    {
      "@type": "Question",
      "name": "Hoe zorgen jullie voor betrouwbaar personeel?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Elk teamlid doorloopt een zorgvuldig screeningsproces: horeca-ervaring, referentiechecks en een persoonlijk gesprek. Zo weet u zeker dat er betrouwbare mensen op uw vloer staan."
      }
    }
  ]
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqSchema) }}
      />
      {/* AI-citeerbaar definitieblok — zichtbaar voor crawlers en screen readers */}
      <section className="sr-only" aria-label="Over TopTalent Jobs">
        <h2>Wat is TopTalent Jobs?</h2>
        <p>
          TopTalent Jobs is een horeca uitzendbureau gevestigd in Utrecht, Nederland.
          Het bedrijf levert gescreend en ervaren horecapersoneel binnen 24 uur aan
          restaurants, hotels, catering bedrijven en evenementen. TopTalent Jobs is
          actief in Utrecht, Amsterdam, Rotterdam, Den Haag en Eindhoven. Het bedrijf
          biedt drie diensten: uitzenden (tijdelijk personeel), detachering (langdurige
          plaatsing) en recruitment (werving en selectie van vast personeel). TopTalent
          Jobs is WAADI-geregistreerd en snel bereikbaar. Honderden horecabedrijven
          maken gebruik van de diensten van TopTalent Jobs.
        </p>
      </section>

      {/* Hero Section */}
      <Hero />

      {/* Service Banner - Premium Marquee */}
      <MarqueeBanner />

      {/* How We Work - Outcome-driven steps */}
      <HowWeWorkCarousel />

      {/* Why TopTalent - Tinted background */}
      <WhyTopTalent />

      {/* Services - Tinted section */}
      <ServicesSection />

      {/* Testimonials Section */}
      <TestimonialCarousel testimonials={testimonials} />

      {/* Industries Section */}
      <Section variant="white" spacing="large">
        <Container>
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                Horecabranches
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
                Horecapersoneel voor elke <span className="text-[#F97316]">branche</span>
              </h2>
              <p className="text-neutral-600 max-w-2xl mx-auto">
                Van fine dining tot festivals: wij leveren ervaren{" "}
                <Link href="/diensten/detachering/" className="text-[#F97316] hover:underline">horecapersoneel</Link> dat past bij uw tempo en service.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {industries.map((industry, index) => (
              <FadeIn key={index} delay={0.05 * index}>
                <div className="bg-neutral-50 rounded-2xl p-6 text-center hover:bg-orange-50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer border border-neutral-100 hover:border-[#F97316]/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                    {industry.icon}
                  </div>
                  <h3 className="font-semibold text-neutral-900 mb-1">{industry.name}</h3>
                  <span className="text-sm text-[#F97316] font-medium">{industry.count} bedrijven</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </Container>
      </Section>

      {/* Populaire Functies Section */}
      <Section variant="white" spacing="large">
        <Container>
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                Personeel per functie
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
                Populaire <span className="text-[#F97316]">horecafuncties</span>
              </h2>
              <p className="text-neutral-600 max-w-2xl mx-auto">
                Van kok tot bediening: TopTalent Jobs levert ervaren horecapersoneel
                binnen 24 uur. Kies een functie en ontdek de mogelijkheden.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {[
              {
                href: "/functies/kok-inhuren/",
                title: "Kok inhuren",
                description: "Ervaren koks voor uw keuken — van hulpkok tot sous-chef.",
                rate: "€25–€45",
              },
              {
                href: "/functies/bediening-inhuren/",
                title: "Bediening inhuren",
                description: "Professionele obers en serveersters voor restaurants en events.",
                rate: "€18–€28",
              },
              {
                href: "/functies/barista-inhuren/",
                title: "Barista inhuren",
                description: "Koffiespecialisten voor cafés, restaurants en evenementen.",
                rate: "€18–€26",
              },
              {
                href: "/functies/barman-inhuren/",
                title: "Barman inhuren",
                description: "Bartenders voor bars, clubs, restaurants en events.",
                rate: "€18–€28",
              },
            ].map((functie, index) => (
              <FadeIn key={functie.href} delay={0.05 * index}>
                <Link
                  href={functie.href}
                  className="group block bg-neutral-50 rounded-2xl p-6 border border-neutral-100 hover:border-[#F97316]/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full"
                >
                  <h3 className="text-lg font-bold text-neutral-900 group-hover:text-[#F97316] transition-colors mb-2">
                    {functie.title}
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                    {functie.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                      {functie.rate} / uur
                    </span>
                    <span className="text-[#F97316] text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      Bekijk
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>

          {/* Trust signals + alle functies link */}
          <FadeIn delay={0.25}>
            <div className="bg-gradient-to-r from-neutral-50 to-orange-50/30 rounded-2xl border border-neutral-100 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-6 flex-wrap text-sm text-neutral-600">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Binnen 24 uur geregeld
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  WAADI-geregistreerd
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Honderden horecabedrijven geholpen
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Flexibel inzetbaar
                </span>
              </div>
              <Link
                href="/functies/"
                className="inline-flex items-center gap-2 text-[#F97316] font-semibold hover:gap-3 transition-all duration-300 whitespace-nowrap"
              >
                Alle horeca functies bekijken
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </FadeIn>
        </Container>
      </Section>

      {/* Locations Section - Internal Linking */}
      <Section variant="tinted" spacing="large">
        <Container>
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-white px-4 py-2 rounded-full border border-orange-100 shadow-sm">
                Actief in heel Nederland
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
                Horecapersoneel in <span className="text-[#F97316]">jouw stad</span>
              </h2>
              <p className="text-neutral-600 max-w-2xl mx-auto">
                TopTalent Jobs levert lokaal horecapersoneel in alle grote steden van Nederland.
                Kies je stad en ontdek onze diensten.
              </p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Utrecht */}
            <FadeIn delay={0}>
              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 group border border-neutral-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-neutral-900 mb-2 group-hover:text-[#F97316] transition-colors">
                      Utrecht
                    </h3>
                    <p className="text-sm text-neutral-600 mb-4">
                      Horecapersoneel voor Utrecht en omstreken
                    </p>
                  </div>
                  <span className="text-3xl">🏛️</span>
                </div>
                <div className="space-y-2">
                  <Link
                    href="/locaties/utrecht/"
                    className="block text-neutral-700 hover:text-[#F97316] font-medium transition-colors text-sm"
                  >
                    → Meer over Utrecht
                  </Link>
                  <Link
                    href="/locaties/utrecht/uitzenden/"
                    className="block text-neutral-700 hover:text-[#F97316] transition-colors text-sm"
                  >
                    → Horecapersoneel Uitzenden
                  </Link>
                  <Link
                    href="/locaties/utrecht/detachering/"
                    className="block text-neutral-700 hover:text-[#F97316] transition-colors text-sm"
                  >
                    → Horecapersoneel Detacheren
                  </Link>
                </div>
              </div>
            </FadeIn>

            {/* Den Haag */}
            <FadeIn delay={0.1}>
              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 group border border-neutral-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-neutral-900 mb-2 group-hover:text-[#F97316] transition-colors">
                      Den Haag
                    </h3>
                    <p className="text-sm text-neutral-600 mb-4">
                      Horecapersoneel voor Den Haag en regio
                    </p>
                  </div>
                  <span className="text-3xl">🏛️</span>
                </div>
                <div className="space-y-2">
                  <Link
                    href="/locaties/den-haag/"
                    className="block text-neutral-700 hover:text-[#F97316] font-medium transition-colors text-sm"
                  >
                    → Meer over Den Haag
                  </Link>
                  <Link
                    href="/locaties/den-haag/uitzenden/"
                    className="block text-neutral-700 hover:text-[#F97316] transition-colors text-sm"
                  >
                    → Horecapersoneel Uitzenden
                  </Link>
                  <Link
                    href="/locaties/den-haag/detachering/"
                    className="block text-neutral-700 hover:text-[#F97316] transition-colors text-sm"
                  >
                    → Horecapersoneel Detacheren
                  </Link>
                </div>
              </div>
            </FadeIn>

            {/* Eindhoven */}
            <FadeIn delay={0.2}>
              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 group border border-neutral-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-neutral-900 mb-2 group-hover:text-[#F97316] transition-colors">
                      Eindhoven
                    </h3>
                    <p className="text-sm text-neutral-600 mb-4">
                      Horecapersoneel voor Eindhoven en Brabant
                    </p>
                  </div>
                  <span className="text-3xl">💡</span>
                </div>
                <div className="space-y-2">
                  <Link
                    href="/locaties/eindhoven/"
                    className="block text-neutral-700 hover:text-[#F97316] font-medium transition-colors text-sm"
                  >
                    → Meer over Eindhoven
                  </Link>
                  <Link
                    href="/locaties/eindhoven/uitzenden/"
                    className="block text-neutral-700 hover:text-[#F97316] transition-colors text-sm"
                  >
                    → Horecapersoneel Uitzenden
                  </Link>
                  <Link
                    href="/locaties/eindhoven/detachering/"
                    className="block text-neutral-700 hover:text-[#F97316] transition-colors text-sm"
                  >
                    → Horecapersoneel Detacheren
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.3}>
            <div className="text-center">
              <Link
                href="/locaties/"
                className="inline-flex items-center gap-2 text-[#F97316] font-semibold hover:gap-3 transition-all duration-300"
              >
                Bekijk alle locaties
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </FadeIn>
        </Container>
      </Section>

      {/* FAQ Objections Section */}
      <FAQObjections />

      {/* CTA Section - Action-driven */}
      <Section variant="white" spacing="large">
        <Container>
          <FadeIn>
            <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-60 h-60 border border-white/20 rounded-full translate-x-1/3 translate-y-1/3"></div>
              </div>

              <div className="relative z-10 max-w-3xl mx-auto">
                {/* Trust indicator */}
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Vaak binnen 24 uur personeel beschikbaar
                </div>

                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                  Klaar voor horecapersoneel waar u op kunt bouwen?
                </h2>
                <p className="text-white/90 text-lg leading-relaxed mb-10">
                  Vraag vrijblijvend een matchscore aan en ontdek hoe wij u kunnen helpen met betrouwbaar, gescreend horecapersoneel en een persoonlijke aanpak.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/personeel-aanvragen/"
                    className="inline-flex items-center justify-center bg-white text-[#F97316] px-8 py-4 rounded-xl text-base font-semibold hover:bg-neutral-100 transition-all duration-300 shadow-xl"
                  >
                    Bekijk hoeveel personeel ik kan krijgen
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  <Link
                    href="/kosten-calculator/"
                    className="border-2 border-white/30 text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-white/10 transition-all duration-300"
                  >
                    Bereken je kosten in 60 sec
                  </Link>
                </div>
                <p className="text-white/70 text-sm mt-6">
                  ✓ Geen inschrijfkosten  ✓ Reactie binnen 15 min  ✓ Vaak morgen al personeel
                </p>
              </div>
            </div>
          </FadeIn>
        </Container>
      </Section>

      {/* Dynamic Contextual CTA */}
      <DynamicCTA />
    </>
  );
}
