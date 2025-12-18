"use client";

import { useState } from "react";

const DAGEN = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const TIJDSLOTEN = ["ochtend", "middag", "avond", "nacht"];

interface Beschikbaarheid {
  [key: string]: string[];
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
  onSave: (data: any) => Promise<void>;
}) {
  const [beschikbaarheid, setBeschikbaarheid] = useState<Beschikbaarheid>(
    initialData?.beschikbaarheid || DAGEN.reduce((acc, dag) => ({ ...acc, [dag]: [] }), {})
  );
  const [vanaf, setVanaf] = useState(initialData?.beschikbaar_vanaf || "");
  const [maxUren, setMaxUren] = useState(initialData?.max_uren_per_week || 40);
  const [saving, setSaving] = useState(false);

  const toggleSlot = (dag: string, slot: string) => {
    setBeschikbaarheid(prev => ({
      ...prev,
      [dag]: prev[dag].includes(slot)
        ? prev[dag].filter(s => s !== slot)
        : [...prev[dag], slot]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ beschikbaarheid, beschikbaar_vanaf: vanaf, max_uren_per_week: maxUren });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Beschikbaar vanaf</label>
        <input
          type="date"
          value={vanaf}
          onChange={e => setVanaf(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
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
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-3">Beschikbaarheid per dag</label>
        <div className="space-y-2">
          {DAGEN.map(dag => (
            <div key={dag} className="flex items-center gap-2">
              <span className="w-8 font-medium capitalize">{dag}</span>
              {TIJDSLOTEN.map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => toggleSlot(dag, slot)}
                  className={`px-3 py-1 text-xs rounded ${
                    beschikbaarheid[dag]?.includes(slot)
                      ? 'bg-[#F27501] text-white'
                      : 'bg-gray-200 text-gray-700'
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
        disabled={saving}
        className="w-full bg-[#F27501] text-white py-3 rounded-lg font-semibold hover:bg-[#d96800] disabled:opacity-50"
      >
        {saving ? "Opslaan..." : "Beschikbaarheid Opslaan"}
      </button>
    </form>
  );
}
