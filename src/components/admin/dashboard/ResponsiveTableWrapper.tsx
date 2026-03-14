"use client";

import type { ReactNode } from "react";

interface ResponsiveTableWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper voor tabellen die op mobiel horizontaal scrollbaar zijn
 * met een subtiele gradient fade aan de rechterkant als indicator.
 */
export default function ResponsiveTableWrapper({ children }: ResponsiveTableWrapperProps) {
  return (
    <div className="relative">
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 md:overflow-x-visible">
        {children}
      </div>
      {/* Fade indicator op mobiel */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#f3f5f7] to-transparent md:hidden" />
    </div>
  );
}
