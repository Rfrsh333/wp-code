"use client";

import { useCallback, useEffect, useState } from "react";

interface Review {
  id: string;
  reviewer_naam: string;
  score: number;
  tekst: string;
  review_datum: string;
  antwoord: string | null;
  antwoord_datum: string | null;
  ai_antwoord: string | null;
  created_at: string;
}

interface Stats {
  totaal: number;
  gemiddelde: number;
  deze_maand: number;
  gem_deze_maand: number;
  gem_vorige_maand: number;
  trend: number;
  review_requests_verzonden: number;
}

export default function ReviewsTab() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [newReview, setNewReview] = useState({ reviewer_naam: "", score: "5", tekst: "", review_datum: new Date().toISOString().split("T")[0] });
  const [error, setError] = useState<string | null>(null);

  const getToken = async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  };

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/reviews", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setReviews(data.reviews || []);
        setStats(data.stats || null);
        setError(null);
      } else {
        setError(data.error || "Fout bij ophalen reviews");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Kon reviews niet laden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const adminAction = async (body: Record<string, unknown>) => {
    const token = await getToken();
    const res = await fetch("/api/admin/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return res.ok ? await res.json() : null;
  };

  const addReview = async () => {
    if (!newReview.reviewer_naam || !newReview.score) return;
    const result = await adminAction({ action: "add", ...newReview });
    if (result) {
      setShowForm(false);
      setNewReview({ reviewer_naam: "", score: "5", tekst: "", review_datum: new Date().toISOString().split("T")[0] });
      setError(null);
      fetchData();
    } else {
      setError("Fout bij toevoegen review");
    }
  };

  const generateResponse = async (review: Review) => {
    setGenerating(review.id);
    const result = await adminAction({
      action: "generate_response",
      review_id: review.id,
      reviewer_naam: review.reviewer_naam,
      score: review.score,
      tekst: review.tekst,
    });
    if (result?.antwoord) {
      setReviews(prev => prev.map(r => r.id === review.id ? { ...r, ai_antwoord: result.antwoord } : r));
    }
    setGenerating(null);
  };

  const saveResponse = async (reviewId: string, antwoord: string) => {
    await adminAction({ action: "save_response", review_id: reviewId, antwoord });
    fetchData();
  };

  const stars = (score: number) => "★".repeat(score) + "☆".repeat(5 - score);

  const scoreColor = (score: number) => {
    if (score >= 4) return "text-green-600";
    if (score >= 3) return "text-amber-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-neutral-200 rounded" />
        <div className="h-64 bg-neutral-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-900">Google Reviews</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#F27501] text-white text-sm font-medium rounded-lg hover:bg-[#D96800] transition-colors"
        >
          {showForm ? "Annuleren" : "+ Review toevoegen"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-sm text-neutral-500">Totaal reviews</p>
            <p className="text-2xl font-bold text-neutral-900">{stats.totaal}</p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-sm text-neutral-500">Gemiddelde score</p>
            <p className={`text-2xl font-bold ${scoreColor(stats.gemiddelde)}`}>
              {stats.gemiddelde > 0 ? stats.gemiddelde.toFixed(1) : "—"} <span className="text-amber-400 text-lg">★</span>
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-sm text-neutral-500">Deze maand</p>
            <p className="text-2xl font-bold text-neutral-900">{stats.deze_maand}</p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-sm text-neutral-500">Trend</p>
            <p className={`text-2xl font-bold ${stats.trend >= 0 ? "text-green-600" : "text-red-600"}`}>
              {stats.trend > 0 ? "+" : ""}{stats.trend.toFixed(1)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-sm text-neutral-500">Review requests</p>
            <p className="text-2xl font-bold text-blue-600">{stats.review_requests_verzonden}</p>
          </div>
        </div>
      )}

      {/* Nieuwe review form */}
      {showForm && (
        <div className="bg-white rounded-xl border-2 border-[#F27501]/20 p-6 space-y-4">
          <h3 className="font-semibold text-neutral-900">Review handmatig toevoegen</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Reviewer naam</label>
              <input
                type="text"
                value={newReview.reviewer_naam}
                onChange={e => setNewReview({ ...newReview, reviewer_naam: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F27501]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Score</label>
              <select
                value={newReview.score}
                onChange={e => setNewReview({ ...newReview, score: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F27501]/30"
              >
                {[5, 4, 3, 2, 1].map(s => (
                  <option key={s} value={s}>{s} {s === 1 ? "ster" : "sterren"}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Review tekst</label>
              <textarea
                value={newReview.tekst}
                onChange={e => setNewReview({ ...newReview, tekst: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F27501]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Datum</label>
              <input
                type="date"
                value={newReview.review_datum}
                onChange={e => setNewReview({ ...newReview, review_datum: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F27501]/30"
              />
            </div>
          </div>
          <button
            onClick={addReview}
            disabled={!newReview.reviewer_naam}
            className="px-4 py-2 bg-[#1B2E4A] text-white text-sm font-medium rounded-lg hover:bg-[#2A4365] transition-colors disabled:opacity-50"
          >
            Opslaan
          </button>
        </div>
      )}

      {/* Reviews lijst */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center text-neutral-400">
            Nog geen reviews. Voeg handmatig reviews toe of wacht op review requests.
          </div>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-neutral-900">{review.reviewer_naam}</h4>
                    <span className={`text-lg ${scoreColor(review.score)}`}>{stars(review.score)}</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    {review.review_datum ? new Date(review.review_datum).toLocaleDateString("nl-NL") : "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {review.tekst && !review.ai_antwoord && (
                    <button
                      onClick={() => generateResponse(review)}
                      disabled={generating === review.id}
                      className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                    >
                      {generating === review.id ? "Genereren..." : "AI Antwoord"}
                    </button>
                  )}
                </div>
              </div>

              {review.tekst && (
                <p className="text-neutral-700 mb-4 leading-relaxed">&ldquo;{review.tekst}&rdquo;</p>
              )}

              {/* AI antwoord */}
              {review.ai_antwoord && !review.antwoord && (
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-600 rounded">AI Suggestie</span>
                  </div>
                  <p className="text-sm text-neutral-700 whitespace-pre-line">{review.ai_antwoord}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => saveResponse(review.id, review.ai_antwoord!)}
                      className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      Accepteer als antwoord
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(review.ai_antwoord!);
                      }}
                      className="px-3 py-1.5 text-xs bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200 transition-colors"
                    >
                      Kopieer
                    </button>
                  </div>
                </div>
              )}

              {/* Opgeslagen antwoord */}
              {review.antwoord && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-4 mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">Beantwoord</span>
                    {review.antwoord_datum && (
                      <span className="text-xs text-neutral-400">{new Date(review.antwoord_datum).toLocaleDateString("nl-NL")}</span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-700 whitespace-pre-line">{review.antwoord}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
