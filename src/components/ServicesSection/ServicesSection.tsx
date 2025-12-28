"use client";

import Link from "next/link";
import { useInView } from "@/components/Hero/hooks";
import styles from "./ServicesSection.module.css";

/**
 * Service data with icons as SVG paths
 */
const services = [
  {
    id: "uitzenden",
    title: "Uitzenden horeca",
    description:
      "Flexibele inzet van horecapersoneel voor piekuren, evenementen of seizoensdrukte. Snel beschikbaar en direct inzetbaar.",
    href: "/diensten/uitzenden",
    icon: (
      <svg
        className={styles.icon}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    id: "detachering",
    title: "Detachering horeca",
    description:
      "Structurele versterking met ervaren krachten voor langere periodes, met behoud van flexibiliteit.",
    href: "/diensten/detachering",
    icon: (
      <svg
        className={styles.icon}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    id: "recruitment",
    title: "Werving en selectie",
    description:
      "Werving en selectie voor vaste functies. Wij vinden kandidaten die passen bij uw team en tempo.",
    href: "/diensten/recruitment",
    icon: (
      <svg
        className={styles.icon}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

/**
 * Arrow Icon for CTA links
 */
const ArrowIcon = () => (
  <svg
    className={styles.linkArrow}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </svg>
);

/**
 * Service Card Component
 */
interface ServiceCardProps {
  service: (typeof services)[0];
  isVisible: boolean;
  delayClass: string;
}

const ServiceCard = ({ service, isVisible, delayClass }: ServiceCardProps) => (
  <article
    className={`${styles.card} ${styles.revealItem} ${delayClass} ${
      isVisible ? styles.visible : ""
    }`}
  >
    <div className={styles.iconContainer}>{service.icon}</div>
    <h3 className={styles.cardTitle}>{service.title}</h3>
    <p className={styles.cardDescription}>{service.description}</p>
    <Link href={service.href} className={styles.cardLink}>
      Lees meer
      <ArrowIcon />
    </Link>
  </article>
);

/**
 * Services Section Component
 * Premium, professional section with scroll reveal animations
 */
export default function ServicesSection() {
  const [sectionRef, isInView] = useInView({ threshold: 0.1 });

  const cardDelays = [styles.delayCard1, styles.delayCard2, styles.delayCard3];

  return (
    <section
      className={styles.section}
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="services-heading"
    >
      <div className={styles.container}>
        {/* Section Header */}
        <header className={styles.header}>
          <span
            className={`${styles.eyebrow} ${styles.revealItem} ${styles.delayEyebrow} ${
              isInView ? styles.visible : ""
            }`}
          >
            Diensten voor werkgevers
          </span>
          <h2
            id="services-heading"
            className={`${styles.headline} ${styles.revealItem} ${styles.delayHeadline} ${
              isInView ? styles.visible : ""
            }`}
          >
            Flexibel horecapersoneel op maat
          </h2>
          <p
            className={`${styles.subtitle} ${styles.revealItem} ${styles.delaySubtitle} ${
              isInView ? styles.visible : ""
            }`}
          >
            Van tijdelijke inzet tot vaste plaatsing. Wij regelen de volledige
            personeelsbezetting voor horeca en events.
          </p>
        </header>

        {/* Service Cards */}
        <div className={styles.cardsGrid}>
          {services.map((service, index) => (
            <ServiceCard
              key={service.id}
              service={service}
              isVisible={isInView}
              delayClass={cardDelays[index]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
