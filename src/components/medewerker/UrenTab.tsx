"use client";

import EmptyState from "@/components/ui/EmptyState";

interface KlantAanpassing {
  id: string;
  start_tijd: string;
  eind_tijd: string;
  pauze_minuten: number;
  gewerkte_uren: number;
  klant_start_tijd: string;
  klant_eind_tijd: string;
  klant_pauze_minuten: number;
  klant_gewerkte_uren: number;
  klant_opmerking: string;
  dienst_datum: string;
  klant_naam: string;
  locatie: string;
}

interface UrenTabProps {
  aanpassingen: KlantAanpassing[];
  onAccepteer: (id: string) => void;
  onWeiger: (id: string) => void;
}

export default function UrenTab({ aanpassingen, onAccepteer, onWeiger }: UrenTabProps) {
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Uren & Aanpassingen</h2>
      {aanpassingen.length === 0 ? (
        <EmptyState
          title="Geen openstaande uren-aanpassingen"
          description="Er zijn geen klant-aanpassingen die je aandacht nodig hebben."
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      ) : (
        <div className="space-y-4">
          {aanpassingen.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-neutral-900">{a.klant_naam}</h3>
                  <p className="text-sm text-neutral-500">{a.locatie} • {formatDate(a.dienst_datum)}</p>
                </div>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Klant aanpassing</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-neutral-50 rounded-xl p-3">
                  <p className="text-xs text-neutral-500 mb-1">Jouw uren (origineel)</p>
                  <p className="font-medium">{a.start_tijd?.slice(0,5)} - {a.eind_tijd?.slice(0,5)}</p>
                  <p className="text-sm text-neutral-600">{a.pauze_minuten}m pauze = {a.gewerkte_uren} uur</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-3 border-2 border-orange-200">
                  <p className="text-xs text-orange-600 mb-1">Klant correctie</p>
                  <p className="font-medium text-orange-700">{a.klant_start_tijd?.slice(0,5)} - {a.klant_eind_tijd?.slice(0,5)}</p>
                  <p className="text-sm text-orange-600">{a.klant_pauze_minuten}m pauze = {a.klant_gewerkte_uren} uur</p>
                </div>
              </div>
              {a.klant_opmerking && (
                <div className="bg-neutral-50 rounded-xl p-3 mb-4">
                  <p className="text-xs text-neutral-500 mb-1">Reden van klant</p>
                  <p className="text-sm">{a.klant_opmerking}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => onAccepteer(a.id)} className="flex-1 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">Akkoord</button>
                <button onClick={() => onWeiger(a.id)} className="flex-1 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600">Niet akkoord</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
