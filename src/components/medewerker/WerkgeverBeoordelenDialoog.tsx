"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Lock, Star, X } from "lucide-react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { OPMERKING_MAX } from "@/lib/medewerker/werkgever-beoordeling-regels";
import { DEELSCORE_KOLOM, DEELSCORE_LABEL, DEELSCORES, type Deelscore } from "@/lib/werkgever-profiel-regels";

/**
 * Werkgever beoordelen na een afgeronde dienst (stap 4 "Vertrouwen zoals YoungOnes"): 1-5 sterren,
 * optioneel drie deelscores en een korte opmerking die alleen TopTalent leest. De server controleert
 * alles opnieuw (POST /api/medewerker/werkgever-beoordelingen).
 */

export type TeBeoordelen = {
  aanmelding_id: string;
  dienst_id: string;
  bedrijfsnaam: string;
  functie: string | null;
  datum: string;
};

const SCORE_WOORD = ["", "Slecht", "Matig", "Oké", "Goed", "Uitstekend"];

function datumLang(datum: string) {
  return new Date(`${datum}T12:00:00Z`).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

function SterrenKiezer({
  legenda,
  waarde,
  onKies,
  optioneel = false,
  groot = false,
}: {
  legenda: string;
  waarde: number | null;
  onKies: (n: number | null) => void;
  optioneel?: boolean;
  groot?: boolean;
}) {
  const naam = useId();
  const maat = groot ? "w-9 h-9" : "w-6 h-6";
  return (
    <fieldset className="space-y-1">
      <legend className={`${groot ? "text-sm font-semibold" : "text-sm"} text-[var(--mp-text-primary)]`}>
        {legenda}
        {optioneel && <span className="text-[var(--mp-text-tertiary)]"> (optioneel)</span>}
      </legend>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const aan = waarde != null && n <= waarde;
          return (
            <label key={n} className="cursor-pointer rounded-md p-0.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--mp-accent)]">
              <input
                type="radio"
                name={naam}
                value={n}
                checked={waarde === n}
                onChange={() => onKies(n)}
                className="sr-only"
              />
              <span className="sr-only">
                {n} {n === 1 ? "ster" : "sterren"}
              </span>
              <Star
                aria-hidden="true"
                className={`${maat} ${aan ? "text-[#F27501] fill-[#F27501]" : "text-[var(--mp-text-tertiary)]"}`}
              />
            </label>
          );
        })}
        {groot && waarde != null && <span className="ml-2 text-sm text-[var(--mp-text-secondary)]">{SCORE_WOORD[waarde]}</span>}
        {optioneel && waarde != null && (
          <button type="button" onClick={() => onKies(null)} className="ml-2 text-xs text-[var(--mp-text-secondary)] underline">
            Wissen
          </button>
        )}
      </div>
    </fieldset>
  );
}

export default function WerkgeverBeoordelenDialoog({
  dienst,
  onSluit,
  onVerstuurd,
}: {
  dienst: TeBeoordelen;
  onSluit: () => void;
  onVerstuurd: (dienstId: string) => void;
}) {
  const titelId = useId();
  const [score, setScore] = useState<number | null>(null);
  const [deel, setDeel] = useState<Record<Deelscore, number | null>>({ instructies: null, sfeer: null, zoals_beschreven: null });
  const [opmerking, setOpmerking] = useState("");
  const [bezig, setBezig] = useState(false);
  const verstuurtRef = useRef(false);

  useEffect(() => {
    const opEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !verstuurtRef.current) onSluit();
    };
    window.addEventListener("keydown", opEscape);
    return () => window.removeEventListener("keydown", opEscape);
  }, [onSluit]);

  const verstuur = async () => {
    if (score == null || verstuurtRef.current) return;
    verstuurtRef.current = true;
    setBezig(true);
    try {
      const body: Record<string, unknown> = { aanmelding_id: dienst.aanmelding_id, dienst_id: dienst.dienst_id, score };
      for (const d of DEELSCORES) body[DEELSCORE_KOLOM[d]] = deel[d];
      if (opmerking.trim()) body.opmerking = opmerking.trim();
      const res = await fetch("/api/medewerker/werkgever-beoordelingen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && data.code !== "al_beoordeeld") {
        toast.error(data.error || "Opslaan mislukt");
        return;
      }
      toast.success(data.code === "al_beoordeeld" ? "Je had deze dienst al beoordeeld." : "Bedankt voor je beoordeling!");
      onVerstuurd(dienst.dienst_id);
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Er ging iets mis");
    } finally {
      verstuurtRef.current = false;
      setBezig(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center" onClick={() => !bezig && onSluit()}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-[var(--mp-card)] rounded-t-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 bg-[var(--mp-card)] px-4 pt-4 pb-3 border-b border-[var(--mp-separator)]">
          <div className="min-w-0">
            <h2 id={titelId} className="text-lg font-bold text-[var(--mp-text-primary)]">
              Hoe was het bij {dienst.bedrijfsnaam}?
            </h2>
            <p className="text-xs text-[var(--mp-text-secondary)] truncate">
              {dienst.functie ? `${dienst.functie} · ` : ""}
              <span className="capitalize">{datumLang(dienst.datum)}</span>
            </p>
          </div>
          <button
            onClick={onSluit}
            disabled={bezig}
            aria-label="Sluiten"
            className="w-8 h-8 shrink-0 rounded-full bg-[var(--mp-bg)] flex items-center justify-center text-[var(--mp-text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] space-y-5">
          <SterrenKiezer legenda="Jouw oordeel over deze werkgever" waarde={score} onKies={setScore} groot />

          <div className="space-y-3">
            {DEELSCORES.map((d) => (
              <SterrenKiezer
                key={d}
                legenda={DEELSCORE_LABEL[d]}
                waarde={deel[d]}
                onKies={(n) => setDeel((v) => ({ ...v, [d]: n }))}
                optioneel
              />
            ))}
          </div>

          <div className="space-y-1">
            <label htmlFor={`${titelId}-opmerking`} className="block text-sm text-[var(--mp-text-primary)]">
              Opmerking voor TopTalent <span className="text-[var(--mp-text-tertiary)]">(optioneel)</span>
            </label>
            <textarea
              id={`${titelId}-opmerking`}
              value={opmerking}
              onChange={(e) => setOpmerking(e.target.value.slice(0, OPMERKING_MAX))}
              maxLength={OPMERKING_MAX}
              rows={3}
              className="w-full rounded-xl border border-[var(--mp-separator)] bg-[var(--mp-bg)] px-3 py-2 text-sm text-[var(--mp-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-accent)]"
            />
            <p className="flex items-start gap-1.5 text-xs text-[var(--mp-text-secondary)]">
              <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Alleen TopTalent leest je opmerking. De werkgever ziet alleen gemiddelden van alle medewerkers, nooit jouw naam.
                {opmerking.length > OPMERKING_MAX - 50 ? ` (${opmerking.length}/${OPMERKING_MAX})` : ""}
              </span>
            </p>
          </div>

          <button
            onClick={verstuur}
            disabled={score == null || bezig}
            className="w-full py-3 rounded-xl bg-[#F27501] text-[#1D1B19] font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {bezig ? "Bezig…" : score == null ? "Kies eerst 1 tot 5 sterren" : "Beoordeling versturen"}
          </button>
        </div>
      </div>
    </div>
  );
}
