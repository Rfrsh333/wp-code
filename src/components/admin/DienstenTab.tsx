"use client";

import { useState, useEffect } from "react";
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
  status: "open" | "vol" | "bezig" | "afgerond" | "geannuleerd";
  notities: string | null;
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

const functieOptions = [
  { value: "bediening", label: "Bediening" },
  { value: "bar", label: "Bar" },
  { value: "keuken", label: "Keuken" },
  { value: "afwas", label: "Afwas" },
];

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  vol: "bg-green-100 text-green-700",
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
    notities: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState<"alle" | "open" | "vol" | "afgerond">("alle");

  const fetchDiensten = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("diensten")
      .select("*")
      .order("datum", { ascending: true });

    if (!error && data) {
      setDiensten(data);
    }
    setIsLoading(false);
  };

  const fetchAanmeldingen = async (dienstId: string) => {
    const { data, error } = await supabase
      .from("dienst_aanmeldingen")
      .select(`
        *,
        medewerker:medewerkers(naam, email, telefoon)
      `)
      .eq("dienst_id", dienstId)
      .order("aangemeld_at", { ascending: true });

    if (!error && data) {
      setAanmeldingen(data.map(a => ({
        ...a,
        medewerker: a.medewerker as unknown as Aanmelding["medewerker"]
      })));
    }
  };

  useEffect(() => {
    fetchDiensten();
  }, []);

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
      notities: "",
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
      functie: dienst.functie,
      aantal_nodig: dienst.aantal_nodig.toString(),
      uurtarief: dienst.uurtarief?.toString() || "",
      notities: dienst.notities || "",
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

    const data = {
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
      notities: formData.notities || null,
    };

    if (editingDienst) {
      await supabase.from("diensten").update(data).eq("id", editingDienst.id);
    } else {
      await supabase.from("diensten").insert(data);
    }

    setIsSaving(false);
    setShowModal(false);
    fetchDiensten();
  };

  const deleteDienst = async (id: string) => {
    if (confirm("Weet je zeker dat je deze dienst wilt verwijderen?")) {
      await supabase.from("diensten").delete().eq("id", id);
      fetchDiensten();
    }
  };

  const updateDienstStatus = async (id: string, status: Dienst["status"]) => {
    await supabase.from("diensten").update({ status }).eq("id", id);
    fetchDiensten();
  };

  const updateAanmeldingStatus = async (
    aanmeldingId: string,
    status: Aanmelding["status"]
  ) => {
    await supabase
      .from("dienst_aanmeldingen")
      .update({ status, beoordeeld_at: new Date().toISOString() })
      .eq("id", aanmeldingId);

    if (selectedDienst) {
      await fetchAanmeldingen(selectedDienst.id);

      // Check if dienst is now full
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

  const filteredDiensten = diensten.filter((d) => {
    if (filter === "alle") return true;
    if (filter === "open") return d.status === "open";
    if (filter === "vol") return d.status === "vol" || d.status === "bezig";
    if (filter === "afgerond") return d.status === "afgerond" || d.status === "geannuleerd";
    return true;
  });

  // Group diensten by date
  const dienstenByDate = filteredDiensten.reduce((acc, dienst) => {
    const date = dienst.datum;
    if (!acc[date]) acc[date] = [];
    acc[date].push(dienst);
    return acc;
  }, {} as Record<string, Dienst[]>);

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

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
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

      {/* Diensten grouped by date */}
      {Object.keys(dienstenByDate).length === 0 ? (
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
        <div className="space-y-6">
          {Object.entries(dienstenByDate).map(([date, dateDiensten]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-neutral-500 mb-3">
                {formatDate(date)}
              </h3>
              <div className="space-y-3">
                {dateDiensten.map((dienst) => (
                  <div
                    key={dienst.id}
                    className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-neutral-900">
                            {dienst.klant_naam}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              statusColors[dienst.status]
                            }`}
                          >
                            {statusLabels[dienst.status]}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium capitalize">
                            {dienst.functie}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-neutral-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatTime(dienst.start_tijd)} - {formatTime(dienst.eind_tijd)}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {dienst.locatie}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {dienst.aantal_nodig} nodig
                          </span>
                          {dienst.uurtarief && (
                            <span className="text-[#F27501] font-medium">
                              €{dienst.uurtarief.toFixed(2)}/uur
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openAanmeldingenModal(dienst)}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                        >
                          Aanmeldingen
                        </button>
                        <button
                          onClick={() => openEditModal(dienst)}
                          className="px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-200 transition-colors"
                        >
                          Bewerken
                        </button>
                        <button
                          onClick={() => deleteDienst(dienst.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
                    Uurtarief (€)
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
    </div>
  );
}
