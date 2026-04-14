"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Lead {
  id: string;
  bedrijfsnaam: string;
  contactpersoon: string | null;
  email: string | null;
  telefoon: string | null;
  stad: string | null;
  branche: string | null;
  pipeline_stage: string;
  ai_score: number | null;
  bron: string;
  emails_verzonden_count: number;
  laatste_contact_datum: string | null;
  created_at: string;
  tags: string[];
  engagement_score: number;
}

interface Props {
  onSelectLead: (id: string) => void;
  onRefresh: () => void;
}

const STAGES = ["nieuw", "benaderd", "interesse", "offerte", "klant", "afgewezen"];
const BRANCHES = ["restaurant", "cafe", "hotel", "catering", "events", "bar", "horeca"];

export default function LijstView({ onSelectLead, onRefresh }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterBranche, setFilterBranche] = useState("");
  const [filterStad, setFilterStad] = useState("");
  const [filterMinScore, setFilterMinScore] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  }, []);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    const token = await getToken();

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "50");
    params.set("sort", sortBy);
    params.set("dir", sortDir);
    if (search) params.set("search", search);
    if (filterStage) params.set("stage", filterStage);
    if (filterBranche) params.set("branche", filterBranche);
    if (filterStad) params.set("stad", filterStad);
    if (filterMinScore) params.set("min_score", filterMinScore);

    const res = await fetch(`/api/admin/acquisitie/leads?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const json = await res.json();
      setLeads(json.data || []);
      setTotal(json.total || 0);
    }
    setIsLoading(false);
  }, [getToken, page, search, filterStage, filterBranche, filterStad, filterMinScore, sortBy, sortDir]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  const bulkUpdateStage = async (stage: string) => {
    const token = await getToken();
    await fetch("/api/admin/acquisitie/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action: "bulk_update",
        ids: Array.from(selectedIds),
        data: { pipeline_stage: stage },
      }),
    });
    setSelectedIds(new Set());
    setMessage({ type: "success", text: `${selectedIds.size} leads verplaatst naar ${stage}` });
    fetchLeads();
    onRefresh();
  };

  const bulkDelete = async () => {
    if (!confirm(`Weet je zeker dat je ${selectedIds.size} leads wilt verwijderen?`)) return;
    const token = await getToken();
    await fetch("/api/admin/acquisitie/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "delete_many", ids: Array.from(selectedIds) }),
    });
    setSelectedIds(new Set());
    setMessage({ type: "success", text: "Leads verwijderd" });
    fetchLeads();
    onRefresh();
  };

  const bulkScore = async () => {
    const token = await getToken();
    setMessage({ type: "success", text: "AI scoring gestart..." });
    const res = await fetch("/api/admin/ai/lead-score", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lead_ids: Array.from(selectedIds) }),
    });
    if (res.ok) {
      const result = await res.json();
      setMessage({ type: "success", text: `${result.scored} leads gescored` });
      fetchLeads();
    } else {
      setMessage({ type: "error", text: "Scoring mislukt" });
    }
  };

  const exportCsv = () => {
    const header = "Bedrijfsnaam,Contactpersoon,Email,Telefoon,Stad,Branche,Stage,AI Score,Bron\n";
    const rows = leads
      .filter((l) => selectedIds.size === 0 || selectedIds.has(l.id))
      .map((l) =>
        [l.bedrijfsnaam, l.contactpersoon, l.email, l.telefoon, l.stad, l.branche, l.pipeline_stage, l.ai_score, l.bron]
          .map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `acquisitie_leads_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStageBadge = (stage: string) => {
    const colors: Record<string, string> = {
      nieuw: "bg-blue-100 text-blue-700",
      benaderd: "bg-amber-100 text-amber-700",
      interesse: "bg-purple-100 text-purple-700",
      offerte: "bg-cyan-100 text-cyan-700",
      klant: "bg-green-100 text-green-700",
      afgewezen: "bg-red-100 text-red-700",
    };
    return colors[stage] || "bg-neutral-100 text-neutral-600";
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-neutral-400";
    if (score >= 70) return "text-green-600 font-bold";
    if (score >= 40) return "text-amber-600";
    return "text-red-500";
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const totalPages = Math.ceil(total / 50);

  if (isLoading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div className={`mb-4 p-3 rounded-xl text-sm ${
          message.type === "success"
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Zoeken..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-[#F27501] w-64"
        />
        <select
          value={filterStage}
          onChange={(e) => { setFilterStage(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none"
        >
          <option value="">Alle stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterBranche}
          onChange={(e) => { setFilterBranche(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none"
        >
          <option value="">Alle branches</option>
          {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <input
          type="text"
          placeholder="Stad..."
          value={filterStad}
          onChange={(e) => { setFilterStad(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none w-32"
        />
        <input
          type="number"
          placeholder="Min score"
          value={filterMinScore}
          onChange={(e) => { setFilterMinScore(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none w-28"
        />
      </div>

      {/* Bulk actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">{total} leads</span>
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm font-medium text-[#F27501]">{selectedIds.size} geselecteerd</span>
              <select
                onChange={(e) => { if (e.target.value) bulkUpdateStage(e.target.value); e.target.value = ""; }}
                className="px-2 py-1 border border-neutral-300 rounded-lg text-xs"
                defaultValue=""
              >
                <option value="" disabled>Verplaats naar...</option>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={bulkScore} className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700">
                AI Score
              </button>
              <button onClick={bulkDelete} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700">
                Verwijderen
              </button>
            </>
          )}
        </div>
        <button onClick={exportCsv} className="px-3 py-1.5 bg-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-300">
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === leads.length && leads.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="p-3 text-left cursor-pointer hover:text-[#F27501]" onClick={() => handleSort("bedrijfsnaam")}>
                  Bedrijf {sortBy === "bedrijfsnaam" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="p-3 text-left">Contact</th>
                <th className="p-3 text-left cursor-pointer hover:text-[#F27501]" onClick={() => handleSort("stad")}>
                  Stad {sortBy === "stad" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="p-3 text-left">Stage</th>
                <th className="p-3 text-left cursor-pointer hover:text-[#F27501]" onClick={() => handleSort("ai_score")}>
                  Score {sortBy === "ai_score" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="p-3 text-left">Emails</th>
                <th className="p-3 text-left">Bron</th>
                <th className="p-3 text-left cursor-pointer hover:text-[#F27501]" onClick={() => handleSort("created_at")}>
                  Datum {sortBy === "created_at" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer"
                  onClick={() => onSelectLead(lead.id)}
                >
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-neutral-900">{lead.bedrijfsnaam}</p>
                    {lead.branche && <p className="text-xs text-neutral-500">{lead.branche}</p>}
                  </td>
                  <td className="p-3">
                    {lead.email && <p className="text-xs text-neutral-600">{lead.email}</p>}
                    {lead.telefoon && <p className="text-xs text-neutral-500">{lead.telefoon}</p>}
                    {!lead.email && !lead.telefoon && <span className="text-xs text-neutral-400">-</span>}
                  </td>
                  <td className="p-3 text-neutral-600">{lead.stad || "-"}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStageBadge(lead.pipeline_stage)}`}>
                      {lead.pipeline_stage}
                    </span>
                  </td>
                  <td className={`p-3 ${getScoreColor(lead.ai_score)}`}>
                    <div className="flex items-center gap-1">
                      {lead.ai_score || "-"}
                      {lead.engagement_score >= 50 && (
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" title={`Engagement: ${lead.engagement_score}`} />
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-neutral-500">{lead.emails_verzonden_count}</td>
                  <td className="p-3 text-xs text-neutral-500">{lead.bron}</td>
                  <td className="p-3 text-xs text-neutral-500">
                    {new Date(lead.created_at).toLocaleDateString("nl-NL")}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-neutral-400">
                    Geen leads gevonden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 rounded-lg text-sm border border-neutral-300 disabled:opacity-50 hover:bg-neutral-100"
          >
            Vorige
          </button>
          <span className="text-sm text-neutral-600">
            Pagina {page} van {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 rounded-lg text-sm border border-neutral-300 disabled:opacity-50 hover:bg-neutral-100"
          >
            Volgende
          </button>
        </div>
      )}
    </div>
  );
}
