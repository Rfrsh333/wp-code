"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, Search, X } from "lucide-react";
import ShiftCard from "@/components/medewerker/ShiftCard";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import ReageerChecklistBlok from "@/components/medewerker/ReageerChecklistBlok";
import ReageerDialoog from "@/components/medewerker/ReageerDialoog";
import DienstDetailSheet from "@/components/medewerker/DienstDetailSheet";
import { MAX_AFSTAND_OPTIES_KM } from "@/lib/locatie/locatie-regels";
import type { OntdekSortering } from "@/lib/medewerker/ontdekken-regels";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

interface Shift {
  id: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  locatie: string;
  omschrijving?: string;
  uurtarief: number;
  plekken_beschikbaar: number;
  plekken_totaal: number;
  klant_id?: string | null;
  klant: {
    id?: string | null;
    bedrijfsnaam: string;
    bedrijf_foto_url?: string;
    rating?: number;
  };
  tags?: string[];
  is_speciaal?: boolean;
  functie?: string | null;
  opmerkingen?: string | null;
  kledingvoorschrift?: string | null;
  pauze_minuten?: number | null;
  medewerker_uurtarief?: number;
  afstand_km?: number | null;
  aantal_reacties?: number;
  werkgever_favoriet?: boolean;
  ik_ben_favoriet?: boolean;
}

type Antwoord = {
  shifts?: Shift[];
  filters?: { genegeerd?: string[] };
  mijn_locatie?: { bekend: boolean; postcode_ingevuld: boolean };
  werkgever_voorkeuren_beschikbaar?: boolean;
  aantal_verborgen?: number;
};

/** Filters van Ontdekken; de server past ze toe (GET /api/medewerker/shifts/beschikbaar). */
type Filters = {
  sortering: OntdekSortering;
  maxAfstandKm: number | null;
  minUurtarief: string;
  favorieteWerkgevers: boolean;
  waarIkFavorietBen: boolean;
};

const GEEN_FILTERS: Filters = { sortering: "datum", maxAfstandKm: null, minUurtarief: "", favorieteWerkgevers: false, waarIkFavorietBen: false };
const OPSLAG = "tt-ontdekken-filters";

function leesOpgeslagen(): Filters {
  try {
    const ruw = window.localStorage.getItem(OPSLAG);
    return ruw ? { ...GEEN_FILTERS, ...(JSON.parse(ruw) as Partial<Filters>) } : GEEN_FILTERS;
  } catch {
    return GEEN_FILTERS;
  }
}

function bewaar(f: Filters) {
  try {
    window.localStorage.setItem(OPSLAG, JSON.stringify(f));
  } catch {
    // Privévenster of geblokkeerde opslag: filters gelden dan alleen voor deze sessie.
  }
}

function naarQuery(f: Filters): string {
  const q = new URLSearchParams();
  if (f.sortering !== "datum") q.set("sortering", f.sortering);
  if (f.maxAfstandKm != null) q.set("max_afstand_km", String(f.maxAfstandKm));
  const tarief = Number(f.minUurtarief.replace(",", "."));
  if (f.minUurtarief.trim() && Number.isFinite(tarief) && tarief > 0) q.set("min_uurtarief", String(tarief));
  if (f.favorieteWerkgevers) q.set("alleen_favoriete_werkgevers", "1");
  if (f.waarIkFavorietBen) q.set("waar_ik_favoriet_ben", "1");
  const s = q.toString();
  return s ? `?${s}` : "";
}

function aantalActief(f: Filters): number {
  return (
    (f.sortering !== "datum" ? 1 : 0) +
    (f.maxAfstandKm != null ? 1 : 0) +
    (f.minUurtarief.trim() ? 1 : 0) +
    (f.favorieteWerkgevers ? 1 : 0) +
    (f.waarIkFavorietBen ? 1 : 0)
  );
}

function Schakel({ label, sub, aan, onWissel }: { label: string; sub?: string; aan: boolean; onWissel: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={aan}
      onClick={onWissel}
      className="w-full flex items-center justify-between gap-3 py-2.5 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--mp-text-primary)]">{label}</span>
        {sub && <span className="block text-xs text-[var(--mp-text-tertiary)]">{sub}</span>}
      </span>
      <span className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${aan ? "bg-[var(--mp-accent)]" : "bg-[var(--mp-separator)]"}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${aan ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}

export default function OntdekkenClient() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedShifts, setSavedShifts] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [checklistVersie, setChecklistVersie] = useState(0);
  // Uitgebreid reageren: de dialoog met tijden, tarief, motivatie, kleding en intrekken.
  const [reageerOp, setReageerOp] = useState<Shift | null>(null);
  const [detail, setDetail] = useState<Shift | null>(null);
  const [filters, setFilters] = useState<Filters>(GEEN_FILTERS);
  const [concept, setConcept] = useState<Filters>(GEEN_FILTERS);
  const [geladenFilters, setGeladenFilters] = useState(false);
  const [zoek, setZoek] = useState("");
  const [meta, setMeta] = useState<Omit<Antwoord, "shifts">>({});

  // Opgeslagen filters pas na het eerste renderen lezen (geen verschil tussen server en browser).
  useEffect(() => {
    setFilters(leesOpgeslagen());
    setGeladenFilters(true);
  }, []);

  const fetchShifts = useCallback(async (f: Filters) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/medewerker/shifts/beschikbaar${naarQuery(f)}`);
      if (!res.ok) {
        toast.error("Shifts ophalen mislukt");
        return;
      }
      const data = (await res.json()) as Antwoord;
      setShifts(data.shifts || []);
      setMeta({
        filters: data.filters,
        mijn_locatie: data.mijn_locatie,
        werkgever_voorkeuren_beschikbaar: data.werkgever_voorkeuren_beschikbaar,
        aantal_verborgen: data.aantal_verborgen,
      });
      // Detail open? Dan de verse gegevens tonen (of sluiten als de dienst weg is).
      setDetail((d) => (d ? (data.shifts || []).find((s) => s.id === d.id) ?? null : d));
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Er ging iets mis");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (geladenFilters) void fetchShifts(filters);
  }, [filters, geladenFilters, fetchShifts]);

  const zichtbaar = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    if (!term) return shifts;
    return shifts.filter((s) =>
      [s.klant.bedrijfsnaam, s.locatie, s.functie].some((v) => typeof v === "string" && v.toLowerCase().includes(term)),
    );
  }, [shifts, zoek]);

  const handleApply = (shiftId: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (shift) setReageerOp(shift);
  };

  const handleSave = (shiftId: string) => {
    setSavedShifts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(shiftId)) {
        newSet.delete(shiftId);
        toast.success("Shift verwijderd uit opgeslagen");
      } else {
        newSet.add(shiftId);
        toast.success("Shift opgeslagen");
      }
      return newSet;
    });
  };

  const klantVan = (s: Shift) => s.klant_id ?? s.klant.id ?? null;

  /** Werkgever bewaren (aan) of niet meer bewaren (uit). */
  const zetFavoriet = async (s: Shift, aan: boolean): Promise<boolean> => {
    const klantId = klantVan(s);
    if (!klantId) return false;
    try {
      const res = aan
        ? await fetch("/api/medewerker/werkgevers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ soort: "favoriet", klant_id: klantId }),
          })
        : await fetch(`/api/medewerker/werkgevers?klant_id=${encodeURIComponent(klantId)}&soort=favoriet`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Opslaan mislukt");
        return false;
      }
      toast.success(aan ? `${s.klant.bedrijfsnaam} bewaard bij je favoriete werkgevers` : "Niet meer bewaard");
      setShifts((lijst) => lijst.map((x) => (klantVan(x) === klantId ? { ...x, werkgever_favoriet: aan } : x)));
      setDetail((d) => (d && klantVan(d) === klantId ? { ...d, werkgever_favoriet: aan } : d));
      return true;
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Er ging iets mis");
      return false;
    }
  };

  const verbergWerkgever = async (s: Shift): Promise<boolean> => {
    const klantId = klantVan(s);
    if (!klantId) return false;
    try {
      const res = await fetch("/api/medewerker/werkgevers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soort: "verborgen", klant_id: klantId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Verbergen mislukt");
        return false;
      }
      toast.success(`${s.klant.bedrijfsnaam} is verborgen. Terugzetten kan onder Account → Werkgevers.`);
      setShifts((lijst) => lijst.filter((x) => klantVan(x) !== klantId));
      return true;
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Er ging iets mis");
      return false;
    }
  };

  const openFilters = () => {
    setConcept(filters);
    setFilterOpen(true);
  };

  const pasToe = (f: Filters) => {
    setFilters(f);
    bewaar(f);
    setFilterOpen(false);
  };

  const actief = aantalActief(filters);
  const locatieBekend = meta.mijn_locatie?.bekend ?? false;
  const voorkeurenAan = meta.werkgever_voorkeuren_beschikbaar ?? false;
  const afstandGenegeerd = meta.filters?.genegeerd?.includes("max_afstand_km") || (filters.sortering === "afstand" && !locatieBekend);

  return (
    <MedewerkerResponsiveLayout>
    <div className="min-h-screen bg-[var(--mp-bg)]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[var(--mp-card)] border-b border-[var(--mp-separator)]">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-[var(--mp-text-primary)]">
              Ontdekken
            </h1>
            <button
              onClick={openFilters}
              className="relative w-10 h-10 rounded-xl bg-[var(--mp-bg)] flex items-center justify-center transition-colors active:scale-95"
              aria-label={actief ? `Filters (${actief} actief)` : "Filters"}
            >
              <SlidersHorizontal className="w-5 h-5 text-[var(--mp-text-primary)]" />
              {actief > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[var(--mp-accent)] text-white text-[10px] font-bold flex items-center justify-center">
                  {actief}
                </span>
              )}
            </button>
          </div>

          {/* Zoeken: in de opgehaalde diensten (bedrijf, locatie, functie) */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--mp-text-tertiary)]" />
            <input
              type="search"
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
              placeholder="Zoek op locatie, bedrijf of functie..."
              aria-label="Zoek in open diensten"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] border border-transparent focus:border-[var(--mp-accent)] focus:outline-none transition-colors"
            />
          </div>

          {/* Snelle filters */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5 -mx-1 px-1">
            {voorkeurenAan && (
              <button
                onClick={() => pasToe({ ...filters, favorieteWerkgevers: !filters.favorieteWerkgevers })}
                aria-pressed={filters.favorieteWerkgevers}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${filters.favorieteWerkgevers ? "bg-[var(--mp-accent)] text-white border-transparent" : "border-[var(--mp-separator)] text-[var(--mp-text-primary)]"}`}
              >
                Favoriete werkgevers
              </button>
            )}
            <button
              onClick={() => pasToe({ ...filters, waarIkFavorietBen: !filters.waarIkFavorietBen })}
              aria-pressed={filters.waarIkFavorietBen}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${filters.waarIkFavorietBen ? "bg-[var(--mp-accent)] text-white border-transparent" : "border-[var(--mp-separator)] text-[var(--mp-text-primary)]"}`}
            >
              Waar ik favoriet ben
            </button>
            {actief > 0 && (
              <button
                onClick={() => pasToe(GEEN_FILTERS)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--mp-text-secondary)] flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Wis filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* B1: checklist vóór reageren */}
      <div className="px-4 pt-4 empty:hidden">
        <ReageerChecklistBlok verversSleutel={checklistVersie} />
      </div>

      {afstandGenegeerd && !loading && (
        <div className="px-4 pt-4">
          <p className="rounded-xl bg-[var(--mp-card)] p-3 text-sm text-[var(--mp-text-secondary)]">
            Op afstand filteren en sorteren kan pas als we je postcode kennen.{" "}
            <Link href="/medewerker/profiel" className="font-semibold text-[var(--mp-accent)]">
              Vul je postcode in
            </Link>
            .
          </p>
        </div>
      )}

      {/* Shifts Feed */}
      <div className="px-4 pt-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : zichtbaar.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[var(--mp-bg)] mx-auto mb-4 flex items-center justify-center">
              <Search className="w-8 h-8 text-[var(--mp-text-tertiary)]" />
            </div>
            <p className="text-[var(--mp-text-secondary)] text-sm">
              {actief > 0 || zoek.trim() ? "Geen diensten met deze filters" : "Geen shifts beschikbaar op dit moment"}
            </p>
            {actief > 0 && (
              <button onClick={() => pasToe(GEEN_FILTERS)} className="mt-3 text-sm font-semibold text-[var(--mp-accent)]">
                Filters wissen
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {zichtbaar.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                onApply={handleApply}
                onOpen={(id) => setDetail(shifts.find((s) => s.id === id) ?? null)}
                onSave={handleSave}
                saved={savedShifts.has(shift.id)}
                bezig={reageerOp?.id === shift.id}
              />
            ))}
          </div>
        )}
        {!loading && (meta.aantal_verborgen ?? 0) > 0 && (
          <p className="mt-4 text-center text-xs text-[var(--mp-text-tertiary)]">
            {meta.aantal_verborgen === 1 ? "1 dienst" : `${meta.aantal_verborgen} diensten`} van verborgen werkgevers niet getoond.{" "}
            <Link href="/medewerker/werkgevers" className="font-semibold text-[var(--mp-accent)]">
              Beheren
            </Link>
          </p>
        )}
      </div>

      {detail && !reageerOp && (
        <DienstDetailSheet
          dienst={detail}
          voorkeurenBeschikbaar={voorkeurenAan}
          onSluit={() => setDetail(null)}
          onReageer={() => {
            setReageerOp(detail);
            setDetail(null);
          }}
          onFavoriet={(aan) => zetFavoriet(detail, aan)}
          onVerberg={() => verbergWerkgever(detail)}
        />
      )}

      {reageerOp && (
        <ReageerDialoog
          dienst={reageerOp}
          onSluit={() => setReageerOp(null)}
          onVerstuurd={() => void fetchShifts(filters)}
          onChecklistOnvolledig={() => setChecklistVersie((v) => v + 1)}
        />
      )}

      {/* Filterblad */}
      {filterOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/50"
          onClick={() => setFilterOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute bottom-0 left-0 right-0 sm:left-auto sm:right-4 sm:bottom-4 sm:w-[28rem] bg-[var(--mp-card)] rounded-t-[var(--mp-radius)] sm:rounded-[var(--mp-radius)] max-h-[90vh] overflow-y-auto animate-sheet-up safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-2 pb-4">
              <div className="w-12 h-1 rounded-full bg-[var(--mp-separator)]" />
            </div>

            <div className="px-4 pb-6">
              <h2 className="text-xl font-bold text-[var(--mp-text-primary)] mb-4">
                Filters
              </h2>

              <div className="space-y-6 mb-6">
                <div>
                  <div className="text-sm font-semibold text-[var(--mp-text-primary)] mb-2">Sorteren op</div>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Sorteren op">
                    {([
                      ["datum", "Datum"],
                      ["tarief", "Uurtarief"],
                      ["afstand", "Afstand"],
                    ] as const).map(([waarde, label]) => (
                      <button
                        key={waarde}
                        role="radio"
                        aria-checked={concept.sortering === waarde}
                        onClick={() => setConcept({ ...concept, sortering: waarde })}
                        className={`py-2.5 rounded-xl text-sm font-semibold border ${concept.sortering === waarde ? "bg-[var(--mp-accent)] text-white border-transparent" : "border-[var(--mp-separator)] text-[var(--mp-text-primary)]"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-[var(--mp-text-primary)] mb-1">Snelle filters</div>
                  <div className="divide-y divide-[var(--mp-separator)]">
                    {voorkeurenAan && (
                      <Schakel
                        label="Alleen favoriete werkgevers"
                        sub="Werkgevers die je hebt bewaard"
                        aan={concept.favorieteWerkgevers}
                        onWissel={() => setConcept({ ...concept, favorieteWerkgevers: !concept.favorieteWerkgevers })}
                      />
                    )}
                    <Schakel
                      label="Waar ik favoriet ben"
                      sub="Werkgevers die jou in hun favorieten hebben"
                      aan={concept.waarIkFavorietBen}
                      onWissel={() => setConcept({ ...concept, waarIkFavorietBen: !concept.waarIkFavorietBen })}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="filter-afstand" className="block text-sm font-semibold text-[var(--mp-text-primary)] mb-2">
                    Maximale afstand
                  </label>
                  <select
                    id="filter-afstand"
                    value={concept.maxAfstandKm ?? ""}
                    onChange={(e) => setConcept({ ...concept, maxAfstandKm: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] border border-[var(--mp-separator)] focus:border-[var(--mp-accent)] focus:outline-none"
                  >
                    <option value="">Geen grens</option>
                    {MAX_AFSTAND_OPTIES_KM.map((km) => (
                      <option key={km} value={km}>
                        Binnen {km} km
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-[var(--mp-text-tertiary)]">
                    Hemelsbreed, vanaf het midden van je postcodegebied.
                    {!locatieBekend && " Vul eerst je postcode in bij Persoonlijke gegevens."}
                  </p>
                </div>

                <div>
                  <label htmlFor="filter-tarief" className="block text-sm font-semibold text-[var(--mp-text-primary)] mb-2">
                    Minimaal uurtarief (wat jij krijgt)
                  </label>
                  <input
                    id="filter-tarief"
                    type="text"
                    inputMode="decimal"
                    value={concept.minUurtarief}
                    onChange={(e) => setConcept({ ...concept, minUurtarief: e.target.value.replace(/[^0-9.,]/g, "").slice(0, 6) })}
                    placeholder="Bijv. 16"
                    className="w-full px-4 py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] border border-[var(--mp-separator)] focus:border-[var(--mp-accent)] focus:outline-none"
                  />
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => pasToe(GEEN_FILTERS)}
                  className="flex-1 py-3.5 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] font-semibold text-sm transition-all active:scale-[0.98]"
                >
                  Wissen
                </button>
                <button
                  onClick={() => pasToe(concept)}
                  className="flex-1 py-3.5 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm transition-all active:scale-[0.98] hover:bg-[var(--mp-accent-dark)]"
                >
                  Toon diensten
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
    </MedewerkerResponsiveLayout>
  );
}
