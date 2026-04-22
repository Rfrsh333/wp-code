"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

interface ReferralStats {
  totaal_referrals: number;
  pending: number;
  qualified: number;
  rewarded: number;
  totaal_uitbetaald: number;
  conversie_rate: number;
}

interface TopReferrer {
  naam: string;
  type: string;
  count: number;
  qualified: number;
}

interface RecentReferral {
  id: string;
  referrer_type: string;
  referred_naam: string;
  referred_email: string;
  status: string;
  reward_amount: number;
  reward_type: string;
  created_at: string;
  qualified_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "In afwachting", color: "text-orange-700", bg: "bg-orange-100" },
  qualified: { label: "Gekwalificeerd", color: "text-blue-700", bg: "bg-blue-100" },
  rewarded: { label: "Uitbetaald", color: "text-green-700", bg: "bg-green-100" },
};

export default function ReferralsTab() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [referrals, setReferrals] = useState<RecentReferral[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/referrals", { headers });
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
        setTopReferrers(data.top_referrers || []);
        setReferrals(data.recente_referrals || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { fetchData(); }, [fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const markRewarded = async (referralId: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/referrals", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "mark_rewarded", referral_id: referralId }),
      });
      if (res.ok) fetchData();
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-neutral-200 rounded" />
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-neutral-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Referrals</h2>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-neutral-900">{stats.totaal_referrals}</p>
            <p className="text-xs text-neutral-500">Totaal verwijzingen</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
            <p className="text-xs text-neutral-500">In afwachting</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{stats.qualified}</p>
            <p className="text-xs text-neutral-500">Gekwalificeerd</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-green-600">€{stats.totaal_uitbetaald}</p>
            <p className="text-xs text-neutral-500">Uitbetaald</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-[#F27501]">{stats.conversie_rate}%</p>
            <p className="text-xs text-neutral-500">Conversie rate</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Top referrers */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-neutral-900 mb-3">Top Referrers</h3>
          {topReferrers.length === 0 ? (
            <p className="text-sm text-neutral-400">Nog geen referrals</p>
          ) : (
            <div className="space-y-3">
              {topReferrers.map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#F27501]/10 text-[#F27501] text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{r.naam}</p>
                      <p className="text-xs text-neutral-500">{r.type === "medewerker" ? "Medewerker" : "Klant"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-neutral-900">{r.count}</p>
                    <p className="text-xs text-neutral-500">{r.qualified} gekw.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending beloningen */}
        <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-neutral-900 mb-3">Gekwalificeerde beloningen</h3>
          {referrals.filter(r => r.status === "qualified").length === 0 ? (
            <p className="text-sm text-neutral-400">Geen openstaande beloningen</p>
          ) : (
            <div className="space-y-2">
              {referrals.filter(r => r.status === "qualified").map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{r.referred_naam}</p>
                    <p className="text-xs text-neutral-500">
                      {r.referrer_type === "medewerker" ? "Medewerker referral" : "Klant referral"} · {r.reward_type === "bonus" ? `€${r.reward_amount} bonus` : `€${r.reward_amount} korting`}
                    </p>
                  </div>
                  <button
                    onClick={() => markRewarded(r.id)}
                    className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600"
                  >
                    Markeer uitbetaald
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alle referrals */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h3 className="font-bold text-neutral-900">Alle verwijzingen</h3>
        </div>
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="text-left px-5 py-3 text-sm font-semibold text-neutral-600">Verwezen persoon</th>
              <th className="text-left px-5 py-3 text-sm font-semibold text-neutral-600">Type</th>
              <th className="text-left px-5 py-3 text-sm font-semibold text-neutral-600">Beloning</th>
              <th className="text-left px-5 py-3 text-sm font-semibold text-neutral-600">Datum</th>
              <th className="text-center px-5 py-3 text-sm font-semibold text-neutral-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {referrals.map(r => {
              const status = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
              return (
                <tr key={r.id} className="border-b border-neutral-50">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-neutral-900">{r.referred_naam}</p>
                    <p className="text-xs text-neutral-500">{r.referred_email}</p>
                  </td>
                  <td className="px-5 py-3 text-sm text-neutral-600">
                    {r.referrer_type === "medewerker" ? "Medewerker" : "Klant"}
                  </td>
                  <td className="px-5 py-3 text-sm text-neutral-600">
                    €{r.reward_amount} {r.reward_type === "bonus" ? "bonus" : "korting"}
                  </td>
                  <td className="px-5 py-3 text-sm text-neutral-500">
                    {new Date(r.created_at).toLocaleDateString("nl-NL")}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`${status.bg} ${status.color} px-2 py-0.5 rounded-full text-xs font-medium`}>
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {referrals.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nog geen verwijzingen
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
