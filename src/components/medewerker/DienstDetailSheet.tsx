"use client";

import { useEffect, useId, useState } from "react";
import { Clock, EyeOff, Heart, MapPin, Shirt, Star, Users, X } from "lucide-react";
import { afstandLabel } from "@/lib/locatie/locatie-regels";
import { reactiesLabel } from "@/lib/medewerker/ontdekken-regels";
import { geschatteVerdiensten, medewerkerTariefVanDienst } from "@/lib/medewerker/reactie-regels";

/**
 * Dienstdetail in Ontdekken (medewerkerportaal, stap 3): alle gegevens van de dienst, de afstand,
 * het aantal reacties en de knoppen om de werkgever te bewaren of te verbergen. Reageren opent de
 * bestaande ReageerDialoog via `onReageer`.
 */

export type DetailDienst = {
  id: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  locatie: string;
  functie?: string | null;
  opmerkingen?: string | null;
  kledingvoorschrift?: string | null;
  pauze_minuten?: number | null;
  uurtarief: number;
  medewerker_uurtarief?: number;
  plekken_beschikbaar: number;
  plekken_totaal: number;
  klant_id?: string | null;
  klant: { bedrijfsnaam: string };
  afstand_km?: number | null;
  aantal_reacties?: number;
  werkgever_favoriet?: boolean;
  ik_ben_favoriet?: boolean;
};

const euro = (n: number) => `€ ${n.toFixed(2).replace(".", ",")}`;

function datumLang(datum: string) {
  return new Date(`${datum}T12:00:00Z`).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

export default function DienstDetailSheet({
  dienst,
  voorkeurenBeschikbaar,
  onSluit,
  onReageer,
  onFavoriet,
  onVerberg,
}: {
  dienst: DetailDienst;
  /** false zolang de migratie niet gedraaid is: knoppen voor bewaren/verbergen uit. */
  voorkeurenBeschikbaar: boolean;
  onSluit: () => void;
  onReageer: () => void;
  onFavoriet: (aan: boolean) => Promise<boolean>;
  onVerberg: () => Promise<boolean>;
}) {
  const titelId = useId();
  const [bezig, setBezig] = useState<"favoriet" | "verbergen" | null>(null);
  const [bevestigVerbergen, setBevestigVerbergen] = useState(false);

  useEffect(() => {
    const opEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSluit();
    };
    window.addEventListener("keydown", opEscape);
    return () => window.removeEventListener("keydown", opEscape);
  }, [onSluit]);

  const tarief = dienst.medewerker_uurtarief ?? medewerkerTariefVanDienst(dienst.uurtarief);
  const schatting = geschatteVerdiensten({
    start_tijd: dienst.start_tijd,
    eind_tijd: dienst.eind_tijd,
    pauze_minuten: dienst.pauze_minuten,
    uurtarief: tarief,
  });
  const afstand = afstandLabel(dienst.afstand_km);
  const reacties = reactiesLabel(dienst.aantal_reacties);
  const kanVoorkeur = voorkeurenBeschikbaar && !!dienst.klant_id;

  const wisselFavoriet = async () => {
    setBezig("favoriet");
    try {
      await onFavoriet(!dienst.werkgever_favoriet);
    } finally {
      setBezig(null);
    }
  };

  const verberg = async () => {
    setBezig("verbergen");
    try {
      if (await onVerberg()) onSluit();
    } finally {
      setBezig(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={onSluit}>
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
            <h2 id={titelId} className="text-lg font-bold text-[var(--mp-text-primary)] truncate">
              {dienst.klant.bedrijfsnaam}
            </h2>
            <p className="text-xs text-[var(--mp-text-secondary)] capitalize truncate">{dienst.functie || "Dienst"}</p>
          </div>
          <button
            onClick={onSluit}
            aria-label="Sluiten"
            className="w-8 h-8 shrink-0 rounded-full bg-[var(--mp-bg)] flex items-center justify-center text-[var(--mp-text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] space-y-4">
          {(dienst.ik_ben_favoriet || dienst.werkgever_favoriet) && (
            <div className="flex flex-wrap gap-2">
              {dienst.ik_ben_favoriet && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--mp-accent)]/10 text-[var(--mp-accent)] text-xs font-semibold">
                  <Star className="w-3.5 h-3.5" /> Jij staat bij deze werkgever in de favorieten
                </span>
              )}
              {dienst.werkgever_favoriet && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--mp-bg)] text-[var(--mp-text-primary)] text-xs font-semibold">
                  <Heart className="w-3.5 h-3.5 fill-current" /> Jouw favoriete werkgever
                </span>
              )}
            </div>
          )}

          <div className="space-y-2 text-sm text-[var(--mp-text-secondary)]">
            <p className="flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                <span className="capitalize">{datumLang(dienst.datum)}</span> · {dienst.start_tijd.slice(0, 5)}–{dienst.eind_tijd.slice(0, 5)}
                {dienst.pauze_minuten ? ` · ${dienst.pauze_minuten} min pauze (onbetaald)` : ""}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {dienst.locatie || "Locatie volgt"}
                {afstand && <span className="block text-xs text-[var(--mp-text-tertiary)]">{afstand}</span>}
              </span>
            </p>
            {dienst.kledingvoorschrift && (
              <p className="flex items-start gap-2">
                <Shirt className="w-4 h-4 mt-0.5 shrink-0" /> <span>{dienst.kledingvoorschrift}</span>
              </p>
            )}
            <p className="flex items-start gap-2">
              <Users className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {dienst.plekken_beschikbaar} van {dienst.plekken_totaal} {dienst.plekken_totaal === 1 ? "plek" : "plekken"} vrij
                {reacties ? ` · ${reacties}` : " · nog geen reacties"}
              </span>
            </p>
          </div>

          {dienst.opmerkingen && (
            <p className="text-sm text-[var(--mp-text-primary)] whitespace-pre-line rounded-xl bg-[var(--mp-bg)] p-3">{dienst.opmerkingen}</p>
          )}

          <div className="rounded-xl bg-[var(--mp-bg)] p-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-[var(--mp-text-tertiary)]">Jij krijgt per uur</div>
              <div className="text-base font-bold text-[var(--mp-text-primary)]">{euro(tarief)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[var(--mp-text-tertiary)]">± verdiensten ({schatting.uren.toFixed(1)} u)</div>
              <div className="text-base font-bold text-[var(--mp-accent)]">{euro(schatting.bedrag)}</div>
            </div>
          </div>

          {kanVoorkeur && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={wisselFavoriet}
                disabled={bezig !== null}
                aria-pressed={!!dienst.werkgever_favoriet}
                className="py-2.5 rounded-xl border border-[var(--mp-separator)] text-sm font-semibold text-[var(--mp-text-primary)] flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Heart className={`w-4 h-4 ${dienst.werkgever_favoriet ? "fill-[var(--mp-accent)] text-[var(--mp-accent)]" : ""}`} />
                {dienst.werkgever_favoriet ? "Bewaard" : "Werkgever bewaren"}
              </button>
              <button
                onClick={() => setBevestigVerbergen(true)}
                disabled={bezig !== null}
                className="py-2.5 rounded-xl border border-[var(--mp-separator)] text-sm font-semibold text-[var(--mp-text-primary)] flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <EyeOff className="w-4 h-4" /> Verbergen
              </button>
            </div>
          )}

          {bevestigVerbergen && (
            <div className="rounded-xl border border-[var(--mp-separator)] p-3 space-y-3">
              <p className="text-sm text-[var(--mp-text-primary)]">
                Je ziet dan geen diensten meer van {dienst.klant.bedrijfsnaam} en krijgt er geen meldingen meer over. Terugzetten kan
                onder Account → Werkgevers.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setBevestigVerbergen(false)}
                  disabled={bezig !== null}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--mp-bg)] text-sm font-semibold text-[var(--mp-text-primary)]"
                >
                  Annuleren
                </button>
                <button
                  onClick={verberg}
                  disabled={bezig !== null}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--mp-danger)] text-white text-sm font-semibold disabled:opacity-50"
                >
                  {bezig === "verbergen" ? "Bezig…" : "Verberg werkgever"}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={onReageer}
            className="w-full py-3 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm transition-all active:scale-[0.98] hover:bg-[var(--mp-accent-dark)]"
          >
            Reageren
          </button>
        </div>
      </div>
    </div>
  );
}
