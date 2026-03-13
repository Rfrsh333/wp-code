"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

interface Certificering {
  id: string;
  naam: string;
  uitgever: string | null;
  behaald_op: string | null;
  verloopt_op: string | null;
  document_url: string | null;
  created_at: string;
}

export default function CertificeringenSection() {
  const toast = useToast();
  const [certificeringen, setCertificeringen] = useState<Certificering[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ naam: "", uitgever: "", behaald_op: "", verloopt_op: "" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCertificeringen();
  }, []);

  const fetchCertificeringen = async () => {
    try {
      const res = await fetch("/api/medewerker/certificeringen");
      const data = await res.json();
      if (!res.ok) throw new Error();
      setCertificeringen(data.certificeringen || []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.naam.trim()) {
      toast.error("Naam is verplicht");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/medewerker/certificeringen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          data: {
            naam: form.naam.trim(),
            uitgever: form.uitgever.trim() || null,
            behaald_op: form.behaald_op || null,
            verloopt_op: form.verloopt_op || null,
          },
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Certificering toegevoegd");
      setForm({ naam: "", uitgever: "", behaald_op: "", verloopt_op: "" });
      setShowForm(false);
      fetchCertificeringen();
    } catch {
      toast.error("Kon certificering niet opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Certificering verwijderen?")) return;
    try {
      const res = await fetch("/api/medewerker/certificeringen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Certificering verwijderd");
      fetchCertificeringen();
    } catch {
      toast.error("Kon certificering niet verwijderen");
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });

  const isExpired = (date: string | null) =>
    date ? new Date(date) < new Date() : false;

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const d = new Date(date);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // 30 dagen
  };

  if (isLoading) return null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">Certificeringen</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-[#F27501] hover:text-[#d96800] font-medium"
        >
          {showForm ? "Annuleren" : "+ Toevoegen"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-neutral-50 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Naam *</label>
              <input
                type="text"
                value={form.naam}
                onChange={(e) => setForm({ ...form, naam: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501]"
                placeholder="Bijv. HACCP, BHV, VCA"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Uitgever</label>
              <input
                type="text"
                value={form.uitgever}
                onChange={(e) => setForm({ ...form, uitgever: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501]"
                placeholder="Organisatie"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Behaald op</label>
              <input
                type="date"
                value={form.behaald_op}
                onChange={(e) => setForm({ ...form, behaald_op: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Verloopt op</label>
              <input
                type="date"
                value={form.verloopt_op}
                onChange={(e) => setForm({ ...form, verloopt_op: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501]"
              />
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 bg-[#F27501] hover:bg-[#d96800] text-white text-sm font-semibold rounded-xl disabled:opacity-50"
          >
            {isSaving ? "Opslaan..." : "Opslaan"}
          </button>
        </div>
      )}

      {/* List */}
      {certificeringen.length === 0 ? (
        <p className="text-sm text-neutral-500">Nog geen certificeringen toegevoegd.</p>
      ) : (
        <div className="space-y-3">
          {certificeringen.map((cert) => (
            <div key={cert.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
              <div className="w-10 h-10 bg-[#F27501]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-neutral-900">{cert.naam}</p>
                  {isExpired(cert.verloopt_op) && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">Verlopen</span>
                  )}
                  {isExpiringSoon(cert.verloopt_op) && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Verloopt binnenkort</span>
                  )}
                </div>
                <p className="text-xs text-neutral-500">
                  {cert.uitgever && `${cert.uitgever} · `}
                  {cert.behaald_op && `Behaald: ${formatDate(cert.behaald_op)}`}
                  {cert.verloopt_op && ` · Verloopt: ${formatDate(cert.verloopt_op)}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(cert.id)}
                className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                title="Verwijderen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
