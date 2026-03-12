"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import StarRating from "@/components/ui/StarRating";
import MedewerkerDetailView from "./MedewerkerDetailView";

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
  heeft_wachtwoord?: boolean;
  admin_score_aanwezigheid?: number | null;
  admin_score_vaardigheden?: number | null;
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
    admin_score_aanwezigheid: 0,
    admin_score_vaardigheden: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [viewingMedewerkerId, setViewingMedewerkerId] = useState<string | null>(null);

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const fetchMedewerkers = useCallback(async () => {
    setIsLoading(true);
    const headers = await getAuthHeader();
    const res = await fetch("/api/admin/medewerkers", { headers });
    const { data } = await res.json();
    setMedewerkers(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchMedewerkers();
    })();
  }, [fetchMedewerkers]);

  const openNewModal = () => {
    setEditingMedewerker(null);
    setTemporaryPassword(null);
    setFeedback(null);
    setFormData({
      naam: "",
      email: "",
      telefoon: "",
      wachtwoord: "",
      functie: [],
      uurtarief: "15.00",
      status: "actief",
      notities: "",
      admin_score_aanwezigheid: 0,
      admin_score_vaardigheden: 0,
    });
    setShowModal(true);
  };

  const openEditModal = (medewerker: Medewerker) => {
    setEditingMedewerker(medewerker);
    setTemporaryPassword(null);
    setFeedback(null);
    setFormData({
      naam: medewerker.naam,
      email: medewerker.email,
      telefoon: medewerker.telefoon || "",
      wachtwoord: "",
      functie: medewerker.functie || [],
      uurtarief: medewerker.uurtarief.toString(),
      status: medewerker.status,
      notities: medewerker.notities || "",
      admin_score_aanwezigheid: medewerker.admin_score_aanwezigheid || 0,
      admin_score_vaardigheden: medewerker.admin_score_vaardigheden || 0,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    setTemporaryPassword(null);

    const headers = await getAuthHeader();
    const payload = {
      naam: formData.naam,
      email: formData.email,
      telefoon: formData.telefoon || null,
      functie: formData.functie,
      uurtarief: parseFloat(formData.uurtarief),
      status: formData.status,
      notities: formData.notities || null,
      wachtwoord: formData.wachtwoord || undefined,
    };

    const response = await fetch("/api/admin/medewerkers", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        action: editingMedewerker ? "update" : "create",
        id: editingMedewerker?.id,
        data: payload,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setIsSaving(false);
      setFeedback(result.error || "Opslaan mislukt");
      return;
    }

    // Save admin scores if editing and scores are set
    if (editingMedewerker && formData.admin_score_aanwezigheid > 0 && formData.admin_score_vaardigheden > 0) {
      await fetch("/api/admin/medewerkers", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_scores",
          id: editingMedewerker.id,
          data: {
            admin_score_aanwezigheid: formData.admin_score_aanwezigheid,
            admin_score_vaardigheden: formData.admin_score_vaardigheden,
          },
        }),
      });
    }

    setIsSaving(false);
    setShowModal(false);
    setFeedback(editingMedewerker ? "Medewerker bijgewerkt." : "Medewerker aangemaakt.");
    fetchMedewerkers();
  };

  const deleteMedewerker = async (id: string) => {
    if (!window.confirm("Weet u zeker dat u deze medewerker wilt verwijderen?")) return;
    const headers = await getAuthHeader();
    await fetch("/api/admin/medewerkers", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    setFeedback("Medewerker verwijderd.");
    fetchMedewerkers();
  };

  const generateTemporaryPassword = async () => {
    if (!editingMedewerker) return;

    setIsSaving(true);
    setFeedback(null);
    setTemporaryPassword(null);

    const headers = await getAuthHeader();
    const response = await fetch("/api/admin/medewerkers", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_password", id: editingMedewerker.id }),
    });
    const result = await response.json();

    setIsSaving(false);

    if (!response.ok) {
      setFeedback(result.error || "Tijdelijk wachtwoord genereren mislukt.");
      return;
    }

    setTemporaryPassword(result.temporaryPassword || null);
    setFeedback("Tijdelijk wachtwoord gegenereerd. Geef dit veilig aan de medewerker door.");
    await fetchMedewerkers();
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

  if (viewingMedewerkerId) {
    return (
      <MedewerkerDetailView
        medewerkerId={viewingMedewerkerId}
        onBack={() => setViewingMedewerkerId(null)}
      />
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

      {feedback && (
        <div className="mb-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 shadow-sm">
          {feedback}
        </div>
      )}

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
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Naam</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Contact</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Functie(s)</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Uurtarief</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Status</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Login</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-neutral-600">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {medewerkers.map((medewerker) => (
              <tr key={medewerker.id} className="hover:bg-neutral-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingMedewerkerId(medewerker.id)}
                      className="font-medium text-neutral-900 hover:text-[#F27501] transition-colors text-left"
                    >
                      {medewerker.naam}
                    </button>
                    {medewerker.admin_score_aanwezigheid && medewerker.admin_score_vaardigheden && (
                      <span className="flex items-center gap-0.5 text-xs text-[#F27501]">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#F27501" stroke="none">
                          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        {((medewerker.admin_score_aanwezigheid + medewerker.admin_score_vaardigheden) / 2).toFixed(1)}
                      </span>
                    )}
                  </div>
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
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      medewerker.heeft_wachtwoord
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {medewerker.heeft_wachtwoord ? "Wachtwoord ingesteld" : "Nog geen wachtwoord"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setViewingMedewerkerId(medewerker.id)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm mr-3"
                  >
                    Bekijk profiel
                  </button>
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
              {editingMedewerker && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">Accounttoegang</p>
                      <p className="text-sm text-neutral-500">
                        {editingMedewerker.heeft_wachtwoord
                          ? "Deze medewerker heeft al een wachtwoord."
                          : "Deze medewerker heeft nog geen wachtwoord ingesteld."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void generateTemporaryPassword()}
                      disabled={isSaving}
                      className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      {isSaving ? "Bezig..." : editingMedewerker.heeft_wachtwoord ? "Reset tijdelijk wachtwoord" : "Maak tijdelijk wachtwoord"}
                    </button>
                  </div>

                  {temporaryPassword && (
                    <div className="rounded-lg bg-white border border-blue-200 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">
                        Tijdelijk wachtwoord
                      </p>
                      <p className="font-mono text-sm text-neutral-900 break-all">{temporaryPassword}</p>
                      <p className="mt-2 text-xs text-neutral-500">
                        Dit wachtwoord wordt alleen nu getoond. Sla het veilig op of deel het direct met de medewerker.
                      </p>
                    </div>
                  )}
                </div>
              )}

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

              {editingMedewerker && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-sm font-semibold text-neutral-900 mb-3">Admin Beoordeling</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600">Aanwezigheid & op tijd</span>
                      <StarRating
                        value={formData.admin_score_aanwezigheid}
                        onChange={(v) => setFormData({ ...formData, admin_score_aanwezigheid: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600">Vaardigheden</span>
                      <StarRating
                        value={formData.admin_score_vaardigheden}
                        onChange={(v) => setFormData({ ...formData, admin_score_vaardigheden: v })}
                      />
                    </div>
                  </div>
                </div>
              )}

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
