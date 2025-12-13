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
    title: "Snelle responstijd",
    description: "Binnen 24 uur personeel beschikbaar",
  },
  {
    title: "Gekwalificeerd personeel",
    description: "Uitgebreid gescreend en getraind",
  },
  {
    title: "Flexibele inzet",
    description: "Van enkele uren tot langdurige plaatsing",
  },
  {
    title: "Persoonlijke aanpak",
    description: "Vaste contactpersoon voor uw account",
  },
];

/**
 * Benefits data with icons
 */
const benefits = [
  { icon: "€", text: "Concurrerende salarissen voor talent" },
  { icon: "⚡", text: "Snelle uitbetaling binnen 24 uur" },
  { icon: "📱", text: "Moderne talent-app voor planning" },
  { icon: "🎓", text: "Professionele trainingen en certificeringen" },
  { icon: "👥", text: "Community van vakgenoten" },
  { icon: "📍", text: "Werkervaring bij premium locaties" },
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
              Waarom TopTalent
            </span>

            {/* Headline */}
            <h2
              id="why-toptalent-heading"
              className={`${styles.headline} ${styles.revealItem} ${styles.delayHeadline} ${
                isInView ? styles.visible : ""
              }`}
            >
              Uw betrouwbare partner in horeca staffing
            </h2>

            {/* Description */}
            <p
              className={`${styles.description} ${styles.revealItem} ${styles.delayDescription} ${
                isInView ? styles.visible : ""
              }`}
            >
              Met jarenlange ervaring in de horeca- en evenementenbranche begrijpen
              wij de uitdagingen van onze klanten. Wij leveren niet alleen personeel,
              maar bouwen duurzame partnerships.
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
              Meer over TopTalent
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
              Wij bieden
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
              Schrijf je nu in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
