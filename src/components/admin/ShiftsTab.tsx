"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

interface Company {
  id: string;
  name: string;
  address?: string | null;
  logo_url?: string | null;
  owner_id: string;
  created_at: string;
}

interface Shift {
  id: string;
  company_id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_at: string;
  end_at?: string | null;
  wage: number;
  seats: number;
  status: string;
  created_at: string;
  company?: {
    id: string;
    name: string;
    logo_url?: string | null;
  };
}

interface Application {
  id: string;
  shift_id: string;
  candidate_id: string;
  cover_text?: string | null;
  status: string;
  applied_at: string;
  candidate?: {
    full_name?: string | null;
    phone?: string | null;
  };
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCentsToEuro(cents: number) {
  return `€${cents.toFixed(2)}`;
}

export default function ShiftsTab() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newShift, setNewShift] = useState({
    company_id: "",
    title: "",
    description: "",
    location: "",
    start_at: "",
    end_at: "",
    wage: "18",
    seats: "1",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load all companies
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (companiesError) throw companiesError;

      setCompanies((companiesData || []) as Company[]);

      // If we have companies, load shifts for all companies
      if (companiesData && companiesData.length > 0) {
        const { data: shiftsData, error: shiftsError } = await supabase
          .from("shifts")
          .select("*, company:companies(id, name, logo_url)")
          .order("start_at", { ascending: false });

        if (shiftsError) throw shiftsError;

        setShifts((shiftsData || []) as Shift[]);

        // Load all applications
        const shiftIds = (shiftsData || []).map((s) => s.id);
        if (shiftIds.length > 0) {
          const { data: applicationsData, error: applicationsError } = await supabase
            .from("applications")
            .select("id, shift_id, candidate_id, cover_text, status, applied_at, candidate:profiles!applications_candidate_id_fkey(full_name, phone)")
            .in("shift_id", shiftIds)
            .order("applied_at", { ascending: false });

          if (applicationsError) throw applicationsError;

          setApplications((applicationsData || []) as Application[]);
        }

        // Auto-select first company if none selected
        if (!selectedCompanyId && companiesData.length > 0) {
          setSelectedCompanyId(companiesData[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis bij het laden van de data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter shifts by selected company
  const companyShifts = useMemo(
    () => shifts.filter((shift) => shift.company_id === selectedCompanyId),
    [shifts, selectedCompanyId]
  );

  // Filter applications by selected shift
  const shiftApplications = useMemo(
    () => applications.filter((app) => app.shift_id === selectedShiftId),
    [applications, selectedShiftId]
  );

  // Count applications per shift
  const applicationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach((app) => {
      counts[app.shift_id] = (counts[app.shift_id] || 0) + 1;
    });
    return counts;
  }, [applications]);

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm("Weet je zeker dat je deze shift wilt verwijderen?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("shifts")
        .delete()
        .eq("id", shiftId);

      if (deleteError) throw deleteError;

      await loadData();
      if (selectedShiftId === shiftId) {
        setSelectedShiftId(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Verwijderen mislukt");
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      const { error: updateError } = await supabase
        .from("applications")
        .update({ status: newStatus })
        .eq("id", applicationId);

      if (updateError) throw updateError;

      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Status update mislukt");
    }
  };

  const handleCreateShift = async () => {
    try {
      if (!newShift.company_id || !newShift.title || !newShift.start_at) {
        alert("Bedrijf, titel en starttijd zijn verplicht");
        return;
      }

      const { error: createError } = await supabase.from("shifts").insert({
        company_id: newShift.company_id,
        title: newShift.title,
        description: newShift.description || null,
        location: newShift.location || null,
        start_at: new Date(newShift.start_at).toISOString(),
        end_at: newShift.end_at ? new Date(newShift.end_at).toISOString() : null,
        wage: parseFloat(newShift.wage),
        seats: parseInt(newShift.seats),
        status: "open",
      });

      if (createError) throw createError;

      setShowCreateModal(false);
      setNewShift({
        company_id: "",
        title: "",
        description: "",
        location: "",
        start_at: "",
        end_at: "",
        wage: "18",
        seats: "1",
      });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Shift aanmaken mislukt");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Horeca Shifts Beheer</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-[#F27501] rounded-lg hover:bg-[#d96800]"
          >
            ➕ Nieuwe Shift
          </button>
          <button
            onClick={() => loadData()}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50"
          >
            🔄 Ververs
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {companies.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
          <p className="text-neutral-500">Geen bedrijven gevonden</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Companies */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Bedrijven ({companies.length})</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {companies.map((company) => {
                const companyShiftCount = shifts.filter((s) => s.company_id === company.id).length;
                return (
                  <button
                    key={company.id}
                    onClick={() => {
                      setSelectedCompanyId(company.id);
                      setSelectedShiftId(null);
                    }}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      selectedCompanyId === company.id
                        ? "bg-[#F27501] text-white shadow-md"
                        : "bg-neutral-50 hover:bg-neutral-100 text-neutral-900"
                    }`}
                  >
                    <div className="font-semibold">{company.name}</div>
                    {company.address && (
                      <div className={`text-sm mt-1 ${selectedCompanyId === company.id ? "text-white/80" : "text-neutral-500"}`}>
                        {company.address}
                      </div>
                    )}
                    <div className={`text-sm mt-2 ${selectedCompanyId === company.id ? "text-white/90" : "text-neutral-600"}`}>
                      {companyShiftCount} shift{companyShiftCount !== 1 ? "s" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Middle Column: Shifts */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Shifts ({companyShifts.length})
            </h3>
            {companyShifts.length === 0 ? (
              <p className="text-neutral-500 text-sm">Geen shifts voor dit bedrijf</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {companyShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedShiftId === shift.id
                        ? "border-[#F27501] bg-orange-50"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                    onClick={() => setSelectedShiftId(shift.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-neutral-900">{shift.title}</h4>
                      <span className="px-2 py-1 text-xs rounded-full bg-neutral-100 text-neutral-600">
                        {shift.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-neutral-600">
                      <div>📍 {shift.location || "Locatie onbekend"}</div>
                      <div>🕐 {formatDateTime(shift.start_at)}</div>
                      <div>💰 {formatCentsToEuro(shift.wage)} per uur</div>
                      <div>👥 {shift.seats} plekken</div>
                      {applicationCounts[shift.id] > 0 && (
                        <div className="mt-2 pt-2 border-t border-neutral-200">
                          <span className="font-medium text-[#F27501]">
                            {applicationCounts[shift.id]} sollicitatie{applicationCounts[shift.id] !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteShift(shift.id);
                      }}
                      className="mt-3 text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      🗑️ Verwijderen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Applications */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Sollicitaties ({shiftApplications.length})
            </h3>
            {!selectedShiftId ? (
              <p className="text-neutral-500 text-sm">Selecteer een shift om sollicitaties te bekijken</p>
            ) : shiftApplications.length === 0 ? (
              <p className="text-neutral-500 text-sm">Geen sollicitaties voor deze shift</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {shiftApplications.map((app) => (
                  <div key={app.id} className="p-4 rounded-xl border border-neutral-200">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-neutral-900">
                          {app.candidate?.full_name || "Kandidaat"}
                        </h4>
                        {app.candidate?.phone && (
                          <p className="text-sm text-neutral-600">📱 {app.candidate.phone}</p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          app.status === "accepted"
                            ? "bg-green-100 text-green-700"
                            : app.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                    {app.cover_text && (
                      <p className="text-sm text-neutral-600 mb-3 line-clamp-3">{app.cover_text}</p>
                    )}
                    <p className="text-xs text-neutral-500 mb-3">
                      Gesolliciteerd: {formatDateTime(app.applied_at)}
                    </p>
                    {app.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateApplicationStatus(app.id, "accepted")}
                          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                        >
                          ✓ Accepteren
                        </button>
                        <button
                          onClick={() => handleUpdateApplicationStatus(app.id, "rejected")}
                          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                        >
                          ✗ Afwijzen
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Shift Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-2xl font-bold text-neutral-900">Nieuwe Shift Aanmaken</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-neutral-400 hover:text-neutral-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Bedrijf *
                </label>
                <select
                  value={newShift.company_id}
                  onChange={(e) => setNewShift({ ...newShift, company_id: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
                  required
                >
                  <option value="">Selecteer bedrijf</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Functie/Titel *
                </label>
                <input
                  type="text"
                  value={newShift.title}
                  onChange={(e) => setNewShift({ ...newShift, title: e.target.value })}
                  placeholder="Bijv. Barmedewerker, Kok, Serveerster"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Beschrijving
                </label>
                <textarea
                  value={newShift.description}
                  onChange={(e) => setNewShift({ ...newShift, description: e.target.value })}
                  placeholder="Extra informatie over de shift"
                  rows={3}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#F27501] focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Locatie
                </label>
                <input
                  type="text"
                  value={newShift.location}
                  onChange={(e) => setNewShift({ ...newShift, location: e.target.value })}
                  placeholder="Bijv. Amsterdam, Oudegracht 120 Utrecht"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Start *
                  </label>
                  <input
                    type="datetime-local"
                    value={newShift.start_at}
                    onChange={(e) => setNewShift({ ...newShift, start_at: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Einde
                  </label>
                  <input
                    type="datetime-local"
                    value={newShift.end_at}
                    onChange={(e) => setNewShift({ ...newShift, end_at: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Uurtarief (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newShift.wage}
                    onChange={(e) => setNewShift({ ...newShift, wage: e.target.value })}
                    placeholder="18.00"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Aantal plekken *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newShift.seats}
                    onChange={(e) => setNewShift({ ...newShift, seats: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleCreateShift}
                className="flex-1 px-6 py-3 bg-[#F27501] hover:bg-[#d96800] text-white font-semibold rounded-lg transition-colors"
              >
                Shift Aanmaken
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
