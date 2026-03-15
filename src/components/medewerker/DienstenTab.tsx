"use client";

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

interface DienstenTabProps {
  diensten: Dienst[];
  onAanmelden: (dienstId: string) => void;
  onAfmelden: (dienstId: string) => void;
  onUrenInvullen: (dienst: Dienst) => void;
}

export default function DienstenTab({ diensten, onAanmelden, onAfmelden, onUrenInvullen }: DienstenTabProps) {
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });

  const beschikbareDiensten = diensten.filter((d) => !d.aangemeld);
  const mijnAanmeldingen = diensten.filter((d) => d.aangemeld);

  const getStatusBadge = (dienst: Dienst) => {
    if (dienst.aanmelding_status === "geaccepteerd") return { label: "Geaccepteerd", classes: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" };
    if (dienst.aanmelding_status === "afgewezen") return { label: "Afgewezen", classes: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400" };
    if (dienst.aanmelding_status === "aangemeld") return { label: "In behandeling", classes: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" };
    if (dienst.status === "open") return { label: "Open", classes: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" };
    if (dienst.status === "vol") return { label: "Vol", classes: "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400" };
    return { label: dienst.status, classes: "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400" };
  };

  return (
    <div>
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
                    className="w-full px-4 py-3 bg-[#F27501] hover:bg-[#d96800] active:scale-[0.98] text-white font-semibold rounded-xl transition-all min-h-[44px]"
                  >
                    Aanmelden
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
    </div>
  );
}
