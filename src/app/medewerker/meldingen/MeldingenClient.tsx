"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import MeldingenCentrum from "@/components/meldingen/MeldingenCentrum";

/** Meldingencentrum voor werknemers (stap 5): via de bel in de kop of Account → Meldingen. */
export default function MeldingenClient() {
  const router = useRouter();
  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
          <button
            type="button"
            // Via een deeplink (push, mail) is er geen vorige pagina: dan naar Ontdekken.
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/medewerker/shifts/"))}
            className="md:hidden flex items-center gap-2 text-[var(--mp-text-secondary)] mb-3 transition-opacity active:opacity-70"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
            <span className="text-sm font-medium">Terug</span>
          </button>
          <MeldingenCentrum rol="medewerker" />
        </div>
      </div>
    </MedewerkerResponsiveLayout>
  );
}
