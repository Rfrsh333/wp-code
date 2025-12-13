"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./PremiumImage.module.css";

interface PremiumImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}

export default function PremiumImage({
  src,
  alt,
  width,
  height,
  className = "",
  priority = false,
}: PremiumImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsRevealed(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${styles.reveal} ${
        isRevealed ? styles.revealed : ""
      } ${className}`}
    >
      {/* Static glow behind everything */}
      <div className={styles.glow} aria-hidden="true" />

      {/* Mat layer - offset background */}
      <div className={styles.mat} aria-hidden="true" />

      {/* Main frame with image */}
      <div className={styles.frame}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={styles.image}
          priority={priority}
        />
      </div>

      {/* Corner accents */}
      <div
        className={`${styles.cornerAccent} ${styles.cornerTopLeft}`}
        aria-hidden="true"
      />
      <div
        className={`${styles.cornerAccent} ${styles.cornerBottomRight}`}
        aria-hidden="true"
      />
    </div>
  );
}
