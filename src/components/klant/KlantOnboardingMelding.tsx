"use client";

import { useState } from "react";
import { useKlantAccount, type KlantOnboarding } from "@/hooks/queries/useKlantQueries";

/**
 * Melding over de onboarding van een zelf geregistreerde klant (lib/klant-onboarding.ts):
 * - e-mailadres nog niet bevestigd: diensten plaatsen kan nog niet, met "Nieuwe link sturen";
 * - nog niet gecontroleerd: de eerste dienst gaat eerst langs TopTalent (status in_controle).
 * Toont niets als alles in orde is of als de stand niet te laden is.
 */
export default function KlantOnboardingMelding({ plek }: { plek: "overzicht" | "aanvraag" }) {
  const { data } = useKlantAccount();
  const onboarding = (data?.onboarding ?? null) as KlantOnboarding | null;
  const email = (data?.account?.email as string | undefined) ?? "";
  const [stand, setStand] = useState<"klaar" | "bezig" | "verstuurd" | "fout">("klaar");
  const [fout, setFout] = useState("");

  if (!onboarding) return null;

  const stuurOpnieuw = async () => {
    setStand("bezig");
    try {
      const res = await fetch("/api/klant/email-bevestigen/opnieuw", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setStand("verstuurd");
      } else {
        setStand("fout");
        setFout(body.error || "Versturen mislukt.");
      }
    } catch {
      setStand("fout");
      setFout("Geen verbinding. Probeer het opnieuw.");
    }
  };

  if (!onboarding.email_bevestigd) {
    return (
      <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Bevestig uw e-mailadres</p>
        <p className="mt-1">
          {plek === "aanvraag" ? "Personeel aanvragen kan zodra u uw e-mailadres heeft bevestigd. " : ""}
          We stuurden een bevestigingslink naar {email ? <strong>{email}</strong> : "uw e-mailadres"}. Geen mail ontvangen? Kijk ook in uw spam.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={stuurOpnieuw}
            disabled={stand === "bezig" || stand === "verstuurd"}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {stand === "bezig" ? "Versturen..." : stand === "verstuurd" ? "Nieuwe link verstuurd" : "Nieuwe link sturen"}
          </button>
          {stand === "fout" && <span className="text-xs text-red-700">{fout}</span>}
        </div>
      </div>
    );
  }

  if (!onboarding.gecontroleerd && plek === "aanvraag") {
    return (
      <div role="status" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold">Uw eerste dienst controleren we eerst</p>
        <p className="mt-1">
          Omdat u nieuw bent bij TopTalent, bekijken we uw eerste aanvraag kort voordat medewerkers hem zien. Daarna gaan
          al uw volgende diensten direct live.
        </p>
      </div>
    );
  }

  return null;
}
