"use client";

import SWUpdatePrompt from "@/components/shared/SWUpdatePrompt";

export default function RegisterSW() {
  return (
    <SWUpdatePrompt
      swPath="/sw-business.js"
      swScope="/klant/"
      accentColor="#1e3a5f"
    />
  );
}
