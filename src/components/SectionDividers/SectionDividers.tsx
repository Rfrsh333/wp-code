"use client";

import styles from "./SectionDividers.module.css";

/* ==========================================================================
   Section Dividers - Premium Transition System

   Design Philosophy:
   - Subtle warmth through soft gradients
   - Organic flow through gentle curves
   - Brand presence through minimal accent lines
   - The best transitions are felt, not seen
   ========================================================================== */

/* ==========================================================================
   Color Constants (for reference)

   Base colors:
   - Pure white: #FFFFFF
   - Warm off-white: #FFF7F1
   - Deeper warm off-white: #FFF4EC

   Accent colors:
   - Primary accent: #F97316
   - Softer accent: #FB923C
   ========================================================================== */

/* ==========================================================================
   Curved Wave Dividers
   ========================================================================== */

interface WaveDividerProps {
  /** Color of the wave (should match the NEXT section's background) */
  fillColor?: string;
  /** Height of the wave in pixels (40-80px recommended) */
  height?: number;
  /** Flip the wave vertically */
  flip?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Soft Wave Divider - Type A
 * A gentle, organic curve for transitioning between sections
 */
export function WaveDividerSoft({
  fillColor = "#FFF7F1",
  height = 60,
  flip = false,
  className = "",
}: WaveDividerProps) {
  return (
    <div
      className={`${styles.waveDivider} ${flip ? styles.flipped : ""} ${className}`}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 60"
        fill="none"
        preserveAspectRatio="none"
        className={styles.waveSvg}
      >
        <path
          d="M0 60V30C240 50 480 10 720 30C960 50 1200 10 1440 30V60H0Z"
          fill={fillColor}
        />
      </svg>
    </div>
  );
}

/**
 * Gentle Arc Divider - Type B
 * An even subtler single arc for minimal transitions
 */
export function WaveDividerArc({
  fillColor = "#FFF7F1",
  height = 50,
  flip = false,
  className = "",
}: WaveDividerProps) {
  return (
    <div
      className={`${styles.waveDivider} ${flip ? styles.flipped : ""} ${className}`}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 50"
        fill="none"
        preserveAspectRatio="none"
        className={styles.waveSvg}
      >
        <path
          d="M0 50V25C360 0 1080 0 1440 25V50H0Z"
          fill={fillColor}
        />
      </svg>
    </div>
  );
}

/**
 * Asymmetric Wave Divider - Type C
 * A slightly asymmetric curve for organic flow
 */
export function WaveDividerOrganic({
  fillColor = "#FFF7F1",
  height = 55,
  flip = false,
  className = "",
}: WaveDividerProps) {
  return (
    <div
      className={`${styles.waveDivider} ${flip ? styles.flipped : ""} ${className}`}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 55"
        fill="none"
        preserveAspectRatio="none"
        className={styles.waveSvg}
      >
        <path
          d="M0 55V35C180 15 360 45 600 25C840 5 1080 40 1440 20V55H0Z"
          fill={fillColor}
        />
      </svg>
    </div>
  );
}

/* ==========================================================================
   Accent Line Dividers
   ========================================================================== */

interface AccentLineProps {
  /** Width of the line in pixels */
  width?: number;
  /** Height of the line in pixels */
  height?: number;
  /** Color of the line */
  color?: string;
  /** Alignment: center, left, or right */
  align?: "center" | "left" | "right";
  /** Additional className */
  className?: string;
}

/**
 * Accent Line
 * A minimal brand-colored line for rhythm and warmth
 * Use sparingly between related content blocks
 */
export function AccentLine({
  width = 48,
  height = 3,
  color = "#F97316",
  align = "center",
  className = "",
}: AccentLineProps) {
  return (
    <div
      className={`${styles.accentLineWrapper} ${styles[`align${align.charAt(0).toUpperCase() + align.slice(1)}`]} ${className}`}
      aria-hidden="true"
    >
      <div
        className={styles.accentLine}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

/* ==========================================================================
   Section Wrapper with Gradient
   ========================================================================== */

interface GradientSectionProps {
  children: React.ReactNode;
  /**
   * Gradient type:
   * - "cleanToWarm": #FFFFFF → #FFF7F1 (use after pure white sections)
   * - "warmToDeep": #FFF7F1 → #FFF4EC (use for longer content)
   * - "warmToClean": #FFF4EC → #FFFFFF (use to return to white)
   * - "warmSubtle": #FFF7F1 solid (subtle warm background)
   * - "deepWarm": #FFF4EC solid (deeper warm background)
   * - "white": #FFFFFF solid
   */
  gradient?: "cleanToWarm" | "warmToDeep" | "warmToClean" | "warmSubtle" | "deepWarm" | "white";
  /** Additional className */
  className?: string;
  /** Section ID for accessibility */
  id?: string;
  /** aria-labelledby reference */
  ariaLabelledBy?: string;
}

/**
 * Gradient Section Wrapper
 * Wraps content with the appropriate background gradient
 */
export function GradientSection({
  children,
  gradient = "white",
  className = "",
  id,
  ariaLabelledBy,
}: GradientSectionProps) {
  return (
    <section
      className={`${styles.gradientSection} ${styles[gradient]} ${className}`}
      id={id}
      aria-labelledby={ariaLabelledBy}
    >
      {children}
    </section>
  );
}

/* ==========================================================================
   Combined Section Transition
   ========================================================================== */

interface SectionTransitionProps {
  /** Type of transition */
  type?: "waveToWarm" | "waveToWhite" | "arcToWarm" | "arcToWhite" | "accentOnly";
  /** Custom fill color for waves */
  fillColor?: string;
  /** Show accent line */
  showAccent?: boolean;
  /** Accent line alignment */
  accentAlign?: "center" | "left" | "right";
  /** Additional className */
  className?: string;
}

/**
 * Section Transition
 * A combined component for common transition patterns
 */
export function SectionTransition({
  type = "waveToWarm",
  fillColor,
  showAccent = false,
  accentAlign = "center",
  className = "",
}: SectionTransitionProps) {
  const defaultColors = {
    waveToWarm: "#FFF7F1",
    waveToWhite: "#FFFFFF",
    arcToWarm: "#FFF7F1",
    arcToWhite: "#FFFFFF",
    accentOnly: undefined,
  };

  const color = fillColor || defaultColors[type];

  return (
    <div className={`${styles.transitionWrapper} ${className}`} aria-hidden="true">
      {showAccent && <AccentLine align={accentAlign} className={styles.transitionAccent} />}

      {type === "waveToWarm" && <WaveDividerSoft fillColor={color} />}
      {type === "waveToWhite" && <WaveDividerSoft fillColor={color} />}
      {type === "arcToWarm" && <WaveDividerArc fillColor={color} />}
      {type === "arcToWhite" && <WaveDividerArc fillColor={color} />}
    </div>
  );
}

/* ==========================================================================
   Exports
   ========================================================================== */

export default {
  WaveDividerSoft,
  WaveDividerArc,
  WaveDividerOrganic,
  AccentLine,
  GradientSection,
  SectionTransition,
};
