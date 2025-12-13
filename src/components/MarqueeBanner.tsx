"use client";

import { useState, useEffect } from "react";
import styles from "./MarqueeBanner.module.css";

const services = [
  "Uitzenden",
  "Detachering",
  "Recruitment",
  "Events",
  "Horeca personeel",
];

// Create repeated content for seamless loop
const MarqueeContent = () => (
  <>
    {[...Array(3)].map((_, groupIndex) => (
      <div key={groupIndex} className={styles.group}>
        {services.map((service, index) => (
          <span key={`${groupIndex}-${index}`} className={styles.item}>
            <span className={styles.text}>{service}</span>
            <span className={styles.separator}>✦</span>
          </span>
        ))}
      </div>
    ))}
  </>
);

export default function MarqueeBanner() {
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <div
      className={`${styles.wrapper} ${isHovered ? styles.hovered : ""} ${
        prefersReducedMotion ? styles.reducedMotion : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-hidden="true"
    >
      {/* Noise texture overlay */}
      <div className={styles.noiseOverlay} />

      {/* Gradient background */}
      <div className={styles.gradientBg} />

      {/* Marquee track */}
      <div className={styles.marquee}>
        <div className={styles.track}>
          <MarqueeContent />
          <MarqueeContent />
        </div>
      </div>
    </div>
  );
}
