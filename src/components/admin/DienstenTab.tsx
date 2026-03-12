"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Dienst {
  id: string;
  klant_naam: string;
  klant_email: string | null;
  klant_telefoon: string | null;
  locatie: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  functie: string;
  aantal_nodig: number;
  uurtarief: number | null;
  afbeelding: string | null;
  status: "open" | "vol" | "bezig" | "afgerond" | "geannuleerd";
  notities: string | null;
  created_at: string;
  is_spoeddienst: boolean;
  spoeddienst_token: string | null;
  spoeddienst_whatsapp_tekst: string | null;
}

interface SpoedResponse {
  id: string;
  dienst_id: string;
  token: string;
  medewerker_id: string | null;
  naam: string;
  telefoon: string;
  status: "beschikbaar" | "bevestigd" | "afgewezen";
  created_at: string;
}

interface Aanmelding {
  id: string;
  dienst_id: string;
  medewerker_id: string;
  status: "aangemeld" | "geaccepteerd" | "afgewezen" | "geannuleerd";
  aangemeld_at: string;
  medewerker?: {
    naam: string;
    email: string;
    telefoon: string | null;
  };
}

interface AanmeldingResponse extends Omit<Aanmelding, "medewerker"> {
  medewerker?: Aanmelding["medewerker"];
}

const functieOptions = [
  { value: "bediening", label: "Bediening" },
  { value: "bar", label: "Bar" },
  { value: "keuken", label: "Keuken" },
  { value: "afwas", label: "Afwas" },
];

const statusColors: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  vol: "bg-blue-100 text-blue-700",
  bezig: "bg-yellow-100 text-yellow-700",
  afgerond: "bg-neutral-100 text-neutral-600",
  geannuleerd: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  vol: "Vol",
  bezig: "Bezig",
  afgerond: "Afgerond",
  geannuleerd: "Geannuleerd",
};

export default function DienstenTab() {
  const [diensten, setDiensten] = useState<Dienst[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAanmeldingenModal, setShowAanmeldingenModal] = useState(false);
  const [selectedDienst, setSelectedDienst] = useState<Dienst | null>(null);
  const [aanmeldingen, setAanmeldingen] = useState<Aanmelding[]>([]);
  const [editingDienst, setEditingDienst] = useState<Dienst | null>(null);
  const [formData, setFormData] = useState({
    klant_naam: "",
    klant_email: "",
    klant_telefoon: "",
    locatie: "",
    datum: "",
    start_tijd: "",
    eind_tijd: "",
    functie: "bediening",
    aantal_nodig: "1",
    uurtarief: "",
    afbeelding: "",
    notities: "",
    is_spoeddienst: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState<"alle" | "open" | "vol" | "afgerond">("alle");
  const [zoekterm, setZoekterm] = useState("");
  // Spoeddienst state
  const [showSpoedModal, setShowSpoedModal] = useState(false);
  const [spoedDienst, setSpoedDienst] = useState<Dienst | null>(null);
  const [spoedResponses, setSpoedResponses] = useState<SpoedResponse[]>([]);
  const [spoedCopied, setSpoedCopied] = useState(false);

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const fetchDiensten = useCallback(async () => {
    setIsLoading(true);
    const headers = await getAuthHeader();
    const res = await fetch("/api/admin/diensten", { headers });
    const { data } = await res.json();
    setDiensten(data || []);
    setIsLoading(false);
  }, []);

  const fetchAanmeldingen = async (dienstId: string) => {
    const headers = await getAuthHeader();
    const res = await fetch("/api/admin/diensten", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_aanmeldingen", dienst_id: dienstId }),
    });
    const { data } = await res.json();
    setAanmeldingen(((data || []) as AanmeldingResponse[]).map((a) => ({
      ...a,
      medewerker: a.medewerker,
    })));
  };

  useEffect(() => {
    void (async () => {
      await fetchDiensten();
    })();
  }, [fetchDiensten]);

  const openNewModal = () => {
    setEditingDienst(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormData({
      klant_naam: "",
      klant_email: "",
      klant_telefoon: "",
      locatie: "",
      datum: tomorrow.toISOString().split("T")[0],
      start_tijd: "18:00",
      eind_tijd: "23:00",
      functie: "bediening",
      aantal_nodig: "1",
      uurtarief: "",
      afbeelding: "",
      notities: "",
      is_spoeddienst: false,
    });
    setShowModal(true);
  };

  const openEditModal = (dienst: Dienst) => {
    setEditingDienst(dienst);
    setFormData({
      klant_naam: dienst.klant_naam,
      klant_email: dienst.klant_email || "",
      klant_telefoon: dienst.klant_telefoon || "",
      locatie: dienst.locatie,
      datum: dienst.datum,
      start_tijd: dienst.start_tijd,
      eind_tijd: dienst.eind_tijd,
      afbeelding: dienst.afbeelding || "",
      functie: dienst.functie,
      aantal_nodig: dienst.aantal_nodig.toString(),
      uurtarief: dienst.uurtarief?.toString() || "",
      notities: dienst.notities || "",
      is_spoeddienst: dienst.is_spoeddienst || false,
    });
    setShowModal(true);
  };

  const openAanmeldingenModal = async (dienst: Dienst) => {
    setSelectedDienst(dienst);
    await fetchAanmeldingen(dienst.id);
    setShowAanmeldingenModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const headers = await getAuthHeader();
    const payload = {
      klant_naam: formData.klant_naam,
      klant_email: formData.klant_email || null,
      klant_telefoon: formData.klant_telefoon || null,
      locatie: formData.locatie,
      datum: formData.datum,
      start_tijd: formData.start_tijd,
      eind_tijd: formData.eind_tijd,
      functie: formData.functie,
      aantal_nodig: parseInt(formData.aantal_nodig),
      uurtarief: formData.uurtarief ? parseFloat(formData.uurtarief) : null,
      afbeelding: formData.afbeelding || null,
      notities: formData.notities || null,
      is_spoeddienst: formData.is_spoeddienst,
    };

    await fetch("/api/admin/diensten", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        action: editingDienst ? "update" : "create",
        id: editingDienst?.id,
        data: payload,
      }),
    });

    setIsSaving(false);
    setShowModal(false);
    fetchDiensten();
  };

  const deleteDienst = async (id: string) => {
    if (confirm("Weet je zeker dat je deze dienst wilt verwijderen?")) {
      const headers = await getAuthHeader();
      await fetch("/api/admin/diensten", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      fetchDiensten();
    }
  };

  const updateDienstStatus = async (id: string, status: Dienst["status"]) => {
    const headers = await getAuthHeader();
    await fetch("/api/admin/diensten", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id, data: { status } }),
    });
    fetchDiensten();
  };

  const updateAanmeldingStatus = async (
    aanmeldingId: string,
    status: Aanmelding["status"]
  ) => {
    const headers = await getAuthHeader();
    await fetch("/api/admin/diensten", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_aanmelding", id: aanmeldingId, data: { status } }),
    });

    if (selectedDienst) {
      await fetchAanmeldingen(selectedDienst.id);

      const geaccepteerd = aanmeldingen.filter(
        (a) => a.status === "geaccepteerd" || (a.id === aanmeldingId && status === "geaccepteerd")
      ).length;

      if (geaccepteerd >= selectedDienst.aantal_nodig) {
        await updateDienstStatus(selectedDienst.id, "vol");
      }
    }
    fetchDiensten();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("nl-NL", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  // Spoeddienst functies
  const openSpoedModal = async (dienst: Dienst) => {
    setSpoedDienst(dienst);
    setSpoedCopied(false);
    const headers = await getAuthHeader();
    const res = await fetch("/api/admin/diensten", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_spoeddienst_responses", dienst_id: dienst.id }),
    });
    const { data } = await res.json();
    setSpoedResponses(data || []);
    setShowSpoedModal(true);
  };

  const copyWhatsApp = async (tekst: string) => {
    await navigator.clipboard.writeText(tekst);
    setSpoedCopied(true);
    setTimeout(() => setSpoedCopied(false), 2000);
  };

  const updateSpoedResponse = async (responseId: string, status: "bevestigd" | "afgewezen") => {
    const headers = await getAuthHeader();
    await fetch("/api/admin/diensten", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_spoeddienst_response", id: responseId, data: { status } }),
    });
    // Refresh responses
    if (spoedDienst) {
      const res = await fetch("/api/admin/diensten", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_spoeddienst_responses", dienst_id: spoedDienst.id }),
      });
      const { data } = await res.json();
      setSpoedResponses(data || []);
    }
    fetchDiensten();
  };

  const filteredDiensten = diensten
    .filter((d) => {
      if (filter === "alle") return true;
      if (filter === "open") return d.status === "open";
      if (filter === "vol") return d.status === "vol" || d.status === "bezig";
      if (filter === "afgerond") return d.status === "afgerond" || d.status === "geannuleerd";
      return true;
    })
    .filter((d) => {
      if (!zoekterm) return true;
      const term = zoekterm.toLowerCase();
      return (
        d.klant_naam.toLowerCase().includes(term) ||
        d.locatie.toLowerCase().includes(term) ||
        d.functie.toLowerCase().includes(term)
      );
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Diensten</h2>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nieuwe dienst
        </button>
      </div>

      {/* Filter tabs + zoek */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-2">
          {(["alle", "open", "vol", "afgerond"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-[#F27501] text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {f === "alle" ? "Alle" : f === "open" ? "Open" : f === "vol" ? "Gevuld" : "Afgerond"}
              {f === "open" && (
                <span className="ml-1 text-xs">
                  ({diensten.filter((d) => d.status === "open").length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Zoek op klant, locatie, functie..."
            value={zoekterm}
            onChange={(e) => setZoekterm(e.target.value)}
            className="w-full px-4 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
          />
        </div>
      </div>

      {/* Diensten grid */}
      {filteredDiensten.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <p className="text-neutral-500">Geen diensten gevonden</p>
          <button
            onClick={openNewModal}
            className="mt-4 text-[#F27501] font-medium hover:underline"
          >
            Maak je eerste dienst aan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDiensten.map((dienst) => (
            <div
              key={dienst.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold capitalize">
                      {dienst.functie}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[dienst.status]}`}>
                      {statusLabels[dienst.status]}
                    </span>
                    {dienst.is_spoeddienst && (
                      <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                        SPOED
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mt-2">{dienst.klant_naam}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(dienst)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                    title="Bewerken"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteDienst(dienst.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Verwijderen"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4 text-sm text-neutral-600">
                <p>📍 {dienst.locatie}</p>
                <p>🕐 {formatDate(dienst.datum)} · {formatTime(dienst.start_tijd)} - {formatTime(dienst.eind_tijd)}</p>
                {dienst.uurtarief && <p>💰 <span className="font-semibold text-neutral-900">€{dienst.uurtarief.toFixed(2)}/uur</span></p>}
                <p>👥 {dienst.aantal_nodig} nodig</p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => openAanmeldingenModal(dienst)}
                  className="w-full px-4 py-2 bg-neutral-100 text-neutral-700 font-medium rounded-xl hover:bg-neutral-200 transition-colors text-sm"
                >
                  Aanmeldingen bekijken
                </button>
                {dienst.is_spoeddienst && dienst.spoeddienst_token && (
                  <button
                    onClick={() => openSpoedModal(dienst)}
                    className="w-full px-4 py-2 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    </svg>
                    Spoeddienst beheren
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-neutral-900">
                {editingDienst ? "Dienst bewerken" : "Nieuwe dienst"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Klant/Bedrijf *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.klant_naam}
                    onChange={(e) => setFormData({ ...formData, klant_naam: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                    placeholder="Naam van klant of bedrijf"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.klant_email}
                    onChange={(e) => setFormData({ ...formData, klant_email: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Telefoon
                  </label>
                  <input
                    type="tel"
                    value={formData.klant_telefoon}
                    onChange={(e) => setFormData({ ...formData, klant_telefoon: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Locatie *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.locatie}
                    onChange={(e) => setFormData({ ...formData, locatie: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                    placeholder="Adres of stad"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Datum *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.datum}
                    onChange={(e) => setFormData({ ...formData, datum: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Start *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.start_tijd}
                      onChange={(e) => setFormData({ ...formData, start_tijd: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Eind *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.eind_tijd}
                      onChange={(e) => setFormData({ ...formData, eind_tijd: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Functie *
                  </label>
                  <select
                    value={formData.functie}
                    onChange={(e) => setFormData({ ...formData, functie: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  >
                    {functieOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Aantal nodig *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.aantal_nodig}
                    onChange={(e) => setFormData({ ...formData, aantal_nodig: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Uurtarief
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={formData.uurtarief}
                    onChange={(e) => setFormData({ ...formData, uurtarief: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                    placeholder="Optioneel"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Afbeelding URL
                  </label>
                  <input
                    type="url"
                    value={formData.afbeelding}
                    onChange={(e) => setFormData({ ...formData, afbeelding: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                    placeholder="https://..."
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Notities
                  </label>
                  <textarea
                    value={formData.notities}
                    onChange={(e) => setFormData({ ...formData, notities: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] resize-none"
                    placeholder="Extra informatie voor medewerkers..."
                  />
                </div>

                {/* Spoeddienst toggle */}
                <div className="col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-neutral-200 hover:bg-orange-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.is_spoeddienst}
                      onChange={(e) => setFormData({ ...formData, is_spoeddienst: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors relative ${formData.is_spoeddienst ? "bg-[#F27501]" : "bg-neutral-300"}`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.is_spoeddienst ? "translate-x-5" : ""}`} />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-neutral-900">Spoeddienst</span>
                      <p className="text-xs text-neutral-500">
                        Genereert een WhatsApp bericht met link om snel medewerkers te vinden
                      </p>
                    </div>
                    {formData.is_spoeddienst && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold animate-pulse">
                        SPOED
                      </span>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-50 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Opslaan..." : editingDienst ? "Bijwerken" : "Aanmaken"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Aanmeldingen Modal */}
      {showAanmeldingenModal && selectedDienst && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-neutral-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">Aanmeldingen</h3>
                  <p className="text-sm text-neutral-500">
                    {selectedDienst.klant_naam} - {formatDate(selectedDienst.datum)}
                  </p>
                </div>
                <button
                  onClick={() => setShowAanmeldingenModal(false)}
                  className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span className="text-neutral-500">
                  {aanmeldingen.filter((a) => a.status === "geaccepteerd").length} / {selectedDienst.aantal_nodig} geaccepteerd
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedDienst.status]}`}>
                  {statusLabels[selectedDienst.status]}
                </span>
              </div>
            </div>

            <div className="p-6">
              {aanmeldingen.length === 0 ? (
                <p className="text-center text-neutral-500 py-8">
                  Nog geen aanmeldingen voor deze dienst
                </p>
              ) : (
                <div className="space-y-3">
                  {aanmeldingen.map((aanmelding) => (
                    <div
                      key={aanmelding.id}
                      className={`p-4 rounded-xl border ${
                        aanmelding.status === "geaccepteerd"
                          ? "border-green-200 bg-green-50"
                          : aanmelding.status === "afgewezen"
                          ? "border-red-200 bg-red-50"
                          : "border-neutral-200 bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-neutral-900">
                            {aanmelding.medewerker?.naam || "Onbekend"}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {aanmelding.medewerker?.email}
                          </p>
                          {aanmelding.medewerker?.telefoon && (
                            <p className="text-sm text-neutral-500">
                              {aanmelding.medewerker.telefoon}
                            </p>
                          )}
                        </div>
                        {aanmelding.status === "aangemeld" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateAanmeldingStatus(aanmelding.id, "geaccepteerd")}
                              className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                            >
                              Accepteren
                            </button>
                            <button
                              onClick={() => updateAanmeldingStatus(aanmelding.id, "afgewezen")}
                              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                            >
                              Afwijzen
                            </button>
                          </div>
                        )}
                        {aanmelding.status !== "aangemeld" && (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              aanmelding.status === "geaccepteerd"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {aanmelding.status === "geaccepteerd" ? "Geaccepteerd" : "Afgewezen"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-neutral-100">
              <button
                onClick={() => setShowAanmeldingenModal(false)}
                className="w-full px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spoeddienst Modal */}
      {showSpoedModal && spoedDienst && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-neutral-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">SPOED</span>
                  <div>
                    <h3 className="text-xl font-bold text-neutral-900">Spoeddienst beheren</h3>
                    <p className="text-sm text-neutral-500">
                      {spoedDienst.klant_naam} - {formatDate(spoedDienst.datum)} · {formatTime(spoedDienst.start_tijd)} - {formatTime(spoedDienst.eind_tijd)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSpoedModal(false)}
                  className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* WhatsApp tekst */}
            <div className="p-6 border-b border-neutral-100">
              <h4 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                </svg>
                WhatsApp bericht
              </h4>
              <div className="bg-neutral-50 rounded-xl p-4 font-mono text-sm whitespace-pre-wrap text-neutral-700 mb-3">
                {spoedDienst.spoeddienst_whatsapp_tekst || "Geen tekst beschikbaar"}
              </div>
              <button
                onClick={() => spoedDienst.spoeddienst_whatsapp_tekst && copyWhatsApp(spoedDienst.spoeddienst_whatsapp_tekst)}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                  spoedCopied
                    ? "bg-green-500 text-white"
                    : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                }`}
              >
                {spoedCopied ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Gekopieerd!
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Kopieer naar WhatsApp
                  </>
                )}
              </button>
            </div>

            {/* Responses */}
            <div className="p-6">
              <h4 className="text-sm font-semibold text-neutral-700 mb-3">
                Reacties ({spoedResponses.length})
              </h4>

              {spoedResponses.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <p>Nog geen reacties ontvangen</p>
                  <p className="text-xs mt-1">Deel het WhatsApp bericht om reacties te ontvangen</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {spoedResponses.map((response) => (
                    <div
                      key={response.id}
                      className={`p-4 rounded-xl border ${
                        response.status === "bevestigd"
                          ? "border-green-200 bg-green-50"
                          : response.status === "afgewezen"
                          ? "border-red-200 bg-red-50"
                          : "border-orange-200 bg-orange-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-neutral-900">{response.naam}</p>
                          <p className="text-sm text-neutral-500">{response.telefoon}</p>
                          <p className="text-xs text-neutral-400 mt-1">
                            {new Date(response.created_at).toLocaleString("nl-NL", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {response.medewerker_id && (
                              <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                Bekend
                              </span>
                            )}
                          </p>
                        </div>
                        {response.status === "beschikbaar" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateSpoedResponse(response.id, "bevestigd")}
                              className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                            >
                              Bevestig
                            </button>
                            <button
                              onClick={() => updateSpoedResponse(response.id, "afgewezen")}
                              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                            >
                              Afwijzen
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              response.status === "bevestigd"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {response.status === "bevestigd" ? "Bevestigd" : "Afgewezen"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-neutral-100">
              <button
                onClick={() => setShowSpoedModal(false)}
                className="w-full px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
