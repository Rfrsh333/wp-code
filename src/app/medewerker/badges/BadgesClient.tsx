"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Award, Trophy, Star, Target, Flame, Calendar, Clock, TrendingUp } from "lucide-react";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";

export default function BadgesClient() {
  const router = useRouter();

  const badges = [
    {
      id: 1,
      icon: Star,
      name: "Eerste dienst",
      description: "Je hebt je eerste dienst voltooid!",
      earned: true,
      color: "from-yellow-500 to-yellow-600",
    },
    {
      id: 2,
      icon: Flame,
      name: "Op streak",
      description: "3 dagen achter elkaar gewerkt",
      earned: true,
      color: "from-orange-500 to-red-500",
    },
    {
      id: 3,
      icon: Trophy,
      name: "Top performer",
      description: "Gemiddelde rating van 4.8 of hoger",
      earned: true,
      color: "from-purple-500 to-purple-600",
    },
    {
      id: 4,
      icon: Target,
      name: "10 diensten",
      description: "Voltooi 10 diensten",
      earned: false,
      progress: 7,
      total: 10,
      color: "from-blue-500 to-blue-600",
    },
    {
      id: 5,
      icon: Calendar,
      name: "Maand vol",
      description: "Elke dag van de maand gewerkt",
      earned: false,
      progress: 15,
      total: 30,
      color: "from-green-500 to-green-600",
    },
    {
      id: 6,
      icon: Clock,
      name: "100 uur",
      description: "Werk 100 uur in totaal",
      earned: false,
      progress: 45,
      total: 100,
      color: "from-indigo-500 to-indigo-600",
    },
  ];

  const stats = [
    { label: "Behaalde badges", value: "3", icon: Award, color: "text-[var(--mp-accent)]" },
    { label: "Totale punten", value: "450", icon: TrendingUp, color: "text-purple-500" },
    { label: "Ranking", value: "#28", icon: Trophy, color: "text-yellow-500" },
  ];

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
            <p className="text-white/80 text-sm mt-1">Verzamel badges door te werken!</p>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-4xl mx-auto px-4 -mt-2 mb-6">
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)] text-center">
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                  <div className="text-xl font-bold text-[var(--mp-text-primary)]">
                    {stat.value}
                  </div>
                  <div className="text-xs text-[var(--mp-text-tertiary)] mt-1">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Badges Grid */}
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-lg font-semibold text-[var(--mp-text-primary)] mb-4">
            Alle badges
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {badges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className={`bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-5 shadow-[var(--mp-shadow)] ${
                    !badge.earned ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${badge.color} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-[var(--mp-text-primary)]">
                          {badge.name}
                        </h3>
                        {badge.earned && (
                          <div className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs font-bold flex-shrink-0">
                            ✓
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-[var(--mp-text-secondary)] mb-2">
                        {badge.description}
                      </p>

                      {/* Progress bar */}
                      {!badge.earned && badge.progress !== undefined && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[var(--mp-text-tertiary)]">
                              Voortgang
                            </span>
                            <span className="text-xs font-semibold text-[var(--mp-text-secondary)]">
                              {badge.progress}/{badge.total}
                            </span>
                          </div>
                          <div className="h-2 bg-[var(--mp-bg)] rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${badge.color} transition-all`}
                              style={{ width: `${(badge.progress / badge.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spacing */}
        <div className="h-8" />
      </div>
    </MedewerkerResponsiveLayout>
  );
}
