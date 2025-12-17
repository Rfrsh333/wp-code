"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

interface Medewerker {
  id: string;
  naam: string;
  email: string;
  telefoon: string | null;
  functie: string[];
  uurtarief: number;
  status: "actief" | "inactief";
  notities: string | null;
  created_at: string;
}

const functieOptions = [
  { value: "bediening", label: "Bediening" },
  { value: "bar", label: "Bar" },
  { value: "keuken", label: "Keuken" },
  { value: "afwas", label: "Afwas" },
];

export default function MedewerkersTab() {
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMedewerker, setEditingMedewerker] = useState<Medewerker | null>(null);
  const [formData, setFormData] = useState({
    naam: "",
    email: "",
    telefoon: "",
    wachtwoord: "",
    functie: [] as string[],
    uurtarief: "15.00",
    status: "actief" as "actief" | "inactief",
    notities: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchMedewerkers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("medewerkers")
      .select("*")
      .order("naam", { ascending: true });

    if (!error && data) {
      setMedewerkers(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMedewerkers();
  }, []);

  const openNewModal = () => {
    setEditingMedewerker(null);
    setFormData({
      naam: "",
      email: "",
      telefoon: "",
      wachtwoord: "",
      functie: [],
      uurtarief: "15.00",
      status: "actief",
      notities: "",
    });
    setShowModal(true);
  };

  const openEditModal = (medewerker: Medewerker) => {
    setEditingMedewerker(medewerker);
    setFormData({
      naam: medewerker.naam,
      email: medewerker.email,
      telefoon: medewerker.telefoon || "",
      wachtwoord: "",
      functie: medewerker.functie || [],
      uurtarief: medewerker.uurtarief.toString(),
      status: medewerker.status,
      notities: medewerker.notities || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const data: Record<string, unknown> = {
      naam: formData.naam,
      email: formData.email,
      telefoon: formData.telefoon || null,
      functie: formData.functie,
      uurtarief: parseFloat(formData.uurtarief),
      status: formData.status,
      notities: formData.notities || null,
    };

    if (formData.wachtwoord) {
      data.wachtwoord = await bcrypt.hash(formData.wachtwoord, 10);
    }

    if (editingMedewerker) {
      await supabase.from("medewerkers").update(data).eq("id", editingMedewerker.id);
    } else {
      await supabase.from("medewerkers").insert(data);
    }

    setIsSaving(false);
    setShowModal(false);
    fetchMedewerkers();
  };

  const deleteMedewerker = async (id: string) => {
    if (confirm("Weet je zeker dat je deze medewerker wilt verwijderen?")) {
      await supabase.from("medewerkers").delete().eq("id", id);
      fetchMedewerkers();
    }
  };

  const toggleFunctie = (functie: string) => {
    setFormData((prev) => ({
      ...prev,
      functie: prev.functie.includes(functie)
        ? prev.functie.filter((f) => f !== functie)
        : [...prev.functie, functie],
    }));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

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
        <h2 className="text-2xl font-bold text-neutral-900">Medewerkers</h2>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nieuwe medewerker
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Totaal medewerkers</p>
          <p className="text-2xl font-bold text-neutral-900">{medewerkers.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Actief</p>
          <p className="text-2xl font-bold text-green-600">
            {medewerkers.filter((m) => m.status === "actief").length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Inactief</p>
          <p className="text-2xl font-bold text-neutral-400">
            {medewerkers.filter((m) => m.status === "inactief").length}
          </p>
        </div>
      </div>

      {/* Medewerkers list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Naam</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Contact</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Functie(s)</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Uurtarief</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Status</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-neutral-600">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {medewerkers.map((medewerker) => (
              <tr key={medewerker.id} className="hover:bg-neutral-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-neutral-900">{medewerker.naam}</p>
                  <p className="text-sm text-neutral-500">Sinds {formatDate(medewerker.created_at)}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-neutral-900">{medewerker.email}</p>
                  <p className="text-sm text-neutral-500">{medewerker.telefoon || "-"}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {medewerker.functie?.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium capitalize"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-neutral-900">€{medewerker.uurtarief.toFixed(2)}</p>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      medewerker.status === "actief"
                        ? "bg-green-100 text-green-700"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {medewerker.status === "actief" ? "Actief" : "Inactief"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openEditModal(medewerker)}
                    className="text-[#F27501] hover:text-[#d96800] font-medium text-sm mr-3"
                  >
                    Bewerken
                  </button>
                  <button
                    onClick={() => deleteMedewerker(medewerker.id)}
                    className="text-red-500 hover:text-red-700 font-medium text-sm"
                  >
                    Verwijderen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {medewerkers.length === 0 && (
          <div className="text-center py-12 text-neutral-500">
            Nog geen medewerkers. Voeg je eerste medewerker toe!
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-neutral-900">
                {editingMedewerker ? "Medewerker bewerken" : "Nieuwe medewerker"}
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
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Naam *
                </label>
                <input
                  type="text"
                  required
                  value={formData.naam}
                  onChange={(e) => setFormData({ ...formData, naam: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  placeholder="Volledige naam"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  placeholder="email@voorbeeld.nl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Telefoon
                </label>
                <input
                  type="tel"
                  value={formData.telefoon}
                  onChange={(e) => setFormData({ ...formData, telefoon: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  placeholder="06 12345678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Wachtwoord {editingMedewerker ? "(laat leeg om niet te wijzigen)" : "*"}
                </label>
                <input
                  type="password"
                  value={formData.wachtwoord}
                  onChange={(e) => setFormData({ ...formData, wachtwoord: e.target.value })}
                  required={!editingMedewerker}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Functie(s) *
                </label>
                <div className="flex flex-wrap gap-2">
                  {functieOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleFunctie(option.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        formData.functie.includes(option.value)
                          ? "bg-[#F27501] text-white"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Status
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: "actief" })}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      formData.status === "actief"
                        ? "bg-green-500 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    Actief
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: "inactief" })}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      formData.status === "inactief"
                        ? "bg-neutral-500 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    Inactief
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Notities
                </label>
                <textarea
                  value={formData.notities}
                  onChange={(e) => setFormData({ ...formData, notities: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] resize-none"
                  placeholder="Eventuele opmerkingen..."
                />
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
                  disabled={isSaving || formData.functie.length === 0}
                  className="flex-1 px-4 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Opslaan..." : editingMedewerker ? "Bijwerken" : "Toevoegen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
