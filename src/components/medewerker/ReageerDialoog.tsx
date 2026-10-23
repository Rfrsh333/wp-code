"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, Clock, Euro, Shirt, X } from "lucide-react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import {
  AUTO_INTREKKEN_OPTIES,
  binnenDienst,
  geschatteVerdiensten,
  intrekMoment,
  korteTijd,
  medewerkerTariefVanDienst,
  MOTIVATIE_MAX,
  tegenbodAdvies,
  type AutoIntrekkenUren,
} from "@/lib/medewerker/reactie-regels";
import { ANNULEER_GRENS_UREN } from "@/lib/medewerker/dienst-regels";

/**
 * Reageren op een dienst in het medewerkerportaal (uitgebreid reageren, zelfde opties als de app):
 * hele dienst of eigen tijden, eigen uurtarief (tegenbod), motivatie, akkoord kledingvoorschrift en
 * automatisch intrekken. De server controleert alles opnieuw (lib/medewerker/reactie-regels.ts).
 */

export type ReageerDienst = {
  id: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  locatie: string;
  functie?: string | null;
  opmerkingen?: string | null;
  kledingvoorschrift?: string | null;
  pauze_minuten?: number | null;
  /** Klanttarief van de dienst; de medewerker krijgt standaard dit min € 4. */
  uurtarief: number;
  medewerker_uurtarief?: number;
  klant: { bedrijfsnaam: string };
};

const euro = (n: number) => `€ ${n.toFixed(2).replace(".", ",")}`;
const bedragTekst = (n: number) => n.toFixed(2).replace(".", ",");
const parseBedrag = (t: string) => (t.trim() ? Number(t.trim().replace(",", ".")) : NaN);

function datumLang(datum: string) {
  return new Date(`${datum}T12:00:00Z`).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

export default function ReageerDialoog({
  dienst,
  onSluit,
  onVerstuurd,
  onChecklistOnvolledig,
}: {
  dienst: ReageerDienst;
  onSluit: () => void;
  onVerstuurd: () => void;
  /** B1: de checklist is niet compleet; de ouder ververst het checklistblok. */
  onChecklistOnvolledig?: () => void;
}) {
  const titelId = useId();
  const dienstStart = korteTijd(dienst.start_tijd) ?? dienst.start_tijd.slice(0, 5);
  const dienstEind = korteTijd(dienst.eind_tijd) ?? dienst.eind_tijd.slice(0, 5);
  const basisTarief = dienst.medewerker_uurtarief ?? medewerkerTariefVanDienst(dienst.uurtarief);
  const voorschrift = dienst.kledingvoorschrift?.trim() || null;

  const [tijden, setTijden] = useState<"heel" | "eigen">("heel");
  const [start, setStart] = useState(dienstStart);
  const [eind, setEind] = useState(dienstEind);
  const [tarief, setTarief] = useState(bedragTekst(basisTarief));
  const [motivatie, setMotivatie] = useState("");
  const [kledingAkkoord, setKledingAkkoord] = useState(false);
  const [intrekken, setIntrekken] = useState(false);
  const [intrekUren, setIntrekUren] = useState<AutoIntrekkenUren>(24);
  const [bezig, setBezig] = useState(false);
  // Ref i.p.v. alleen state: een snelle dubbelklik komt vóór de re-render binnen.
  const verstuurtRef = useRef(false);

  useEffect(() => {
    const opEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !verstuurtRef.current) onSluit();
    };
    window.addEventListener("keydown", opEscape);
    return () => window.removeEventListener("keydown", opEscape);
  }, [onSluit]);

  const tariefGetal = parseBedrag(tarief);
  const tariefGeldig = Number.isFinite(tariefGetal) && tariefGetal > 0 && tariefGetal <= 1000;
  const advies = tariefGeldig ? tegenbodAdvies(tariefGetal, { functie: dienst.functie, dienstUurtarief: dienst.uurtarief }) : null;
  const eigenTijdenGeldig = tijden === "heel" || (!!korteTijd(start) && !!korteTijd(eind) && binnenDienst(dienstStart, dienstEind, start, eind));
  const motivatieTeLang = motivatie.trim().length > MOTIVATIE_MAX;

  // Alleen intrekmomenten die nog in de toekomst liggen (anders weigert de server ze). "Nu" één keer
  // bij openen vastleggen: de dialoog staat maar kort open en de server controleert opnieuw.
  const [geopendOp] = useState(() => Date.now());
  const intrekOpties = useMemo(
    () => AUTO_INTREKKEN_OPTIES.filter((u) => intrekMoment(dienst.datum, dienstStart, u).getTime() > geopendOp),
    [dienst.datum, dienstStart, geopendOp],
  );
  const gekozenIntrekUren: AutoIntrekkenUren | null = intrekOpties.includes(intrekUren) ? intrekUren : (intrekOpties[0] ?? null);

  const schatting = geschatteVerdiensten({
    start_tijd: tijden === "eigen" && eigenTijdenGeldig ? start : dienstStart,
    eind_tijd: tijden === "eigen" && eigenTijdenGeldig ? eind : dienstEind,
    pauze_minuten: dienst.pauze_minuten,
    uurtarief: tariefGeldig ? tariefGetal : basisTarief,
  });

  const kanVersturen = tariefGeldig && eigenTijdenGeldig && !motivatieTeLang && (!voorschrift || kledingAkkoord) && !bezig;

  const verstuur = async () => {
    if (verstuurtRef.current || !kanVersturen) return;
    verstuurtRef.current = true;
    setBezig(true);
    try {
      const res = await fetch("/api/medewerker/shifts/aanmelden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dienst_id: dienst.id,
          // Gelijk aan het tarief van de dienst = geen tegenbod (de server ziet dat ook zo).
          voorgesteld_uurtarief: Math.abs(tariefGetal - basisTarief) < 0.005 ? null : tariefGetal,
          voorgestelde_start_tijd: tijden === "eigen" ? start : null,
          voorgestelde_eind_tijd: tijden === "eigen" ? eind : null,
          motivatie: motivatie.trim() || null,
          kleding_akkoord: voorschrift ? kledingAkkoord : undefined,
          auto_intrekken_uren: intrekken ? gekozenIntrekUren : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Reageren mislukt");
        if (data.code === "checklist_onvolledig") {
          onChecklistOnvolledig?.();
          onSluit();
        }
        return;
      }
      toast.success("Reactie verstuurd! Je vindt hem bij Mijn diensten onder Aangemeld.");
      onVerstuurd();
      onSluit();
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Er ging iets mis");
    } finally {
      verstuurtRef.current = false;
      setBezig(false);
    }
  };

  const veld =
    "w-full px-3 py-2.5 rounded-xl bg-[var(--mp-bg)] border border-[var(--mp-separator)] text-base text-[var(--mp-text-primary)] focus:outline-none focus:border-[var(--mp-accent)]";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={() => !bezig && onSluit()}>
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
              Reageren op deze dienst
            </h2>
            <p className="text-xs text-[var(--mp-text-secondary)] truncate">
              {dienst.klant.bedrijfsnaam} · {datumLang(dienst.datum)} · {dienstStart}–{dienstEind}
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
          {/* Transparantie: reageren is een toezegging */}
          <div className="flex gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              Reageren is een toezegging: kiest de werkgever jou, dan rekent hij erop dat je komt. Afzeggen kan tot{" "}
              {ANNULEER_GRENS_UREN} uur voor de start; daarna blijf je ingepland tot er een vervanger is goedgekeurd.
            </p>
          </div>

          {/* Dienstdetails: pauze, kleding, opmerkingen */}
          <div className="space-y-1.5 text-sm text-[var(--mp-text-secondary)]">
            {dienst.functie && <p className="font-medium text-[var(--mp-text-primary)] capitalize">{dienst.functie} · {dienst.locatie}</p>}
            {dienst.pauze_minuten != null && (
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> {dienst.pauze_minuten > 0 ? `${dienst.pauze_minuten} minuten pauze (onbetaald)` : "Geen pauze"}
              </p>
            )}
            {voorschrift && (
              <p className="flex items-start gap-2">
                <Shirt className="w-4 h-4 mt-0.5 shrink-0" /> <span>Kledingvoorschrift: {voorschrift}</span>
              </p>
            )}
            {dienst.opmerkingen && <p className="rounded-xl bg-[var(--mp-bg)] p-3 text-[var(--mp-text-primary)]">{dienst.opmerkingen}</p>}
          </div>

          {/* Beschikbaarheid */}
          <fieldset>
            <legend className="text-sm font-semibold text-[var(--mp-text-primary)] mb-2">Wanneer kun je?</legend>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${tijden === "heel" ? "border-[var(--mp-accent)] bg-[var(--mp-accent)]/5" : "border-[var(--mp-separator)]"}`}>
                <input type="radio" name="tijden" checked={tijden === "heel"} onChange={() => setTijden("heel")} className="accent-[var(--mp-accent)]" />
                <span className="text-sm text-[var(--mp-text-primary)]">
                  Hele dienst ({dienstStart}–{dienstEind})
                </span>
              </label>
              <label className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${tijden === "eigen" ? "border-[var(--mp-accent)] bg-[var(--mp-accent)]/5" : "border-[var(--mp-separator)]"}`}>
                <input type="radio" name="tijden" checked={tijden === "eigen"} onChange={() => setTijden("eigen")} className="accent-[var(--mp-accent)]" />
                <span className="text-sm text-[var(--mp-text-primary)]">Eigen tijden voorstellen</span>
              </label>
            </div>
            {tijden === "eigen" && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${titelId}-start`} className="text-xs text-[var(--mp-text-secondary)] mb-1 block">Van</label>
                  <input id={`${titelId}-start`} type="time" value={start} onChange={(e) => setStart(e.target.value)} className={veld} />
                </div>
                <div>
                  <label htmlFor={`${titelId}-eind`} className="text-xs text-[var(--mp-text-secondary)] mb-1 block">Tot</label>
                  <input id={`${titelId}-eind`} type="time" value={eind} onChange={(e) => setEind(e.target.value)} className={veld} />
                </div>
                {!eigenTijdenGeldig && (
                  <p className="col-span-2 text-xs text-[var(--mp-danger)]" role="alert">
                    Kies tijden binnen de dienst ({dienstStart}–{dienstEind}), met de begintijd vóór de eindtijd.
                  </p>
                )}
              </div>
            )}
          </fieldset>

          {/* Uurtarief (tegenbod) */}
          <div>
            <label htmlFor={`${titelId}-tarief`} className="text-sm font-semibold text-[var(--mp-text-primary)] mb-1 block">
              Jouw uurtarief
            </label>
            <p className="text-xs text-[var(--mp-text-secondary)] mb-2">
              Wat jij per uur krijgt. Het tarief van deze dienst is {euro(basisTarief)}; je mag een ander bedrag voorstellen.
            </p>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mp-text-tertiary)]" />
              <input
                id={`${titelId}-tarief`}
                inputMode="decimal"
                value={tarief}
                onChange={(e) => setTarief(e.target.value)}
                className={`${veld} pl-9`}
                aria-describedby={`${titelId}-tarief-advies`}
              />
            </div>
            <div id={`${titelId}-tarief-advies`} aria-live="polite">
              {!tariefGeldig && <p className="mt-1.5 text-xs text-[var(--mp-danger)]">Vul een geldig bedrag in.</p>}
              {advies?.waarschuwing && <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">{advies.waarschuwing}</p>}
            </div>
          </div>

          {/* Motivatie */}
          <div>
            <label htmlFor={`${titelId}-motivatie`} className="text-sm font-semibold text-[var(--mp-text-primary)] mb-1 block">
              Waarom moet de werkgever jou kiezen? <span className="font-normal text-[var(--mp-text-tertiary)]">(optioneel)</span>
            </label>
            <textarea
              id={`${titelId}-motivatie`}
              value={motivatie}
              onChange={(e) => setMotivatie(e.target.value)}
              maxLength={MOTIVATIE_MAX}
              rows={3}
              placeholder="Bijv. je ervaring, waarom deze dienst je past of wanneer je er kunt zijn."
              className={`${veld} resize-none`}
            />
            <p className={`text-right text-[11px] ${motivatieTeLang ? "text-[var(--mp-danger)]" : "text-[var(--mp-text-tertiary)]"}`}>
              {motivatie.trim().length}/{MOTIVATIE_MAX}
            </p>
          </div>

          {/* Kledingvoorschrift */}
          {voorschrift && (
            <label className="flex items-start gap-3 rounded-xl border border-[var(--mp-separator)] p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={kledingAkkoord}
                onChange={(e) => setKledingAkkoord(e.target.checked)}
                className="mt-0.5 accent-[var(--mp-accent)]"
              />
              <span className="text-sm text-[var(--mp-text-primary)]">
                Ik ga akkoord met het kledingvoorschrift: <span className="font-medium">{voorschrift}</span>
              </span>
            </label>
          )}

          {/* Automatisch intrekken */}
          <div className="rounded-xl border border-[var(--mp-separator)] p-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm text-[var(--mp-text-primary)]">
                Reactie automatisch intrekken als ik niet op tijd gekozen ben
              </span>
              <input
                type="checkbox"
                role="switch"
                aria-checked={intrekken}
                checked={intrekken}
                disabled={intrekOpties.length === 0}
                onChange={(e) => setIntrekken(e.target.checked)}
                className="h-5 w-5 accent-[var(--mp-accent)]"
              />
            </label>
            {intrekOpties.length === 0 ? (
              <p className="mt-1 text-xs text-[var(--mp-text-tertiary)]">Deze dienst begint te snel om dit nog in te stellen.</p>
            ) : (
              intrekken && (
                <div className="mt-2 flex items-center gap-2 text-sm text-[var(--mp-text-secondary)]">
                  <span>Trek in als ik</span>
                  <select
                    aria-label="Aantal uur voor de start"
                    value={gekozenIntrekUren ?? ""}
                    onChange={(e) => setIntrekUren(Number(e.target.value) as AutoIntrekkenUren)}
                    className="rounded-lg border border-[var(--mp-separator)] bg-[var(--mp-bg)] px-2 py-1 text-[var(--mp-text-primary)]"
                  >
                    {intrekOpties.map((u) => (
                      <option key={u} value={u}>
                        {u} uur
                      </option>
                    ))}
                  </select>
                  <span>voor de start nog niet gekozen ben</span>
                </div>
              )
            )}
          </div>

          {/* ± Verdiensten */}
          <div className="flex items-center justify-between rounded-xl bg-[var(--mp-accent)]/10 p-3">
            <span className="text-xs text-[var(--mp-text-secondary)]">
              ± Verdiensten ({schatting.uren.toFixed(1).replace(".", ",")} uur{dienst.pauze_minuten ? ", pauze eraf" : ""})
            </span>
            <span className="text-sm font-bold text-[var(--mp-accent)]">{euro(schatting.bedrag)}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onSluit}
              disabled={bezig}
              className="flex-1 py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Annuleren
            </button>
            <button
              onClick={verstuur}
              disabled={!kanVersturen}
              aria-busy={bezig}
              className="flex-1 py-3 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm transition-all active:scale-[0.98] hover:bg-[var(--mp-accent-dark)] disabled:opacity-50"
            >
              {bezig ? "Bezig…" : "Reactie versturen"}
            </button>
          </div>
          {voorschrift && !kledingAkkoord && (
            <p className="text-center text-xs text-[var(--mp-text-tertiary)]">Ga eerst akkoord met het kledingvoorschrift.</p>
          )}
        </div>
      </div>
    </div>
  );
}
