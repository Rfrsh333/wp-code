"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface PlatformOption {
  id: string;
  type: string;
  value: string;
  sort_order: number;
  active: boolean;
}

type OptionType = "functie" | "vaardigheid";

const TYPE_LABELS: Record<OptionType, { title: string; description: string; icon: string }> = {
  functie: {
    title: "Functies",
    description: "Functies die klanten kunnen selecteren bij het aanmaken van een dienst",
    icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  vaardigheid: {
    title: "Vaardigheden",
    description: "Vaardigheden die klanten als vereiste kunnen opgeven bij een dienstaanvraag",
    icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  },
};

export default function PlatformOptionsTab() {
  const [activeType, setActiveType] = useState<OptionType>("functie");
  const [options, setOptions] = useState<PlatformOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/platform-options?type=${activeType}`, {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    const json = await res.json();
    setOptions(json.data || []);
    setLoading(false);
  }, [activeType]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchOptions();
  }, [fetchOptions]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const apiAction = async (body: Record<string, unknown>) => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/platform-options", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    setSaving(false);
    await fetchOptions();
  };

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    await apiAction({ action: "create", type: activeType, value: newValue.trim(), sort_order: options.length });
    setNewValue("");
  };

  const handleDelete = async (id: string) => {
    await apiAction({ action: "delete", id });
  };

  const handleUpdate = async (id: string) => {
    if (!editValue.trim()) return;
    await apiAction({ action: "update", id, value: editValue.trim() });
    setEditingId(null);
    setEditValue("");
  };

  const handleSeed = async () => {
    if (!confirm("Dit laadt de standaard functies en vaardigheden. Bestaande waarden worden niet overschreven. Doorgaan?")) return;
    await apiAction({ action: "seed" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Platform Instellingen</h2>
          <p className="text-sm text-neutral-500 mt-1">Beheer de opties die beschikbaar zijn in het klantportaal</p>
        </div>
        <button
          onClick={handleSeed}
          disabled={saving}
          className="px-3 py-1.5 text-xs font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
        >
          Standaard opties laden
        </button>
      </div>

      {/* Type selector */}
      <div className="flex gap-2">
        {(Object.keys(TYPE_LABELS) as OptionType[]).map((type) => {
          const { title, icon } = TYPE_LABELS[type];
          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeType === type
                  ? "bg-[#F27501] text-white shadow-sm"
                  : "bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
              </svg>
              {title}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeType === type ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
              }`}>
                {activeType === type ? options.length : ""}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active type info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-700">{TYPE_LABELS[activeType].description}</p>
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder={`Nieuwe ${activeType} toevoegen...`}
          className="flex-1 px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
        />
        <button
          onClick={handleAdd}
          disabled={!newValue.trim() || saving}
          className="px-5 py-2.5 bg-[#F27501] text-white text-sm font-medium rounded-xl hover:bg-[#d96800] transition-colors disabled:opacity-50"
        >
          Toevoegen
        </button>
      </div>

      {/* Options list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-6 h-6 border-3 border-[#F27501] border-t-transparent rounded-full"></div>
        </div>
      ) : options.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-neutral-400">
          <p className="text-sm">Nog geen {TYPE_LABELS[activeType].title.toLowerCase()} toegevoegd.</p>
          <p className="text-xs mt-1">Klik op &quot;Standaard opties laden&quot; om te beginnen.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-neutral-100">
            {options.map((opt, index) => (
              <div key={opt.id} className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 group">
                <span className="text-xs text-neutral-300 w-6 text-right tabular-nums">{index + 1}</span>
                {editingId === opt.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate(opt.id);
                        if (e.key === "Escape") { setEditingId(null); setEditValue(""); }
                      }}
                      autoFocus
                      className="flex-1 px-3 py-1 border border-[#F27501] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20"
                    />
                    <button
                      onClick={() => handleUpdate(opt.id)}
                      disabled={saving}
                      className="px-3 py-1 bg-[#F27501] text-white text-xs rounded-lg hover:bg-[#d96800]"
                    >
                      Opslaan
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditValue(""); }}
                      className="px-3 py-1 text-neutral-500 text-xs rounded-lg hover:bg-neutral-100"
                    >
                      Annuleer
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-neutral-900">{opt.value}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(opt.id); setEditValue(opt.value); }}
                        className="p-1.5 text-neutral-400 hover:text-[#F27501] hover:bg-[#F27501]/10 rounded-lg transition-colors"
                        title="Bewerken"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(opt.id)}
                        disabled={saving}
                        className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Verwijderen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
