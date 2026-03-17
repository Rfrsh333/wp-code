"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  RefreshCw,
  Check,
  X,
  Eye,
  ChevronDown,
  Sparkles,
  BarChart3,
  MapPin,
  FileText,
  Clock,
  Zap,
  Send,
  Archive,
} from "lucide-react";

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
  tokens_gebruikt?: number;
}

interface GeoStats {
  totaal: number;
  per_status: Record<string, number>;
  per_stad: Record<string, number>;
  per_type: Record<string, number>;
  tokens_totaal: number;
  laatste_generatie: string | null;
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

  // Generate form
  const [genType, setGenType] = useState<string>("city_page");
  const [genStad, setGenStad] = useState<string>("amsterdam");
  const [genContext, setGenContext] = useState<string>("");
  const [showGenForm, setShowGenForm] = useState(false);

  const fetchContent = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterStad) params.set("stad", filterStad);
      if (filterType) params.set("content_type", filterType);

      const data = await apiFetch(`/api/admin/geo?${params.toString()}`);
      setContent(data.content || []);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [filterStatus, filterStad, filterType]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch("/api/admin/geo?action=stats");
      setStats(data);
    } catch {
      // Stats zijn niet kritiek
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchContent(), fetchStats()]).finally(() => setLoading(false));
  }, [fetchContent, fetchStats]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    setSuccessMsg("");
    try {
      const data = await apiFetch("/api/admin/geo", {
        method: "POST",
        body: JSON.stringify({
          action: "generate",
          content_type: genType,
          stad: genStad,
          extra_context: genContext || undefined,
        }),
      });
      setSuccessMsg(`Content gegenereerd: "${data.content.title}" (${data.tokens} tokens, ${(data.duur_ms / 1000).toFixed(1)}s)`);
      setShowGenForm(false);
      setGenContext("");
      fetchContent();
      fetchStats();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      setError("");
      await apiFetch("/api/admin/geo", {
        method: "POST",
        body: JSON.stringify({ action: "update_status", id, status }),
      });
      setSuccessMsg(`Status bijgewerkt naar ${status}`);
      fetchContent();
      fetchStats();
      if (selectedItem?.id === id) {
        setSelectedItem((prev) => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleBulkPublish = async () => {
    const reviewItems = content.filter((c) => c.status === "review");
    if (reviewItems.length === 0) return;

    try {
      setError("");
      await apiFetch("/api/admin/geo", {
        method: "POST",
        body: JSON.stringify({
          action: "bulk_publish",
          ids: reviewItems.map((c) => c.id),
        }),
      });
      setSuccessMsg(`${reviewItems.length} items gepubliceerd`);
      fetchContent();
      fetchStats();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRunCron = async () => {
    setGenerating(true);
    setError("");
    try {
      const data = await apiFetch("/api/cron/geo-agent?max=3");
      setSuccessMsg(`Cron voltooid: ${data.generated} gegenereerd, ${data.skipped} overgeslagen${data.errors?.length ? `, ${data.errors.length} fouten` : ""}`);
      fetchContent();
      fetchStats();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const stadLabel = (stad: string) => STEDEN.find((s) => s.value === stad)?.label || stad;
  const typeLabel = (type: string) => CONTENT_TYPES.find((t) => t.value === type)?.label || type;

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
            Generative Engine Optimization — Content voor AI zoekmachines
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunCron}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${generating ? "animate-pulse" : ""}`} />
            {generating ? "Bezig..." : "Auto genereren"}
          </button>
          <button
            onClick={() => setShowGenForm(!showGenForm)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
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
              <select
                value={genType}
                onChange={(e) => setGenType(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 mb-1 block">Stad</label>
              <select
                value={genStad}
                onChange={(e) => setGenStad(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              >
                {STEDEN.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 mb-1 block">Focus/thema (optioneel)</label>
              <input
                type="text"
                value={genContext}
                onChange={(e) => setGenContext(e.target.value)}
                placeholder="bijv. Kosten uitzendkracht"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Genereren..." : "Genereer content"}
            </button>
            <button
              onClick={() => setShowGenForm(false)}
              className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm"
        >
          <option value="">Alle statussen</option>
          <option value="concept">Concept</option>
          <option value="review">Review</option>
          <option value="gepubliceerd">Gepubliceerd</option>
          <option value="gearchiveerd">Gearchiveerd</option>
        </select>
        <select
          value={filterStad}
          onChange={(e) => setFilterStad(e.target.value)}
          className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm"
        >
          <option value="">Alle steden</option>
          {STEDEN.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm"
        >
          <option value="">Alle types</option>
          {CONTENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {content.filter((c) => c.status === "review").length > 0 && (
          <button
            onClick={handleBulkPublish}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
          >
            <Send className="w-3.5 h-3.5" />
            Alle review items publiceren ({content.filter((c) => c.status === "review").length})
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
          <p className="text-sm text-neutral-500 mb-4">
            Genereer je eerste content voor AI zoekmachines
          </p>
          <button
            onClick={() => setShowGenForm(true)}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Eerste content genereren
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {content.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl p-4 shadow-sm border transition-colors cursor-pointer hover:border-blue-200 ${
                selectedItem?.id === item.id ? "border-blue-400 ring-1 ring-blue-200" : "border-neutral-100"
              }`}
              onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[item.status] || "bg-gray-100"}`}>
                      {item.status}
                    </span>
                    <span className="text-xs text-neutral-400">{typeLabel(item.content_type)}</span>
                    <span className="text-xs text-neutral-400">•</span>
                    <span className="flex items-center gap-0.5 text-xs text-neutral-400">
                      <MapPin className="w-3 h-3" />
                      {stadLabel(item.stad)}
                    </span>
                  </div>
                  <h4 className="font-semibold text-neutral-900 text-sm truncate">{item.title}</h4>
                  {item.excerpt && (
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{item.excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-neutral-400">
                    <span>v{item.versie}</span>
                    <span>{item.faq_items?.length || 0} FAQs</span>
                    <span>{item.primary_keywords?.slice(0, 3).join(", ")}</span>
                    <span>{new Date(item.updated_at).toLocaleDateString("nl-NL")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  {item.status === "review" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStatusUpdate(item.id, "gepubliceerd"); }}
                      className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                      title="Publiceer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {item.status === "review" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStatusUpdate(item.id, "gearchiveerd"); }}
                      className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                      title="Archiveer"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                  {item.status === "gepubliceerd" && (
                    <a
                      href={`/geo/${item.slug}`}
                      target="_blank"
                      rel="noopener"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                      title="Bekijk pagina"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  )}
                  <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${selectedItem?.id === item.id ? "rotate-180" : ""}`} />
                </div>
              </div>

              {/* Expanded detail */}
              {selectedItem?.id === item.id && (
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Content preview */}
                    <div>
                      <h5 className="text-xs font-semibold text-neutral-600 mb-2">Content preview</h5>
                      <div className="bg-neutral-50 rounded-lg p-3 max-h-64 overflow-y-auto">
                        <p className="text-xs text-neutral-700 whitespace-pre-wrap">
                          {item.body_markdown.slice(0, 1000)}
                          {item.body_markdown.length > 1000 && "..."}
                        </p>
                      </div>
                    </div>
                    {/* FAQs */}
                    <div>
                      <h5 className="text-xs font-semibold text-neutral-600 mb-2">
                        FAQ items ({item.faq_items?.length || 0})
                      </h5>
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
                  {/* Meta */}
                  <div className="mt-3 flex items-center gap-4 text-[11px] text-neutral-400">
                    <span>Slug: <code className="bg-neutral-100 px-1 rounded">{item.slug}</code></span>
                    {item.meta_description && <span>Meta: {item.meta_description.slice(0, 60)}...</span>}
                    <span>Keywords: {item.primary_keywords?.join(", ")}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
