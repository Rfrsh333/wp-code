"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Hero.module.css";
import { useInView } from "./hooks";

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
 * Hero Section Component
 * Premium, production-ready hero with advanced animations
 */
export default function Hero() {
  // Intersection observer for scroll reveals
  const [heroRef, isHeroInView] = useInView({ threshold: 0.1 });
  const trustItems = [
    "Binnen 24 uur inzetbaar",
    "Gescreend op horeca-ervaring",
    "Snelle vervanging bij uitval",
    "Actief in meerdere regio's",
  ];

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
              Personeeltekort?
            </span>

            {/* Headline */}
            <h1
              className={`${styles.headline} ${styles.revealItem} ${
                isHeroInView ? styles.visible : ""
              } ${styles.delay2}`}
            >
              Stop{" "}
              <span
                className={`${styles.highlight} ${
                  highlightAnimated ? styles.highlightAnimated : ""
                }`}
              >
                omzetverlies
              </span>{" "}
              door personeelsuitval — extra horecapersoneel binnen 24 u
            </h1>

            {/* Subtext */}
            <p
              className={`${styles.subtext} ${styles.revealItem} ${
                isHeroInView ? styles.visible : ""
              } ${styles.delay3}`}
            >
              Geen paniek meer bij ziekte of last-minute uitval. Wij hebben gescreend personeel klaarstaan.
            </p>

            {/* CTA Buttons */}
            <div
              className={`${styles.ctaGroup} ${styles.revealItem} ${
                isHeroInView ? styles.visible : ""
              } ${styles.delay4}`}
            >
              <Link href="/personeel-aanvragen" className={styles.ctaPrimary}>
                Bekijk hoeveel personeel ik kan krijgen
                <ArrowIcon />
              </Link>
              <Link href="/contact" className={styles.ctaSecondary}>
                Laat mij direct bellen door een expert
              </Link>
            </div>
            <p className="text-sm text-neutral-500 mb-6 tracking-wide">
              Reactie binnen 15 minuten tijdens openingstijden.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trustItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-sm font-medium text-neutral-700"
                >
                  <span className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  {item}
                </div>
              ))}
            </div>

          </div>

          {/* Right Image Section */}
          <div
            className={`${styles.imageSection} ${styles.revealItem} ${
              isHeroInView ? styles.visible : ""
            } ${styles.delay6}`}
          >
            {/* Powder splash background */}
            <div className={styles.powderSplash}>
              <Image
                src="/images/powder-splash.png"
                alt=""
                width={500}
                height={500}
                className={styles.powderSplashImage}
                aria-hidden="true"
              />
            </div>

            {/* Hero image */}
            <Image
              src="/images/barista.png"
              alt="Barista aan het werk met inzetbaar horecapersoneel via ons uitzendbureau"
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
