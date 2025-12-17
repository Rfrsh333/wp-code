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
  const [filter, setFilter] = useState<"klant_goedgekeurd" | "ingediend" | "alle">("klant_goedgekeurd");

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const fetchUren = async () => {
    setIsLoading(true);
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/uren?filter=${filter}`, { headers });
    const { data } = await res.json();
    setUren((data || []) as UrenRegistratie[]);
    setIsLoading(false);
  };

  useEffect(() => { fetchUren(); }, [filter]);

  const updateStatus = async (id: string, status: "goedgekeurd" | "afgewezen") => {
    const headers = await getAuthHeader();
    await fetch("/api/admin/uren", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", id, status }),
    });
    fetchUren();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Uren Goedkeuren</h2>
        <div className="flex gap-2">
          <button onClick={() => setFilter("klant_goedgekeurd")} className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === "klant_goedgekeurd" ? "bg-[#F27501] text-white" : "bg-white"}`}>
            Klant goedgekeurd
          </button>
          <button onClick={() => setFilter("ingediend")} className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === "ingediend" ? "bg-[#F27501] text-white" : "bg-white"}`}>
            Wacht op klant
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
                    u.status === "klant_goedgekeurd" ? "bg-blue-100 text-blue-700" :
                    u.status === "afgewezen" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>{u.status === "klant_goedgekeurd" ? "Klant OK" : u.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  {(u.status === "ingediend" || u.status === "klant_goedgekeurd") && (
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
