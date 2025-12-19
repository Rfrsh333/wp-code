"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Factuur {
  id: string;
  factuur_nummer: string;
  klant: { bedrijfsnaam: string; email: string };
  periode_start: string;
  periode_eind: string;
  subtotaal: number;
  btw_bedrag: number;
  totaal: number;
  status: string;
  created_at: string;
}

interface Klant {
  id: string;
  bedrijfsnaam: string;
}

export default function FacturenTab() {
  const [facturen, setFacturen] = useState<Factuur[]>([]);
  const [klanten, setKlanten] = useState<Klant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ klant_id: "", periode_start: "", periode_eind: "" });
  const [generating, setGenerating] = useState(false);

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const fetchData = async () => {
    setIsLoading(true);
    const headers = await getAuthHeader();
    const res = await fetch("/api/admin/facturen", { headers });
    const { facturen: f, klanten: k } = await res.json();
    setFacturen((f || []) as Factuur[]);
    setKlanten(k || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const generateFactuur = async () => {
    setGenerating(true);
    const headers = await getAuthHeader();
    const res = await fetch("/api/facturen/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setGenerating(false);
    if (data.success) {
      setShowModal(false);
      setForm({ klant_id: "", periode_start: "", periode_eind: "" });
      fetchData();
    } else {
      alert(data.error);
    }
  };

  const sendFactuur = async (id: string, email: string) => {
    const headers = await getAuthHeader();
    await fetch("/api/facturen/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ factuur_id: id, email }),
    });
    fetchData();
  };

  const openFactuurPdf = async (id: string) => {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/facturen/${id}/pdf`, { headers });
    if (!res.ok) {
      alert("PDF kon niet worden geladen");
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  const formatCurrency = (n: number) => `€${n.toFixed(2)}`;

  const statusColors: Record<string, string> = {
    concept: "bg-yellow-100 text-yellow-700",
    verzonden: "bg-blue-100 text-blue-700",
    betaald: "bg-green-100 text-green-700",
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Facturen</h2>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-[#F27501] text-white rounded-xl font-medium hover:bg-[#d96800]">
          + Nieuwe Factuur
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Nummer</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Klant</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Periode</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Totaal</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Status</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-neutral-600">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {facturen.map((f) => (
              <tr key={f.id} className="hover:bg-neutral-50">
                <td className="px-6 py-4 font-medium">{f.factuur_nummer}</td>
                <td className="px-6 py-4">{f.klant?.bedrijfsnaam}</td>
                <td className="px-6 py-4 text-sm text-neutral-500">{formatDate(f.periode_start)} - {formatDate(f.periode_eind)}</td>
                <td className="px-6 py-4 font-medium text-green-600">{formatCurrency(f.totaal)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[f.status]}`}>{f.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => openFactuurPdf(f.id)}
                      className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded text-sm hover:bg-neutral-200"
                    >
                      PDF
                    </button>
                    {f.status === "concept" && (
                      <button onClick={() => sendFactuur(f.id, f.klant?.email)} className="px-3 py-1 bg-[#F27501] text-white rounded text-sm hover:bg-[#d96800]">Versturen</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {facturen.length === 0 && <div className="text-center py-12 text-neutral-500">Geen facturen</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Nieuwe Factuur</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Klant</label>
                <select value={form.klant_id} onChange={(e) => setForm({ ...form, klant_id: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl">
                  <option value="">Selecteer klant</option>
                  {klanten.map((k) => <option key={k.id} value={k.id}>{k.bedrijfsnaam}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Van</label>
                  <input type="date" value={form.periode_start} onChange={(e) => setForm({ ...form, periode_start: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tot</label>
                  <input type="date" value={form.periode_eind} onChange={(e) => setForm({ ...form, periode_eind: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-neutral-200 rounded-xl">Annuleren</button>
              <button onClick={generateFactuur} disabled={generating || !form.klant_id}
                className="flex-1 px-4 py-2 bg-[#F27501] text-white rounded-xl font-medium disabled:opacity-50">
                {generating ? "Genereren..." : "Genereren"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
