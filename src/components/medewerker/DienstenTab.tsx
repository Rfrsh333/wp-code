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
    if (dienst.aanmelding_status === "geaccepteerd") return { label: "Geaccepteerd", classes: "bg-green-100 text-green-700" };
    if (dienst.aanmelding_status === "afgewezen") return { label: "Afgewezen", classes: "bg-red-100 text-red-700" };
    if (dienst.aanmelding_status === "aangemeld") return { label: "In behandeling", classes: "bg-yellow-100 text-yellow-700" };
    if (dienst.status === "open") return { label: "Open", classes: "bg-green-100 text-green-700" };
    if (dienst.status === "vol") return { label: "Vol", classes: "bg-neutral-100 text-neutral-600" };
    return { label: dienst.status, classes: "bg-neutral-100 text-neutral-600" };
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Beschikbare Diensten</h2>

      {beschikbareDiensten.length === 0 ? (
        <EmptyState
          title="Geen beschikbare diensten"
          description="Er zijn op dit moment geen openstaande diensten. Check later opnieuw."
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {beschikbareDiensten.map((dienst) => {
            const badge = getStatusBadge(dienst);
            return (
              <div key={dienst.id} className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 capitalize">{dienst.functie}</h3>
                    <p className="text-sm text-neutral-600">{dienst.klant_naam}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badge.classes}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="space-y-2 mb-4 text-sm text-neutral-600">
                  <p>📍 {dienst.locatie}</p>
                  <p>🕐 {formatDate(dienst.datum)} · {dienst.start_tijd.slice(0, 5)} - {dienst.eind_tijd.slice(0, 5)}</p>
                  {dienst.uurtarief && <p>💰 <span className="font-semibold text-neutral-900">€{dienst.uurtarief.toFixed(2)}/uur</span></p>}
                  {dienst.aantal_nodig && <p>👥 {dienst.aantal_nodig} plekken</p>}
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
                  <span className="block w-full text-center px-4 py-3 bg-neutral-100 text-neutral-500 font-medium rounded-xl min-h-[44px]">
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
          <h3 className="text-xl font-bold text-neutral-900 mb-4">Mijn Aanmeldingen ({mijnAanmeldingen.length})</h3>
          <div className="space-y-4">
            {mijnAanmeldingen.map((dienst) => {
              const badge = getStatusBadge(dienst);
              return (
                <div key={dienst.id} className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-bold text-neutral-900 capitalize">{dienst.functie}</h4>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600">
                        {dienst.klant_naam} · {dienst.locatie}
                      </p>
                      <p className="text-sm text-neutral-500 mt-1">
                        🕐 {formatDate(dienst.datum)} · {dienst.start_tijd.slice(0, 5)} - {dienst.eind_tijd.slice(0, 5)}
                        {dienst.uurtarief && <> · 💰 €{dienst.uurtarief.toFixed(2)}/uur</>}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      {dienst.aanmelding_status === "aangemeld" && (
                        <button
                          onClick={() => onAfmelden(dienst.id)}
                          className="px-4 py-3 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl transition-colors min-h-[44px]"
                        >
                          Afmelden
                        </button>
                      )}
                      {dienst.aanmelding_status === "geaccepteerd" && !dienst.uren_status && new Date(dienst.datum) <= new Date() && (
                        <button
                          onClick={() => onUrenInvullen(dienst)}
                          className="px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 active:scale-[0.98] transition-all min-h-[44px]"
                        >
                          Uren invullen
                        </button>
                      )}
                      {dienst.uren_status && (
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                          dienst.uren_status === "goedgekeurd" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
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
