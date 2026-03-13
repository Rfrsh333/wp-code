"use client";

import { useState, useEffect } from "react";

const DAGEN = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const DAG_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const TIJDSLOTEN = ["ochtend", "middag", "avond", "nacht"];

interface Beschikbaarheid {
  [key: string]: string[];
}

interface BeschikbaarheidSaveData {
  beschikbaarheid: Beschikbaarheid;
  beschikbaar_vanaf: string;
  max_uren_per_week: number;
}

interface Override {
  id?: string;
  week_start: string;
  beschikbaarheid: Beschikbaarheid;
  notitie?: string;
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function formatWeekLabel(dateStr: string): string {
  const start = new Date(dateStr + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}`;
}

export default function BeschikbaarheidForm({
  initialData,
  onSave
}: {
  initialData?: {
    beschikbaarheid: Beschikbaarheid;
    beschikbaar_vanaf: string;
    max_uren_per_week: number;
  };
  onSave: (data: BeschikbaarheidSaveData) => Promise<void>;
}) {
  const [beschikbaarheid, setBeschikbaarheid] = useState<Beschikbaarheid>(
    initialData?.beschikbaarheid || DAGEN.reduce((acc, dag) => ({ ...acc, [dag]: [] }), {})
  );
  const [vanaf, setVanaf] = useState(initialData?.beschikbaar_vanaf || "");
  const [maxUren, setMaxUren] = useState(initialData?.max_uren_per_week || 40);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Week override state
  const [modus, setModus] = useState<"standaard" | "week">("standaard");
  const [selectedWeek, setSelectedWeek] = useState(getWeekStart(new Date()));
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [weekBeschikbaarheid, setWeekBeschikbaarheid] = useState<Beschikbaarheid>(
    DAGEN.reduce((acc, dag) => ({ ...acc, [dag]: [] }), {})
  );
  const [weekNotitie, setWeekNotitie] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);

  useEffect(() => {
    if (modus === "week") {
      fetchOverrides();
    }
  }, [modus]);

  useEffect(() => {
    if (modus === "week") {
      const existing = overrides.find(o => o.week_start === selectedWeek);
      if (existing) {
        setWeekBeschikbaarheid(existing.beschikbaarheid);
        setWeekNotitie(existing.notitie || "");
      } else {
        // Kopie van standaard patroon
        setWeekBeschikbaarheid({ ...beschikbaarheid });
        setWeekNotitie("");
      }
    }
  }, [selectedWeek, overrides, modus, beschikbaarheid]);

  const fetchOverrides = async () => {
    try {
      const res = await fetch("/api/medewerker/beschikbaarheid?overrides=true");
      const data = await res.json();
      setOverrides(data.overrides || []);
    } catch {
      // non-critical
    }
  };

  const toggleSlot = (dag: string, slot: string) => {
    if (modus === "standaard") {
      setBeschikbaarheid(prev => ({
        ...prev,
        [dag]: prev[dag].includes(slot)
          ? prev[dag].filter(s => s !== slot)
          : [...prev[dag], slot]
      }));
    } else {
      setWeekBeschikbaarheid(prev => ({
        ...prev,
        [dag]: prev[dag]?.includes(slot)
          ? prev[dag].filter(s => s !== slot)
          : [...(prev[dag] || []), slot]
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modus === "standaard") {
      if (vanaf && new Date(vanaf) < new Date(new Date().toDateString())) return;
      setSaving(true);
      setSaved(false);
      try {
        await onSave({ beschikbaarheid, beschikbaar_vanaf: vanaf, max_uren_per_week: maxUren });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } finally {
        setSaving(false);
      }
    } else {
      setOverrideLoading(true);
      try {
        await fetch("/api/medewerker/beschikbaarheid", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            week_start: selectedWeek,
            beschikbaarheid: weekBeschikbaarheid,
            notitie: weekNotitie,
          }),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        fetchOverrides();
      } finally {
        setOverrideLoading(false);
      }
    }
  };

  const deleteOverride = async (weekStart: string) => {
    await fetch(`/api/medewerker/beschikbaarheid?week_start=${weekStart}`, { method: "DELETE" });
    fetchOverrides();
  };

  const navigateWeek = (direction: number) => {
    const d = new Date(selectedWeek + "T00:00:00");
    d.setDate(d.getDate() + direction * 7);
    setSelectedWeek(d.toISOString().split("T")[0]);
  };

  const currentBeschikbaarheid = modus === "standaard" ? beschikbaarheid : weekBeschikbaarheid;
  const hasOverride = overrides.some(o => o.week_start === selectedWeek);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Modus toggle */}
      <div className="flex bg-neutral-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setModus("standaard")}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            modus === "standaard" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
          }`}
        >
          Standaard patroon
        </button>
        <button
          type="button"
          onClick={() => setModus("week")}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            modus === "week" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
          }`}
        >
          Week-specifiek
        </button>
      </div>

      {modus === "standaard" && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Beschikbaar vanaf</label>
            <input
              type="date"
              value={vanaf}
              onChange={e => setVanaf(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max uren per week</label>
            <input
              type="number"
              value={maxUren}
              onChange={e => setMaxUren(Number(e.target.value))}
              min="1"
              max="60"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none transition-all"
            />
          </div>
        </>
      )}

      {modus === "week" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => navigateWeek(-1)} className="p-2 rounded-lg border hover:bg-neutral-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-medium text-neutral-700">{formatWeekLabel(selectedWeek)}</span>
            <button type="button" onClick={() => navigateWeek(1)} className="p-2 rounded-lg border hover:bg-neutral-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          {hasOverride && (
            <div className="flex items-center gap-2 mb-3 text-xs">
              <span className="bg-[#F27501]/10 text-[#F27501] px-2 py-1 rounded-md font-medium">Override actief</span>
              <button type="button" onClick={() => deleteOverride(selectedWeek)} className="text-red-500 hover:text-red-700 underline">Verwijderen</button>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Notitie (optioneel)</label>
            <input
              type="text"
              value={weekNotitie}
              onChange={e => setWeekNotitie(e.target.value)}
              placeholder="Bijv. vakantie, examen, etc."
              className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-3">
          {modus === "standaard" ? "Beschikbaarheid per dag" : "Beschikbaarheid deze week"}
        </label>
        <div className="space-y-2">
          {DAGEN.map((dag, i) => (
            <div key={dag} className="flex items-center gap-2">
              <span className="w-8 font-medium text-sm">{DAG_LABELS[i]}</span>
              {TIJDSLOTEN.map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => toggleSlot(dag, slot)}
                  className={`px-3 py-1.5 text-xs rounded-lg min-h-[32px] transition-colors ${
                    currentBeschikbaarheid[dag]?.includes(slot)
                      ? 'bg-[#F27501] text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={saving || overrideLoading}
        className="w-full bg-[#F27501] text-white py-3 rounded-lg font-semibold hover:bg-[#d96800] disabled:opacity-50 min-h-[48px]"
      >
        {saving || overrideLoading ? "Opslaan..." : modus === "standaard" ? "Beschikbaarheid Opslaan" : "Week Override Opslaan"}
      </button>
      {saved && (
        <p className="text-green-600 text-sm text-center font-medium">Opgeslagen!</p>
      )}

      {/* Bestaande overrides */}
      {modus === "week" && overrides.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-neutral-500 mb-2">Actieve overrides</h4>
          <div className="space-y-1">
            {overrides.map(o => (
              <div key={o.week_start} className="flex items-center justify-between bg-neutral-50 rounded-lg px-3 py-2 text-sm">
                <span className="font-medium">{formatWeekLabel(o.week_start)}</span>
                <div className="flex items-center gap-2">
                  {o.notitie && <span className="text-xs text-neutral-400">{o.notitie}</span>}
                  <button type="button" onClick={() => setSelectedWeek(o.week_start)} className="text-[#F27501] text-xs hover:underline">Bewerk</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
