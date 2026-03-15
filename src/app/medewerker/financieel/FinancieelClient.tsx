"use client";

import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import FinancieelOverzicht from "@/components/medewerker/FinancieelOverzicht";

export default function FinancieelClient() {
  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        <FinancieelOverzicht />
      </div>
    </MedewerkerResponsiveLayout>
  );
}
