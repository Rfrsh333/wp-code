"use client";

import { useEffect, useState } from "react";
import { Plus, Calendar, Users, MapPin, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { TESTSHIFT_STATUS_CONFIG } from "./constants";
import type { CRMLead, CRMTestShift } from "./types";

interface TestShiftPanelProps {
  lead: CRMLead;
  onUpdate: (lead: CRMLead) => void;
}

export default function TestShiftPanel({ lead, onUpdate }: TestShiftPanelProps) {
  const [shifts, setShifts] = useState<CRMTestShift[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    shift_date: "",
    shift_time: "",
    shift_role: "bediening",
    people_count: 1,
    location: lead.address || "",
    notes: "",
  });
  const toast = useToast();

  useEffect(() => {
    fetchShifts();
  }, [lead.id]);

  async function getToken() {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function fetchShifts() {
    setLoading(true);
    const token = await getToken();
    const res = await fetch(`/api/admin/crm/test-shifts?lead_id=${lead.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setShifts(await res.json());
    setLoading(false);
  }

  async function createShift() {
    if (!formData.shift_date) return;
    const token = await getToken();
    const res = await fetch("/api/admin/crm/test-shifts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: lead.id, ...formData }),
    });
    if (res.ok) {
      toast.success("Testdienst gepland");
      setShowForm(false);
      setFormData({ shift_date: "", shift_time: "", shift_role: "bediening", people_count: 1, location: lead.address || "", notes: "" });
      fetchShifts();

      // Update lead status
      const updateRes = await fetch(`/api/admin/crm/leads/${lead.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "testdienst_ingepland", outreach_status: "interested" }),
      });
      if (updateRes.ok) {
        const updated = await updateRes.json();
        onUpdate({ ...lead, ...updated });
      }
    } else {
      toast.error("Aanmaken mislukt");
    }
  }

  async function updateShiftStatus(shiftId: string, newStatus: string) {
    const token = await getToken();
    const res = await fetch(`/api/admin/crm/test-shifts/${shiftId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      fetchShifts();

      // If geslaagd, offer to mark as klant
      if (newStatus === "geslaagd") {
        const updateRes = await fetch(`/api/admin/crm/leads/${lead.id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ status: "testdienst_afgerond" }),
        });
        if (updateRes.ok) {
          const updated = await updateRes.json();
          onUpdate({ ...lead, ...updated });
        }
        toast.success("Testdienst geslaagd! Markeer als klant?");
      } else if (newStatus === "mislukt") {
        const updateRes = await fetch(`/api/admin/crm/leads/${lead.id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ status: "testdienst_afgerond" }),
        });
        if (updateRes.ok) {
          const updated = await updateRes.json();
          onUpdate({ ...lead, ...updated });
        }
      }
    }
  }

  async function deleteShift(shiftId: string) {
    const token = await getToken();
    await fetch(`/api/admin/crm/test-shifts/${shiftId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchShifts();
  }

  const statusTransitions: Record<string, string[]> = {
    gepland: ["bevestigd", "geannuleerd"],
    bevestigd: ["uitgevoerd", "geannuleerd"],
    uitgevoerd: ["geslaagd", "mislukt"],
  };

  return (
    <div className="space-y-3">
      {/* Existing shifts */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-16 bg-neutral-100 rounded-lg" />
        </div>
      ) : shifts.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-4">Nog geen testdiensten</p>
      ) : (
        <div className="space-y-2">
          {shifts.map(shift => {
            const statusCfg = TESTSHIFT_STATUS_CONFIG[shift.status] || TESTSHIFT_STATUS_CONFIG.gepland;
            const transitions = statusTransitions[shift.status] || [];
            return (
              <div key={shift.id} className="bg-neutral-50 border border-neutral-100 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.color} ${statusCfg.bgColor}`}>
                        {statusCfg.label}
                      </span>
                      <span className="text-sm font-medium text-neutral-900">
                        {new Date(shift.shift_date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
                        {shift.shift_time && ` ${shift.shift_time}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{shift.people_count}x {shift.shift_role}</span>
                      {shift.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{shift.location}</span>}
                    </div>
                    {shift.notes && <p className="text-xs text-neutral-500 mt-1">{shift.notes}</p>}
                  </div>
                  <button onClick={() => deleteShift(shift.id)} className="p-1 text-neutral-300 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {transitions.length > 0 && (
                  <div className="flex gap-1.5 mt-2 pt-2 border-t border-neutral-100">
                    {transitions.map(nextStatus => {
                      const nextCfg = TESTSHIFT_STATUS_CONFIG[nextStatus];
                      return (
                        <button
                          key={nextStatus}
                          onClick={() => updateShiftStatus(shift.id, nextStatus)}
                          className={`px-2 py-1 rounded text-[11px] font-medium ${nextCfg.color} ${nextCfg.bgColor} hover:opacity-80`}
                        >
                          {nextCfg.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {shift.status === "geslaagd" && (
                  <button
                    onClick={() => {
                      onUpdate({ ...lead, status: "klant_geworden", outreach_status: "converted", next_best_channel: "none" } as CRMLead);
                    }}
                    className="mt-2 w-full py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200"
                  >
                    Markeer als klant
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-semibold text-sky-900">Nieuwe testdienst</h4>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={formData.shift_date}
              onChange={e => setFormData(f => ({ ...f, shift_date: e.target.value }))}
              className="border border-sky-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="time"
              value={formData.shift_time}
              onChange={e => setFormData(f => ({ ...f, shift_time: e.target.value }))}
              className="border border-sky-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={formData.shift_role}
              onChange={e => setFormData(f => ({ ...f, shift_role: e.target.value }))}
              className="border border-sky-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="bediening">Bediening</option>
              <option value="keuken">Keuken</option>
              <option value="afwas">Afwas</option>
              <option value="bar">Bar</option>
              <option value="events">Events</option>
            </select>
            <input
              type="number"
              min="1"
              value={formData.people_count}
              onChange={e => setFormData(f => ({ ...f, people_count: parseInt(e.target.value) || 1 }))}
              placeholder="Aantal"
              className="border border-sky-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <input
            type="text"
            value={formData.location}
            onChange={e => setFormData(f => ({ ...f, location: e.target.value }))}
            placeholder="Locatie"
            className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            value={formData.notes}
            onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
            placeholder="Notities..."
            className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm min-h-[50px]"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg">
              Annuleren
            </button>
            <button onClick={createShift} disabled={!formData.shift_date} className="px-3 py-1.5 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50">
              Plannen
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-sky-200 rounded-lg text-sm text-sky-600 hover:bg-sky-50 hover:border-sky-300"
        >
          <Plus className="w-4 h-4" />
          Plan testdienst
        </button>
      )}
    </div>
  );
}
