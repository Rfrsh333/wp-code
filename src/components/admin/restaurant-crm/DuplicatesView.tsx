"use client";

import { useState } from "react";
import { Search, Loader2, GitMerge, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import LeadMergeModal from "./LeadMergeModal";
import type { DuplicateMatch } from "./types";

interface DuplicatesViewProps {
  leadId: string;
  leadName: string;
  onMergeComplete?: () => void;
}

export default function DuplicatesView({ leadId, leadName, onMergeComplete }: DuplicatesViewProps) {
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<DuplicateMatch | null>(null);
  const toast = useToast();

  async function searchDuplicates() {
    setLoading(true);
    setSearched(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch("/api/admin/crm/duplicates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDuplicates(data.duplicates || []);
    } catch {
      toast.error("Fout bij zoeken duplicaten");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-neutral-900">Duplicaat detectie</h4>
        <button
          onClick={searchDuplicates}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Zoek duplicaten
        </button>
      </div>

      {searched && !loading && duplicates.length === 0 && (
        <p className="text-sm text-neutral-500 py-4 text-center">Geen duplicaten gevonden</p>
      )}

      {duplicates.length > 0 && (
        <div className="space-y-2">
          {duplicates.map(dup => (
            <div key={dup.lead_id} className="flex items-center justify-between p-3 bg-white border border-neutral-100 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-neutral-900">{dup.company_name}</p>
                <p className="text-xs text-neutral-500">
                  {dup.city && `${dup.city} \u00B7 `}
                  {dup.email || dup.phone || ""}
                </p>
                <div className="flex gap-1 mt-1.5">
                  {dup.match_reasons.map((reason, i) => (
                    <span key={i} className="px-1.5 py-0.5 text-[10px] bg-purple-50 text-purple-600 rounded font-medium">
                      {reason}
                    </span>
                  ))}
                  <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                    dup.confidence === "high" ? "bg-red-50 text-red-600" :
                    dup.confidence === "medium" ? "bg-amber-50 text-amber-600" :
                    "bg-neutral-50 text-neutral-600"
                  }`}>
                    {dup.confidence}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMergeTarget(dup)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100"
              >
                <GitMerge className="w-3.5 h-3.5" />
                Merge
              </button>
            </div>
          ))}
        </div>
      )}

      {mergeTarget && (
        <LeadMergeModal
          primaryId={leadId}
          primaryName={leadName}
          duplicateId={mergeTarget.lead_id}
          duplicateName={mergeTarget.company_name}
          onClose={() => setMergeTarget(null)}
          onMergeComplete={() => {
            setMergeTarget(null);
            setDuplicates([]);
            setSearched(false);
            onMergeComplete?.();
          }}
        />
      )}
    </div>
  );
}
