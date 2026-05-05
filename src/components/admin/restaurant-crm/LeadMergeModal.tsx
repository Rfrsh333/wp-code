"use client";

import { useEffect, useState } from "react";
import { X, GitMerge, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import type { CRMLead } from "./types";

interface LeadMergeModalProps {
  primaryId: string;
  primaryName: string;
  duplicateId: string;
  duplicateName: string;
  onClose: () => void;
  onMergeComplete: () => void;
}

const COMPARE_FIELDS: { key: keyof CRMLead; label: string }[] = [
  { key: "company_name", label: "Bedrijfsnaam" },
  { key: "city", label: "Stad" },
  { key: "address", label: "Adres" },
  { key: "phone", label: "Telefoon" },
  { key: "email", label: "Email" },
  { key: "website", label: "Website" },
  { key: "instagram_url", label: "Instagram" },
  { key: "facebook_url", label: "Facebook" },
  { key: "contact_person", label: "Contactpersoon" },
  { key: "status", label: "Status" },
  { key: "outreach_status", label: "Outreach" },
  { key: "source", label: "Bron" },
];

export default function LeadMergeModal({
  primaryId,
  primaryName,
  duplicateId,
  duplicateName,
  onClose,
  onMergeComplete,
}: LeadMergeModalProps) {
  const [primaryLead, setPrimaryLead] = useState<CRMLead | null>(null);
  const [duplicateLead, setDuplicateLead] = useState<CRMLead | null>(null);
  const [selectedPrimary, setSelectedPrimary] = useState<"left" | "right">("left");
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const [res1, res2] = await Promise.all([
        fetch(`/api/admin/crm/leads/${primaryId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/crm/leads/${duplicateId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (res1.ok) setPrimaryLead(await res1.json());
      if (res2.ok) setDuplicateLead(await res2.json());
    } catch {
      toast.error("Fout bij laden leads");
    } finally {
      setLoading(false);
    }
  }

  async function handleMerge() {
    setMerging(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const actualPrimaryId = selectedPrimary === "left" ? primaryId : duplicateId;
      const actualDuplicateId = selectedPrimary === "left" ? duplicateId : primaryId;

      const res = await fetch("/api/admin/crm/leads/merge", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ primary_id: actualPrimaryId, duplicate_id: actualDuplicateId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Merge mislukt");
      }

      toast.success("Leads succesvol gemerged");
      onMergeComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Merge mislukt");
    } finally {
      setMerging(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      </div>
    );
  }

  if (!primaryLead || !duplicateLead) {
    return null;
  }

  const leftLead = primaryLead;
  const rightLead = duplicateLead;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-neutral-900">Leads samenvoegen</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary selector */}
        <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-100">
          <p className="text-xs text-neutral-500 mb-2">Kies de primary lead (deze blijft bewaard):</p>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedPrimary("left")}
              className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                selectedPrimary === "left"
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {leftLead.company_name}
            </button>
            <button
              onClick={() => setSelectedPrimary("right")}
              className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                selectedPrimary === "right"
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {rightLead.company_name}
            </button>
          </div>
        </div>

        {/* Side-by-side comparison */}
        <div className="flex-1 overflow-y-auto p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="text-left py-2 text-xs font-medium text-neutral-500 w-1/4">Veld</th>
                <th className={`text-left py-2 text-xs font-medium w-[37.5%] ${selectedPrimary === "left" ? "text-purple-600" : "text-neutral-500"}`}>
                  {leftLead.company_name} {selectedPrimary === "left" && "(Primary)"}
                </th>
                <th className={`text-left py-2 text-xs font-medium w-[37.5%] ${selectedPrimary === "right" ? "text-purple-600" : "text-neutral-500"}`}>
                  {rightLead.company_name} {selectedPrimary === "right" && "(Primary)"}
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_FIELDS.map(field => {
                const leftVal = leftLead[field.key];
                const rightVal = rightLead[field.key];
                const isDiff = String(leftVal || "") !== String(rightVal || "");
                return (
                  <tr key={field.key} className={`border-b border-neutral-50 ${isDiff ? "bg-amber-50/50" : ""}`}>
                    <td className="py-2 text-neutral-500">{field.label}</td>
                    <td className="py-2 text-neutral-900">{String(leftVal || "-")}</td>
                    <td className="py-2 text-neutral-900">{String(rightVal || "-")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              Bij merge worden alle contact logs, follow-ups, notities, tags en campagnes van de duplicate verplaatst naar de primary lead.
              Lege velden op de primary worden aangevuld vanuit de duplicate.
              De duplicate wordt daarna gearchiveerd.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-neutral-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800"
          >
            Annuleer
          </button>
          <button
            onClick={handleMerge}
            disabled={merging}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {merging ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
            {merging ? "Merging..." : "Bevestig merge"}
          </button>
        </div>
      </div>
    </div>
  );
}
