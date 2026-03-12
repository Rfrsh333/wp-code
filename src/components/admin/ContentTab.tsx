"use client";

import { useCallback, useEffect, useState } from "react";

interface ContentPost {
  id: string;
  type: "blog" | "linkedin";
  status: string;
  titel: string;
  inhoud: string;
  meta_description: string | null;
  keywords: string[] | null;
  slug: string | null;
  gepubliceerd_op: string | null;
  created_at: string;
}

const LINKEDIN_TYPES = [
  { value: "mijlpaal", label: "Mijlpaal" },
  { value: "tip", label: "Tip" },
  { value: "case_study", label: "Case study" },
  { value: "seizoen", label: "Seizoen" },
  { value: "vacature", label: "Vacature" },
];

export default function ContentTab() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<"all" | "blog" | "linkedin">("all");
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [editText, setEditText] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  };

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("type", filter);
      const token = await getToken();
      const res = await fetch(`/api/admin/content?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const adminAction = async (body: Record<string, unknown>) => {
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/content", {
        method: "POST",
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
      setError("Netwerkfout bij API call");
      return null;
    }
  };

  const generatePost = async (type: "blog" | "linkedin", subtype?: string) => {
    setGenerating(true);
    setError(null);
    const result = await adminAction({ action: "generate", type, subtype });
    if (result) {
      await fetchData();
    }
    setGenerating(false);
  };

  const publishPost = async (id: string) => {
    await adminAction({ action: "publish", id });
    fetchData();
  };

  const deletePost = async (id: string) => {
    if (!confirm("Weet je het zeker?")) return;
    await adminAction({ action: "delete", id });
    fetchData();
  };

  const saveEdit = async () => {
    if (!editingPost) return;
    await adminAction({ action: "update", id: editingPost.id, inhoud: editText });
    setEditingPost(null);
    fetchData();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const statusBadge = (status: string) => {
    if (status === "published") return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Gepubliceerd</span>;
    if (status === "scheduled") return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Ingepland</span>;
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-neutral-100 text-neutral-600">Concept</span>;
  };

  const typeBadge = (type: string) => {
    if (type === "blog") return <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">Blog</span>;
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">LinkedIn</span>;
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-neutral-200 rounded" />
        <div className="h-64 bg-neutral-100 rounded-xl" />
      </div>
    );
  }

  const drafts = posts.filter(p => p.status === "draft").length;
  const published = posts.filter(p => p.status === "published").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-900">Content Autopilot</h2>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => !generating && setShowDropdown(!showDropdown)}
              disabled={generating}
              className="px-4 py-2 bg-[#F27501] text-white text-sm font-medium rounded-lg hover:bg-[#D96800] transition-colors disabled:opacity-50"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Genereren...
                </span>
              ) : (
                "+ Genereer content"
              )}
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg py-2 w-56 z-10">
                <button onClick={() => { setShowDropdown(false); generatePost("blog"); }} className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50">
                  Blog artikel
                </button>
                <hr className="my-1 border-neutral-100" />
                {LINKEDIN_TYPES.map(lt => (
                  <button key={lt.value} onClick={() => { setShowDropdown(false); generatePost("linkedin", lt.value); }} className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50">
                    LinkedIn: {lt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-red-700 text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Totaal", value: posts.length, color: "bg-neutral-100 text-neutral-700" },
          { label: "Concepten", value: drafts, color: "bg-amber-50 text-amber-700" },
          { label: "Gepubliceerd", value: published, color: "bg-green-50 text-green-700" },
          { label: "Deze week", value: posts.filter(p => new Date(p.created_at) > new Date(Date.now() - 7 * 86400000)).length, color: "bg-blue-50 text-blue-700" },
        ].map((s, i) => (
          <div key={i} className={`${s.color} rounded-xl p-4`}>
            <p className="text-sm font-medium opacity-70">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { value: "all", label: "Alles" },
          { value: "blog", label: "Blogs" },
          { value: "linkedin", label: "LinkedIn" },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f.value ? "bg-[#1B2E4A] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Edit modal */}
      {editingPost && (
        <div className="bg-white rounded-xl border-2 border-[#F27501]/20 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900">Bewerken: {editingPost.titel}</h3>
            <button onClick={() => setEditingPost(null)} className="text-neutral-400 hover:text-neutral-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={15}
            className="w-full px-4 py-3 border border-neutral-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/30"
          />
          <div className="flex gap-2">
            <button onClick={saveEdit} className="px-4 py-2 bg-[#1B2E4A] text-white text-sm font-medium rounded-lg hover:bg-[#2A4365]">
              Opslaan
            </button>
            <button onClick={() => setEditingPost(null)} className="px-4 py-2 bg-neutral-100 text-neutral-600 text-sm font-medium rounded-lg hover:bg-neutral-200">
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Posts lijst */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center text-neutral-400">
            Nog geen content. Klik &quot;Genereer content&quot; om te beginnen.
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {typeBadge(post.type)}
                  {statusBadge(post.status)}
                  <h3 className="font-semibold text-neutral-900 ml-1">{post.titel}</h3>
                </div>
                <p className="text-xs text-neutral-400">{new Date(post.created_at).toLocaleDateString("nl-NL")}</p>
              </div>

              <div className="text-sm text-neutral-700 whitespace-pre-line leading-relaxed mb-4 max-h-48 overflow-hidden relative">
                {post.inhoud}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />
              </div>

              {post.keywords && post.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {post.keywords.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 text-[10px] bg-neutral-100 text-neutral-500 rounded">{kw}</span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-neutral-100">
                <button
                  onClick={() => { setEditingPost(post); setEditText(post.inhoud); }}
                  className="px-3 py-1.5 text-xs bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  Bewerken
                </button>
                <button
                  onClick={() => copyToClipboard(post.inhoud, post.id)}
                  className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  {copied === post.id ? "Gekopieerd!" : "Kopieer tekst"}
                </button>
                {post.status === "draft" && (
                  <button
                    onClick={() => publishPost(post.id)}
                    className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Publiceer
                  </button>
                )}
                <button
                  onClick={() => deletePost(post.id)}
                  className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors ml-auto"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
