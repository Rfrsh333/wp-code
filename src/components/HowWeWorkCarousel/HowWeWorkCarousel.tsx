"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useInView } from "@/components/Hero/hooks";
import styles from "./HowWeWorkCarousel.module.css";

/* ==========================================================================
   Types & Data
   ========================================================================== */

interface Step {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  {
    number: "01",
    title: "Intake",
    description:
      "Korte kennismaking en duidelijke afspraken. We bespreken jouw personeelsbehoefte, planning en verwachtingen, zodat we gericht kunnen schakelen.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Matching",
    description:
      "Gescreend personeel dat past bij jouw zaak. We selecteren professionals die passen bij jouw team, type locatie en werkwijze.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Inzet",
    description:
      "Snel geregeld, flexibel inzetbaar. Voor piekdrukte, ziekte of langere periodes — wij regelen het, zodat jij door kunt.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Nazorg",
    description:
      "We blijven betrokken. Ook na de start blijven we bereikbaar en sturen we bij als dat nodig is.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

/* ==========================================================================
   Custom Hook: usePrefersReducedMotion
   ========================================================================== */

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}

/* ==========================================================================
   Props Interface
   ========================================================================== */

interface HowWeWorkCarouselProps {
  autoplay?: boolean;
  autoplayInterval?: number;
  initialIndex?: number;
}

/* ==========================================================================
   Component
   ========================================================================== */

export default function HowWeWorkCarousel({
  autoplay = false,
  autoplayInterval = 5000,
  initialIndex = 0,
}: HowWeWorkCarouselProps) {
  // State
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragCurrentX = useRef(0);
  const dragOffset = useRef(0);

  // Hooks
  const [sectionRef, isInView] = useInView({ threshold: 0.15 });
  const prefersReducedMotion = usePrefersReducedMotion();

  // Constants
  const DRAG_THRESHOLD = 60;
  const totalSlides = steps.length;

  /* ------------------------------------------------------------------------
     Navigation Functions
     ------------------------------------------------------------------------ */

  const goToSlide = useCallback((index: number) => {
    if (index < 0) {
      setActiveIndex(totalSlides - 1);
    } else if (index >= totalSlides) {
      setActiveIndex(0);
    } else {
      setActiveIndex(index);
    }
  }, [totalSlides]);

  const goToPrev = useCallback(() => {
    goToSlide(activeIndex - 1);
  }, [activeIndex, goToSlide]);

  const goToNext = useCallback(() => {
    goToSlide(activeIndex + 1);
  }, [activeIndex, goToSlide]);

  /* ------------------------------------------------------------------------
     Keyboard Navigation
     ------------------------------------------------------------------------ */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if carousel or its children are focused
      if (!trackRef.current?.closest("section")?.contains(document.activeElement)) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrev, goToNext]);

  /* ------------------------------------------------------------------------
     Autoplay
     ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!autoplay || isDragging) return;

    const interval = setInterval(() => {
      goToNext();
    }, autoplayInterval);

    return () => clearInterval(interval);
  }, [autoplay, autoplayInterval, isDragging, goToNext]);

  /* ------------------------------------------------------------------------
     Touch/Mouse Drag Handling
     ------------------------------------------------------------------------ */

  const handleDragStart = useCallback((clientX: number) => {
    if (prefersReducedMotion) return;

    setIsDragging(true);
    dragStartX.current = clientX;
    dragCurrentX.current = clientX;
    dragOffset.current = 0;

    if (trackRef.current) {
      trackRef.current.style.transition = "none";
    }
  }, [prefersReducedMotion]);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return;

    dragCurrentX.current = clientX;
    dragOffset.current = clientX - dragStartX.current;

    if (trackRef.current) {
      const baseOffset = -activeIndex * 100;
      const dragPercent = (dragOffset.current / trackRef.current.offsetWidth) * 100;
      trackRef.current.style.transform = `translateX(calc(${baseOffset}% + ${dragPercent}%))`;
    }
  }, [isDragging, activeIndex]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    if (trackRef.current) {
      trackRef.current.style.transition = "";
    }

    const diff = dragOffset.current;

    if (Math.abs(diff) > DRAG_THRESHOLD) {
      if (diff > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    } else {
      // Snap back to current slide
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${-activeIndex * 100}%)`;
      }
    }

    dragOffset.current = 0;
  }, [isDragging, activeIndex, goToPrev, goToNext]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleDragEnd();
    }
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  /* ------------------------------------------------------------------------
     Render
     ------------------------------------------------------------------------ */

  return (
    <section
      className={styles.section}
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="how-we-work-heading"
    >
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <span
            className={`${styles.eyebrow} ${styles.revealItem} ${styles.delay1} ${
              isInView ? styles.visible : ""
            }`}
          >
            Zo werken wij
          </span>

          <h2
            id="how-we-work-heading"
            className={`${styles.headline} ${styles.revealItem} ${styles.delay2} ${
              isInView ? styles.visible : ""
            }`}
          >
            In 4 stappen geregeld
          </h2>

          <p
            className={`${styles.subtitle} ${styles.revealItem} ${styles.delay3} ${
              isInView ? styles.visible : ""
            }`}
          >
            Snel schakelen, duidelijke afspraken en betrokken nazorg.
          </p>
        </div>

        {/* Carousel */}
        <div
          className={`${styles.carouselWrapper} ${styles.revealItem} ${styles.delay4} ${
            isInView ? styles.visible : ""
          }`}
        >
          {/* Previous Button */}
          <button
            type="button"
            className={`${styles.navButton} ${styles.navButtonPrev}`}
            onClick={goToPrev}
            aria-label="Vorige stap"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Track Container */}
          <div
            className={styles.carouselContainer}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              ref={trackRef}
              className={`${styles.track} ${isDragging ? styles.dragging : ""} ${
                prefersReducedMotion ? styles.reducedMotion : ""
              }`}
              style={{
                transform: `translateX(${-activeIndex * 100}%)`,
              }}
            >
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  className={styles.slideWrapper}
                  aria-hidden={index !== activeIndex}
                >
                  <article
                    className={`${styles.card} ${
                      index === activeIndex ? styles.cardActive : styles.cardInactive
                    } ${prefersReducedMotion ? styles.reducedMotion : ""}`}
                  >
                    {/* Step Number */}
                    <span className={styles.stepNumber}>{step.number}</span>

                    {/* Icon */}
                    <div className={styles.iconWrapper}>
                      {step.icon}
                    </div>

                    {/* Content */}
                    <div className={styles.cardContent}>
                      <h3 className={styles.cardTitle}>
                        Stap {step.number.replace(/^0/, "")} – {step.title}
                      </h3>
                      <p className={styles.cardDescription}>{step.description}</p>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>

          {/* Next Button */}
          <button
            type="button"
            className={`${styles.navButton} ${styles.navButtonNext}`}
            onClick={goToNext}
            aria-label="Volgende stap"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Dots Pagination */}
        <div className={styles.dots} role="tablist" aria-label="Carousel navigatie">
          {steps.map((step, index) => (
            <button
              key={step.number}
              type="button"
              role="tab"
              className={`${styles.dot} ${index === activeIndex ? styles.dotActive : ""}`}
              onClick={() => goToSlide(index)}
              aria-label={`Ga naar stap ${index + 1}`}
              aria-selected={index === activeIndex}
              aria-current={index === activeIndex ? "true" : undefined}
              tabIndex={index === activeIndex ? 0 : -1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
