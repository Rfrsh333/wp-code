"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Medewerker {
  id: string;
  naam: string;
  email: string;
}

interface Shift {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  wage: number;
  seats: number;
  status: string;
  company?: {
    name: string;
    logo_url: string | null;
  };
  has_applied?: boolean;
  application_status?: string;
}

interface Application {
  id: string;
  shift_id: string;
  status: string;
  applied_at: string;
  shift?: Shift;
}

export default function MedewerkerShiftsClient({ medewerker }: { medewerker: Medewerker }) {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<"beschikbaar" | "mijn">("beschikbaar");
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [coverText, setCoverText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/medewerker/shifts");
      if (!res.ok) throw new Error("Laden mislukt");
      const data = await res.json();
      setShifts(data.shifts || []);
      setApplications(data.applications || []);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      setFeedback({ type: "error", message: "Kon shifts niet laden" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApply = async (shiftId: string) => {
    if (!coverText.trim()) {
      setFeedback({ type: "error", message: "Motivatie is verplicht" });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/medewerker/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          shift_id: shiftId,
          cover_text: coverText,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sollicitatie mislukt");
      }

      setFeedback({ type: "success", message: "Sollicitatie verstuurd! ✅" });
      setCoverText("");
      setSelectedShift(null);
      await fetchData();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Er ging iets mis",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async (applicationId: string) => {
    if (!confirm("Weet je zeker dat je je sollicitatie wilt intrekken?")) return;

    try {
      const res = await fetch("/api/medewerker/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "withdraw",
          application_id: applicationId,
        }),
      });

      if (!res.ok) throw new Error("Intrekken mislukt");

      setFeedback({ type: "success", message: "Sollicitatie ingetrokken" });
      await fetchData();
    } catch (error) {
      setFeedback({ type: "error", message: "Kon sollicitatie niet intrekken" });
    }
  };

  const handleLogout = async () => {
    await fetch("/api/medewerker/logout", { method: "POST" });
    router.push("/medewerker/login");
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("nl-NL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatWage = (cents: number) => {
    return `€${cents.toFixed(2)}`;
  };

  const availableShifts = shifts.filter((s) => s.status === "open" && !s.has_applied);
  const myApplications = applications;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-bold text-[#F27501]">TopTalent</h1>
              <p className="text-sm text-neutral-600">Welkom, {medewerker.naam}</p>
            </div>
            <nav className="flex items-center gap-4">
              <a
                href="/medewerker/diensten"
                className="text-sm text-neutral-600 hover:text-neutral-900 font-medium"
              >
                Mijn Diensten
              </a>
              <button
                onClick={handleLogout}
                className="text-sm px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg font-medium transition-colors"
              >
                Uitloggen
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Feedback */}
        {feedback && (
          <div
            className={`mb-6 p-4 rounded-xl ${
              feedback.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-neutral-200">
          <button
            onClick={() => setTab("beschikbaar")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              tab === "beschikbaar"
                ? "text-[#F27501] border-[#F27501]"
                : "text-neutral-500 border-transparent hover:text-neutral-700"
            }`}
          >
            Beschikbare Shifts ({availableShifts.length})
          </button>
          <button
            onClick={() => setTab("mijn")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              tab === "mijn"
                ? "text-[#F27501] border-[#F27501]"
                : "text-neutral-500 border-transparent hover:text-neutral-700"
            }`}
          >
            Mijn Sollicitaties ({myApplications.length})
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div>
          </div>
        )}

        {/* Beschikbare Shifts Tab */}
        {!isLoading && tab === "beschikbaar" && (
          <div>
            {availableShifts.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                Geen beschikbare shifts op dit moment
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-neutral-900">{shift.title}</h3>
                        <p className="text-sm text-neutral-600">{shift.company?.name}</p>
                      </div>
                      <span className="px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                        {shift.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <span>📍</span>
                        <span>{shift.location || "Locatie volgt"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <span>🕐</span>
                        <span>{formatDateTime(shift.start_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <span>💰</span>
                        <span className="font-semibold text-neutral-900">{formatWage(shift.wage)}/uur</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <span>👥</span>
                        <span>{shift.seats} plekken beschikbaar</span>
                      </div>
                    </div>

                    {shift.description && (
                      <p className="text-sm text-neutral-600 mb-4 line-clamp-2">{shift.description}</p>
                    )}

                    <button
                      onClick={() => setSelectedShift(shift)}
                      className="w-full px-4 py-2 bg-[#F27501] hover:bg-[#d96800] text-white font-semibold rounded-xl transition-colors"
                    >
                      Solliciteer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mijn Sollicitaties Tab */}
        {!isLoading && tab === "mijn" && (
          <div>
            {myApplications.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                Je hebt nog geen sollicitaties
              </div>
            ) : (
              <div className="space-y-4">
                {myApplications.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-neutral-900">
                            {app.shift?.title}
                          </h3>
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              app.status === "accepted"
                                ? "bg-green-100 text-green-700"
                                : app.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {app.status === "accepted"
                              ? "Geaccepteerd"
                              : app.status === "rejected"
                              ? "Afgewezen"
                              : "In behandeling"}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-600 mb-3">
                          {app.shift?.company?.name} · {app.shift?.location}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-neutral-600">
                          <span>🕐 {app.shift?.start_at && formatDateTime(app.shift.start_at)}</span>
                          <span>💰 {app.shift?.wage && formatWage(app.shift.wage)}/uur</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-2">
                          Gesolliciteerd op {formatDateTime(app.applied_at)}
                        </p>
                      </div>
                      {app.status === "pending" && (
                        <button
                          onClick={() => handleWithdraw(app.id)}
                          className="ml-4 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Intrekken
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Sollicitatie Modal */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">{selectedShift.title}</h2>
                <p className="text-neutral-600">{selectedShift.company?.name}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedShift(null);
                  setCoverText("");
                  setFeedback(null);
                }}
                className="text-neutral-400 hover:text-neutral-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2 text-neutral-600">
                <span>📍</span>
                <span>{selectedShift.location || "Locatie volgt"}</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-600">
                <span>🕐</span>
                <span>{formatDateTime(selectedShift.start_at)}</span>
              </div>
              {selectedShift.end_at && (
                <div className="flex items-center gap-2 text-neutral-600">
                  <span>🏁</span>
                  <span>{formatDateTime(selectedShift.end_at)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-neutral-600">
                <span>💰</span>
                <span className="font-semibold text-neutral-900">{formatWage(selectedShift.wage)} per uur</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-600">
                <span>👥</span>
                <span>{selectedShift.seats} plekken beschikbaar</span>
              </div>
            </div>

            {selectedShift.description && (
              <div className="mb-6 p-4 bg-neutral-50 rounded-xl">
                <p className="text-sm text-neutral-700">{selectedShift.description}</p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 mb-2">
                Motivatie *
              </label>
              <textarea
                value={coverText}
                onChange={(e) => setCoverText(e.target.value)}
                placeholder="Vertel kort waarom je geschikt bent voor deze shift (bijv. ervaring, beschikbaarheid, vaardigheden)"
                rows={6}
                className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#F27501] focus:border-transparent resize-none"
                required
              />
              <p className="text-xs text-neutral-500 mt-2">
                Dit helpt de werkgever om je sollicitatie te beoordelen
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedShift(null);
                  setCoverText("");
                  setFeedback(null);
                }}
                className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={() => handleApply(selectedShift.id)}
                disabled={isSubmitting || !coverText.trim()}
                className="flex-1 px-6 py-3 bg-[#F27501] hover:bg-[#d96800] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Versturen..." : "Solliciteer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
