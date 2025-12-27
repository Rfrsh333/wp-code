"use client";

import Link from "next/link";
import { useInView } from "@/components/Hero/hooks";
import styles from "./WhyTopTalent.module.css";

/**
 * Check Icon for bullet points
 */
const CheckIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

/**
 * Arrow Icon for text link
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
 * Bullet point data
 */
const bulletPoints = [
  {
    title: "Snel schakelen",
    description: "Binnen 24 uur een passend voorstel",
  },
  {
    title: "Geselecteerde kandidaten",
    description: "Ervaring in keuken, bediening en events",
  },
  {
    title: "Flexibele inzet",
    description: "Losse diensten of langere trajecten",
  },
  {
    title: "Vaste contactpersoon",
    description: "Eén aanspreekpunt voor planning en kwaliteit",
  },
];

/**
 * Benefits data with icons
 */
const benefits = [
  { icon: "€", text: "Transparante tarieven zonder verrassingen" },
  { icon: "⚡", text: "Beschikbaar voor piekuren en last-minute diensten" },
  { icon: "📱", text: "Snelle planning en heldere communicatie" },
  { icon: "🎓", text: "Screening op ervaring en referenties" },
  { icon: "👥", text: "Snelle vervanging bij uitval" },
  { icon: "📍", text: "Lokale pool in Utrecht en omgeving" },
];

/**
 * Bullet delay classes
 */
const bulletDelays = [
  styles.delayBullet1,
  styles.delayBullet2,
  styles.delayBullet3,
  styles.delayBullet4,
];

/**
 * Benefit delay classes
 */
const benefitDelays = [
  styles.delayBenefit1,
  styles.delayBenefit2,
  styles.delayBenefit3,
  styles.delayBenefit4,
  styles.delayBenefit5,
  styles.delayBenefit6,
];

/**
 * Why TopTalent Section Component
 * Premium two-column layout showcasing company benefits
 */
export default function WhyTopTalent() {
  const [sectionRef, isInView] = useInView({ threshold: 0.1 });

  return (
    <section
      className={styles.section}
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="why-toptalent-heading"
    >
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Left Column - Content */}
          <div className={styles.content}>
            {/* Eyebrow */}
            <span
              className={`${styles.eyebrow} ${styles.revealItem} ${styles.delayEyebrow} ${
                isInView ? styles.visible : ""
              }`}
            >
              Waarom werkgevers kiezen
            </span>

            {/* Headline */}
            <h2
              id="why-toptalent-heading"
              className={`${styles.headline} ${styles.revealItem} ${styles.delayHeadline} ${
                isInView ? styles.visible : ""
              }`}
            >
              Het horeca uitzendbureau dat meedenkt
            </h2>

            {/* Description */}
            <p
              className={`${styles.description} ${styles.revealItem} ${styles.delayDescription} ${
                isInView ? styles.visible : ""
              }`}
            >
              Wij kennen de horeca en begrijpen de druk op planning en service.
              Daarom leveren we snel inzetbaar horecapersoneel en een vast
              aanspreekpunt voor uw locatie.
            </p>

            {/* Bullet Points */}
            <ul className={styles.bulletList}>
              {bulletPoints.map((point, index) => (
                <li
                  key={point.title}
                  className={`${styles.bulletItem} ${styles.revealItem} ${bulletDelays[index]} ${
                    isInView ? styles.visible : ""
                  }`}
                >
                  <div className={styles.bulletIcon}>
                    <CheckIcon />
                  </div>
                  <div className={styles.bulletContent}>
                    <span className={styles.bulletTitle}>{point.title}</span>
                    <span className={styles.bulletDescription}>
                      {point.description}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Text Link */}
            <Link
              href="/over-ons"
              className={`${styles.textLink} ${styles.revealItem} ${styles.delayLink} ${
                isInView ? styles.visible : ""
              }`}
            >
              Meer over onze werkwijze
              <ArrowIcon />
            </Link>
          </div>

          {/* Right Column - Benefits Card */}
          <div
            className={`${styles.benefitsCard} ${styles.revealItem} ${styles.delayCard} ${
              isInView ? styles.visible : ""
            }`}
          >
            {/* Card Title */}
            <h3
              className={`${styles.cardTitle} ${styles.revealItem} ${styles.delayCardTitle} ${
                isInView ? styles.visible : ""
              }`}
            >
              Wat u krijgt
            </h3>

            {/* Benefits List */}
            <ul className={styles.benefitsList}>
              {benefits.map((benefit, index) => (
                <li
                  key={benefit.text}
                  className={`${styles.benefitItem} ${styles.revealItem} ${benefitDelays[index]} ${
                    isInView ? styles.visible : ""
                  }`}
                >
                  <span className={styles.benefitIconContainer}>
                    <span className={styles.benefitIcon} aria-hidden="true">
                      {benefit.icon}
                    </span>
                  </span>
                  <span className={styles.benefitText}>{benefit.text}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <Link
              href="/inschrijven"
              className={`${styles.ctaButton} ${styles.revealItem} ${styles.delayCta} ${
                isInView ? styles.visible : ""
              }`}
            >
              Start de samenwerking
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
