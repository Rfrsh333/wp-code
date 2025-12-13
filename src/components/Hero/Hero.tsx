"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Hero.module.css";
import { useInView, useCountUp } from "./hooks";

/**
 * Arrow Icon Component
 */
const ArrowIcon = () => (
  <svg
    className={styles.arrow}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

/**
 * Stat Counter Component
 */
interface StatCounterProps {
  target: number;
  suffix: string;
  label: string;
  shouldAnimate: boolean;
}

const StatCounter = ({ target, suffix, label, shouldAnimate }: StatCounterProps) => {
  const count = useCountUp(target, 1100, shouldAnimate);

  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>
        {count}
        {suffix}
      </span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
};

/**
 * Hero Section Component
 * Premium, production-ready hero with advanced animations
 */
export default function Hero() {
  // Intersection observer for scroll reveals
  const [heroRef, isHeroInView] = useInView({ threshold: 0.1 });

  // Track if highlight animation has played
  const [highlightAnimated, setHighlightAnimated] = useState(false);

  // Trigger highlight animation after H1 becomes visible
  useEffect(() => {
    if (isHeroInView && !highlightAnimated) {
      // Small delay to let the H1 fade in first
      const timer = setTimeout(() => {
        setHighlightAnimated(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isHeroInView, highlightAnimated]);

  return (
    <section
      className={styles.hero}
      ref={heroRef as React.RefObject<HTMLElement>}
    >
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Left Content */}
          <div className={styles.content}>
            {/* Eyebrow */}
            <span
              className={`${styles.eyebrow} ${styles.revealItem} ${
                isHeroInView ? styles.visible : ""
              } ${styles.delay1}`}
            >
              Horeca Uitzendbureau
            </span>

            {/* Headline */}
            <h1
              className={`${styles.headline} ${styles.revealItem} ${
                isHeroInView ? styles.visible : ""
              } ${styles.delay2}`}
            >
              Uw partner voor{" "}
              <span
                className={`${styles.highlight} ${
                  highlightAnimated ? styles.highlightAnimated : ""
                }`}
              >
                kwalitatief
              </span>{" "}
              horecapersoneel
            </h1>

            {/* Subtext */}
            <p
              className={`${styles.subtext} ${styles.revealItem} ${
                isHeroInView ? styles.visible : ""
              } ${styles.delay3}`}
            >
              TopTalent levert betrouwbaar en professioneel personeel voor
              restaurants, hotels en evenementen. Binnen 24 uur de juiste
              mensen op de juiste plek.
            </p>

            {/* CTA Buttons */}
            <div
              className={`${styles.ctaGroup} ${styles.revealItem} ${
                isHeroInView ? styles.visible : ""
              } ${styles.delay4}`}
            >
              <Link href="/personeel-aanvragen" className={styles.ctaPrimary}>
                Personeel aanvragen
                <ArrowIcon />
              </Link>
              <Link href="/inschrijven" className={styles.ctaSecondary}>
                Solliciteren
              </Link>
            </div>

            {/* Stats Row */}
            <div
              className={`${styles.statsRow} ${styles.revealItem} ${
                isHeroInView ? styles.visible : ""
              } ${styles.delay5}`}
            >
              <StatCounter
                target={100}
                suffix="+"
                label="Tevreden klanten"
                shouldAnimate={isHeroInView}
              />
              <div className={styles.statDivider} />
              <StatCounter
                target={24}
                suffix="u"
                label="Responstijd"
                shouldAnimate={isHeroInView}
              />
              <div className={styles.statDivider} />
              <StatCounter
                target={98}
                suffix="%"
                label="Klanttevredenheid"
                shouldAnimate={isHeroInView}
              />
            </div>
          </div>

          {/* Right Image Section */}
          <div
            className={`${styles.imageSection} ${styles.revealItem} ${
              isHeroInView ? styles.visible : ""
            } ${styles.delay6}`}
          >
            {/* Gradient blobs */}
            <div className={styles.blob} aria-hidden="true" />
            <div className={styles.blobSecondary} aria-hidden="true" />

            {/* Powder splash background */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                src="/images/powder-splash.png"
                alt=""
                width={500}
                height={500}
                className="object-contain opacity-90"
                style={{ transform: "scale(1.5)" }}
                priority
                aria-hidden="true"
              />
            </div>

            {/* Hero image */}
            <Image
              src="/images/barista.png"
              alt="Professionele barista"
              width={240}
              height={320}
              className={styles.heroImage}
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
