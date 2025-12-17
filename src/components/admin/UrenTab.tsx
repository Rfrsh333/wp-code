"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface UrenRegistratie {
  id: string;
  start_tijd: string;
  eind_tijd: string;
  pauze_minuten: number;
  gewerkte_uren: number;
  status: string;
  created_at: string;
  aanmelding: {
    medewerker: { naam: string; email: string };
    dienst: { klant_naam: string; datum: string; locatie: string; uurtarief: number };
  };
}

export default function UrenTab() {
  const [uren, setUren] = useState<UrenRegistratie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"ingediend" | "alle">("ingediend");

  const fetchUren = async () => {
    setIsLoading(true);
    let query = supabase
      .from("uren_registraties")
      .select(`*, aanmelding:dienst_aanmeldingen(medewerker:medewerkers(naam, email), dienst:diensten(klant_naam, datum, locatie, uurtarief))`)
      .order("created_at", { ascending: false });

    if (filter === "ingediend") query = query.eq("status", "ingediend");

    const { data } = await query;
    setUren((data || []) as unknown as UrenRegistratie[]);
    setIsLoading(false);
  };

  useEffect(() => { fetchUren(); }, [filter]);

  const updateStatus = async (id: string, status: "goedgekeurd" | "afgewezen") => {
    await supabase.from("uren_registraties").update({ status, goedgekeurd_at: new Date().toISOString() }).eq("id", id);
    fetchUren();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Uren Goedkeuren</h2>
        <div className="flex gap-2">
          <button onClick={() => setFilter("ingediend")} className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === "ingediend" ? "bg-[#F27501] text-white" : "bg-white"}`}>
            Te beoordelen ({uren.filter(u => u.status === "ingediend").length})
          </button>
          <button onClick={() => setFilter("alle")} className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === "alle" ? "bg-[#F27501] text-white" : "bg-white"}`}>
            Alle
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Medewerker</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Dienst</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Uren</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Bedrag</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Status</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-neutral-600">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {uren.map((u) => (
              <tr key={u.id} className="hover:bg-neutral-50">
                <td className="px-6 py-4">
                  <p className="font-medium">{u.aanmelding?.medewerker?.naam}</p>
                  <p className="text-sm text-neutral-500">{u.aanmelding?.medewerker?.email}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium">{u.aanmelding?.dienst?.klant_naam}</p>
                  <p className="text-sm text-neutral-500">{formatDate(u.aanmelding?.dienst?.datum)} • {u.aanmelding?.dienst?.locatie}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium">{u.gewerkte_uren} uur</p>
                  <p className="text-sm text-neutral-500">{u.start_tijd?.slice(0,5)} - {u.eind_tijd?.slice(0,5)} ({u.pauze_minuten}m pauze)</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-green-600">€{(u.gewerkte_uren * (u.aanmelding?.dienst?.uurtarief || 0)).toFixed(2)}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    u.status === "goedgekeurd" ? "bg-green-100 text-green-700" :
                    u.status === "afgewezen" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>{u.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  {u.status === "ingediend" && (
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => updateStatus(u.id, "goedgekeurd")} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Goedkeuren</button>
                      <button onClick={() => updateStatus(u.id, "afgewezen")} className="px-3 py-1 bg-red-500 text-white rounded text-sm">Afwijzen</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {uren.length === 0 && <div className="text-center py-12 text-neutral-500">Geen uren gevonden</div>}
      </div>
    </div>
  );
}
