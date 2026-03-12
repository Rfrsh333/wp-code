"use client";

import { useState, useEffect, useCallback } from "react";

interface Segment {
  id: string;
  naam: string;
  beschrijving: string | null;
  kleur: string;
  filters: SegmentFilters;
  is_dynamic: boolean;
  lead_count: number;
  last_calculated_at: string | null;
}

interface SegmentFilters {
  stages?: string[];
  branches?: string[];
  steden?: string[];
  tags?: string[];
  min_ai_score?: number;
  max_ai_score?: number;
  min_engagement?: number;
  churn_risk?: string[];
  has_email?: boolean;
  has_phone?: boolean;
  predicted_conversion_min?: number;
}

interface TagDef {
  id: string;
  naam: string;
  kleur: string;
  categorie: string | null;
}

interface TagCount {
  tag: string;
  count: number;
}

interface PreviewLead {
  id: string;
  bedrijfsnaam: string;
  branche: string | null;
  stad: string | null;
  pipeline_stage: string;
  ai_score: number | null;
  engagement_score: number | null;
  tags: string[] | null;
  predicted_conversion_pct: number | null;
}

type Mode = "segmenten" | "tags" | "bulk";

interface Props {
  onSelectLead?: (id: string) => void;
}

const STAGES = ["nieuw", "benaderd", "interesse", "offerte", "klant", "afgewezen"];
const BRANCHES = ["restaurant", "cafe", "bar", "hotel", "catering", "evenementen", "fastfood", "bezorging"];
const CHURN_RISKS = ["laag", "midden", "hoog", "kritiek"];
const TAG_KLEUREN = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280", "#F27501"];
const TAG_CATEGORIEEN = ["prioriteit", "status", "branche", "bron", "segment", "custom"];

export default function SegmentenView({ onSelectLead }: Props) {
  const [mode, setMode] = useState<Mode>("segmenten");
  const [segmenten, setSegmenten] = useState<Segment[]>([]);
  const [tagDefs, setTagDefs] = useState<TagDef[]>([]);
  const [tagsInUse, setTagsInUse] = useState<TagCount[]>([]);
  const [previewLeads, setPreviewLeads] = useState<PreviewLead[]>([]);
  const [previewCount, setPreviewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Segment form
  const [showSegForm, setShowSegForm] = useState(false);
  const [editingSegId, setEditingSegId] = useState<string | null>(null);
  const [segForm, setSegForm] = useState({
    naam: "", beschrijving: "", kleur: "#6B7280",
    stages: [] as string[], branches: [] as string[], steden: "",
    tags: [] as string[], min_ai_score: "", max_ai_score: "",
    min_engagement: "", churn_risk: [] as string[],
    has_email: false, has_phone: false, predicted_conversion_min: "",
  });

  // Tag form
  const [showTagForm, setShowTagForm] = useState(false);
  const [tagForm, setTagForm] = useState({ naam: "", kleur: "#6B7280", categorie: "custom" });

  // Bulk
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"tag" | "stage" | "">("");
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [bulkStage, setBulkStage] = useState("");

  const getToken = useCallback(async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  }, []);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchSegmenten = useCallback(async () => {
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/segments?view=list", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setSegmenten(json.data || []);
    }
  }, [getToken]);

  const fetchTags = useCallback(async () => {
    const token = await getToken();
    const [defsRes, useRes] = await Promise.all([
      fetch("/api/admin/acquisitie/segments?view=tags", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/acquisitie/segments?view=tags_in_use", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (defsRes.ok) { const j = await defsRes.json(); setTagDefs(j.data || []); }
    if (useRes.ok) { const j = await useRes.json(); setTagsInUse(j.data || []); }
  }, [getToken]);

  const fetchPreview = useCallback(async (segmentId?: string) => {
    setIsLoading(true);
    const token = await getToken();
    const url = segmentId
      ? `/api/admin/acquisitie/segments?view=preview&segment_id=${segmentId}`
      : `/api/admin/acquisitie/segments?view=preview&filters=${encodeURIComponent(JSON.stringify(buildFiltersFromForm()))}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const json = await res.json();
      setPreviewLeads(json.data || []);
      setPreviewCount(json.count || json.data?.length || 0);
    }
    setIsLoading(false);
  }, [getToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode === "segmenten") fetchSegmenten();
    if (mode === "tags") fetchTags();
    if (mode === "bulk") { fetchSegmenten(); fetchTags(); }
  }, [mode, fetchSegmenten, fetchTags]);

  function buildFiltersFromForm(): SegmentFilters {
    return {
      ...(segForm.stages.length ? { stages: segForm.stages } : {}),
      ...(segForm.branches.length ? { branches: segForm.branches } : {}),
      ...(segForm.steden ? { steden: segForm.steden.split(",").map((s) => s.trim()).filter(Boolean) } : {}),
      ...(segForm.tags.length ? { tags: segForm.tags } : {}),
      ...(segForm.min_ai_score ? { min_ai_score: parseInt(segForm.min_ai_score) } : {}),
      ...(segForm.max_ai_score ? { max_ai_score: parseInt(segForm.max_ai_score) } : {}),
      ...(segForm.min_engagement ? { min_engagement: parseInt(segForm.min_engagement) } : {}),
      ...(segForm.churn_risk.length ? { churn_risk: segForm.churn_risk } : {}),
      ...(segForm.has_email ? { has_email: true } : {}),
      ...(segForm.has_phone ? { has_phone: true } : {}),
      ...(segForm.predicted_conversion_min ? { predicted_conversion_min: parseInt(segForm.predicted_conversion_min) } : {}),
    };
  }

  const saveSegment = async () => {
    const token = await getToken();
    const filters = buildFiltersFromForm();
    const payload = {
      action: editingSegId ? "update_segment" : "create_segment",
      ...(editingSegId ? { id: editingSegId } : {}),
      naam: segForm.naam,
      beschrijving: segForm.beschrijving || null,
      kleur: segForm.kleur,
      filters,
      is_dynamic: true,
    };

    const res = await fetch("/api/admin/acquisitie/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showMsg("success", editingSegId ? "Segment bijgewerkt" : "Segment aangemaakt");
      setShowSegForm(false);
      setEditingSegId(null);
      resetSegForm();
      fetchSegmenten();
    } else {
      showMsg("error", "Fout bij opslaan");
    }
  };

  const deleteSegment = async (id: string) => {
    if (!confirm("Segment verwijderen?")) return;
    const token = await getToken();
    await fetch("/api/admin/acquisitie/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "delete_segment", id }),
    });
    fetchSegmenten();
  };

  const editSegment = (s: Segment) => {
    setEditingSegId(s.id);
    setSegForm({
      naam: s.naam,
      beschrijving: s.beschrijving || "",
      kleur: s.kleur,
      stages: s.filters.stages || [],
      branches: s.filters.branches || [],
      steden: s.filters.steden?.join(", ") || "",
      tags: s.filters.tags || [],
      min_ai_score: s.filters.min_ai_score?.toString() || "",
      max_ai_score: s.filters.max_ai_score?.toString() || "",
      min_engagement: s.filters.min_engagement?.toString() || "",
      churn_risk: s.filters.churn_risk || [],
      has_email: s.filters.has_email || false,
      has_phone: s.filters.has_phone || false,
      predicted_conversion_min: s.filters.predicted_conversion_min?.toString() || "",
    });
    setShowSegForm(true);
  };

  const resetSegForm = () => {
    setSegForm({ naam: "", beschrijving: "", kleur: "#6B7280", stages: [], branches: [], steden: "", tags: [], min_ai_score: "", max_ai_score: "", min_engagement: "", churn_risk: [], has_email: false, has_phone: false, predicted_conversion_min: "" });
  };

  const toggleArrayItem = (arr: string[], item: string): string[] =>
    arr.includes(item) ? arr.filter((a) => a !== item) : [...arr, item];

  // Tag CRUD
  const saveTag = async () => {
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "create_tag", ...tagForm }),
    });
    if (res.ok) {
      showMsg("success", "Tag aangemaakt");
      setShowTagForm(false);
      setTagForm({ naam: "", kleur: "#6B7280", categorie: "custom" });
      fetchTags();
    }
  };

  const deleteTag = async (id: string) => {
    if (!confirm("Tag definitie verwijderen?")) return;
    const token = await getToken();
    await fetch("/api/admin/acquisitie/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "delete_tag", id }),
    });
    fetchTags();
  };

  // Bulk actions
  const executeBulk = async () => {
    if (selectedLeads.size === 0) return;
    const token = await getToken();
    const leadIds = Array.from(selectedLeads);

    if (bulkAction === "tag" && bulkTags.length > 0) {
      await fetch("/api/admin/acquisitie/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "bulk_tag", lead_ids: leadIds, tags_to_add: bulkTags }),
      });
      showMsg("success", `${bulkTags.length} tag(s) toegevoegd aan ${leadIds.length} leads`);
    } else if (bulkAction === "stage" && bulkStage) {
      await fetch("/api/admin/acquisitie/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "bulk_stage", lead_ids: leadIds, stage: bulkStage }),
      });
      showMsg("success", `${leadIds.length} leads verplaatst naar ${bulkStage}`);
    }
    setSelectedLeads(new Set());
    if (selectedSegment) fetchPreview(selectedSegment);
  };

  const autoTagSegment = async (segId: string) => {
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "auto_tag_segment", segment_id: segId }),
    });
    if (res.ok) {
      const json = await res.json();
      showMsg("success", `${json.tagged} leads getagd met "${json.tag}"`);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-3 rounded-xl text-sm font-medium ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-2">
        {([
          { id: "segmenten" as Mode, label: "Segmenten" },
          { id: "tags" as Mode, label: "Tags" },
          { id: "bulk" as Mode, label: "Bulk Acties" },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === tab.id ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === SEGMENTEN === */}
      {mode === "segmenten" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">Segmenten ({segmenten.length})</h3>
            <button onClick={() => { resetSegForm(); setEditingSegId(null); setShowSegForm(true); }} className="px-4 py-2 bg-[#F27501] text-white text-sm font-medium rounded-xl hover:bg-[#d96800]">
              + Segment
            </button>
          </div>

          {/* Segment form */}
          {showSegForm && (
            <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-4">
              <h4 className="text-sm font-semibold">{editingSegId ? "Segment Bewerken" : "Nieuw Segment"}</h4>

              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Naam *" value={segForm.naam} onChange={(e) => setSegForm({ ...segForm, naam: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">Kleur:</span>
                  {TAG_KLEUREN.map((k) => (
                    <button key={k} onClick={() => setSegForm({ ...segForm, kleur: k })} className={`w-6 h-6 rounded-full border-2 ${segForm.kleur === k ? "border-neutral-900" : "border-transparent"}`} style={{ backgroundColor: k }} />
                  ))}
                </div>
              </div>

              <input placeholder="Beschrijving" value={segForm.beschrijving} onChange={(e) => setSegForm({ ...segForm, beschrijving: e.target.value })} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" />

              {/* Filter: Stages */}
              <div>
                <p className="text-xs font-medium text-neutral-600 mb-1">Pipeline Stages</p>
                <div className="flex flex-wrap gap-1">
                  {STAGES.map((s) => (
                    <button key={s} onClick={() => setSegForm({ ...segForm, stages: toggleArrayItem(segForm.stages, s) })} className={`text-xs px-2.5 py-1 rounded-full capitalize ${segForm.stages.includes(s) ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-600"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter: Branches */}
              <div>
                <p className="text-xs font-medium text-neutral-600 mb-1">Branches</p>
                <div className="flex flex-wrap gap-1">
                  {BRANCHES.map((b) => (
                    <button key={b} onClick={() => setSegForm({ ...segForm, branches: toggleArrayItem(segForm.branches, b) })} className={`text-xs px-2.5 py-1 rounded-full capitalize ${segForm.branches.includes(b) ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-600"}`}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <input placeholder="Steden (komma-gescheiden)" value={segForm.steden} onChange={(e) => setSegForm({ ...segForm, steden: e.target.value })} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" />

              {/* Score filters */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Min AI Score</p>
                  <input type="number" min="0" max="100" value={segForm.min_ai_score} onChange={(e) => setSegForm({ ...segForm, min_ai_score: e.target.value })} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Min Engagement</p>
                  <input type="number" value={segForm.min_engagement} onChange={(e) => setSegForm({ ...segForm, min_engagement: e.target.value })} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Min Conversie %</p>
                  <input type="number" min="0" max="100" value={segForm.predicted_conversion_min} onChange={(e) => setSegForm({ ...segForm, predicted_conversion_min: e.target.value })} className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2" />
                </div>
              </div>

              {/* Churn risk */}
              <div>
                <p className="text-xs font-medium text-neutral-600 mb-1">Churn Risico</p>
                <div className="flex gap-1">
                  {CHURN_RISKS.map((r) => (
                    <button key={r} onClick={() => setSegForm({ ...segForm, churn_risk: toggleArrayItem(segForm.churn_risk, r) })} className={`text-xs px-2.5 py-1 rounded-full capitalize ${segForm.churn_risk.includes(r) ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-600"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Boolean filters */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={segForm.has_email} onChange={(e) => setSegForm({ ...segForm, has_email: e.target.checked })} className="w-4 h-4 rounded" />
                  Heeft email
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={segForm.has_phone} onChange={(e) => setSegForm({ ...segForm, has_phone: e.target.checked })} className="w-4 h-4 rounded" />
                  Heeft telefoon
                </label>
              </div>

              <div className="flex gap-2">
                <button onClick={() => fetchPreview()} className="px-3 py-1.5 bg-neutral-100 text-neutral-700 text-sm rounded-lg hover:bg-neutral-200">
                  Preview ({previewCount} leads)
                </button>
                <button onClick={saveSegment} disabled={!segForm.naam} className="px-4 py-2 bg-[#F27501] text-white text-sm rounded-lg hover:bg-[#d96800] disabled:opacity-50">
                  {editingSegId ? "Opslaan" : "Aanmaken"}
                </button>
                <button onClick={() => { setShowSegForm(false); setEditingSegId(null); setPreviewLeads([]); }} className="px-3 py-1.5 text-neutral-600 text-sm hover:bg-neutral-100 rounded-lg">
                  Annuleren
                </button>
              </div>

              {/* Preview */}
              {previewLeads.length > 0 && (
                <div className="border-t pt-3 mt-3">
                  <p className="text-xs text-neutral-500 mb-2">Preview: {previewCount} leads matchen</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {previewLeads.slice(0, 20).map((l) => (
                      <div key={l.id} className="flex items-center gap-2 text-sm p-1 hover:bg-neutral-50 rounded">
                        <span className="font-medium text-neutral-900 truncate cursor-pointer hover:text-[#F27501]" onClick={() => onSelectLead?.(l.id)}>{l.bedrijfsnaam}</span>
                        <span className="text-xs text-neutral-400">{l.stad}</span>
                        <span className="text-xs text-neutral-400 capitalize">{l.pipeline_stage}</span>
                        {l.ai_score && <span className="text-xs text-purple-500">Score: {l.ai_score}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Segment cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segmenten.map((seg) => (
              <div key={seg.id} className="bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: seg.kleur }} />
                    <h4 className="text-sm font-semibold text-neutral-900">{seg.naam}</h4>
                  </div>
                  <span className="text-lg font-bold text-neutral-700">{seg.lead_count}</span>
                </div>
                {seg.beschrijving && <p className="text-xs text-neutral-500 mb-2">{seg.beschrijving}</p>}

                {/* Filter badges */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {seg.filters.stages?.map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded capitalize">{s}</span>)}
                  {seg.filters.branches?.map((b) => <span key={b} className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded capitalize">{b}</span>)}
                  {seg.filters.min_ai_score && <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">Score &ge;{seg.filters.min_ai_score}</span>}
                  {seg.filters.has_email && <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded">Email</span>}
                </div>

                <div className="flex gap-1">
                  <button onClick={() => editSegment(seg)} className="text-xs px-2 py-1 text-neutral-500 hover:bg-neutral-100 rounded">Bewerk</button>
                  <button onClick={() => { setSelectedSegment(seg.id); setMode("bulk"); fetchPreview(seg.id); }} className="text-xs px-2 py-1 text-blue-500 hover:bg-blue-50 rounded">Bulk Acties</button>
                  <button onClick={() => autoTagSegment(seg.id)} className="text-xs px-2 py-1 text-purple-500 hover:bg-purple-50 rounded">Auto-Tag</button>
                  <button onClick={() => deleteSegment(seg.id)} className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded">Verwijder</button>
                </div>
              </div>
            ))}
          </div>

          {segmenten.length === 0 && !showSegForm && (
            <div className="text-center py-12 bg-neutral-50 rounded-xl">
              <p className="text-neutral-500 mb-2">Nog geen segmenten aangemaakt</p>
              <button onClick={() => setShowSegForm(true)} className="text-sm text-[#F27501] hover:underline">Maak je eerste segment</button>
            </div>
          )}
        </div>
      )}

      {/* === TAGS === */}
      {mode === "tags" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">Tag Management</h3>
            <button onClick={() => setShowTagForm(true)} className="px-4 py-2 bg-[#F27501] text-white text-sm font-medium rounded-xl hover:bg-[#d96800]">
              + Tag
            </button>
          </div>

          {showTagForm && (
            <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input placeholder="Tag naam" value={tagForm.naam} onChange={(e) => setTagForm({ ...tagForm, naam: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2" />
                <select value={tagForm.categorie} onChange={(e) => setTagForm({ ...tagForm, categorie: e.target.value })} className="text-sm border border-neutral-200 rounded-lg px-3 py-2">
                  {TAG_CATEGORIEEN.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
                <div className="flex items-center gap-1">
                  {TAG_KLEUREN.map((k) => (
                    <button key={k} onClick={() => setTagForm({ ...tagForm, kleur: k })} className={`w-6 h-6 rounded-full border-2 ${tagForm.kleur === k ? "border-neutral-900" : "border-transparent"}`} style={{ backgroundColor: k }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveTag} disabled={!tagForm.naam} className="px-4 py-2 bg-[#F27501] text-white text-sm rounded-lg disabled:opacity-50">Toevoegen</button>
                <button onClick={() => setShowTagForm(false)} className="px-3 py-1.5 text-neutral-600 text-sm hover:bg-neutral-100 rounded-lg">Annuleren</button>
              </div>
            </div>
          )}

          {/* Tags per categorie */}
          {TAG_CATEGORIEEN.map((cat) => {
            const catTags = tagDefs.filter((t) => t.categorie === cat);
            if (catTags.length === 0) return null;
            return (
              <div key={cat}>
                <p className="text-xs font-semibold text-neutral-500 uppercase mb-2">{cat}</p>
                <div className="flex flex-wrap gap-2">
                  {catTags.map((t) => {
                    const usage = tagsInUse.find((u) => u.tag === t.naam);
                    return (
                      <div key={t.id} className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-full px-3 py-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.kleur }} />
                        <span className="text-sm text-neutral-700">{t.naam}</span>
                        {usage && <span className="text-[10px] text-neutral-400">({usage.count})</span>}
                        <button onClick={() => deleteTag(t.id)} className="text-neutral-300 hover:text-red-500 ml-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Tags in gebruik (niet in definities) */}
          {tagsInUse.filter((u) => !tagDefs.some((d) => d.naam === u.tag)).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase mb-2">Overige (in gebruik)</p>
              <div className="flex flex-wrap gap-2">
                {tagsInUse.filter((u) => !tagDefs.some((d) => d.naam === u.tag)).map((u) => (
                  <span key={u.tag} className="text-sm px-3 py-1.5 bg-neutral-100 text-neutral-600 rounded-full">
                    {u.tag} <span className="text-[10px] text-neutral-400">({u.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === BULK ACTIES === */}
      {mode === "bulk" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900">Bulk Acties</h3>

          {/* Segment selector */}
          <div className="flex items-center gap-3">
            <select
              value={selectedSegment || ""}
              onChange={(e) => { setSelectedSegment(e.target.value || null); if (e.target.value) fetchPreview(e.target.value); }}
              className="text-sm border border-neutral-200 rounded-lg px-3 py-2"
            >
              <option value="">Kies een segment...</option>
              {segmenten.map((s) => <option key={s.id} value={s.id}>{s.naam} ({s.lead_count})</option>)}
            </select>
            {previewCount > 0 && (
              <span className="text-sm text-neutral-500">{previewCount} leads • {selectedLeads.size} geselecteerd</span>
            )}
          </div>

          {/* Lead lijst met checkboxen */}
          {previewLeads.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-neutral-50 border-b flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedLeads.size === previewLeads.length && previewLeads.length > 0}
                    onChange={() => {
                      if (selectedLeads.size === previewLeads.length) setSelectedLeads(new Set());
                      else setSelectedLeads(new Set(previewLeads.map((l) => l.id)));
                    }}
                    className="w-4 h-4 rounded"
                  />
                  Alles selecteren
                </label>

                {/* Bulk action controls */}
                {selectedLeads.size > 0 && (
                  <div className="flex items-center gap-2">
                    <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value as "tag" | "stage" | "")} className="text-xs border rounded-lg px-2 py-1">
                      <option value="">Actie...</option>
                      <option value="tag">Tags toevoegen</option>
                      <option value="stage">Stage wijzigen</option>
                    </select>

                    {bulkAction === "tag" && (
                      <div className="flex gap-1">
                        {tagDefs.slice(0, 6).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setBulkTags(toggleArrayItem(bulkTags, t.naam))}
                            className={`text-[10px] px-2 py-0.5 rounded-full ${bulkTags.includes(t.naam) ? "text-white" : "bg-neutral-100 text-neutral-600"}`}
                            style={bulkTags.includes(t.naam) ? { backgroundColor: t.kleur } : {}}
                          >
                            {t.naam}
                          </button>
                        ))}
                      </div>
                    )}

                    {bulkAction === "stage" && (
                      <select value={bulkStage} onChange={(e) => setBulkStage(e.target.value)} className="text-xs border rounded-lg px-2 py-1">
                        <option value="">Stage...</option>
                        {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}

                    <button
                      onClick={executeBulk}
                      disabled={(bulkAction === "tag" && bulkTags.length === 0) || (bulkAction === "stage" && !bulkStage) || !bulkAction}
                      className="text-xs px-3 py-1 bg-[#F27501] text-white rounded-lg hover:bg-[#d96800] disabled:opacity-50"
                    >
                      Uitvoeren ({selectedLeads.size})
                    </button>
                  </div>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto divide-y divide-neutral-100">
                {previewLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-50">
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.id)}
                      onChange={() => {
                        const next = new Set(selectedLeads);
                        if (next.has(lead.id)) next.delete(lead.id);
                        else next.add(lead.id);
                        setSelectedLeads(next);
                      }}
                      className="w-4 h-4 rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate cursor-pointer hover:text-[#F27501]" onClick={() => onSelectLead?.(lead.id)}>
                        {lead.bedrijfsnaam}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-400">{lead.stad}</span>
                        <span className="text-xs text-neutral-400 capitalize">{lead.pipeline_stage}</span>
                        {(lead.tags || []).slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                    {lead.ai_score && <span className="text-xs text-purple-500">{lead.ai_score}</span>}
                    {lead.predicted_conversion_pct != null && (
                      <span className={`text-xs font-medium ${lead.predicted_conversion_pct >= 50 ? "text-green-600" : "text-neutral-400"}`}>
                        {lead.predicted_conversion_pct}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewLeads.length === 0 && !isLoading && (
            <div className="text-center py-12 bg-neutral-50 rounded-xl">
              <p className="text-neutral-500">Kies een segment om leads te bewerken</p>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block w-6 h-6 border-2 border-[#F27501] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
