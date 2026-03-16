"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Linkedin,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  FileText,
  Settings,
  Plus,
  Trash2,
  Eye,
  Sparkles,
  Calendar,
  RefreshCw,
  Copy,
  ExternalLink,
  ThumbsUp,
  MessageSquare,
  Share2,
  MousePointerClick,
  TrendingUp,
  Zap,
  Link2,
  Unlink,
  ImageIcon,
} from "lucide-react";

// ============================================================
// Types
// ============================================================

interface LinkedInPost {
  id: string;
  content_post_id: string | null;
  template_id: string | null;
  status: string;
  post_type: string;
  content: string;
  link_url: string | null;
  image_url: string | null;
  hashtags: string[] | null;
  scheduled_for: string | null;
  published_at: string | null;
  linkedin_post_urn: string | null;
  error_message: string | null;
  retry_count: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement_rate: number;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

interface LinkedInTemplate {
  id: string;
  naam: string;
  categorie: string;
  template: string;
  variabelen: string[];
  voorbeeld: string | null;
  is_active: boolean;
  gebruik_count: number;
}

interface Stats {
  total_posts: number;
  drafts: number;
  approved: number;
  scheduled: number;
  published: number;
  failed: number;
  total_impressions: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_clicks: number;
  posts_this_week: number;
  posts_this_month: number;
}

interface ConnectionStatus {
  connected: boolean;
  expired?: boolean;
  profile?: { name: string; image_url: string | null; person_id: string } | null;
  token_expires_at?: string | null;
  scopes?: string[] | null;
}

interface AnalyticsData {
  summary: {
    total_posts: number;
    total_impressions: number;
    total_likes: number;
    total_comments: number;
    total_shares: number;
    total_clicks: number;
    avg_engagement_rate: number;
  };
  daily: Array<{
    date: string;
    posts: number;
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
  }>;
  topPosts: Array<{
    id: string;
    content_preview: string;
    published_at: string;
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
  }>;
}

type SubTab = "wachtrij" | "gepland" | "gepubliceerd" | "analytics" | "templates" | "instellingen";

const TEMPLATE_CATEGORIES = [
  { value: "mijlpaal", label: "Mijlpaal" },
  { value: "tip", label: "Tip" },
  { value: "case_study", label: "Case study" },
  { value: "seizoen", label: "Seizoen" },
  { value: "vacature", label: "Vacature" },
  { value: "nieuws", label: "Nieuws" },
  { value: "engagement", label: "Engagement" },
  { value: "behind_the_scenes", label: "Behind the scenes" },
];

// ============================================================
// Component
// ============================================================

export default function LinkedInTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("wachtrij");
  const [posts, setPosts] = useState<LinkedInPost[]>([]);
  const [templates, setTemplates] = useState<LinkedInTemplate[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal state
  const [showEditor, setShowEditor] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [editorPostId, setEditorPostId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");

  // Generate state
  const [generateCategorie, setGenerateCategorie] = useState("");
  const [generating, setGenerating] = useState(false);
  const [batchCount, setBatchCount] = useState(5);

  const [copied, setCopied] = useState<string | null>(null);

  // Template editing
  const [editingTemplate, setEditingTemplate] = useState<LinkedInTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategorie, setNewTemplateCategorie] = useState("tip");
  const [newTemplateContent, setNewTemplateContent] = useState("");

  const getToken = async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  };

  // ============================================================
  // Data fetching
  // ============================================================

  const fetchPosts = useCallback(async (status?: string) => {
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const token = await getToken();
      const res = await fetch(`/api/admin/linkedin?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error("Fetch posts error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/linkedin/templates?active=false", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("Fetch templates error:", err);
    }
  }, []);

  const fetchConnectionStatus = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/linkedin/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus(data);
      }
    } catch (err) {
      console.error("Fetch status error:", err);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/linkedin/analytics?days=30", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error("Fetch analytics error:", err);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchConnectionStatus();
  }, [fetchPosts, fetchConnectionStatus]);

  useEffect(() => {
    if (activeSubTab === "templates") fetchTemplates();
    if (activeSubTab === "analytics") fetchAnalytics();
  }, [activeSubTab, fetchTemplates, fetchAnalytics]);

  // ============================================================
  // Actions
  // ============================================================

  const adminAction = async (
    endpoint: string,
    body: Record<string, unknown>,
    method = "POST"
  ) => {
    try {
      setError(null);
      const token = await getToken();
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Er ging iets mis");
        return null;
      }
      return data;
    } catch (err) {
      console.error("Admin action error:", err);
      setError("Netwerkfout");
      return null;
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    const result = await adminAction("/api/admin/linkedin", {
      action: "generate",
      categorie: generateCategorie || undefined,
    });
    if (result) {
      setSuccess("Post gegenereerd");
      fetchPosts();
    }
    setGenerating(false);
  };

  const handleGenerateBatch = async () => {
    setGenerating(true);
    setError(null);
    const result = await adminAction("/api/admin/linkedin", {
      action: "generate_batch",
      count: batchCount,
      categorie: generateCategorie || undefined,
    });
    if (result) {
      setSuccess(`${result.count} posts gegenereerd`);
      fetchPosts();
    }
    setGenerating(false);
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const result = await adminAction("/api/admin/linkedin", { action: "approve", id });
    if (result) {
      setSuccess("Post goedgekeurd");
      fetchPosts();
    }
    setActionLoading(null);
  };

  const handleSchedule = async (id: string) => {
    if (!scheduleDate) {
      setError("Kies een datum en tijd");
      return;
    }
    setActionLoading(id);
    const result = await adminAction("/api/admin/linkedin", {
      action: "schedule",
      id,
      scheduled_for: new Date(scheduleDate).toISOString(),
    });
    if (result) {
      setSuccess("Post ingepland");
      setScheduleDate("");
      fetchPosts();
    }
    setActionLoading(null);
  };

  const handlePublishNow = async (id: string) => {
    setActionLoading(id);
    const result = await adminAction("/api/admin/linkedin", { action: "publish_now", id });
    if (result) {
      setSuccess("Post gepubliceerd op LinkedIn");
      fetchPosts();
    }
    setActionLoading(null);
  };

  const handleRetry = async (id: string) => {
    setActionLoading(id);
    const result = await adminAction("/api/admin/linkedin", { action: "retry", id });
    if (result) {
      setSuccess("Post opnieuw klaargezet");
      fetchPosts();
    }
    setActionLoading(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Weet je zeker dat je deze post wilt verwijderen?")) return;
    setActionLoading(id);
    const result = await adminAction("/api/admin/linkedin", { action: "delete", id });
    if (result) {
      setSuccess("Post verwijderd");
      fetchPosts();
    }
    setActionLoading(null);
  };

  const handleUpdatePost = async () => {
    if (!editorPostId || !editorContent) return;
    setActionLoading(editorPostId);
    const result = await adminAction("/api/admin/linkedin", {
      action: "update",
      id: editorPostId,
      content: editorContent,
    });
    if (result) {
      setSuccess("Post bijgewerkt");
      setShowEditor(false);
      setEditorContent("");
      setEditorPostId(null);
      fetchPosts();
    }
    setActionLoading(null);
  };

  const handleConnect = async () => {
    setActionLoading("connect");
    try {
      const token = await getToken();
      const res = await fetch("/api/linkedin/authorize", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      } else {
        setError("Kan OAuth flow niet starten");
      }
    } catch {
      setError("Netwerkfout");
    }
    setActionLoading(null);
  };

  const handleDisconnect = async () => {
    if (!confirm("Weet je zeker dat je LinkedIn wilt ontkoppelen?")) return;
    setActionLoading("disconnect");
    const token = await getToken();
    const res = await fetch("/api/linkedin/disconnect", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setSuccess("LinkedIn ontkoppeld");
      fetchConnectionStatus();
    } else {
      setError("Fout bij ontkoppelen");
    }
    setActionLoading(null);
  };

  const handleGenerateImage = async (id: string) => {
    setActionLoading(id);
    setError(null);
    const result = await adminAction("/api/admin/linkedin", { action: "generate_image", id });
    if (result) {
      setSuccess("Afbeelding gegenereerd");
      fetchPosts();
    }
    setActionLoading(null);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Template actions
  const handleTemplateAction = async (body: Record<string, unknown>) => {
    const result = await adminAction("/api/admin/linkedin/templates", body);
    if (result) {
      fetchTemplates();
      setEditingTemplate(null);
      setNewTemplateName("");
      setNewTemplateContent("");
    }
    return result;
  };

  // ============================================================
  // Helpers
  // ============================================================

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      approved: "bg-blue-100 text-blue-700",
      scheduled: "bg-purple-100 text-purple-700",
      publishing: "bg-yellow-100 text-yellow-700",
      published: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
    };
    const labels: Record<string, string> = {
      draft: "Concept",
      approved: "Goedgekeurd",
      scheduled: "Gepland",
      publishing: "Bezig...",
      published: "Gepubliceerd",
      failed: "Mislukt",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {labels[status] || status}
      </span>
    );
  };

  const charCount = editorContent.length;
  const charColor = charCount > 3000 ? "text-red-500" : charCount > 2500 ? "text-yellow-500" : "text-gray-400";

  // Filter posts by subtab
  const filteredPosts = posts.filter((p) => {
    if (activeSubTab === "wachtrij") return ["draft", "approved", "failed"].includes(p.status);
    if (activeSubTab === "gepland") return p.status === "scheduled";
    if (activeSubTab === "gepubliceerd") return p.status === "published";
    return true;
  });

  // Clear success after 3s
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // ============================================================
  // Sub-tab navigation
  // ============================================================

  const subTabs: { id: SubTab; label: string; icon: typeof Linkedin; count?: number }[] = [
    { id: "wachtrij", label: "Wachtrij", icon: FileText, count: (stats?.drafts || 0) + (stats?.approved || 0) + (stats?.failed || 0) },
    { id: "gepland", label: "Gepland", icon: Clock, count: stats?.scheduled },
    { id: "gepubliceerd", label: "Gepubliceerd", icon: CheckCircle2, count: stats?.published },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "instellingen", label: "Instellingen", icon: Settings },
  ];

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Linkedin className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">LinkedIn</h2>
            <p className="text-sm text-gray-500">Beheer en publiceer LinkedIn posts</p>
          </div>
        </div>
        {connectionStatus && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            connectionStatus.connected ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
          }`}>
            <div className={`w-2 h-2 rounded-full ${connectionStatus.connected ? "bg-green-500" : "bg-gray-400"}`} />
            {connectionStatus.connected ? `Verbonden als ${connectionStatus.profile?.name || "..."}` : "Niet verbonden"}
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">x</button>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Sub-tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeSubTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Loading */}
      {loading && activeSubTab !== "templates" && activeSubTab !== "instellingen" && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      )}

      {/* ============================================================ */}
      {/* WACHTRIJ */}
      {/* ============================================================ */}
      {activeSubTab === "wachtrij" && !loading && (
        <div className="space-y-4">
          {/* Generate controls */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              AI Post Genereren
            </h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Categorie</label>
                <select
                  value={generateCategorie}
                  onChange={(e) => setGenerateCategorie(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Willekeurig</option>
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Genereer 1 post
              </button>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm"
                />
                <button
                  onClick={handleGenerateBatch}
                  disabled={generating}
                  className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 disabled:opacity-50 flex items-center gap-2"
                >
                  {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Batch genereren
                </button>
              </div>
            </div>
          </div>

          {/* Post list */}
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <p>Geen posts in de wachtrij</p>
              <p className="text-xs mt-1">Genereer een post hierboven om te beginnen</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map((post) => (
                <div key={post.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {statusBadge(post.status)}
                        <span className="text-xs text-gray-400">{formatDate(post.created_at)}</span>
                        {post.error_message && (
                          <span className="text-xs text-red-500 truncate max-w-xs" title={post.error_message}>
                            {post.error_message}
                          </span>
                        )}
                      </div>
                      {/* LinkedIn preview */}
                      <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 mb-3">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-6">{post.content}</p>
                        {post.link_url && (
                          <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />{post.link_url}
                          </a>
                        )}
                        {post.image_url ? (
                          <div className="mt-2 relative group">
                            <img
                              src={post.image_url}
                              alt="LinkedIn post afbeelding"
                              className="w-full max-w-md rounded-lg border border-gray-200"
                              style={{ aspectRatio: "1200/627" }}
                            />
                            <button
                              onClick={() => handleGenerateImage(post.id)}
                              disabled={actionLoading === post.id}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white/90 text-gray-600 hover:text-orange-600 rounded-lg shadow-sm text-xs flex items-center gap-1"
                              title="Nieuwe afbeelding genereren"
                            >
                              <RefreshCw className={`w-3 h-3 ${actionLoading === post.id ? "animate-spin" : ""}`} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleGenerateImage(post.id)}
                            disabled={actionLoading === post.id}
                            className="mt-2 px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 text-xs rounded-lg hover:border-orange-400 hover:text-orange-600 flex items-center gap-1.5 transition-colors"
                          >
                            {actionLoading === post.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ImageIcon className="w-3.5 h-3.5" />
                            )}
                            Afbeelding genereren
                          </button>
                        )}
                      </div>
                      {post.hashtags && post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {post.hashtags.map((tag) => (
                            <span key={tag} className="text-xs text-blue-500">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => { setEditorContent(post.content); setEditorPostId(post.id); setShowEditor(true); }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Bewerken"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCopy(post.content, post.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Kopieer"
                      >
                        {copied === post.id ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      {post.status === "draft" && (
                        <button
                          onClick={() => handleApprove(post.id)}
                          disabled={actionLoading === post.id}
                          className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Goedkeuren"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {["draft", "approved"].includes(post.status) && connectionStatus?.connected && (
                        <button
                          onClick={() => handlePublishNow(post.id)}
                          disabled={actionLoading === post.id}
                          className="p-1.5 text-green-400 hover:text-green-600 hover:bg-green-50 rounded"
                          title="Nu publiceren"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {post.status === "failed" && (
                        <button
                          onClick={() => handleRetry(post.id)}
                          disabled={actionLoading === post.id}
                          className="p-1.5 text-yellow-400 hover:text-yellow-600 hover:bg-yellow-50 rounded"
                          title="Opnieuw proberen"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={actionLoading === post.id}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {/* Schedule input for draft/approved */}
                  {["draft", "approved"].includes(post.status) && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="border border-gray-200 rounded px-2 py-1 text-sm"
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      <button
                        onClick={() => handleSchedule(post.id)}
                        disabled={!scheduleDate || actionLoading === post.id}
                        className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50"
                      >
                        Inplannen
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* GEPLAND */}
      {/* ============================================================ */}
      {activeSubTab === "gepland" && !loading && (
        <div className="space-y-3">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <p>Geen geplande posts</p>
            </div>
          ) : (
            filteredPosts
              .sort((a, b) => (a.scheduled_for || "").localeCompare(b.scheduled_for || ""))
              .map((post) => (
                <div key={post.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-purple-700">{formatDate(post.scheduled_for)}</span>
                    {statusBadge(post.status)}
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-4 mb-3">{post.content}</p>
                  {post.image_url && (
                    <img src={post.image_url} alt="Post afbeelding" className="w-full max-w-md rounded-lg border border-gray-200 mb-3" style={{ aspectRatio: "1200/627" }} />
                  )}
                  <div className="flex gap-2">
                    {connectionStatus?.connected && (
                      <button
                        onClick={() => handlePublishNow(post.id)}
                        disabled={actionLoading === post.id}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />Nu publiceren
                      </button>
                    )}
                    <button
                      onClick={() => { setEditorContent(post.content); setEditorPostId(post.id); setShowEditor(true); }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200"
                    >
                      Bewerken
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={actionLoading === post.id}
                      className="px-3 py-1.5 text-red-600 text-xs rounded-lg hover:bg-red-50"
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* GEPUBLICEERD */}
      {/* ============================================================ */}
      {activeSubTab === "gepubliceerd" && !loading && (
        <div className="space-y-3">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
              <p>Nog geen gepubliceerde posts</p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <div key={post.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-500">{formatDate(post.published_at)}</span>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-3 mb-3">{post.content}</p>
                    {post.image_url && (
                      <img src={post.image_url} alt="Post afbeelding" className="w-full max-w-md rounded-lg border border-gray-200 mb-3" style={{ aspectRatio: "1200/627" }} />
                    )}
                    {/* Inline analytics */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.impressions.toLocaleString()} impressies</span>
                      <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.likes} likes</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comments} comments</span>
                      <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{post.shares} shares</span>
                      <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" />{post.clicks} clicks</span>
                      {post.engagement_rate > 0 && (
                        <span className="flex items-center gap-1 text-green-600"><TrendingUp className="w-3 h-3" />{post.engagement_rate}% engagement</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(post.content, post.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  >
                    {copied === post.id ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ANALYTICS */}
      {/* ============================================================ */}
      {activeSubTab === "analytics" && (
        <div className="space-y-6">
          {!analyticsData ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Posts", value: analyticsData.summary.total_posts, icon: FileText },
                  { label: "Impressies", value: analyticsData.summary.total_impressions.toLocaleString(), icon: Eye },
                  { label: "Likes", value: analyticsData.summary.total_likes, icon: ThumbsUp },
                  { label: "Comments", value: analyticsData.summary.total_comments, icon: MessageSquare },
                  { label: "Shares", value: analyticsData.summary.total_shares, icon: Share2 },
                  { label: "Clicks", value: analyticsData.summary.total_clicks, icon: MousePointerClick },
                  { label: "Gem. engagement", value: `${analyticsData.summary.avg_engagement_rate.toFixed(1)}%`, icon: TrendingUp },
                ].map((card) => (
                  <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <card.icon className="w-4 h-4" />
                      <span className="text-xs">{card.label}</span>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Daily chart (simple bar representation) */}
              {analyticsData.daily.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Dagelijkse impressies (laatste 30 dagen)</h3>
                  <div className="flex items-end gap-1 h-32">
                    {analyticsData.daily.map((d) => {
                      const maxImp = Math.max(...analyticsData.daily.map((x) => x.impressions), 1);
                      const height = Math.max((d.impressions / maxImp) * 100, 2);
                      return (
                        <div
                          key={d.date}
                          className="flex-1 bg-blue-400 rounded-t hover:bg-blue-500 transition-colors cursor-default group relative"
                          style={{ height: `${height}%` }}
                          title={`${d.date}: ${d.impressions} impressies, ${d.posts} posts`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>{analyticsData.daily[0]?.date}</span>
                    <span>{analyticsData.daily[analyticsData.daily.length - 1]?.date}</span>
                  </div>
                </div>
              )}

              {/* Top posts */}
              {analyticsData.topPosts.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Top posts</h3>
                  <div className="space-y-3">
                    {analyticsData.topPosts.map((p, i) => (
                      <div key={p.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                        <span className="text-lg font-bold text-gray-300 w-6 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{p.content_preview}</p>
                          <div className="flex gap-3 text-xs text-gray-400 mt-1">
                            <span>{p.impressions} impressies</span>
                            <span>{p.likes} likes</span>
                            <span>{p.comments} comments</span>
                            <span>{p.shares} shares</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TEMPLATES */}
      {/* ============================================================ */}
      {activeSubTab === "templates" && (
        <div className="space-y-4">
          {/* Add template form */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nieuw template
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                placeholder="Template naam"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={newTemplateCategorie}
                onChange={(e) => setNewTemplateCategorie(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {TEMPLATE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Template tekst (gebruik {{variabele}} voor variabelen)"
              value={newTemplateContent}
              onChange={(e) => setNewTemplateContent(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
            />
            <button
              onClick={() => handleTemplateAction({
                action: "create",
                naam: newTemplateName,
                categorie: newTemplateCategorie,
                template: newTemplateContent,
                variabelen: Array.from(newTemplateContent.matchAll(/\{\{(\w+)\}\}/g)).map(m => m[1]),
              })}
              disabled={!newTemplateName || !newTemplateContent}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Template opslaan
            </button>
          </div>

          {/* Template list grouped by category */}
          {TEMPLATE_CATEGORIES.map((cat) => {
            const catTemplates = templates.filter((t) => t.categorie === cat.value);
            if (catTemplates.length === 0) return null;
            return (
              <div key={cat.value}>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  {cat.label}
                  <span className="text-xs text-gray-400">({catTemplates.length})</span>
                </h4>
                <div className="space-y-2">
                  {catTemplates.map((t) => (
                    <div key={t.id} className={`border rounded-lg p-3 ${t.is_active ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100 opacity-60"}`}>
                      {editingTemplate?.id === t.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingTemplate.naam}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, naam: e.target.value })}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                          />
                          <textarea
                            value={editingTemplate.template}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, template: e.target.value })}
                            rows={4}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleTemplateAction({
                                action: "update",
                                id: editingTemplate.id,
                                naam: editingTemplate.naam,
                                template: editingTemplate.template,
                                variabelen: Array.from(editingTemplate.template.matchAll(/\{\{(\w+)\}\}/g)).map(m => m[1]),
                              })}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                              Opslaan
                            </button>
                            <button onClick={() => setEditingTemplate(null)} className="px-3 py-1 text-gray-600 text-xs rounded hover:bg-gray-100">
                              Annuleren
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-800">{t.naam}</span>
                              {!t.is_active && <span className="text-xs text-gray-400">(inactief)</span>}
                              <span className="text-xs text-gray-400">({t.gebruik_count}x gebruikt)</span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 whitespace-pre-wrap">{t.template}</p>
                            {t.variabelen.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {t.variabelen.map((v) => (
                                  <span key={v} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{`{{${v}}}`}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => setEditingTemplate(t)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleTemplateAction({
                                action: "update",
                                id: t.id,
                                is_active: !t.is_active,
                              })}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                              title={t.is_active ? "Deactiveren" : "Activeren"}
                            >
                              {t.is_active ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <AlertCircle className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("Template verwijderen?")) {
                                  handleTemplateAction({ action: "delete", id: t.id });
                                }
                              }}
                              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* INSTELLINGEN */}
      {/* ============================================================ */}
      {activeSubTab === "instellingen" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Linkedin className="w-5 h-5 text-blue-600" />
              LinkedIn Connectie
            </h3>

            {connectionStatus ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    connectionStatus.connected ? "bg-green-100" : "bg-gray-200"
                  }`}>
                    {connectionStatus.connected
                      ? <CheckCircle2 className="w-6 h-6 text-green-600" />
                      : <Unlink className="w-6 h-6 text-gray-400" />
                    }
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {connectionStatus.connected
                        ? `Verbonden als ${connectionStatus.profile?.name}`
                        : "Niet verbonden"
                      }
                    </p>
                    {connectionStatus.token_expires_at && (
                      <p className="text-sm text-gray-500">
                        Token geldig tot: {formatDate(connectionStatus.token_expires_at)}
                      </p>
                    )}
                    {connectionStatus.expired && (
                      <p className="text-sm text-red-500">Token is verlopen — opnieuw verbinden</p>
                    )}
                  </div>
                </div>

                {connectionStatus.connected ? (
                  <button
                    onClick={handleDisconnect}
                    disabled={actionLoading === "disconnect"}
                    className="px-4 py-2 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Unlink className="w-4 h-4" />
                    LinkedIn ontkoppelen
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={actionLoading === "connect"}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Link2 className="w-4 h-4" />
                    Verbinden met LinkedIn
                  </button>
                )}

                {connectionStatus.scopes && connectionStatus.scopes.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Scopes:</p>
                    <div className="flex flex-wrap gap-1">
                      {connectionStatus.scopes.map((s) => (
                        <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Status laden...
              </div>
            )}
          </div>

          {/* Quick stats */}
          {stats && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Overzicht</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Totaal posts", value: stats.total_posts },
                  { label: "Concepten", value: stats.drafts },
                  { label: "Gepland", value: stats.scheduled },
                  { label: "Gepubliceerd", value: stats.published },
                  { label: "Mislukt", value: stats.failed },
                  { label: "Deze week", value: stats.posts_this_week },
                  { label: "Deze maand", value: stats.posts_this_month },
                  { label: "Totaal impressies", value: stats.total_impressions.toLocaleString() },
                ].map((s) => (
                  <div key={s.label} className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* EDITOR MODAL */}
      {/* ============================================================ */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Post bewerken</h3>
                <button onClick={() => { setShowEditor(false); setEditorContent(""); setEditorPostId(null); }} className="text-gray-400 hover:text-gray-600">
                  x
                </button>
              </div>

              {/* LinkedIn preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">TT</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">TopTalent Jobs</p>
                    <p className="text-xs text-gray-500">Horeca uitzendbureau</p>
                  </div>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{editorContent || "Begin met typen..."}</p>
              </div>

              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                rows={10}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm resize-y"
                placeholder="Schrijf je LinkedIn post..."
              />

              <div className="flex items-center justify-between mt-2 mb-4">
                <span className={`text-xs ${charColor}`}>{charCount} / 3000 tekens</span>
                <span className="text-xs text-gray-400">~{Math.round(editorContent.split(/\s+/).filter(Boolean).length)} woorden</span>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowEditor(false); setEditorContent(""); setEditorPostId(null); }}
                  className="px-4 py-2 text-gray-600 text-sm rounded-lg hover:bg-gray-100"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleUpdatePost}
                  disabled={!editorContent || actionLoading === editorPostId}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Opslaan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
