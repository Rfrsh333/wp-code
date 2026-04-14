"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Check,
  X,
  Eye,
  ChevronDown,
  Sparkles,
  BarChart3,
  MapPin,
  FileText,
  Zap,
  Send,
  Archive,
  Activity,
  Search,
  Users,
  Target,
  Wrench,
} from "lucide-react";

// Types
interface GeoContent {
  id: string;
  created_at: string;
  updated_at: string;
  content_type: string;
  stad: string;
  slug: string;
  title: string;
  meta_description: string | null;
  body_markdown: string;
  excerpt: string | null;
  faq_items: Array<{ question: string; answer: string }>;
  status: string;
  review_notities: string | null;
  gegenereerd_door: string;
  primary_keywords: string[];
  versie: number;
}

interface GeoStats {
  totaal: number;
  per_status: Record<string, number>;
  per_stad: Record<string, number>;
  per_type: Record<string, number>;
  tokens_totaal: number;
  laatste_generatie: string | null;
}

interface CitationRecord {
  id: string;
  geciteerd: boolean;
  engine: string;
  citatie_positie: number | null;
  created_at: string;
  zoekopdracht: string;
  geo_content?: { title: string };
  concurrenten_urls?: string[];
}

interface PerformanceRecord {
  totaal_citaties: number;
  totaal_checks: number;
  citatie_percentage: number;
}

interface ConcurrentRecord {
  id: string;
  naam: string;
  website: string;
  stad: string | null;
  totaal_citaties: number;
}

interface GapRecord {
  id: string;
  geschat_volume: string;
  prioriteit: number;
  stad: string | null;
  zoekopdracht: string;
  voorgesteld_type: string | null;
  concurrent_urls?: string[];
  status: string;
}

interface AnalyseResult {
  score: number;
  sterke_punten: string[];
  verbeterpunten: string[];
  suggesties: string[];
}

const STEDEN = [
  { value: "amsterdam", label: "Amsterdam" },
  { value: "rotterdam", label: "Rotterdam" },
  { value: "den-haag", label: "Den Haag" },
  { value: "utrecht", label: "Utrecht" },
];

const CONTENT_TYPES = [
  { value: "city_page", label: "Stadspagina", icon: MapPin },
  { value: "faq_cluster", label: "FAQ Cluster", icon: FileText },
  { value: "service_guide", label: "Dienstgids", icon: Zap },
  { value: "authority_article", label: "Autoriteitsartikel", icon: Sparkles },
];

const STATUS_COLORS: Record<string, string> = {
  concept: "bg-gray-100 text-gray-700",
  review: "bg-yellow-100 text-yellow-800",
  gepubliceerd: "bg-green-100 text-green-800",
  gearchiveerd: "bg-red-100 text-red-700",
};

type TabView = "content" | "monitoring" | "optimizer" | "concurrenten" | "gaps";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Onbekende fout" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function GeoTab() {
  const [activeView, setActiveView] = useState<TabView>("content");
  const [content, setContent] = useState<GeoContent[]>([]);
  const [stats, setStats] = useState<GeoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GeoContent | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterStad, setFilterStad] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Monitoring state
  const [citations, setCitations] = useState<CitationRecord[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);

  // Competitor state
  const [concurrenten, setConcurrenten] = useState<ConcurrentRecord[]>([]);
  const [gaps, setGaps] = useState<GapRecord[]>([]);

  // Analyse state
  const [analyseResult, setAnalyseResult] = useState<AnalyseResult | null>(null);
  const [analyseLoading, setAnalyseLoading] = useState(false);

  // Generate form
  const [genType, setGenType] = useState<string>("city_page");
  const [genStad, setGenStad] = useState<string>("amsterdam");
  const [genContext, setGenContext] = useState<string>("");
  const [showGenForm, setShowGenForm] = useState(false);

  // Fetch helpers
  const fetchContent = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterStad) params.set("stad", filterStad);
      if (filterType) params.set("content_type", filterType);
      const data = await apiFetch(`/api/admin/geo?${params.toString()}`);
      setContent(data.content || []);
    } catch (err) { setError((err as Error).message); }
  }, [filterStatus, filterStad, filterType]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch("/api/admin/geo?action=stats");
      setStats(data);
    } catch { /* stats niet kritiek */ }
  }, []);

  const fetchCitations = useCallback(async () => {
    try {
      const data = await apiFetch("/api/admin/geo?action=citations&limit=30");
      setCitations(data.citations || []);
    } catch { /* niet kritiek */ }
  }, []);

  const fetchPerformance = useCallback(async () => {
    try {
      const data = await apiFetch("/api/admin/geo?action=performance&dagen=14");
      setPerformance(data.performance || []);
    } catch { /* niet kritiek */ }
  }, []);

  const fetchConcurrenten = useCallback(async () => {
    try {
      const data = await apiFetch("/api/admin/geo?action=concurrenten");
      setConcurrenten(data.concurrenten || []);
    } catch { /* niet kritiek */ }
  }, []);

  const fetchGaps = useCallback(async () => {
    try {
      const data = await apiFetch("/api/admin/geo?action=gaps&status=open");
      setGaps(data.gaps || []);
    } catch { /* niet kritiek */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchContent(), fetchStats()]).finally(() => setLoading(false));
  }, [fetchContent, fetchStats]);

  useEffect(() => {
    if (activeView === "monitoring") { fetchCitations(); fetchPerformance(); }
    if (activeView === "concurrenten") fetchConcurrenten();
    if (activeView === "gaps") fetchGaps();
  }, [activeView, fetchCitations, fetchPerformance, fetchConcurrenten, fetchGaps]);

  // Actions
  const handleGenerate = async () => {
    setGenerating(true); setError(""); setSuccessMsg("");
    try {
      const data = await apiFetch("/api/admin/geo", {
        method: "POST",
        body: JSON.stringify({ action: "generate", content_type: genType, stad: genStad, extra_context: genContext || undefined }),
      });
      setSuccessMsg(`Content gegenereerd: "${data.content.title}" (${data.tokens} tokens, ${(data.duur_ms / 1000).toFixed(1)}s)`);
      setShowGenForm(false); setGenContext("");
      fetchContent(); fetchStats();
    } catch (err) { setError((err as Error).message); }
    finally { setGenerating(false); }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      setError("");
      await apiFetch("/api/admin/geo", {
        method: "POST",
        body: JSON.stringify({ action: "update_status", id, status }),
      });
      setSuccessMsg(`Status bijgewerkt naar ${status}`);
      fetchContent(); fetchStats();
      if (selectedItem?.id === id) setSelectedItem((prev) => prev ? { ...prev, status } : null);
    } catch (err) { setError((err as Error).message); }
  };

  const handleBulkPublish = async () => {
    const reviewItems = content.filter((c) => c.status === "review");
    if (reviewItems.length === 0) return;
    try {
      setError("");
      await apiFetch("/api/admin/geo", {
        method: "POST",
        body: JSON.stringify({ action: "bulk_publish", ids: reviewItems.map((c) => c.id) }),
      });
      setSuccessMsg(`${reviewItems.length} items gepubliceerd`);
      fetchContent(); fetchStats();
    } catch (err) { setError((err as Error).message); }
  };

  const handleRunPipeline = async (mode: string) => {
    setGenerating(true); setError(""); setSuccessMsg("");
    try {
      if (mode === "monitor") {
        const data = await apiFetch("/api/admin/geo", { method: "POST", body: JSON.stringify({ action: "monitor", max: 5 }) });
        setSuccessMsg(`Monitoring: ${data.citaties_gevonden} citaties gevonden bij ${data.checked} items`);
        fetchCitations(); fetchPerformance();
      } else if (mode === "optimize") {
        const data = await apiFetch("/api/admin/geo", { method: "POST", body: JSON.stringify({ action: "optimize", max: 3 }) });
        setSuccessMsg(`Optimalisatie: ${data.optimized} items verbeterd`);
        fetchContent();
      } else if (mode === "competitor") {
        const data = await apiFetch("/api/admin/geo", { method: "POST", body: JSON.stringify({ action: "run_competitor" }) });
        setSuccessMsg(`Analyse: ${data.concurrenten} concurrenten, ${data.gaps} gaps gevonden`);
        fetchConcurrenten(); fetchGaps();
      } else {
        await apiFetch("/api/cron/geo-agent?max=3&mode=full");
        setSuccessMsg(`Pipeline voltooid`);
        fetchContent(); fetchStats(); fetchCitations(); fetchPerformance();
      }
    } catch (err) { setError((err as Error).message); }
    finally { setGenerating(false); }
  };

  const handleAnalyse = async (contentId: string) => {
    setAnalyseLoading(true); setAnalyseResult(null);
    try {
      const data = await apiFetch(`/api/admin/geo?action=analyse&content_id=${contentId}`);
      setAnalyseResult(data.analyse);
    } catch (err) { setError((err as Error).message); }
    finally { setAnalyseLoading(false); }
  };

  const stadLabel = (stad: string) => STEDEN.find((s) => s.value === stad)?.label || stad;
  const typeLabel = (type: string) => CONTENT_TYPES.find((t) => t.value === type)?.label || type;

  const VIEWS: { id: TabView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "content", label: "Content", icon: FileText },
    { id: "monitoring", label: "Monitoring", icon: Activity },
    { id: "optimizer", label: "Optimizer", icon: Wrench },
    { id: "concurrenten", label: "Concurrenten", icon: Users },
    { id: "gaps", label: "Content Gaps", icon: Target },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            GEO Agent
          </h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            Generative Engine Optimization — Content, monitoring & optimalisatie
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleRunPipeline("full")} disabled={generating}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50">
            <Zap className={`w-4 h-4 ${generating ? "animate-pulse" : ""}`} />
            {generating ? "Bezig..." : "Volledige pipeline"}
          </button>
          <button onClick={() => setShowGenForm(!showGenForm)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Sparkles className="w-4 h-4" />
            Nieuwe content
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          {successMsg}
          <button onClick={() => setSuccessMsg("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
            <div className="text-2xl font-bold text-neutral-900">{stats.totaal}</div>
            <div className="text-xs text-neutral-500">Totaal content</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
            <div className="text-2xl font-bold text-green-600">{stats.per_status.gepubliceerd || 0}</div>
            <div className="text-xs text-neutral-500">Gepubliceerd</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
            <div className="text-2xl font-bold text-yellow-600">{stats.per_status.review || 0}</div>
            <div className="text-xs text-neutral-500">Te reviewen</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
            <div className="text-2xl font-bold text-blue-600">{(stats.tokens_totaal / 1000).toFixed(1)}k</div>
            <div className="text-xs text-neutral-500">Tokens gebruikt</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
            <div className="text-sm font-medium text-neutral-700">
              {stats.laatste_generatie
                ? new Date(stats.laatste_generatie).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                : "—"}
            </div>
            <div className="text-xs text-neutral-500">Laatste generatie</div>
          </div>
        </div>
      )}

      {/* Generate form */}
      {showGenForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-200">
          <h3 className="font-semibold text-neutral-900 mb-3">Nieuwe GEO content genereren</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-neutral-600 mb-1 block">Content type</label>
              <select value={genType} onChange={(e) => setGenType(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm">
                {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 mb-1 block">Stad</label>
              <select value={genStad} onChange={(e) => setGenStad(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm">
                {STEDEN.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 mb-1 block">Focus/thema (optioneel)</label>
              <input type="text" value={genContext} onChange={(e) => setGenContext(e.target.value)}
                placeholder="bijv. Kosten uitzendkracht"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Sparkles className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Genereren..." : "Genereer content"}
            </button>
            <button onClick={() => setShowGenForm(false)} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800">
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Sub-navigation */}
      <div className="flex items-center gap-1 bg-neutral-100 rounded-xl p-1">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === view.id ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <view.icon className="w-4 h-4" />
            {view.label}
          </button>
        ))}
      </div>

      {/* ===== CONTENT VIEW ===== */}
      {activeView === "content" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm">
              <option value="">Alle statussen</option>
              <option value="concept">Concept</option>
              <option value="review">Review</option>
              <option value="gepubliceerd">Gepubliceerd</option>
              <option value="gearchiveerd">Gearchiveerd</option>
            </select>
            <select value={filterStad} onChange={(e) => setFilterStad(e.target.value)}
              className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm">
              <option value="">Alle steden</option>
              {STEDEN.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm">
              <option value="">Alle types</option>
              {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {content.filter((c) => c.status === "review").length > 0 && (
              <button onClick={handleBulkPublish}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
                <Send className="w-3.5 h-3.5" />
                Alle reviewen publiceren ({content.filter((c) => c.status === "review").length})
              </button>
            )}
          </div>

          {/* Content list */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                  <div className="h-5 w-64 bg-neutral-100 rounded mb-2" />
                  <div className="h-4 w-40 bg-neutral-50 rounded" />
                </div>
              ))}
            </div>
          ) : content.length === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-sm text-center">
              <Globe className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <h3 className="font-semibold text-neutral-700 mb-1">Nog geen GEO content</h3>
              <p className="text-sm text-neutral-500 mb-4">Genereer je eerste content voor AI zoekmachines</p>
              <button onClick={() => setShowGenForm(true)}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Eerste content genereren
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {content.map((item) => (
                <div key={item.id}
                  className={`bg-white rounded-xl p-4 shadow-sm border transition-colors cursor-pointer hover:border-blue-200 ${
                    selectedItem?.id === item.id ? "border-blue-400 ring-1 ring-blue-200" : "border-neutral-100"
                  }`}
                  onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[item.status] || "bg-gray-100"}`}>
                          {item.status}
                        </span>
                        <span className="text-xs text-neutral-400">{typeLabel(item.content_type)}</span>
                        <span className="text-xs text-neutral-400">•</span>
                        <span className="flex items-center gap-0.5 text-xs text-neutral-400">
                          <MapPin className="w-3 h-3" />{stadLabel(item.stad)}
                        </span>
                      </div>
                      <h4 className="font-semibold text-neutral-900 text-sm truncate">{item.title}</h4>
                      {item.excerpt && <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{item.excerpt}</p>}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-neutral-400">
                        <span>v{item.versie}</span>
                        <span>{item.faq_items?.length || 0} FAQs</span>
                        <span>{item.primary_keywords?.slice(0, 3).join(", ")}</span>
                        <span>{new Date(item.updated_at).toLocaleDateString("nl-NL")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3 shrink-0">
                      {item.status === "gepubliceerd" && (
                        <button onClick={(e) => { e.stopPropagation(); handleAnalyse(item.id); }}
                          className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100" title="Analyseer">
                          <BarChart3 className="w-4 h-4" />
                        </button>
                      )}
                      {item.status === "review" && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(item.id, "gepubliceerd"); }}
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" title="Publiceer">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(item.id, "gearchiveerd"); }}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Archiveer">
                            <Archive className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {item.status === "gepubliceerd" && (
                        <a href={`/geo/${item.slug}`} target="_blank" rel="noopener"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title="Bekijk pagina">
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${selectedItem?.id === item.id ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {selectedItem?.id === item.id && (
                    <div className="mt-4 pt-4 border-t border-neutral-100">
                      {/* Analyse result */}
                      {analyseResult && (
                        <div className="mb-4 bg-purple-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-semibold text-purple-900">Content Analyse</h5>
                            <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              analyseResult.score >= 70 ? "bg-green-100 text-green-800" :
                              analyseResult.score >= 40 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                            }`}>
                              Score: {analyseResult.score}/100
                            </div>
                          </div>
                          {analyseResult.sterke_punten.length > 0 && (
                            <div className="mb-2">
                              <span className="text-[10px] font-semibold text-green-700 uppercase">Sterk:</span>
                              <span className="text-xs text-green-700 ml-1">{analyseResult.sterke_punten.join(" • ")}</span>
                            </div>
                          )}
                          {analyseResult.verbeterpunten.length > 0 && (
                            <div className="mb-2">
                              <span className="text-[10px] font-semibold text-orange-700 uppercase">Verbeter:</span>
                              <span className="text-xs text-orange-700 ml-1">{analyseResult.verbeterpunten.join(" • ")}</span>
                            </div>
                          )}
                          {analyseResult.suggesties.length > 0 && (
                            <button onClick={(e) => { e.stopPropagation(); handleRunPipeline("optimize"); }}
                              className="mt-2 flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                              <Wrench className="w-3 h-3" />
                              Auto-optimaliseer ({analyseResult.suggesties.length} suggesties)
                            </button>
                          )}
                        </div>
                      )}
                      {analyseLoading && (
                        <div className="mb-4 bg-purple-50 rounded-lg p-4 text-center text-sm text-purple-600 animate-pulse">
                          Analyseren...
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-xs font-semibold text-neutral-600 mb-2">Content preview</h5>
                          <div className="bg-neutral-50 rounded-lg p-3 max-h-64 overflow-y-auto">
                            <p className="text-xs text-neutral-700 whitespace-pre-wrap">
                              {item.body_markdown.slice(0, 1000)}{item.body_markdown.length > 1000 && "..."}
                            </p>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-xs font-semibold text-neutral-600 mb-2">FAQ items ({item.faq_items?.length || 0})</h5>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {(item.faq_items || []).slice(0, 5).map((faq, idx) => (
                              <div key={idx} className="bg-neutral-50 rounded-lg p-2.5">
                                <p className="text-xs font-semibold text-neutral-800">{faq.question}</p>
                                <p className="text-[11px] text-neutral-600 mt-0.5 line-clamp-2">{faq.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-[11px] text-neutral-400">
                        <span>Slug: <code className="bg-neutral-100 px-1 rounded">{item.slug}</code></span>
                        {item.meta_description && <span>Meta: {item.meta_description.slice(0, 60)}...</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== MONITORING VIEW ===== */}
      {activeView === "monitoring" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900">Citation Monitoring</h3>
            <button onClick={() => handleRunPipeline("monitor")} disabled={generating}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50">
              <Search className={`w-4 h-4 ${generating ? "animate-pulse" : ""}`} />
              {generating ? "Checken..." : "Nu checken"}
            </button>
          </div>

          {/* Performance overview */}
          {performance.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-neutral-100">
              <h4 className="text-sm font-semibold text-neutral-700 mb-3">Performance (14 dagen)</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {performance.reduce((sum, p) => sum + (p.totaal_citaties || 0), 0)}
                  </div>
                  <div className="text-xs text-neutral-500">Totaal citaties</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {performance.reduce((sum, p) => sum + (p.totaal_checks || 0), 0)}
                  </div>
                  <div className="text-xs text-neutral-500">Totaal checks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {performance.length > 0
                      ? (performance.reduce((sum, p) => sum + (p.citatie_percentage || 0), 0) / performance.length).toFixed(1)
                      : "0"}%
                  </div>
                  <div className="text-xs text-neutral-500">Gem. citatie %</div>
                </div>
              </div>
            </div>
          )}

          {/* Citation list */}
          {citations.length === 0 ? (
            <div className="bg-white rounded-xl p-8 shadow-sm text-center">
              <Search className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">Nog geen citation checks uitgevoerd</p>
              <p className="text-xs text-neutral-400 mt-1">Klik &quot;Nu checken&quot; om te starten</p>
            </div>
          ) : (
            <div className="space-y-2">
              {citations.map((c) => (
                <div key={c.id} className={`bg-white rounded-xl p-4 shadow-sm border ${c.geciteerd ? "border-green-200" : "border-neutral-100"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {c.geciteerd ? (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px] font-bold">GECITEERD</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold">NIET GECITEERD</span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold uppercase">{c.engine}</span>
                      {c.citatie_positie && (
                        <span className="text-xs text-neutral-500">Positie #{c.citatie_positie}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(c.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-700 mt-1.5 font-medium">&quot;{c.zoekopdracht}&quot;</p>
                  {c.geo_content?.title && <p className="text-xs text-neutral-400 mt-0.5">Content: {c.geo_content.title}</p>}
                  {(c.concurrenten_urls?.length ?? 0) > 0 && (
                    <div className="mt-2 text-[10px] text-neutral-400">
                      Concurrenten: {c.concurrenten_urls!.slice(0, 3).join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== OPTIMIZER VIEW ===== */}
      {activeView === "optimizer" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900">Auto-Optimizer</h3>
            <button onClick={() => handleRunPipeline("optimize")} disabled={generating}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 disabled:opacity-50">
              <Wrench className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Optimaliseren..." : "Auto-optimaliseer"}
            </button>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-100">
            <h4 className="text-sm font-semibold text-neutral-700 mb-3">Hoe werkt de optimizer?</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-neutral-600">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-xs font-bold">1</div>
                <p>Analyseert elke gepubliceerde pagina op FAQ-aantal, statistieken, bronnen, lengte en intro kwaliteit</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                <p>Checkt citatie-percentages per AI zoekmachine</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-xs font-bold">3</div>
                <p>Genereert verbeteringen via Claude (extra FAQs, statistieken, bronnen)</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-xs font-bold">4</div>
                <p>Past content automatisch aan en logt alle wijzigingen</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-neutral-400">
              De optimizer draait automatisch bij de volledige pipeline en optimaliseert content met een score onder 60/100.
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-neutral-100">
            <h4 className="text-sm font-semibold text-neutral-700 mb-3">Content scores</h4>
            <p className="text-xs text-neutral-500 mb-3">Klik op een item in de Content tab en druk op het analyse-icoon om de score te zien.</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-lg font-bold text-green-700">70-100</div>
                <div className="text-[10px] text-green-600">Goed geoptimaliseerd</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-lg font-bold text-yellow-700">40-69</div>
                <div className="text-[10px] text-yellow-600">Verbetering nodig</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-lg font-bold text-red-700">0-39</div>
                <div className="text-[10px] text-red-600">Dringend optimaliseren</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CONCURRENTEN VIEW ===== */}
      {activeView === "concurrenten" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900">Concurrentie-analyse</h3>
            <button onClick={() => handleRunPipeline("competitor")} disabled={generating}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50">
              <Users className={`w-4 h-4 ${generating ? "animate-pulse" : ""}`} />
              {generating ? "Analyseren..." : "Analyse starten"}
            </button>
          </div>

          {concurrenten.length === 0 ? (
            <div className="bg-white rounded-xl p-8 shadow-sm text-center">
              <Users className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">Nog geen concurrenten gedetecteerd</p>
              <p className="text-xs text-neutral-400 mt-1">Run eerst de citation monitoring, dan detecteert de agent automatisch concurrenten</p>
            </div>
          ) : (
            <div className="space-y-2">
              {concurrenten.map((c) => (
                <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-neutral-900 text-sm">{c.naam}</h4>
                    <p className="text-xs text-neutral-500">{c.website}</p>
                    {c.stad && <span className="text-[10px] text-neutral-400">{stadLabel(c.stad)}</span>}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">{c.totaal_citaties}</div>
                    <div className="text-[10px] text-neutral-500">citaties</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== CONTENT GAPS VIEW ===== */}
      {activeView === "gaps" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900">Content Gaps</h3>
            <button onClick={() => handleRunPipeline("competitor")} disabled={generating}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 disabled:opacity-50">
              <Target className={`w-4 h-4 ${generating ? "animate-pulse" : ""}`} />
              {generating ? "Detecteren..." : "Gaps detecteren"}
            </button>
          </div>

          {gaps.length === 0 ? (
            <div className="bg-white rounded-xl p-8 shadow-sm text-center">
              <Target className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">Nog geen content gaps gedetecteerd</p>
              <p className="text-xs text-neutral-400 mt-1">Run eerst de monitoring en concurrentie-analyse</p>
            </div>
          ) : (
            <div className="space-y-2">
              {gaps.map((g) => (
                <div key={g.id} className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          g.geschat_volume === "hoog" ? "bg-red-100 text-red-700" :
                          g.geschat_volume === "middel" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {g.geschat_volume} volume
                        </span>
                        <span className="text-[10px] text-neutral-400">Prioriteit {g.prioriteit}/10</span>
                        {g.stad && <span className="flex items-center gap-0.5 text-[10px] text-neutral-400"><MapPin className="w-2.5 h-2.5" />{stadLabel(g.stad)}</span>}
                      </div>
                      <p className="text-sm font-semibold text-neutral-900">&quot;{g.zoekopdracht}&quot;</p>
                      {g.voorgesteld_type && (
                        <p className="text-xs text-neutral-500 mt-1">Suggestie: {typeLabel(g.voorgesteld_type)}</p>
                      )}
                      {(g.concurrent_urls?.length ?? 0) > 0 && (
                        <p className="text-[10px] text-neutral-400 mt-1">Concurrent: {g.concurrent_urls!.slice(0, 2).join(", ")}</p>
                      )}
                    </div>
                    {g.status === "open" && (
                      <button onClick={() => {
                        setGenContext(g.zoekopdracht);
                        setGenStad(g.stad || "amsterdam");
                        setGenType(g.voorgesteld_type || "faq_cluster");
                        setShowGenForm(true);
                        setActiveView("content");
                      }}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 shrink-0">
                        Content maken
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
