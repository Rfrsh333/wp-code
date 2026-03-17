"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, Euro, TrendingUp, ArrowRight, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import PushNotificationBanner from "@/components/medewerker/PushNotificationBanner";
import { toast } from "sonner";

interface DashboardStats {
  aankomende_diensten: number;
  te_registreren_uren: number;
  deze_maand_verdiensten: number;
  totaal_uren_deze_maand: number;
  gemiddelde_rating: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  color: string;
}

export default function DashboardHomeClient() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    aankomende_diensten: 0,
    te_registreren_uren: 0,
    deze_maand_verdiensten: 0,
    totaal_uren_deze_maand: 0,
    gemiddelde_rating: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/medewerker/dashboard");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error("Fetch dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: "shifts",
      title: "Nieuwe shifts",
      description: "Vind beschikbare diensten",
      icon: Calendar,
      href: "/medewerker/shifts",
      color: "from-[var(--mp-accent)] to-[var(--mp-accent-dark)]",
    },
    {
      id: "uren",
      title: "Uren registreren",
      description: stats.te_registreren_uren > 0 ? `${stats.te_registreren_uren} diensten wachten` : "Registreer je gewerkte uren",
      icon: Clock,
      href: "/medewerker/uren",
      badge: stats.te_registreren_uren,
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "diensten",
      title: "Mijn diensten",
      description: `${stats.aankomende_diensten} aankomende diensten`,
      icon: Calendar,
      href: "/medewerker/diensten",
      color: "from-purple-500 to-purple-600",
    },
    {
      id: "financieel",
      title: "Financieel overzicht",
      description: "Bekijk je verdiensten",
      icon: Euro,
      href: "/medewerker/financieel",
      color: "from-green-500 to-green-600",
    },
  ];

  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        {/* Push Notification Banner */}
        <PushNotificationBanner />
        {/* Header */}
        <div className="bg-gradient-to-br from-[var(--mp-accent)] to-[var(--mp-accent-dark)] pt-8 pb-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Welkom terug! 👋
            </h1>
            <p className="text-white/90 text-sm md:text-base">
              Hier is je overzicht van vandaag
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="max-w-4xl mx-auto px-4 -mt-12 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Deze maand verdiensten */}
            <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)]">
              <div className="flex items-center gap-2 mb-2">
                <Euro className="w-4 h-4 text-[var(--mp-accent)]" />
                <span className="text-xs text-[var(--mp-text-tertiary)]">Deze maand</span>
              </div>
              <div className="text-xl md:text-2xl font-bold text-[var(--mp-text-primary)]">
                €{loading ? "..." : stats.deze_maand_verdiensten.toFixed(0)}
              </div>
            </div>

            {/* Totaal uren */}
            <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)]">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-[var(--mp-text-tertiary)]">Uren</span>
              </div>
              <div className="text-xl md:text-2xl font-bold text-[var(--mp-text-primary)]">
                {loading ? "..." : stats.totaal_uren_deze_maand.toFixed(0)}
              </div>
            </div>

            {/* Aankomende diensten */}
            <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)]">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-[var(--mp-text-tertiary)]">Aankomend</span>
              </div>
              <div className="text-xl md:text-2xl font-bold text-[var(--mp-text-primary)]">
                {loading ? "..." : stats.aankomende_diensten}
              </div>
            </div>

            {/* Rating */}
            <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)]">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-xs text-[var(--mp-text-tertiary)]">Rating</span>
              </div>
              <div className="text-xl md:text-2xl font-bold text-[var(--mp-text-primary)]">
                {loading ? "..." : stats.gemiddelde_rating.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-lg font-semibold text-[var(--mp-text-primary)] mb-4">
            Snelle acties
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => router.push(action.href)}
                  className="relative bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-5 shadow-[var(--mp-shadow)] text-left transition-all hover:shadow-[var(--mp-shadow-elevated)] active:scale-[0.98] group overflow-hidden"
                >
                  {/* Gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-5 transition-opacity`} />

                  <div className="relative flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[var(--mp-text-primary)]">
                          {action.title}
                        </h3>
                        {action.badge !== undefined && action.badge > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[var(--mp-accent)] text-white text-xs font-bold">
                            {action.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--mp-text-secondary)]">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[var(--mp-text-tertiary)] group-hover:text-[var(--mp-accent)] transition-colors flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Progress / Tips */}
          <div className="bg-gradient-to-br from-[var(--mp-accent)]/10 to-[var(--mp-accent)]/5 border border-[var(--mp-accent)]/20 rounded-[var(--mp-radius)] p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--mp-accent)]/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-[var(--mp-accent)]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[var(--mp-text-primary)] mb-2">
                  Blijf actief!
                </h3>
                <p className="text-sm text-[var(--mp-text-secondary)] mb-3">
                  Je hebt deze maand al {stats.totaal_uren_deze_maand.toFixed(0)} uur gewerkt en €{stats.deze_maand_verdiensten.toFixed(0)} verdiend.
                  Blijf shifts accepteren om meer te verdienen!
                </p>
                <button
                  onClick={() => router.push("/medewerker/shifts")}
                  className="px-4 py-2 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm transition-all active:scale-95 hover:bg-[var(--mp-accent-dark)]"
                >
                  Bekijk beschikbare shifts
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Spacing for bottom nav */}
        <div className="h-8" />
      </div>
    </MedewerkerResponsiveLayout>
  );
}
