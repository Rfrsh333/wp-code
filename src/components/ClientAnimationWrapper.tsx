"use client";

import { ReactNode } from "react";
import FadeIn from "@/components/animations/FadeIn";

interface ClientAnimationWrapperProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right" | "none";
  delay?: number;
  duration?: number;
}

/**
 * Client-side wrapper voor FadeIn animaties
 * Gebruikt in server components om animaties te behouden
 */
export default function ClientAnimationWrapper({
  children,
  direction = "up",
  delay = 0,
  duration = 0.6,
}: ClientAnimationWrapperProps) {
  return (
    <FadeIn direction={direction} delay={delay} duration={duration}>
      {children}
    </FadeIn>
  );
}
