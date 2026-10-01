"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Award, Star, Briefcase } from "lucide-react";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import * as Sentry from "@sentry/nextjs";
import { BADGE_CONFIG, huidigeBadge, volgendeBadge } from "@/lib/medewerker/badges";

interface BadgeData {
  badge: string | null;
  beoordeeldeDiensten: number;
  gemiddeldeScore: number;
  gewerkteDiensten: number;
}

/**
 * Badges & prestaties op basis van echte gegevens (medewerkers.badge, beoordelingen).
 * Voorheen stonden hier vaste nepbadges, -punten en een verzonnen ranking.
 */
export default function BadgesClient() {
  const router = useRouter();
  const [data, setData] = useState<BadgeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const laad = async () => {
      try {
        const res = await fetch("/api/medewerker/profile");
        if (!res.ok) return;
        const body = await res.json();
        setData({
          badge: body.profile?.badge ?? null,
          beoordeeldeDiensten: Number(body.profile?.beoordeelde_diensten) || 0,
          gemiddeldeScore: Number(body.profile?.gemiddelde_score) || 0,
          gewerkteDiensten: Number(body.stats?.gewerkte_diensten) || 0,
        });
      } catch (err) {
        Sentry.captureException(err);
      } finally {
        setLoading(false);
      }
    };
    void laad();
  }, []);

  const huidig = huidigeBadge(data?.badge);
  const volgende = data ? volgendeBadge(huidig.badge, data.beoordeeldeDiensten, data.gemiddeldeScore) : null;
  const niveaus = Object.values(BADGE_CONFIG);
  const huidigIndex = niveaus.findIndex((n) => n.badge === huidig.badge);

  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        {/* Header */}
        <div className="bg-gradient-to-br from-[var(--mp-accent)] to-[var(--mp-accent-dark)] pt-4 pb-6 px-4">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white mb-4 transition-opacity active:opacity-70"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Terug</span>
            </button>
            <h1 className="text-2xl font-bold text-white">Badges & Prestaties</h1>
            <p className="text-white/80 text-sm mt-1">Je niveau groeit met goed beoordeelde diensten</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 -mt-2 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data ? (
            <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-6 text-center shadow-[var(--mp-shadow)] text-sm text-[var(--mp-text-secondary)]">
              Je gegevens konden niet worden geladen.
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)] text-center">
                  <Award className="w-6 h-6 mx-auto mb-2 text-[var(--mp-accent)]" />
                  <div className="text-xl font-bold text-[var(--mp-text-primary)]">{huidig.label}</div>
                  <div className="text-xs text-[var(--mp-text-tertiary)] mt-1">Niveau</div>
                </div>
                <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)] text-center">
                  <Briefcase className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                  <div className="text-xl font-bold text-[var(--mp-text-primary)]">{data.gewerkteDiensten}</div>
                  <div className="text-xs text-[var(--mp-text-tertiary)] mt-1">Gewerkte diensten</div>
                </div>
                <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)] text-center">
                  <Star className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                  <div className="text-xl font-bold text-[var(--mp-text-primary)]">
                    {data.gemiddeldeScore > 0 ? data.gemiddeldeScore.toFixed(1) : "–"}
                  </div>
                  <div className="text-xs text-[var(--mp-text-tertiary)] mt-1">Gem. beoordeling</div>
                </div>
              </div>

              {/* Voortgang naar volgend niveau */}
              <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-5 shadow-[var(--mp-shadow)]">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl" aria-hidden>
                    {huidig.icon}
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--mp-text-primary)]">{huidig.label}</h2>
                    <p className="text-sm text-[var(--mp-text-secondary)]">
                      {data.beoordeeldeDiensten} beoordeelde diensten
                    </p>
                  </div>
                </div>
                {volgende ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-[var(--mp-text-secondary)]">
                        Volgende: {volgende.label}
                      </span>
                      <span className="text-xs text-[var(--mp-text-secondary)]">{volgende.progress}%</span>
                    </div>
                    <div className="w-full bg-[var(--mp-bg)] rounded-full h-2.5">
                      <div
                        className="bg-[var(--mp-accent)] h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${volgende.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-[var(--mp-text-secondary)] mt-1.5">
                      {Math.min(data.beoordeeldeDiensten, volgende.dienstenNodig)}/{volgende.dienstenNodig} beoordeelde
                      diensten
                      {volgende.scoreOk ? "" : ` en gemiddeld minimaal ${volgende.scoreNodig.toFixed(2).replace(/0$/, "")} sterren`}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--mp-accent)] font-medium">Je hebt het hoogste niveau bereikt!</p>
                )}
              </div>

              {/* Alle niveaus */}
              <div>
                <h2 className="text-lg font-semibold text-[var(--mp-text-primary)] mb-4">Alle niveaus</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {niveaus.map((niveau, idx) => {
                    const behaald = idx <= huidigIndex;
                    return (
                      <div
                        key={niveau.badge}
                        className={`bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-5 shadow-[var(--mp-shadow)] flex items-center gap-4 ${
                          behaald ? "" : "opacity-60"
                        }`}
                      >
                        <span className="text-3xl" aria-hidden>
                          {niveau.icon}
                        </span>
                        <div className="flex-1 font-semibold text-[var(--mp-text-primary)]">{niveau.label}</div>
                        {behaald && (
                          <div className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs font-bold">✓</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Spacing */}
        <div className="h-8" />
      </div>
    </MedewerkerResponsiveLayout>
  );
}
