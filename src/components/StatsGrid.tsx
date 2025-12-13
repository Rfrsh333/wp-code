"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./StatsGrid.module.css";

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

const stats: Stat[] = [
  { value: 620, suffix: "+", label: "Tevreden klanten" },
  { value: 98, suffix: "%", label: "Klanttevredenheid" },
  { value: 1500, suffix: "+", label: "Plaatsingen per jaar" },
  { value: 24, suffix: "u", label: "Gemiddelde responstijd" },
];

/* ==========================================================================
   Animated Counter Hook
   ========================================================================== */
function useCountUp(target: number, duration: number, shouldStart: boolean) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!shouldStart || hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(easeOut * target));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [target, duration, shouldStart]);

  return count;
}

/* ==========================================================================
   Individual Stat Card
   ========================================================================== */
interface StatCardProps {
  stat: Stat;
  index: number;
  isVisible: boolean;
  prefersReducedMotion: boolean;
}

function StatCard({ stat, index, isVisible, prefersReducedMotion }: StatCardProps) {
  const count = useCountUp(
    stat.value,
    1800,
    isVisible && !prefersReducedMotion
  );

  const displayValue = prefersReducedMotion ? stat.value : count;

  return (
    <div
      className={`${styles.card} ${isVisible ? styles.visible : ""}`}
      style={{
        transitionDelay: prefersReducedMotion ? "0ms" : `${index * 100}ms`,
      }}
    >
      <div className={styles.value}>
        {displayValue}
        <span className={styles.suffix}>{stat.suffix}</span>
      </div>
      <div className={styles.label}>{stat.label}</div>
    </div>
  );
}

/* ==========================================================================
   Stats Grid Component
   ========================================================================== */
export default function StatsGrid() {
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    motionQuery.addEventListener("change", handleMotionChange);

    // Intersection Observer for scroll reveal
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      observer.disconnect();
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${prefersReducedMotion ? styles.reducedMotion : ""}`}
    >
      <div className={styles.container}>
        <div className={styles.grid}>
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              stat={stat}
              index={index}
              isVisible={isVisible}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
