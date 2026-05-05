"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Filter, FolderOpen, Archive, Trash2, Pencil, Users, MessageCircle, ThumbsUp, Crown, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import type { CRMLeadList, LeadListSource } from "./types";

interface LeadListsViewProps {
  onSelectList: (listId: string, listName: string) => void;
  onViewAllLeads: () => void;
  onNavigateImport: () => void;
}

const SOURCE_LABELS: Record<LeadListSource, string> = {
  restaurant_import: "Restaurant import",
  google_maps: "Google Maps",
  personeel_aanvragen: "Personeel aanvragen",
  calculator: "Calculator",
  manual: "Handmatig",
  instantly: "Instantly",
  other: "Overig",
};

const SOURCE_COLORS: Record<LeadListSource, string> = {
  restaurant_import: "bg-orange-100 text-orange-700",
  google_maps: "bg-blue-100 text-blue-700",
  personeel_aanvragen: "bg-purple-100 text-purple-700",
  calculator: "bg-green-100 text-green-700",
  manual: "bg-neutral-100 text-neutral-700",
  instantly: "bg-cyan-100 text-cyan-700",
  other: "bg-neutral-100 text-neutral-700",
};

export default function LeadListsView({ onSelectList, onViewAllLeads, onNavigateImport }: LeadListsViewProps) {
  const [lists, setLists] = useState<CRMLeadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const toast = useToast();

  const fetchLists = useCallback(async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (sourceFilter) params.set("source", sourceFilter);
      if (showArchived) params.set("archived", "true");

      const res = await fetch(`/api/admin/crm/lead-lists?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setLists(await res.json());
    } catch {
      toast.error("Fout bij laden leadlijsten");
    } finally {
      setLoading(false);
    }
  }, [search, sourceFilter, showArchived, toast]);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function getToken() {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function handleArchive(id: string, archived: boolean) {
    const token = await getToken();
    await fetch(`/api/admin/crm/lead-lists/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ archived_at: archived ? new Date().toISOString() : null }),
    });
    fetchLists();
    toast.success(archived ? "Lijst gearchiveerd" : "Lijst hersteld");
  }

  async function handleDelete(id: string) {
    if (!confirm("Weet je zeker dat je deze lege lijst wilt verwijderen?")) return;
    const token = await getToken();
    const res = await fetch(`/api/admin/crm/lead-lists/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Verwijderen mislukt");
      return;
    }
    fetchLists();
    toast.success("Lijst verwijderd");
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    const token = await getToken();
    await fetch(`/api/admin/crm/lead-lists/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    setEditingId(null);
    fetchLists();
    toast.success("Naam bijgewerkt");
  }

  const totalLeads = lists.reduce((sum, l) => sum + l.lead_count, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Leadlijsten</h3>
          <p className="text-sm text-neutral-500">{lists.length} lijsten, {totalLeads} leads totaal</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onViewAllLeads}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200"
          >
            Alle leads bekijken
          </button>
          <button
            onClick={onNavigateImport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
          >
            <Plus className="w-4 h-4" />
            Nieuwe import
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Zoek op naam of beschrijving..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${showFilters ? "bg-orange-50 border-orange-200 text-orange-700" : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"}`}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="text-sm border border-neutral-200 rounded-lg px-3 py-2"
          >
            <option value="">Alle bronnen</option>
            {Object.entries(SOURCE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
              className="rounded"
            />
            Toon gearchiveerd
          </label>
          {(sourceFilter || showArchived) && (
            <button
              onClick={() => { setSourceFilter(""); setShowArchived(false); }}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {/* List cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-white rounded-xl border border-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
          <p className="text-sm">Geen leadlijsten gevonden</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lists.map(list => (
            <div
              key={list.id}
              className="bg-white rounded-xl border border-neutral-100 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectList(list.id, list.name)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  {editingId === list.id ? (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleRename(list.id)}
                        className="flex-1 border border-neutral-200 rounded-lg px-2 py-1 text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRename(list.id)}
                        className="px-2 py-1 bg-orange-500 text-white rounded-lg text-xs"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 text-neutral-500 text-xs"
                      >
                        Annuleer
                      </button>
                    </div>
                  ) : (
                    <h4 className="font-semibold text-neutral-900 truncate">{list.name}</h4>
                  )}
                  {list.description && (
                    <p className="text-xs text-neutral-500 mt-0.5 truncate">{list.description}</p>
                  )}
                </div>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${SOURCE_COLORS[list.source]}`}>
                  {SOURCE_LABELS[list.source]}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-5 gap-2 mb-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-neutral-400 mb-0.5">
                    <Users className="w-3 h-3" />
                  </div>
                  <p className="text-sm font-bold text-neutral-900">{list.lead_count}</p>
                  <p className="text-[9px] text-neutral-400">Leads</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-400 mb-0.5">
                    <MessageCircle className="w-3 h-3" />
                  </div>
                  <p className="text-sm font-bold text-neutral-900">{list.contacted_count}</p>
                  <p className="text-[9px] text-neutral-400">Benaderd</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-purple-400 mb-0.5">
                    <MessageCircle className="w-3 h-3" />
                  </div>
                  <p className="text-sm font-bold text-neutral-900">{list.replied_count}</p>
                  <p className="text-[9px] text-neutral-400">Replied</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-green-400 mb-0.5">
                    <ThumbsUp className="w-3 h-3" />
                  </div>
                  <p className="text-sm font-bold text-neutral-900">{list.interested_count}</p>
                  <p className="text-[9px] text-neutral-400">Interesse</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-amber-400 mb-0.5">
                    <Crown className="w-3 h-3" />
                  </div>
                  <p className="text-sm font-bold text-neutral-900">{list.customer_count}</p>
                  <p className="text-[9px] text-neutral-400">Klant</p>
                </div>
              </div>

              {/* Conversion bar */}
              {list.lead_count > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                    <span>Conversie</span>
                    <span>{list.lead_count > 0 ? Math.round((list.customer_count / list.lead_count) * 100) : 0}%</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                      style={{ width: `${list.lead_count > 0 ? Math.min(100, (list.customer_count / list.lead_count) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-50">
                <span className="text-[10px] text-neutral-400">
                  {list.city && `${list.city} • `}
                  {new Date(list.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => { setEditingId(list.id); setEditName(list.name); }}
                    className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg"
                    title="Hernoemen"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleArchive(list.id, !list.archived_at)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg"
                    title={list.archived_at ? "Herstellen" : "Archiveren"}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  {list.lead_count === 0 && (
                    <button
                      onClick={() => handleDelete(list.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
