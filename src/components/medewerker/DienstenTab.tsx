"use client";

import { useState, useEffect } from "react";
import EmptyState from "@/components/ui/EmptyState";

interface Dienst {
  id: string;
  klant_naam: string;
  locatie: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  functie: string;
  uurtarief: number | null;
  afbeelding: string | null;
  status: string;
  aantal_nodig?: number;
  aangemeld?: boolean;
  aanmelding_id?: string;
  aanmelding_status?: string;
  uren_status?: string;
}

interface VervangingVerzoek {
  aanmelding_id: string;
  dienst_id: string;
  originele_aanmelding_id: string;
  naam: string;
  functie: string | string[];
  profile_photo_url: string | null;
}

interface DienstenTabProps {
  diensten: Dienst[];
  onAanmelden: (dienstId: string) => Promise<void> | void;
  onAfmelden: (dienstId: string) => Promise<void> | void;
  onUrenInvullen: (dienst: Dienst) => void;
  onAnnuleerGeaccepteerd?: (aanmeldingId: string, dienstId: string) => Promise<void> | void;
  onAcceptVervanging?: (origineleAanmeldingId: string, vervangingAanmeldingId: string) => Promise<void> | void;
  onAfwijsVervanging?: (vervangingAanmeldingId: string) => Promise<void> | void;
  vervangingVerzoeken?: VervangingVerzoek[];
  accountGepauzeerd?: boolean;
}

export default function DienstenTab({ diensten, onAanmelden, onAfmelden, onUrenInvullen, onAnnuleerGeaccepteerd, onAcceptVervanging, onAfwijsVervanging, vervangingVerzoeken = [], accountGepauzeerd }: DienstenTabProps) {
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });

  const [vervangingModal, setVervangingModal] = useState<{ aanmeldingId: string; dienstId: string } | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()));
  }, [diensten]);

  const beschikbareDiensten = diensten.filter((d) => !d.aangemeld);
  const mijnAanmeldingen = diensten.filter((d) => d.aangemeld);

  const getUrenTotStart = (dienst: Dienst) => {
    const start = new Date(`${dienst.datum}T${dienst.start_tijd}`);
    return (start.getTime() - now) / (1000 * 60 * 60);
  };

  const getStatusBadge = (dienst: Dienst) => {
    if (dienst.aanmelding_status === "vervanging_gezocht") return { label: "Vervanging gezocht", classes: "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400" };
    if (dienst.aanmelding_status === "vervangen") return { label: "Vervangen", classes: "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400" };
    if (dienst.aanmelding_status === "geaccepteerd") return { label: "Geaccepteerd", classes: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" };
    if (dienst.aanmelding_status === "afgewezen") return { label: "Afgewezen", classes: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400" };
    if (dienst.aanmelding_status === "aangemeld") return { label: "In behandeling", classes: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" };
    if (dienst.status === "open") return { label: "Open", classes: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" };
    if (dienst.status === "vol") return { label: "Vol", classes: "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400" };
    return { label: dienst.status, classes: "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400" };
  };

  return (
    <div>
      {accountGepauzeerd && (
        <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <div>
              <p className="font-bold text-red-800 dark:text-red-300">Account gepauzeerd - openstaande boete</p>
              <p className="text-sm text-red-600 dark:text-red-400">Je kunt je niet aanmelden voor diensten. Neem contact op met TopTalent om je boete af te handelen.</p>
            </div>
          </div>
        </div>
      )}
      <h2 className="text-2xl font-bold text-[var(--mp-text-primary)] mb-6">Beschikbare Diensten</h2>

      {beschikbareDiensten.length === 0 ? (
        <EmptyState
          title="Geen beschikbare diensten"
          description="Er zijn op dit moment geen openstaande diensten. Check later opnieuw."
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {beschikbareDiensten.map((dienst) => {
            const badge = getStatusBadge(dienst);
            return (
              <div key={dienst.id} className="bg-[var(--mp-card)] dark:bg-[var(--mp-card)] rounded-2xl p-5 shadow-sm dark:shadow-none dark:border dark:border-[var(--mp-separator)] hover:shadow-md dark:hover:border-[var(--mp-text-tertiary)] transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--mp-text-primary)] capitalize">{dienst.functie}</h3>
                    <p className="text-sm text-[var(--mp-text-secondary)]">{dienst.klant_naam}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badge.classes}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="space-y-2 mb-4 text-sm text-[var(--mp-text-secondary)]">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--mp-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                    <span>{dienst.locatie}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--mp-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{formatDate(dienst.datum)} · {dienst.start_tijd.slice(0, 5)} - {dienst.eind_tijd.slice(0, 5)}</span>
                  </div>
                  {dienst.uurtarief && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[var(--mp-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="font-semibold text-[var(--mp-text-primary)]">€{dienst.uurtarief.toFixed(2)}/uur</span>
                    </div>
                  )}
                </div>
                {dienst.status === "open" && (
                  <button
                    onClick={() => onAanmelden(dienst.id)}
                    disabled={accountGepauzeerd}
                    className="w-full px-4 py-3 bg-[#F27501] hover:bg-[#d96800] active:scale-[0.98] text-white font-semibold rounded-xl transition-all min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {accountGepauzeerd ? "Account gepauzeerd" : "Aanmelden"}
                  </button>
                )}
                {dienst.status === "vol" && (
                  <span className="block w-full text-center px-4 py-3 bg-[var(--mp-bg)] dark:bg-[var(--mp-card-elevated)] text-[var(--mp-text-tertiary)] font-medium rounded-xl min-h-[44px]">
                    Vol
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {mijnAanmeldingen.length > 0 && (
        <div className="mt-10">
          <h3 className="text-xl font-bold text-[var(--mp-text-primary)] mb-4">Mijn Aanmeldingen ({mijnAanmeldingen.length})</h3>
          <div className="space-y-3">
            {mijnAanmeldingen.map((dienst) => {
              const badge = getStatusBadge(dienst);
              return (
                <div key={dienst.id} className="bg-[var(--mp-card)] dark:bg-[var(--mp-card)] rounded-2xl p-5 shadow-sm dark:shadow-none dark:border dark:border-[var(--mp-separator)]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-bold text-[var(--mp-text-primary)] capitalize">{dienst.functie}</h4>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--mp-text-secondary)]">
                        {dienst.klant_naam} · {dienst.locatie}
                      </p>
                      <p className="text-sm text-[var(--mp-text-tertiary)] mt-1">
                        {formatDate(dienst.datum)} · {dienst.start_tijd.slice(0, 5)} - {dienst.eind_tijd.slice(0, 5)}
                        {dienst.uurtarief && <> · €{dienst.uurtarief.toFixed(2)}/uur</>}
                      </p>
                      {dienst.aanmelding_status === "geaccepteerd" && getUrenTotStart(dienst) <= 48 && getUrenTotStart(dienst) > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                          Annuleren niet mogelijk — dienst begint over {Math.floor(getUrenTotStart(dienst))}u
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      {dienst.aanmelding_status === "aangemeld" && (
                        <button
                          onClick={() => onAfmelden(dienst.id)}
                          className="px-4 py-3 text-sm text-[var(--mp-danger)] hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors min-h-[44px]"
                        >
                          Afmelden
                        </button>
                      )}
                      {dienst.aanmelding_status === "geaccepteerd" && !dienst.uren_status && new Date(dienst.datum) > new Date() && onAnnuleerGeaccepteerd && (
                        getUrenTotStart(dienst) > 48 ? (
                          <button
                            onClick={() => onAnnuleerGeaccepteerd(dienst.aanmelding_id!, dienst.id)}
                            className="px-4 py-3 text-sm text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors min-h-[44px] font-semibold"
                          >
                            Annuleren
                          </button>
                        ) : (
                          <button
                            onClick={() => setVervangingModal({ aanmeldingId: dienst.aanmelding_id!, dienstId: dienst.id })}
                            className="px-4 py-3 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors min-h-[44px] font-semibold"
                          >
                            Zoek vervanging
                          </button>
                        )
                      )}
                      {dienst.aanmelding_status === "geaccepteerd" && !dienst.uren_status && new Date(dienst.datum) <= new Date() && (
                        <button
                          onClick={() => onUrenInvullen(dienst)}
                          className="px-4 py-3 bg-[var(--mp-success)] text-white rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all min-h-[44px]"
                        >
                          Uren invullen
                        </button>
                      )}
                      {dienst.uren_status && (
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                          dienst.uren_status === "goedgekeurd" ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" : "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                        }`}>
                          Uren {dienst.uren_status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vervangingsverzoeken */}
      {vervangingVerzoeken.length > 0 && onAcceptVervanging && onAfwijsVervanging && (
        <div className="mt-10">
          <h3 className="text-xl font-bold text-[var(--mp-text-primary)] mb-4">Vervangingsverzoeken ({vervangingVerzoeken.length})</h3>
          <p className="text-sm text-[var(--mp-text-secondary)] mb-4">Medewerkers die zich aangemeld hebben als vervanging voor jouw diensten.</p>
          <div className="space-y-3">
            {vervangingVerzoeken.map((v) => {
              const functie = Array.isArray(v.functie) ? v.functie.join(", ") : v.functie || "";
              const initialen = v.naam.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
              // Find the dienst for context
              const dienst = mijnAanmeldingen.find(d => d.id === v.dienst_id);

              return (
                <div key={v.aanmelding_id} className="bg-[var(--mp-card)] dark:bg-[var(--mp-card)] rounded-2xl p-5 shadow-sm dark:shadow-none dark:border dark:border-[var(--mp-separator)]">
                  {dienst && (
                    <p className="text-xs text-[var(--mp-text-tertiary)] mb-2">
                      {dienst.functie} · {formatDate(dienst.datum)} · {dienst.start_tijd.slice(0, 5)} - {dienst.eind_tijd.slice(0, 5)}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    {v.profile_photo_url ? (
                      <img src={v.profile_photo_url} alt={v.naam} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#0B2447] text-white flex items-center justify-center text-sm font-bold">
                        {initialen}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[var(--mp-text-primary)] truncate">{v.naam}</p>
                      {functie && <p className="text-xs text-[var(--mp-text-secondary)]">{functie}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onAcceptVervanging(v.originele_aanmelding_id || mijnAanmeldingen.find(d => d.id === v.dienst_id)?.aanmelding_id || "", v.aanmelding_id)}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors"
                      >
                        Accepteren
                      </button>
                      <button
                        onClick={() => onAfwijsVervanging(v.aanmelding_id)}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
                      >
                        Afwijzen
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vervanging confirmatie modal */}
      {vervangingModal && onAnnuleerGeaccepteerd && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[100]">
          <div className="bg-[var(--mp-card)] dark:bg-[var(--mp-card-elevated)] rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-6 shadow-xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0">
            <h2 className="text-lg font-bold text-[var(--mp-text-primary)] mt-1">Vervanging zoeken</h2>

            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 mt-4 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Let op — jij blijft verantwoordelijk
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                De dienst komt online voor andere medewerkers. Jij moet de vervanger goedkeuren. Vind je niemand? Dan moet jij de dienst zelf werken. Werk je niet? Dan volgt een boete van €50 en wordt je account gepauzeerd.
              </p>
            </div>

            <button
              onClick={() => {
                onAnnuleerGeaccepteerd(vervangingModal.aanmeldingId, vervangingModal.dienstId);
                setVervangingModal(null);
              }}
              className="w-full mt-6 py-3.5 rounded-2xl bg-[#F27501] text-white font-semibold hover:bg-[#d96800] active:scale-[0.98] transition-all"
            >
              Bevestig — zet dienst online voor vervanging
            </button>
            <button
              onClick={() => setVervangingModal(null)}
              className="w-full mt-3 py-3 rounded-2xl bg-[var(--mp-bg)] dark:bg-[var(--mp-card)] text-[var(--mp-text-secondary)] font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              Toch zelf werken
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
