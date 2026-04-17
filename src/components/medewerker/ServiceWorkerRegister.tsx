"use client";

import SWUpdatePrompt from "@/components/shared/SWUpdatePrompt";

export default function ServiceWorkerRegister() {
  return (
    <SWUpdatePrompt
      swPath="/sw.js"
      swScope="/medewerker/"
      accentColor="#F27501"
    />
  );
}
