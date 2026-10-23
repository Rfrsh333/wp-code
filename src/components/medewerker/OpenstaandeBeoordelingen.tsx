"use client";

import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import WerkgeverBeoordelenDialoog, { type TeBeoordelen } from "@/components/medewerker/WerkgeverBeoordelenDialoog";

/**
 * "Hoe was het?" boven de voltooide diensten (stap 4 "Vertrouwen zoals YoungOnes"): afgeronde diensten
 * van de laatste 14 dagen die je nog niet hebt beoordeeld (GET /api/medewerker/werkgever-beoordelingen).
 * Met `openDienstId` (uit de link in de herinnering, ?beoordeel=<dienst_id>) gaat het beoordeelscherm
 * van die dienst meteen open. Zolang de functie niet beschikbaar is (migratie) toont dit niets.
 */

type Openstaand = TeBeoordelen & { klant_id: string; beoordelen_tot: string };

function datumKort(datum: string) {
  return new Date(`${datum}T12:00:00Z`).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

export default function OpenstaandeBeoordelingen({
  openDienstId,
  onLinkGebruikt,
}: {
  openDienstId?: string | null;
  /** De ouder vergeet de link, zodat het scherm niet opnieuw opengaat na wisselen van tab. */
  onLinkGebruikt?: () => void;
}) {
  const [lijst, setLijst] = useState<Openstaand[]>([]);
  const [actief, setActief] = useState<Openstaand | null>(null);
  const [linkGebruikt, setLinkGebruikt] = useState(false);

  const laad = useCallback(async () => {
    try {
      const res = await fetch("/api/medewerker/werkgever-beoordelingen");
      if (!res.ok) return;
      const data = (await res.json()) as { beschikbaar?: boolean; openstaand?: Openstaand[] };
      setLijst(data.beschikbaar ? (data.openstaand ?? []) : []);
    } catch (err) {
      Sentry.captureException(err);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    laad();
  }, [laad]);

  // Link uit de herinnering: één keer openen, als die dienst nog te beoordelen is.
  useEffect(() => {
    if (linkGebruikt || !openDienstId || lijst.length === 0) return;
    const gevonden = lijst.find((d) => d.dienst_id === openDienstId);
    if (gevonden) setActief(gevonden);
    setLinkGebruikt(true);
    onLinkGebruikt?.();
  }, [linkGebruikt, openDienstId, lijst, onLinkGebruikt]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (lijst.length === 0 && !actief) return null;

  return (
    <>
      {lijst.length > 0 && (
        <section aria-labelledby="hoe-was-het" className="mb-4 rounded-[var(--mp-radius)] border border-[var(--mp-separator)] bg-[var(--mp-card)] p-4">
          <h2 id="hoe-was-het" className="text-sm font-semibold text-[var(--mp-text-primary)] flex items-center gap-2">
            <Star className="w-4 h-4 text-[#F27501] fill-[#F27501]" aria-hidden="true" />
            Hoe was het? Beoordeel je werkgever
          </h2>
          <p className="mt-1 text-xs text-[var(--mp-text-secondary)]">
            Andere medewerkers zien het gemiddelde. De werkgever ziet niet wie wat gaf.
          </p>
          <ul className="mt-3 divide-y divide-[var(--mp-separator)]">
            {lijst.map((d) => (
              <li key={d.aanmelding_id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--mp-text-primary)] truncate">{d.bedrijfsnaam}</p>
                  <p className="text-xs text-[var(--mp-text-secondary)] truncate">
                    {d.functie ? `${d.functie} · ` : ""}
                    {datumKort(d.datum)}
                  </p>
                </div>
                <button
                  onClick={() => setActief(d)}
                  className="shrink-0 rounded-xl bg-[#F27501] px-3 py-2 text-xs font-semibold text-[#1D1B19] transition-all active:scale-[0.98]"
                >
                  Beoordelen
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {actief && (
        <WerkgeverBeoordelenDialoog
          dienst={actief}
          onSluit={() => setActief(null)}
          onVerstuurd={(dienstId) => {
            setLijst((l) => l.filter((d) => d.dienst_id !== dienstId));
            setActief(null);
          }}
        />
      )}
    </>
  );
}
