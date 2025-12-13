"use client";

import styles from "./SectionDividers.module.css";

/* ==========================================================================
   Section Dividers - Clean Premium System

   Filosofie:
   - Geen zwevende decoratieve elementen
   - Curves alleen als natuurlijke overgang
   - Tinted sections fade naar wit aan beide kanten
   ========================================================================== */

/* ==========================================================================
   Curve Divider - Alleen waar nodig
   ========================================================================== */

interface CurveDividerProps {
  /** Fill color (must match next section's top color) */
  fill?: string;
  /** Height in pixels (40-70px recommended) */
  height?: number;
  /** Position: top of section or bottom */
  position?: "top" | "bottom";
  /** Additional className */
  className?: string;
}

/**
 * Subtle Curve Divider
 * Use sparingly - only between sections that need visual separation
 */
export function CurveDivider({
  fill = "#FFF7F1",
  height = 50,
  position = "bottom",
  className = "",
}: CurveDividerProps) {
  const isTop = position === "top";

  return (
    <div
      className={`${styles.curveDivider} ${isTop ? styles.curveTop : styles.curveBottom} ${className}`}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 50"
        fill="none"
        preserveAspectRatio="none"
        className={styles.curveSvg}
      >
        {isTop ? (
          // Curve at TOP of section (previous section flows into this)
          <path d="M0 0V25C360 50 1080 50 1440 25V0H0Z" fill={fill} />
        ) : (
          // Curve at BOTTOM of section (flows into next section)
          <path d="M0 50V25C360 0 1080 0 1440 25V50H0Z" fill={fill} />
        )}
      </svg>
    </div>
  );
}

/* ==========================================================================
   Accent Underline - Use INSIDE sections, under headings
   ========================================================================== */

interface AccentUnderlineProps {
  /** Width in pixels */
  width?: number;
  /** Color */
  color?: string;
  /** Additional className */
  className?: string;
}

/**
 * Accent Underline
 * Use directly under eyebrow or headline text, NOT as section separator
 */
export function AccentUnderline({
  width = 48,
  color = "#F97316",
  className = "",
}: AccentUnderlineProps) {
  return (
    <div
      className={`${styles.accentUnderline} ${className}`}
      style={{ width: `${width}px`, backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

/* ==========================================================================
   Exports
   ========================================================================== */

export default {
  CurveDivider,
  AccentUnderline,
};
