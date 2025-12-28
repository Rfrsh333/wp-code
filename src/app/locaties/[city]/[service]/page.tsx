"use client";

import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { getLocation } from "@/data/locations";
import Section from "@/components/Section/Section";
import FadeIn from "@/components/animations/FadeIn";
import PremiumImage from "@/components/PremiumImage";
import FAQ from "@/components/FAQ";
import LocatieSubNav from "@/components/LocatieSubNav";
import { getLocationServiceFAQs } from "@/data/location-service-faqs";

const validServices = ["uitzenden", "detachering"];

// Lokale hero content per stad/dienst
const heroContent = {
  uitzenden: {
    utrecht: {
      title: "Horeca uitzenden Utrecht",
      intro: "Van studentenevenementen tot Jaarbeurs congressen, van TivoliVredenburg tot binnenstad horeca. Wij leveren snel en betrouwbaar tijdelijk horecapersoneel in heel Utrecht en omgeving.",
      image: "/images/locatie-utrecht-uitzenden.png",
      alt: "Horeca uitzendpersoneel tijdens druk event in Utrecht Jaarbeurs"
    },
    amsterdam: {
      title: "Horeca uitzenden Amsterdam",
      intro: "Van centrum tot Zuidas, van RAI events tot Schiphol hotels. Wij leveren snel meertalig horecapersoneel voor uw Amsterdamse zaak. Binnen 24 uur inzetbaar.",
      image: "/images/locatie-amsterdam-uitzenden.png",
      alt: "Flexibel horecapersoneel in Amsterdam centrum restaurant"
    },
    rotterdam: {
      title: "Horeca uitzenden Rotterdam",
      intro: "Van Markthal tot havengebied, van Ahoy events tot cruise terminal. Wij leveren snel en flexibel horecapersoneel in heel Rotterdam. Ervaring met grootschalige evenementen.",
      image: "/images/locatie-rotterdam-uitzenden.png",
      alt: "Tijdelijk horecapersoneel tijdens event in Rotterdam Ahoy"
    }
  },
  detachering: {
    utrecht: {
      title: "Horeca detachering Utrecht",
      intro: "Stabiele horecakracht voor uw Utrechtse restaurant, hotel of congreslocatie. Langdurige inzet zonder werkgeversrisico. Ideaal voor Jaarbeurs, TivoliVredenburg en binnenstad horeca.",
      image: "/images/locatie-utrecht-detachering.png",
      alt: "Gedetacheerde horecamedewerker in restaurant Utrecht centrum"
    },
    amsterdam: {
      title: "Horeca detachering Amsterdam",
      intro: "Vaste horecakracht voor uw Amsterdamse zaak zonder vaste lasten. Langdurige inzet van professioneel, meertalig personeel. Perfect voor high-end restaurants en hotels.",
      image: "/images/locatie-amsterdam-detachering.png",
      alt: "Gedetacheerde barista in Amsterdam Zuidas restaurant"
    },
    rotterdam: {
      title: "Horeca detachering Rotterdam",
      intro: "Stabiel teamlid voor uw Rotterdamse horeca zonder werkgeversrisico. Langdurige inzet met flexibel contract. Ervaring met Rotterdamse diversiteit en dynamiek.",
      image: "/images/locatie-rotterdam-detachering.png",
      alt: "Gedetacheerde horecamedewerker in Rotterdam Markthal"
    }
  }
};

// "Wat is" content met lokale voorbeelden
const whatIsContent = {
  uitzenden: {
    utrecht: {
      intro: "Bij uitzenden werkt het horecapersoneel bij uw Utrechtse zaak, maar blijft in dienst bij TopTalent Jobs. Perfect voor piekdrukte tijdens UIT-week, Jaarbeurs events of reguliere drukte in het centrum.",
      examples: [
        "Tijdelijke versterking tijdens UIT-week en introductie-evenementen",
        "Extra personeel voor Jaarbeurs congressen en beurzen",
        "Vervanging bij ziekte of vakantie in binnenstad restaurants",
        "Seizoenspersoneel voor terrasseizoen en feestdagen"
      ]
    },
    amsterdam: {
      intro: "Bij uitzenden werkt het horecapersoneel bij uw Amsterdamse zaak, maar blijft in dienst bij TopTalent Jobs. Ideaal voor ADE, Koningsdag, RAI events of structurele piekdrukte in centrum en Zuidas.",
      examples: [
        "Extra personeel tijdens ADE en grote festivals",
        "Meertalig personeel voor internationale hotels en restaurants",
        "RAI congres- en beurspersoneel",
        "Koningsdag en andere grootschalige evenementen"
      ]
    },
    rotterdam: {
      intro: "Bij uitzenden werkt het horecapersoneel bij uw Rotterdamse zaak, maar blijft in dienst bij TopTalent Jobs. Perfect voor Ahoy events, cruise terminal drukte of Markthal piekdagen.",
      examples: [
        "Grootschalige events in Ahoy Rotterdam",
        "Cruise terminal hospitality (100.000+ passagiers/jaar)",
        "Markthal en Fenix Food Factory drukte",
        "North Sea Jazz en andere festivals"
      ]
    }
  },
  detachering: {
    utrecht: {
      intro: "Bij detachering plaatsen wij een professionele medewerker voor langere tijd (3-12 maanden) bij uw Utrechtse zaak. De medewerker werkt volledig geïntegreerd in uw team, maar blijft formeel bij ons in dienst.",
      benefits: [
        "Continuïteit voor uw team in drukke Utrechtse horeca",
        "Kennis van lokale evenementen en Utrechtse gasten",
        "Stabiliteit zonder langdurige arbeidscontracten",
        "Optie tot overname na detacheringsperiode"
      ]
    },
    amsterdam: {
      intro: "Bij detachering plaatsen wij een professionele medewerker voor langere tijd (3-12 maanden) bij uw Amsterdamse zaak. Vaak meertalig en ervaren met internationale gasten. Volledig geïntegreerd in uw team.",
      benefits: [
        "Meertalig personeel voor internationale Amsterdamse markt",
        "Ervaring met high-end horeca en Michelin-ster zaken",
        "Stabiliteit in snel veranderende Amsterdamse horeca",
        "Flexibel contract met opzegtermijn"
      ]
    },
    rotterdam: {
      intro: "Bij detachering plaatsen wij een professionele medewerker voor langere tijd (3-12 maanden) bij uw Rotterdamse zaak. Gewend aan diverse, multiculturele werkomgevingen. Volledig geïntegreerd in uw team.",
      benefits: [
        "Ervaring met Rotterdamse diversiteit en dynamiek",
        "Kennis van lokale horeca van Markthal tot haven",
        "Stabiele kracht voor wisselende teams",
        "Geen werkgeversrisico bij langdurige inzet"
      ]
    }
  }
};

// Wanneer/Scenario content
const whenContent = {
  uitzenden: {
    utrecht: [
      { scenario: "Jaarbeurs evenementen", description: "Congressen, beurzen en grote events bij de Jaarbeurs Utrecht.", color: "from-orange-500/10 to-orange-500/5" },
      { scenario: "UIT-week & introductie", description: "Studentenevenementen en introductieweken in heel Utrecht.", color: "from-amber-500/10 to-amber-500/5" },
      { scenario: "TivoliVredenburg events", description: "Concerten, festivals en culturele evenementen.", color: "from-orange-500/10 to-orange-500/5" },
      { scenario: "Binnenstad piekdrukte", description: "Drukke weekenden en feestdagen in Utrecht centrum.", color: "from-amber-500/10 to-amber-500/5" }
    ],
    amsterdam: [
      { scenario: "ADE & festivals", description: "Amsterdam Dance Event, festivals en grote evenementen.", color: "from-orange-500/10 to-orange-500/5" },
      { scenario: "RAI events", description: "Congressen, beurzen en conferenties in de RAI.", color: "from-amber-500/10 to-amber-500/5" },
      { scenario: "Koningsdag", description: "Grootschalige horeca voor Koningsdag festiviteiten.", color: "from-orange-500/10 to-orange-500/5" },
      { scenario: "Toeristen seizoen", description: "Extra personeel tijdens toeristische pieken centrum en Zuidas.", color: "from-amber-500/10 to-amber-500/5" }
    ],
    rotterdam: [
      { scenario: "Ahoy evenementen", description: "Concerten, beurzen en events tot 15.000 bezoekers.", color: "from-orange-500/10 to-orange-500/5" },
      { scenario: "Cruise terminal", description: "Hospitality voor cruise passagiers (100.000+/jaar).", color: "from-amber-500/10 to-amber-500/5" },
      { scenario: "North Sea Jazz", description: "Festival personeel en horeca ondersteuning.", color: "from-orange-500/10 to-orange-500/5" },
      { scenario: "Markthal drukte", description: "Piekdagen in Markthal en Fenix Food Factory.", color: "from-amber-500/10 to-amber-500/5" }
    ]
  },
  detachering: {
    utrecht: [
      { scenario: "Restaurant uitbreiding", description: "Structurele versterking team zonder vaste contracten.", color: "from-orange-500/10 to-orange-500/5" },
      { scenario: "Jaarbeurs seizoen", description: "Langdurige inzet tijdens drukke congres seizoenen.", color: "from-amber-500/10 to-amber-500/5" },
      { scenario: "Hotel extra capaciteit", description: "Vaste kracht tijdens hoge bezetting periodes.", color: "from-orange-500/10 to-orange-500/5" },
      { scenario: "Zwangerschapsvervanging", description: "Continuïteit tijdens langdurige afwezigheid.", color: "from-amber-500/10 to-amber-500/5" }
    ],
    amsterdam: [
      { scenario: "High-end restaurant", description: "Ervaren kracht voor fine dining zonder vast contract.", color: "from-orange-500/10 to-orange-500/5" },
      { scenario: "Hotel Schiphol area", description: "Stabiel personeel voor internationale hotelketen.", color: "from-amber-500/10 to-amber-500/5" },
      { scenario: "Langdurig project", description: "Vaste medewerker voor tijdelijke locatie of concept.", color: "from-orange-500/10 to-orange-500/5" },
      { scenario: "Teamversterking Zuidas", description: "Professioneel personeel voor zakelijke horeca.", color: "from-amber-500/10 to-amber-500/5" }
    ],
    rotterdam: [
      { scenario: "Markthal standhouder", description: "Vaste kracht zonder werkgeversrisico voor foodstand.", color: "from-orange-500/10 to-orange-500/5" },
      { scenario: "Haven horeca", description: "Stabiel personeel voor horecagelegenheid havengebied.", color: "from-amber-500/10 to-amber-500/5" },
      { scenario: "Cruise terminal", description: "Seizoenspersoneel voor drukke cruiseperiodes.", color: "from-orange-500/10 to-orange-500/5" },
      { scenario: "Restaurant centrum", description: "Langdurige versterking team zonder vaste lasten.", color: "from-amber-500/10 to-amber-500/5" }
    ]
  }
};

// CTA content
const ctaContent = {
  uitzenden: {
    utrecht: "Van Jaarbeurs tot binnenstad - wij leveren snel en betrouwbaar tijdelijk personeel voor uw Utrechtse zaak.",
    amsterdam: "Van centrum tot Zuidas - meertalig personeel binnen 24 uur voor uw Amsterdamse horeca.",
    rotterdam: "Van Markthal tot haven - flexibel personeel voor uw Rotterdamse zaak, snel inzetbaar."
  },
  detachering: {
    utrecht: "Ontdek of detachering past bij uw Utrechtse restaurant, hotel of congreslocatie. Vrijblijvend adviesgesprek.",
    amsterdam: "Plan een gesprek over langdurige inzet voor uw Amsterdamse zaak. Meertalig en professioneel.",
    rotterdam: "Bespreek uw behoefte aan stabiel personeel voor uw Rotterdamse horeca. Flexibel en zonder risico."
  }
};


export default function CityServicePage() {
  const params = useParams();
  const city = params.city as string;
  const service = params.service as string;
  const location = getLocation(city);

  if (!location || !validServices.includes(service)) {
    notFound();
  }

  const hero = heroContent[service as keyof typeof heroContent][city as keyof typeof heroContent.uitzenden];
  const whatIs = whatIsContent[service as keyof typeof whatIsContent][city as keyof typeof whatIsContent.uitzenden];
  const when = whenContent[service as keyof typeof whenContent][city as keyof typeof whenContent.uitzenden];
  const cta = ctaContent[service as keyof typeof ctaContent][city as keyof typeof ctaContent.uitzenden];

  // FAQ uit centrale data bron (single source of truth)
  const faqs = getLocationServiceFAQs(
    service as "uitzenden" | "detachering",
    city as "utrecht" | "amsterdam" | "rotterdam"
  );

  const serviceLabels = {
    uitzenden: "Uitzenden",
    detachering: "Detachering"
  };

  return (
    <>
      {/* HERO - WHITE */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <FadeIn direction="left">
              <div>
                <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
                  <Link href="/locaties">Locaties</Link> › <Link href={`/locaties/${city}`}>{location.name}</Link> › {serviceLabels[service as keyof typeof serviceLabels]}
                </span>

                {/* Sub-navigatie */}
                <LocatieSubNav city={city} />

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 leading-[1.1]">
                  {hero.title}
                </h1>
                <p className="text-xl text-neutral-600 mb-8 leading-relaxed max-w-xl">
                  {hero.intro}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/personeel-aanvragen"
                    className="inline-flex items-center justify-center bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                    shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                    hover:bg-[#EA580C] transition-all duration-300"
                  >
                    Direct personeel aanvragen
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  <Link
                    href="tel:+31649200412"
                    className="inline-flex items-center justify-center border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
                    hover:border-[#F97316] hover:text-[#F97316] transition-all duration-300"
                  >
                    Bel direct
                  </Link>
                </div>
              </div>
            </FadeIn>

            <FadeIn direction="right" delay={0.2}>
              <div className="hidden lg:flex justify-center lg:justify-end">
                <PremiumImage
                  src={hero.image}
                  alt={hero.alt}
                  width={480}
                  height={480}
                />
              </div>
            </FadeIn>
          </div>
        </Section.Container>
      </Section>

      {/* WAT IS - TINTED */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <div className="max-w-4xl mx-auto">
            <FadeIn>
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                  {service === "uitzenden" ? `Horeca uitzenden in ${location.name}` : `Detachering in ${location.name}`}
                </h2>
                <p className="text-xl text-neutral-600 leading-relaxed">
                  {whatIs.intro}
                </p>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {service === "uitzenden"
                ? (whatIs as typeof whatIsContent.uitzenden.utrecht).examples.map((example, i) => (
                    <FadeIn key={i} delay={0.1 * i}>
                      <div className="bg-white rounded-xl p-6 border border-neutral-100">
                        <div className="flex items-start gap-3">
                          <span className="text-[#F97316] text-xl mt-1">✓</span>
                          <p className="text-neutral-700">{example}</p>
                        </div>
                      </div>
                    </FadeIn>
                  ))
                : (whatIs as typeof whatIsContent.detachering.utrecht).benefits.map((benefit, i) => (
                    <FadeIn key={i} delay={0.1 * i}>
                      <div className="bg-white rounded-xl p-6 border border-neutral-100">
                        <div className="flex items-start gap-3">
                          <span className="text-[#F97316] text-xl mt-1">✓</span>
                          <p className="text-neutral-700">{benefit}</p>
                        </div>
                      </div>
                    </FadeIn>
                  ))
              }
            </div>
          </div>
        </Section.Container>
      </Section>

      {/* WANNEER/SCENARIO - WHITE */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                {service === "uitzenden"
                  ? `Wanneer kies je voor uitzenden in ${location.name}?`
                  : `Wanneer kies je voor detachering in ${location.name}?`
                }
              </h2>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
                {service === "uitzenden"
                  ? `Tijdelijke versterking voor uw ${location.name.toLowerCase()} horeca.`
                  : `Langdurige inzet voor stabiliteit in uw ${location.name.toLowerCase()} team.`
                }
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {when.map((item, i) => (
              <FadeIn key={i} delay={0.1 * i}>
                <div className={`bg-gradient-to-br ${item.color} rounded-2xl p-8 border border-neutral-100`}>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">{item.scenario}</h3>
                  <p className="text-neutral-600">{item.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Section.Container>
      </Section>

      {/* ZO WERKT HET - TINTED */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                Zo werkt {service} in {location.name}
              </h2>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
                Van aanvraag tot inzet: een helder en snel proces.
              </p>
            </div>
          </FadeIn>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-8 left-[calc(12.5%+28px)] right-[calc(12.5%+28px)] h-0.5 bg-gradient-to-r from-[#F97316] via-[#F97316] to-[#F97316]/30" />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { step: "1", title: "Intake", description: `U vertelt ons wat u nodig heeft in ${location.name}` },
                  { step: "2", title: "Match", description: "Wij selecteren de juiste lokale kandidaten" },
                  { step: "3", title: "Inzet", description: "Personeel start op uw locatie" },
                  { step: "4", title: "Nazorg", description: "Wij blijven betrokken en evalueren" },
                ].map((item, i) => (
                  <FadeIn key={i} delay={0.15 * i}>
                    <div className="text-center relative">
                      <div className="w-14 h-14 bg-[#F97316] rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 relative z-10">
                        {item.step}
                      </div>
                      <h3 className="font-bold text-neutral-900 mb-2">{item.title}</h3>
                      <p className="text-neutral-600 text-sm">{item.description}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </Section.Container>
      </Section>

      {/* FAQ - TINTED */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <FadeIn>
            <FAQ items={faqs} />
          </FadeIn>
        </Section.Container>
      </Section>

      {/* CTA - WHITE */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <FadeIn>
            <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-60 h-60 border border-white/20 rounded-full translate-x-1/3 translate-y-1/3"></div>
              </div>

              <div className="relative z-10 max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Vaak binnen 24 uur beschikbaar in {location.name}
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  {service === "uitzenden"
                    ? `Klaar om personeel in te plannen in ${location.name}?`
                    : `Plan een gesprek over detachering in ${location.name}`
                  }
                </h2>
                <p className="text-white/90 text-lg leading-relaxed mb-10">
                  {cta}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/personeel-aanvragen"
                    className="bg-white text-[#F97316] px-8 py-4 rounded-xl text-base font-semibold
                    hover:bg-neutral-100 transition-all duration-300"
                  >
                    Personeel aanvragen
                  </Link>
                  <Link
                    href="/contact"
                    className="border-2 border-white/30 text-white px-8 py-4 rounded-xl text-base font-semibold
                    hover:bg-white/10 transition-all duration-300"
                  >
                    Neem contact op
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
