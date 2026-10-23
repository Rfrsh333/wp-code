"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, Lock, Star, UserCheck } from "lucide-react";
import {
  DEELSCORE_LABEL,
  DEELSCORES,
  kiestBinnenTekst,
  scoreTekst,
  type WerkgeverProfielKern,
} from "@/lib/werkgever-profiel-regels";

/**
 * "Hoe medewerkers u beoordelen" (werkgeversportaal, Overzicht; stap 4 "Vertrouwen zoals YoungOnes").
 * Het profiel dat medewerkers bij uw diensten zien: gemiddelde, deelscores en kengetallen. Anoniem:
 * geen namen en geen opmerkingen (die leest alleen TopTalent). Onder 3 waarnemingen staat er
 * "Nog te weinig gegevens".
 */

type Profiel = WerkgeverProfielKern & { bedrijfsnaam: string };

function SterrenRij({ waarde }: { waarde: number }) {
  const vol = Math.round(waarde);
  return (
    <span className="inline-flex" role="img" aria-label={`${scoreTekst(waarde)} van 5 sterren`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={`w-5 h-5 ${i <= vol ? "text-[#F27501] fill-[#F27501]" : "text-neutral-300 fill-neutral-200"}`}
        />
      ))}
    </span>
  );
}

const teWeinig = <span className="text-neutral-500">Nog te weinig gegevens</span>;

export default function WerkgeverScoreKaart() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["klant", "werkgever-profiel"],
    queryFn: async (): Promise<Profiel> => {
      const res = await fetch("/api/klant/werkgever-profiel");
      if (!res.ok) throw new Error("Ophalen mislukt");
      return res.json();
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Zolang beoordelen nog niet aan staat (migratie niet gedraaid) is er niets over beoordelingen te zeggen.
  if (isLoading || isError || !data || !data.beoordelingen_beschikbaar) return null;
  const min = data.minimum_waarnemingen;
  const kiest = kiestBinnenTekst(data.kiest_binnen_uren);

  return (
    <section aria-labelledby="hoe-beoordeeld" className="rounded-2xl border border-[var(--kp-border)] bg-white p-5 shadow-sm space-y-4">
      <div>
        <h3 id="hoe-beoordeeld" className="text-base font-bold text-[var(--kp-text-primary)]">
          Hoe medewerkers u beoordelen
        </h3>
        <p className="mt-1 text-sm text-[var(--kp-text-secondary)]">
          Medewerkers zien dit bij uw diensten. Een score verschijnt vanaf {min} beoordelingen.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {data.gemiddelde != null ? (
          <>
            <span className="text-3xl font-bold text-[var(--kp-text-primary)]">{scoreTekst(data.gemiddelde)}</span>
            <SterrenRij waarde={data.gemiddelde} />
          </>
        ) : (
          <span className="text-sm">{teWeinig}</span>
        )}
        <span className="text-sm text-[var(--kp-text-secondary)]">
          {data.aantal} {data.aantal === 1 ? "beoordeling" : "beoordelingen"}
        </span>
      </div>

      <dl className="grid gap-2 sm:grid-cols-3">
        {DEELSCORES.map((d) => (
          <div key={d} className="rounded-xl bg-[var(--kp-bg-page)] px-3 py-2">
            <dt className="text-xs text-[var(--kp-text-secondary)]">{DEELSCORE_LABEL[d]}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-[var(--kp-text-primary)]">
              {data.deelscores[d] != null ? `${scoreTekst(data.deelscores[d] as number)} / 5` : teWeinig}
            </dd>
          </div>
        ))}
      </dl>

      <ul className="space-y-2 text-sm text-[var(--kp-text-secondary)]">
        <li className="flex items-start gap-2">
          <Clock className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Reacties beoordelen: {kiest ? <strong className="text-[var(--kp-text-primary)]">u kiest meestal {kiest}</strong> : teWeinig}
            <span className="block text-xs text-neutral-500">Mediaan over de laatste {data.periode_dagen} dagen.</span>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <UserCheck className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Iemand kiezen:{" "}
            {data.kies_percentage != null ? (
              <strong className="text-[var(--kp-text-primary)]">in {data.kies_percentage}% van uw diensten met reacties</strong>
            ) : (
              teWeinig
            )}
            <span className="block text-xs text-neutral-500">Afgelopen diensten, laatste {data.periode_dagen} dagen.</span>
          </span>
        </li>
      </ul>

      <p className="flex items-start gap-1.5 text-xs text-neutral-500">
        <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
        Beoordelingen zijn anoniem: u ziet geen namen en geen opmerkingen.
      </p>
    </section>
  );
}
