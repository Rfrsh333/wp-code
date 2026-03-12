"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface ProfielData {
  stad?: string | null;
  geboortedatum?: string | null;
  factuur_adres?: string | null;
  factuur_postcode?: string | null;
  factuur_stad?: string | null;
  btw_nummer?: string | null;
  iban?: string | null;
}

interface ProfielEditModalProps {
  data: ProfielData;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProfielEditModal({ data, onClose, onSaved }: ProfielEditModalProps) {
  const toast = useToast();
  const [form, setForm] = useState({
    stad: data.stad || "",
    geboortedatum: data.geboortedatum || "",
    factuur_adres: data.factuur_adres || "",
    factuur_postcode: data.factuur_postcode || "",
    factuur_stad: data.factuur_stad || "",
    btw_nummer: data.btw_nummer || "",
    iban: data.iban || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/medewerker/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Opslaan mislukt");
      toast.success("Profiel bijgewerkt");
      onSaved();
      onClose();
    } catch {
      toast.error("Kon profiel niet bijwerken");
    } finally {
      setIsSubmitting(false);
    }
  };

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-neutral-900">Profiel Bewerken</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-2xl leading-none">×</button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">Persoonlijke Informatie</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Woonplaats</label>
                <input type="text" value={form.stad} onChange={(e) => update("stad", e.target.value)} placeholder="Bijv. Utrecht"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Geboortedatum</label>
                <input type="date" value={form.geboortedatum} onChange={(e) => update("geboortedatum", e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent" />
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-4">
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">Facturatie & Betaling</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Factuuradres</label>
                <input type="text" value={form.factuur_adres} onChange={(e) => update("factuur_adres", e.target.value)} placeholder="Straatnaam + nummer"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Postcode</label>
                  <input type="text" value={form.factuur_postcode} onChange={(e) => update("factuur_postcode", e.target.value)} placeholder="1234AB"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Stad</label>
                  <input type="text" value={form.factuur_stad} onChange={(e) => update("factuur_stad", e.target.value)} placeholder="Utrecht"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">BTW-nummer</label>
                <input type="text" value={form.btw_nummer} onChange={(e) => update("btw_nummer", e.target.value)} placeholder="NL123456789B01"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">IBAN</label>
                <input type="text" value={form.iban} onChange={(e) => update("iban", e.target.value)} placeholder="NL12INGB0001234567"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-neutral-300 text-neutral-700 font-medium rounded-xl hover:bg-neutral-50">Annuleren</button>
          <button onClick={handleSave} disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-[#F27501] text-white font-medium rounded-xl hover:bg-[#d96800] disabled:opacity-50">
            {isSubmitting ? "Opslaan..." : "Opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}
