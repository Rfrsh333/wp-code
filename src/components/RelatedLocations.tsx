"use client";

import Link from "next/link";
import FadeIn from "@/components/animations/FadeIn";
import { Section, Container } from "@/components/Section";

type RelatedLocationsProps = {
  currentCity: "amsterdam" | "utrecht" | "rotterdam";
  service: "uitzenden" | "detachering";
};

const CITIES = ["amsterdam", "utrecht", "rotterdam"] as const;

const CITY_LABELS: Record<(typeof CITIES)[number], string> = {
  amsterdam: "Amsterdam",
  utrecht: "Utrecht",
  rotterdam: "Rotterdam",
};

const DESCRIPTIONS = {
  uitzenden: {
    amsterdam: "Tijdelijke inzet voor drukke locaties in en rond Amsterdam.",
    utrecht: "Tijdelijke inzet voor restaurants, hotels en events in Utrecht.",
    rotterdam: "Flexibele inzet voor havengebied, events en zakelijke horeca.",
  },
  detachering: {
    amsterdam: "Structurele bezetting voor hotels, events en locaties in Amsterdam.",
    utrecht: "Structurele bezetting voor restaurants, hotels en events in Utrecht.",
    rotterdam: "Vaste krachten voor zakelijke horeca, events en piekdrukte.",
  },
} satisfies Record<
  RelatedLocationsProps["service"],
  Record<(typeof CITIES)[number], string>
>;

export default function RelatedLocations({ currentCity, service }: RelatedLocationsProps) {
  const items = CITIES.filter((city) => city !== currentCity).map((city) => ({
    href: `/locaties/${city}/${service}`,
    title:
      service === "detachering"
        ? `Detachering ${CITY_LABELS[city]}`
        : `Horeca uitzenden ${CITY_LABELS[city]}`,
    description: DESCRIPTIONS[service][city],
  }));

  return (
    <Section variant="tinted" spacing="default">
      <Container>
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
              Ook actief in deze steden
            </h2>
            <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
              {service === "detachering"
                ? "Detachering in andere steden met dezelfde aanpak."
                : "Horeca uitzenden in andere steden met dezelfde aanpak."}
            </p>
          </div>
        </FadeIn>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {items.map((item, index) => (
            <FadeIn key={item.href} delay={0.1 * index}>
              <Link
                href={item.href}
                className="block bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">{item.title}</h3>
                <p className="text-neutral-600 text-sm">{item.description}</p>
              </Link>
            </FadeIn>
          ))}
        </div>
      </Container>
    </Section>
  );
}
