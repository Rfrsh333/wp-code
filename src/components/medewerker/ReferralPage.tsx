"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";

interface ReferralStats {
  totaal_verwezen: number;
  qualified: number;
  rewarded: number;
  totaal_verdiend: number;
}

interface Referral {
  naam: string;
  status: string;
  reward_amount: number;
  created_at: string;
  qualified_at?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "In afwachting", color: "text-orange-700", bg: "bg-orange-100" },
  qualified: { label: "Gekwalificeerd", color: "text-green-700", bg: "bg-green-100" },
  rewarded: { label: "Uitbetaald", color: "text-[#F27501]", bg: "bg-[#F27501]/10" },
};

export default function ReferralPage() {
  const toast = useToast();
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [stats, setStats] = useState<ReferralStats>({ totaal_verwezen: 0, qualified: 0, rewarded: 0, totaal_verdiend: 0 });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/medewerker/referral");
      const data = await res.json();
      if (res.ok) {
        setReferralCode(data.referral_code);
        setReferralLink(data.referral_link);
        setStats(data.stats);
        setReferrals(data.referrals || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { queueMicrotask(() => { fetchData(); }); }, [fetchData]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Link gekopieerd!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopiëren mislukt");
    }
  };

  const shareWhatsApp = () => {
    const text = `Hey! Ik werk als uitzendkracht via TopTalent Jobs en het bevalt super. Ze zoeken nog meer horecamedewerkers. Schrijf je in via mijn link en we krijgen allebei een bonus! 🎉\n\n${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-[var(--mp-bg)] dark:bg-[var(--mp-card-elevated)] rounded" />
        <div className="h-48 bg-[var(--mp-bg)] dark:bg-[var(--mp-card-elevated)] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-[var(--mp-text-primary)] mb-6">Verwijs een vriend</h2>

      {/* Reward banner */}
      <div className="bg-gradient-to-r from-[#F27501] to-[#d96800] rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🎁</span>
          <div>
            <h3 className="text-xl font-bold">Verdien €50 per verwijzing!</h3>
            <p className="text-white/80 text-sm">Ken jij iemand die in de horeca wil werken? Stuur ze jouw link!</p>
          </div>
        </div>
        <p className="text-sm text-white/70">
          Wanneer jouw vriend zich inschrijft en de eerste dienst voltooit, ontvang jij €50 bonus.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[var(--mp-card)] dark:bg-[var(--mp-card)] rounded-xl p-4 shadow-sm dark:shadow-none dark:border dark:border-[var(--mp-separator)] text-center">
          <p className="text-2xl font-bold text-[var(--mp-text-primary)]">{stats.totaal_verwezen}</p>
          <p className="text-xs text-[var(--mp-text-secondary)]">Verwezen</p>
        </div>
        <div className="bg-[var(--mp-card)] dark:bg-[var(--mp-card)] rounded-xl p-4 shadow-sm dark:shadow-none dark:border dark:border-[var(--mp-separator)] text-center">
          <p className="text-2xl font-bold text-green-600">{stats.qualified}</p>
          <p className="text-xs text-[var(--mp-text-secondary)]">Gekwalificeerd</p>
        </div>
        <div className="bg-[var(--mp-card)] dark:bg-[var(--mp-card)] rounded-xl p-4 shadow-sm dark:shadow-none dark:border dark:border-[var(--mp-separator)] text-center">
          <p className="text-2xl font-bold text-[#F27501]">€{stats.totaal_verdiend}</p>
          <p className="text-xs text-[var(--mp-text-secondary)]">Verdiend</p>
        </div>
      </div>

      {/* Referral link */}
      <div className="bg-[var(--mp-card)] dark:bg-[var(--mp-card)] rounded-2xl p-6 shadow-sm dark:shadow-none dark:border dark:border-[var(--mp-separator)] mb-6">
        <h3 className="font-bold text-[var(--mp-text-primary)] mb-3">Jouw persoonlijke link</h3>
        <div className="flex gap-2">
          <div className="flex-1 bg-[var(--mp-bg)] dark:bg-[var(--mp-card-elevated)] rounded-xl px-4 py-3 text-sm text-[var(--mp-text-secondary)] font-mono truncate border border-[var(--mp-separator)]">
            {referralLink}
          </div>
          <button
            onClick={copyLink}
            className={`px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
              copied
                ? "bg-green-500 text-white"
                : "bg-[#F27501] text-white hover:bg-[#d96800]"
            }`}
          >
            {copied ? "✓ Gekopieerd" : "Kopieer"}
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={shareWhatsApp}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl hover:bg-[#20bd5a] text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Deel via WhatsApp
          </button>
        </div>

        <p className="text-xs text-[var(--mp-text-tertiary)] mt-3">
          Jouw code: <span className="font-mono font-medium">{referralCode}</span>
        </p>
      </div>

      {/* Hoe het werkt */}
      <div className="bg-[var(--mp-card)] dark:bg-[var(--mp-card)] rounded-2xl p-6 shadow-sm dark:shadow-none dark:border dark:border-[var(--mp-separator)] mb-6">
        <h3 className="font-bold text-[var(--mp-text-primary)] mb-4">Hoe werkt het?</h3>
        <div className="space-y-4">
          {[
            { step: "1", title: "Deel je link", desc: "Stuur je persoonlijke link naar vrienden die in de horeca willen werken" },
            { step: "2", title: "Zij schrijven zich in", desc: "Je vriend schrijft zich in via jouw link" },
            { step: "3", title: "Eerste dienst", desc: "Zodra je vriend de eerste dienst succesvol afrondt, krijg jij €50 bonus!" },
          ].map((item) => (
            <div key={item.step} className="flex gap-4">
              <div className="w-8 h-8 bg-[#F27501]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[#F27501]">{item.step}</span>
              </div>
              <div>
                <p className="font-medium text-[var(--mp-text-primary)]">{item.title}</p>
                <p className="text-sm text-[var(--mp-text-secondary)]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verwijzingen lijst */}
      {referrals.length > 0 && (
        <div className="bg-[var(--mp-card)] dark:bg-[var(--mp-card)] rounded-2xl p-6 shadow-sm dark:shadow-none dark:border dark:border-[var(--mp-separator)]">
          <h3 className="font-bold text-[var(--mp-text-primary)] mb-3">Mijn verwijzingen</h3>
          <div className="space-y-3">
            {referrals.map((r, i) => {
              const status = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--mp-separator)] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[var(--mp-text-primary)]">{r.naam}</p>
                    <p className="text-xs text-[var(--mp-text-secondary)]">{new Date(r.created_at).toLocaleDateString("nl-NL")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`${status.bg} ${status.color} px-2 py-0.5 rounded-full text-xs font-medium`}>
                      {status.label}
                    </span>
                    {r.status === "rewarded" && (
                      <span className="text-sm font-bold text-[#F27501]">+€{r.reward_amount}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
