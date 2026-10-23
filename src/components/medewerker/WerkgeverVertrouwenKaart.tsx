"use client";

import { useId } from "react";
import { Clock, Star, UserCheck } from "lucide-react";
import {
  heeftKengetallen,
  kiestBinnenTekst,
  scoreTekst,
  type WerkgeverProfielCompact,
} from "@/lib/werkgever-profiel-regels";

/**
 * "Over deze werkgever" in het dienstdetail (stap 4 "Vertrouwen zoals YoungOnes"): sterren met het
 * aantal beoordelingen, en wat de werkgever gewoonlijk doet met reacties. Een kengetal onder het
 * minimum aantal waarnemingen is null en wordt niet getoond; is er niets, dan "Nog te weinig gegevens".
 * De betaaltermijn ontbreekt bewust: TopTalent legt geen betaaldatum van facturen vast.
 */
export default function WerkgeverVertrouwenKaart({
  bedrijfsnaam,
  profiel,
}: {
  bedrijfsnaam: string;
  profiel: WerkgeverProfielCompact | null | undefined;
}) {
  const titelId = useId();
  const kiest = kiestBinnenTekst(profiel?.kiest_binnen_uren);
  const regels: { icoon: typeof Clock; tekst: string }[] = [];
  if (kiest) regels.push({ icoon: Clock, tekst: `Kiest meestal ${kiest} na een reactie` });
  if (profiel?.kies_percentage != null) {
    regels.push({ icoon: UserCheck, tekst: `Kiest in ${profiel.kies_percentage}% van de diensten met reacties iemand` });
  }

  return (
    <section aria-labelledby={titelId} className="rounded-xl border border-[var(--mp-separator)] p-3 space-y-2">
      <h3 id={titelId} className="text-sm font-bold text-[var(--mp-text-primary)]">
        Over {bedrijfsnaam}
      </h3>
      {!heeftKengetallen(profiel) ? (
        <p className="text-sm text-[var(--mp-text-secondary)]">
          Nog te weinig gegevens over deze werkgever.
          {profiel && profiel.aantal > 0 ? ` (${profiel.aantal} ${profiel.aantal === 1 ? "beoordeling" : "beoordelingen"})` : ""}
        </p>
      ) : (
        <>
          {profiel?.gemiddelde != null ? (
            <p className="flex items-center gap-1.5 text-sm text-[var(--mp-text-primary)]">
              <Sterren waarde={profiel.gemiddelde} />
              <span className="font-semibold">{scoreTekst(profiel.gemiddelde)}</span>
              <span className="text-[var(--mp-text-secondary)]">
                · {profiel.aantal} {profiel.aantal === 1 ? "beoordeling" : "beoordelingen"} van medewerkers
              </span>
            </p>
          ) : (
            <p className="text-xs text-[var(--mp-text-tertiary)]">Nog te weinig beoordelingen voor een score.</p>
          )}
          {regels.length > 0 && (
            <ul className="space-y-1.5">
              {regels.map(({ icoon: Icoon, tekst }) => (
                <li key={tekst} className="flex items-start gap-2 text-sm text-[var(--mp-text-secondary)]">
                  <Icoon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{tekst}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/** Vijf sterren, gevuld naar het gemiddelde (afgerond op een halve ster), met tekstalternatief. */
export function Sterren({ waarde, grootte = "w-4 h-4" }: { waarde: number; grootte?: string }) {
  const half = Math.round(waarde * 2) / 2;
  return (
    <span className="inline-flex items-center" role="img" aria-label={`${scoreTekst(waarde)} van 5 sterren`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const vol = half >= i;
        const halfVol = !vol && half >= i - 0.5;
        return (
          <span key={i} className={`relative inline-block ${grootte}`} aria-hidden="true">
            <Star className={`absolute inset-0 ${grootte} text-[var(--mp-separator)] fill-[var(--mp-separator)]`} />
            {(vol || halfVol) && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: vol ? "100%" : "50%" }}>
                <Star className={`${grootte} text-[#F27501] fill-[#F27501]`} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
