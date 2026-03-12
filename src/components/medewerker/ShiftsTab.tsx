"use client";

import { useState } from "react";
import EmptyState from "@/components/ui/EmptyState";

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
  company?: { name: string; logo_url: string | null };
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

interface ShiftsTabProps {
  shifts: Shift[];
  applications: Application[];
  onApply: (shiftId: string, coverText: string) => Promise<void>;
  onWithdraw: (applicationId: string) => void;
}

export default function ShiftsTab({ shifts, applications, onApply, onWithdraw }: ShiftsTabProps) {
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [coverText, setCoverText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableShifts = shifts.filter((s) => s.status === "open" && !s.has_applied);

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const formatWage = (cents: number) => `€${cents.toFixed(2)}`;

  const handleApply = async (shiftId: string) => {
    if (!coverText.trim()) return;
    setIsSubmitting(true);
    try {
      await onApply(shiftId, coverText);
      setCoverText("");
      setSelectedShift(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Beschikbare Shifts</h2>
      {availableShifts.length === 0 ? (
        <EmptyState
          title="Geen beschikbare shifts"
          description="Er zijn op dit moment geen openstaande shifts. Check later opnieuw."
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableShifts.map((shift) => (
            <div key={shift.id} className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">{shift.title}</h3>
                  <p className="text-sm text-neutral-600">{shift.company?.name}</p>
                </div>
                <span className="px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">Open</span>
              </div>
              <div className="space-y-2 mb-4 text-sm text-neutral-600">
                <p>📍 {shift.location || "Locatie volgt"}</p>
                <p>🕐 {formatDateTime(shift.start_at)}</p>
                <p>💰 <span className="font-semibold text-neutral-900">{formatWage(shift.wage)}/uur</span></p>
                <p>👥 {shift.seats} plekken</p>
              </div>
              {shift.description && <p className="text-sm text-neutral-600 mb-4 line-clamp-2">{shift.description}</p>}
              <button onClick={() => setSelectedShift(shift)} className="w-full px-4 py-2 bg-[#F27501] hover:bg-[#d96800] text-white font-semibold rounded-xl transition-colors">
                Solliciteer
              </button>
            </div>
          ))}
        </div>
      )}

      {applications.length > 0 && (
        <div className="mt-10">
          <h3 className="text-xl font-bold text-neutral-900 mb-4">Mijn Sollicitaties ({applications.length})</h3>
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-bold text-neutral-900">{app.shift?.title}</h4>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        app.status === "accepted" ? "bg-green-100 text-green-700" :
                        app.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {app.status === "accepted" ? "Geaccepteerd" : app.status === "rejected" ? "Afgewezen" : "In behandeling"}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600">{app.shift?.company?.name} · {app.shift?.location}</p>
                  </div>
                  {app.status === "pending" && (
                    <button onClick={() => onWithdraw(app.id)} className="ml-4 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      Intrekken
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sollicitatie Modal */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">{selectedShift.title}</h2>
                <p className="text-neutral-600">{selectedShift.company?.name}</p>
              </div>
              <button onClick={() => { setSelectedShift(null); setCoverText(""); }} className="text-neutral-400 hover:text-neutral-600 text-2xl leading-none">×</button>
            </div>
            <div className="space-y-2 mb-6 text-neutral-600">
              <p>📍 {selectedShift.location || "Locatie volgt"}</p>
              <p>🕐 {formatDateTime(selectedShift.start_at)}</p>
              <p>💰 <span className="font-semibold text-neutral-900">{formatWage(selectedShift.wage)} per uur</span></p>
              <p>👥 {selectedShift.seats} plekken beschikbaar</p>
            </div>
            {selectedShift.description && (
              <div className="mb-6 p-4 bg-neutral-50 rounded-xl">
                <p className="text-sm text-neutral-700">{selectedShift.description}</p>
              </div>
            )}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 mb-2">Motivatie *</label>
              <textarea
                value={coverText}
                onChange={(e) => setCoverText(e.target.value)}
                placeholder="Vertel kort waarom je geschikt bent voor deze shift"
                rows={5}
                className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#F27501] focus:border-transparent resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setSelectedShift(null); setCoverText(""); }} className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 font-semibold rounded-xl hover:bg-neutral-50 transition-colors">Annuleren</button>
              <button onClick={() => handleApply(selectedShift.id)} disabled={isSubmitting || !coverText.trim()} className="flex-1 px-6 py-3 bg-[#F27501] hover:bg-[#d96800] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? "Versturen..." : "Solliciteer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
