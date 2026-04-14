"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UrenRegistratie {
  id: string;
  start_tijd: string;
  eind_tijd: string;
  pauze_minuten: number;
  gewerkte_uren: number;
  reiskosten_km: number;
  reiskosten_bedrag: number;
  status: string;
  created_at: string;
  aanmelding: {
    medewerker: { naam: string; email: string };
    dienst: { klant_naam: string; datum: string; locatie: string; uurtarief: number };
  };
}

interface AanmeldingZonderUren {
  id: string;
  status: string;
  check_in_at: string | null;
  medewerker: { id: string; naam: string; email: string };
  dienst: { id: string; klant_naam: string; datum: string; start_tijd: string; eind_tijd: string; locatie: string; uurtarief: number; functie: string };
}

export default function UrenTab() {
  const [uren, setUren] = useState<UrenRegistratie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"goedgekeurd" | "klant_goedgekeurd" | "ingediend" | "alle">("ingediend");
  const [adjustModal, setAdjustModal] = useState<UrenRegistratie | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    start_tijd: "",
    eind_tijd: "",
    pauze_minuten: "0",
    reiskosten_km: "0",
    opmerking: "",
  });

  // Handmatig registreren state
  const [showHandmatig, setShowHandmatig] = useState(false);
  const [aanmeldingenZonderUren, setAanmeldingenZonderUren] = useState<AanmeldingZonderUren[]>([]);
  const [loadingAanmeldingen, setLoadingAanmeldingen] = useState(false);
  const [selectedAanmelding, setSelectedAanmelding] = useState<AanmeldingZonderUren | null>(null);
  const [handmatigForm, setHandmatigForm] = useState({
    start_tijd: "",
    eind_tijd: "",
    pauze_minuten: "0",
    reiskosten_km: "0",
    opmerking: "",
  });

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const fetchUren = useCallback(async () => {
    setIsLoading(true);
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/uren?filter=${filter}`, { headers });
    const { data } = await res.json();
    setUren((data || []) as UrenRegistratie[]);
    setIsLoading(false);
  }, [filter]);

  useEffect(() => {
    void (async () => {
      await fetchUren();
    })();
  }, [fetchUren]);

  const updateStatus = async (id: string, status: "goedgekeurd" | "afgewezen") => {
    const headers = await getAuthHeader();
    const res = await fetch("/api/admin/uren", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", id, status }),
    });
    if (!res.ok) {
      const error = await res.json();
      alert(error.error || "Status aanpassen mislukt");
      return;
    }
    fetchUren();
  };

  const openAdjustModal = (urenItem: UrenRegistratie) => {
    setAdjustModal(urenItem);
    setAdjustForm({
      start_tijd: urenItem.start_tijd.slice(0, 5),
      eind_tijd: urenItem.eind_tijd.slice(0, 5),
      pauze_minuten: String(urenItem.pauze_minuten),
      reiskosten_km: String(urenItem.reiskosten_km || 0),
      opmerking: "",
    });
  };

  const submitAdjustment = async () => {
    if (!adjustModal) return;

    const start = adjustForm.start_tijd.split(":").map(Number);
    const eind = adjustForm.eind_tijd.split(":").map(Number);
    const gewerkteUren = Math.round((((eind[0] * 60 + eind[1]) - (start[0] * 60 + start[1]) - Number(adjustForm.pauze_minuten)) / 60) * 100) / 100;
    const reiskostenKm = Math.max(0, Number(adjustForm.reiskosten_km) || 0);
    const reiskostenBedrag = Math.round(reiskostenKm * 0.21 * 100) / 100;

    const headers = await getAuthHeader();
    const res = await fetch("/api/admin/uren", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "adjust",
        id: adjustModal.id,
        data: {
          start_tijd: adjustForm.start_tijd,
          eind_tijd: adjustForm.eind_tijd,
          pauze_minuten: Number(adjustForm.pauze_minuten),
          gewerkte_uren: gewerkteUren,
          reiskosten_km: reiskostenKm,
          reiskosten_bedrag: reiskostenBedrag,
          opmerking: adjustForm.opmerking,
        },
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      alert(error.error || "Correctie versturen mislukt");
      return;
    }

    setAdjustModal(null);
    fetchUren();
  };

  const fetchAanmeldingenZonderUren = async () => {
    setLoadingAanmeldingen(true);
    const headers = await getAuthHeader();
    const res = await fetch("/api/admin/uren?filter=zonder_uren", { headers });
    const { data } = await res.json();
    setAanmeldingenZonderUren((data || []).map((a: Record<string, unknown>) => ({
      ...a,
      medewerker: Array.isArray(a.medewerker) ? a.medewerker[0] : a.medewerker,
      dienst: Array.isArray(a.dienst) ? a.dienst[0] : a.dienst,
    } as AanmeldingZonderUren)));
    setLoadingAanmeldingen(false);
  };

  const openHandmatig = async () => {
    setShowHandmatig(true);
    setSelectedAanmelding(null);
    await fetchAanmeldingenZonderUren();
  };

  const selectAanmelding = (a: AanmeldingZonderUren) => {
    setSelectedAanmelding(a);
    setHandmatigForm({
      start_tijd: a.dienst?.start_tijd?.slice(0, 5) || "",
      eind_tijd: a.dienst?.eind_tijd?.slice(0, 5) || "",
      pauze_minuten: "0",
      reiskosten_km: "0",
      opmerking: "",
    });
  };

  const submitHandmatig = async () => {
    if (!selectedAanmelding) return;

    const headers = await getAuthHeader();
    const res = await fetch("/api/admin/uren", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "handmatig_registreren",
        data: {
          aanmelding_id: selectedAanmelding.id,
          start_tijd: handmatigForm.start_tijd,
          eind_tijd: handmatigForm.eind_tijd,
          pauze_minuten: Number(handmatigForm.pauze_minuten),
          reiskosten_km: Number(handmatigForm.reiskosten_km),
          opmerking: handmatigForm.opmerking,
        },
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      alert(error.error || "Uren registreren mislukt");
      return;
    }

    setShowHandmatig(false);
    setSelectedAanmelding(null);
    fetchUren();
  };

  const berekenHandmatigUren = () => {
    if (!handmatigForm.start_tijd || !handmatigForm.eind_tijd) return "0.0";
    const [sh, sm] = handmatigForm.start_tijd.split(":").map(Number);
    const [eh, em] = handmatigForm.eind_tijd.split(":").map(Number);
    let totalMin = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMin <= 0) totalMin += 24 * 60;
    totalMin -= Number(handmatigForm.pauze_minuten) || 0;
    return Math.max(0, totalMin / 60).toFixed(1);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Uren Goedkeuren</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Medewerkers vullen uren in bij Mijn diensten. Nieuwe inzendingen beoordeel je hier, en zodra uren definitief goedgekeurd zijn verschijnen ze onder Klaar voor factuur.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilter("ingediend")} className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === "ingediend" ? "bg-[#F27501] text-white" : "bg-white"}`}>
            Nieuw van medewerker
          </button>
          <button onClick={() => setFilter("klant_goedgekeurd")} className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === "klant_goedgekeurd" ? "bg-[#F27501] text-white" : "bg-white"}`}>
            Klant akkoord
          </button>
          <button onClick={() => setFilter("goedgekeurd")} className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === "goedgekeurd" ? "bg-[#F27501] text-white" : "bg-white"}`}>
            Klaar voor factuur
          </button>
          <button onClick={() => setFilter("alle")} className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === "alle" ? "bg-[#F27501] text-white" : "bg-white"}`}>
            Alle
          </button>
          <button onClick={openHandmatig} className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition ml-auto">
            + Handmatig registreren
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
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
                  {u.reiskosten_km > 0 && (
                    <p className="text-sm text-neutral-500">{u.reiskosten_km} km reiskosten (€{u.reiskosten_bedrag.toFixed(2)})</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-green-600">€{((u.gewerkte_uren * (u.aanmelding?.dienst?.uurtarief || 0)) + ((u.reiskosten_km || 0) * 0.23)).toFixed(2)}</p>
                  {u.reiskosten_km > 0 && (
                    <p className="text-sm text-neutral-500">incl. €{((u.reiskosten_km || 0) * 0.23).toFixed(2)} reiskosten klant</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    u.status === "goedgekeurd" ? "bg-green-100 text-green-700" :
                    u.status === "klant_goedgekeurd" ? "bg-blue-100 text-blue-700" :
                    u.status === "afgewezen" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {u.status === "klant_goedgekeurd"
                      ? "Klant OK"
                      : u.status === "goedgekeurd"
                        ? "Klaar voor factuur"
                        : u.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {(u.status === "ingediend" || u.status === "klant_goedgekeurd") && (
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => updateStatus(u.id, "goedgekeurd")} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Goedkeuren</button>
                      <button onClick={() => openAdjustModal(u)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">Corrigeren</button>
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

      {/* Handmatig registreren modal */}
      {showHandmatig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-1">Handmatig uren registreren</h3>
            <p className="text-sm text-neutral-500 mb-4">
              Voor medewerkers die niet ingecheckt zijn via QR code.
            </p>

            {!selectedAanmelding ? (
              <>
                <p className="text-sm font-medium text-neutral-700 mb-3">Selecteer een dienst:</p>
                {loadingAanmeldingen ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-3 border-[#F27501] border-t-transparent rounded-full" />
                  </div>
                ) : aanmeldingenZonderUren.length === 0 ? (
                  <p className="text-sm text-neutral-400 text-center py-8">Geen aanmeldingen zonder uren gevonden.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {aanmeldingenZonderUren.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => selectAanmelding(a)}
                        className="w-full text-left p-3 rounded-xl border-2 border-neutral-200 hover:border-[#F27501] transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{a.medewerker?.naam || "Onbekend"}</span>
                          {!a.check_in_at && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Geen check-in</span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">
                          {a.dienst?.klant_naam} · {a.dienst?.functie} · {a.dienst?.datum ? formatDate(a.dienst.datum) : "—"}
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          {a.dienst?.start_tijd?.slice(0, 5)} - {a.dienst?.eind_tijd?.slice(0, 5)} · {a.dienst?.locatie}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-4">
                  <button onClick={() => setShowHandmatig(false)} className="w-full py-2 border rounded-lg text-sm">Sluiten</button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-neutral-50 rounded-xl p-3 mb-4">
                  <p className="font-medium text-sm">{selectedAanmelding.medewerker?.naam}</p>
                  <p className="text-xs text-neutral-500">
                    {selectedAanmelding.dienst?.klant_naam} · {selectedAanmelding.dienst?.functie} · {selectedAanmelding.dienst?.datum ? formatDate(selectedAanmelding.dienst.datum) : "—"} · {selectedAanmelding.dienst?.locatie}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Starttijd</label>
                      <input type="time" value={handmatigForm.start_tijd} onChange={(e) => setHandmatigForm({ ...handmatigForm, start_tijd: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Eindtijd</label>
                      <input type="time" value={handmatigForm.eind_tijd} onChange={(e) => setHandmatigForm({ ...handmatigForm, eind_tijd: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Pauze (min)</label>
                      <input type="number" min="0" value={handmatigForm.pauze_minuten} onChange={(e) => setHandmatigForm({ ...handmatigForm, pauze_minuten: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Reiskosten (km)</label>
                      <input type="number" min="0" value={handmatigForm.reiskosten_km} onChange={(e) => setHandmatigForm({ ...handmatigForm, reiskosten_km: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                    <span className="text-sm text-neutral-600">Gewerkte uren</span>
                    <span className="font-bold text-green-700">{berekenHandmatigUren()} uur</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Reden (intern)</label>
                    <textarea rows={2} value={handmatigForm.opmerking} onChange={(e) => setHandmatigForm({ ...handmatigForm, opmerking: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Bijv. medewerker kon niet inchecken, klant bevestigt aanwezigheid" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setSelectedAanmelding(null)} className="flex-1 py-2 border rounded-lg text-sm">Terug</button>
                  <button onClick={submitHandmatig} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition">Uren registreren</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {adjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-2">Uren corrigeren</h3>
            <p className="text-sm text-neutral-500 mb-4">
              {adjustModal.aanmelding?.medewerker?.naam} · {adjustModal.aanmelding?.dienst?.klant_naam}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Starttijd</label>
                <input
                  type="time"
                  value={adjustForm.start_tijd}
                  onChange={(e) => setAdjustForm({ ...adjustForm, start_tijd: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Eindtijd</label>
                <input
                  type="time"
                  value={adjustForm.eind_tijd}
                  onChange={(e) => setAdjustForm({ ...adjustForm, eind_tijd: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pauze (minuten)</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={adjustForm.pauze_minuten}
                  onChange={(e) => setAdjustForm({ ...adjustForm, pauze_minuten: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reiskostenvergoeding (km)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={adjustForm.reiskosten_km}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reiskosten_km: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Medewerker ontvangt €{((Math.max(0, Number(adjustForm.reiskosten_km) || 0)) * 0.21).toFixed(2)} en klant wordt €{((Math.max(0, Number(adjustForm.reiskosten_km) || 0)) * 0.23).toFixed(2)} gefactureerd.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Opmerking voor medewerker</label>
                <textarea
                  rows={4}
                  value={adjustForm.opmerking}
                  onChange={(e) => setAdjustForm({ ...adjustForm, opmerking: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Bijvoorbeeld: klant gaf door dat de dienst om 22:30 stopte en dat er 30 minuten pauze was."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setAdjustModal(null)} className="flex-1 py-2 border rounded-lg">Annuleren</button>
              <button onClick={submitAdjustment} className="flex-1 py-2 bg-[#F27501] text-white rounded-lg font-medium">Stuur correctie</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
