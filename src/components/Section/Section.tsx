"use client";

import React from "react";
import styles from "./Section.module.css";

/* =============================================================================
   SECTION COMPONENT - TopTalent Design System

   Usage:
   <Section variant="tinted" spacing="default" dividerBottom>
     <Section.Container>
       <Section.Header eyebrow="Onze Diensten" title="Wat wij bieden" accentLine />
       <YourContent />
     </Section.Container>
   </Section>
   ============================================================================= */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type SectionVariant =
  | "white"
  | "tinted"
  | "tintedDeep"
  | "gradientToWarm"
  | "gradientToWhite";

export type SectionSpacing = "none" | "small" | "default" | "large";

export interface SectionProps {
  children: React.ReactNode;
  variant?: SectionVariant;
  spacing?: SectionSpacing;
  dividerTop?: boolean;
  dividerBottom?: boolean;
  dividerColor?: string;
  className?: string;
  id?: string;
}

export interface ContainerProps {
  children: React.ReactNode;
  narrow?: boolean;
  className?: string;
}

export interface HeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  accentLine?: boolean;
  align?: "center" | "left";
  className?: string;
}

export interface AccentLineProps {
  align?: "center" | "left";
  className?: string;
}

// -----------------------------------------------------------------------------
// Color mapping for dividers
// -----------------------------------------------------------------------------
const variantColors: Record<SectionVariant, string> = {
  white: "#FFFFFF",
  tinted: "#FFF7F1",
  tintedDeep: "#FFF4EC",
  gradientToWarm: "#FFF7F1",
  gradientToWhite: "#FFFFFF",
};

// -----------------------------------------------------------------------------
// Curve Divider Components
// -----------------------------------------------------------------------------
function CurveDividerTop({ fillColor }: { fillColor: string }) {
  return (
    <div className={styles.dividerTop}>
      <svg
        className={styles.dividerSvg}
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,60 L0,30 Q300,0 600,30 T1200,30 L1200,60 Z"
          fill={fillColor}
        />
      </svg>
    </div>
  );
}

function CurveDividerBottom({ fillColor }: { fillColor: string }) {
  return (
    <div className={styles.dividerBottom}>
      <svg
        className={styles.dividerSvg}
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,0 L0,30 Q300,60 600,30 T1200,30 L1200,0 Z"
          fill={fillColor}
        />
      </svg>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Accent Line Component
// -----------------------------------------------------------------------------
export function AccentLine({ align = "center", className = "" }: AccentLineProps) {
  const alignClass = align === "center" ? styles.accentLineCenter : styles.accentLineLeft;
  return <span className={`${styles.accentLine} ${alignClass} ${className}`} />;
}

// -----------------------------------------------------------------------------
// Container Component
// -----------------------------------------------------------------------------
export function Container({ children, narrow = false, className = "" }: ContainerProps) {
  const containerClass = narrow ? styles.containerNarrow : styles.container;
  return <div className={`${containerClass} ${className}`}>{children}</div>;
}

// -----------------------------------------------------------------------------
// Header Component
// -----------------------------------------------------------------------------
export function Header({
  eyebrow,
  title,
  subtitle,
  accentLine = false,
  align = "center",
  className = ""
}: HeaderProps) {
  const alignStyle = align === "left" ? { textAlign: "left" as const } : {};

  return (
    <div className={`${styles.sectionHeader} ${className}`} style={alignStyle}>
      {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
      <h2 className={styles.title}>{title}</h2>
      {accentLine && <AccentLine align={align} />}
      {subtitle && <p className={styles.subtitle} style={{ marginTop: accentLine ? "1.5rem" : "0" }}>{subtitle}</p>}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Section Component
// -----------------------------------------------------------------------------
export function Section({
  children,
  variant = "white",
  spacing = "default",
  dividerTop = false,
  dividerBottom = false,
  dividerColor,
  className = "",
  id,
}: SectionProps) {
  // Get variant class
  const variantClass = {
    white: styles.sectionWhite,
    tinted: styles.sectionTinted,
    tintedDeep: styles.sectionTintedDeep,
    gradientToWarm: styles.sectionGradientToWarm,
    gradientToWhite: styles.sectionGradientToWhite,
  }[variant];

  // Get spacing class
  const spacingClass = {
    none: styles.spacingNone,
    small: styles.spacingSmall,
    default: styles.spacing,
    large: styles.spacingLarge,
  }[spacing];

  // Determine divider fill color
  const fillColor = dividerColor || variantColors[variant];

  return (
    <section
      id={id}
      className={`${styles.section} ${variantClass} ${spacingClass} ${className}`}
    >
      {dividerTop && <CurveDividerTop fillColor={fillColor} />}
      {children}
      {dividerBottom && <CurveDividerBottom fillColor={fillColor} />}
    </section>
  );
}

// Attach sub-components
Section.Container = Container;
Section.Header = Header;
Section.AccentLine = AccentLine;

export default Section;
