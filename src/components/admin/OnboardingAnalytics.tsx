"use client";

import { useMemo, useState } from "react";

type OnboardingStatus =
  | "nieuw"
  | "in_beoordeling"
  | "documenten_opvragen"
  | "wacht_op_kandidaat"
  | "goedgekeurd"
  | "inzetbaar"
  | "afgewezen";

interface Inschrijving {
  id: string;
  onboarding_status: OnboardingStatus;
  created_at: string;
  goedgekeurd_op: string | null;
  inzetbaar_op: string | null;
}

interface Props {
  inschrijvingen: Inschrijving[];
}

export default function OnboardingAnalytics({ inschrijvingen }: Props) {
  const [referenceNow] = useState(() => Date.now());

  const analytics = useMemo(() => {
    const now = referenceNow;

    // Filter out afgewezen for cleaner conversion funnel
    const activeKandidaten = inschrijvingen.filter(k => k.onboarding_status !== "afgewezen");

    // Count per status
    const statusCounts: Record<OnboardingStatus, number> = {
      nieuw: 0,
      in_beoordeling: 0,
      documenten_opvragen: 0,
      wacht_op_kandidaat: 0,
      goedgekeurd: 0,
      inzetbaar: 0,
      afgewezen: 0,
    };

    inschrijvingen.forEach(k => {
      statusCounts[k.onboarding_status]++;
    });

    // Calculate conversion rates
    const total = activeKandidaten.length;
    const conversionFunnel = [
      { status: "Ingeschreven", count: total, percentage: 100 },
      {
        status: "In beoordeling",
        count: statusCounts.in_beoordeling + statusCounts.documenten_opvragen + statusCounts.wacht_op_kandidaat + statusCounts.goedgekeurd + statusCounts.inzetbaar,
        percentage: total > 0 ? ((statusCounts.in_beoordeling + statusCounts.documenten_opvragen + statusCounts.wacht_op_kandidaat + statusCounts.goedgekeurd + statusCounts.inzetbaar) / total) * 100 : 0
      },
      {
        status: "Docs aangevraagd",
        count: statusCounts.documenten_opvragen + statusCounts.wacht_op_kandidaat + statusCounts.goedgekeurd + statusCounts.inzetbaar,
        percentage: total > 0 ? ((statusCounts.documenten_opvragen + statusCounts.wacht_op_kandidaat + statusCounts.goedgekeurd + statusCounts.inzetbaar) / total) * 100 : 0
      },
      {
        status: "Docs ontvangen",
        count: statusCounts.wacht_op_kandidaat + statusCounts.goedgekeurd + statusCounts.inzetbaar,
        percentage: total > 0 ? ((statusCounts.wacht_op_kandidaat + statusCounts.goedgekeurd + statusCounts.inzetbaar) / total) * 100 : 0
      },
      {
        status: "Goedgekeurd",
        count: statusCounts.goedgekeurd + statusCounts.inzetbaar,
        percentage: total > 0 ? ((statusCounts.goedgekeurd + statusCounts.inzetbaar) / total) * 100 : 0
      },
      {
        status: "Inzetbaar ✓",
        count: statusCounts.inzetbaar,
        percentage: total > 0 ? (statusCounts.inzetbaar / total) * 100 : 0
      },
    ];

    // Calculate drop-offs
    const dropOffs = conversionFunnel.map((step, index) => {
      if (index === 0) return null;
      const previousStep = conversionFunnel[index - 1];
      const dropOff = previousStep.percentage - step.percentage;
      return {
        step: step.status,
        dropOff: dropOff,
        isBottleneck: dropOff > 20, // More than 20% drop = bottleneck
      };
    }).filter(Boolean);

    // Calculate average time to inzetbaar
    const inzetbareKandidaten = inschrijvingen.filter(k => k.inzetbaar_op);
    const avgDaysToInzetbaar = inzetbareKandidaten.length > 0
      ? inzetbareKandidaten.reduce((sum, k) => {
          const created = new Date(k.created_at).getTime();
          const inzetbaar = new Date(k.inzetbaar_op!).getTime();
          const days = (inzetbaar - created) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / inzetbareKandidaten.length
      : 0;

    // Identify slowest kandidaten (> 7 days in same status)
    const slowKandidaten = activeKandidaten
      .filter(k => {
        const daysInStatus = (now - new Date(k.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysInStatus > 7 && k.onboarding_status !== "inzetbaar";
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 5);

    return {
      statusCounts,
      conversionFunnel,
      dropOffs,
      avgDaysToInzetbaar: avgDaysToInzetbaar.toFixed(1),
      slowKandidaten,
      now,
      totalActive: activeKandidaten.length,
      totalInzetbaar: statusCounts.inzetbaar,
      conversionRate: total > 0 ? ((statusCounts.inzetbaar / total) * 100).toFixed(1) : "0",
    };
  }, [inschrijvingen, referenceNow]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-700 font-medium text-sm">Actieve Kandidaten</span>
            <span className="text-2xl">👥</span>
          </div>
          <div className="text-3xl font-bold text-blue-900">{analytics.totalActive}</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-700 font-medium text-sm">Inzetbaar</span>
            <span className="text-2xl">✅</span>
          </div>
          <div className="text-3xl font-bold text-green-900">{analytics.totalInzetbaar}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-700 font-medium text-sm">Conversie Rate</span>
            <span className="text-2xl">📈</span>
          </div>
          <div className="text-3xl font-bold text-purple-900">{analytics.conversionRate}%</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orange-700 font-medium text-sm">Gem. Doorlooptijd</span>
            <span className="text-2xl">⏱️</span>
          </div>
          <div className="text-3xl font-bold text-orange-900">{analytics.avgDaysToInzetbaar}d</div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-neutral-200">
        <h3 className="text-lg font-bold text-neutral-900 mb-4">📊 Conversion Funnel</h3>
        <div className="space-y-3">
          {analytics.conversionFunnel.map((step, index) => (
            <div key={step.status}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-neutral-700">{step.status}</span>
                <span className="text-sm font-bold text-neutral-900">
                  {step.count} ({step.percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="h-8 bg-neutral-100 rounded-lg overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-500 ${
                    step.percentage > 80
                      ? "bg-gradient-to-r from-green-400 to-green-500"
                      : step.percentage > 50
                      ? "bg-gradient-to-r from-blue-400 to-blue-500"
                      : "bg-gradient-to-r from-orange-400 to-orange-500"
                  }`}
                  style={{ width: `${step.percentage}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-neutral-700">
                    {step.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Drop-off indicator */}
              {analytics.dropOffs[index] && analytics.dropOffs[index]!.dropOff > 5 && (
                <div className={`mt-1 text-xs ${
                  analytics.dropOffs[index]!.isBottleneck ? "text-red-600 font-bold" : "text-orange-600"
                }`}>
                  {analytics.dropOffs[index]!.isBottleneck && "⚠️ BOTTLENECK: "}
                  -{analytics.dropOffs[index]!.dropOff.toFixed(1)}% drop-off
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Slow Kandidaten */}
      {analytics.slowKandidaten.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-neutral-200">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">⏰ Aandacht Nodig (&gt;7 dagen)</h3>
          <div className="space-y-2">
            {analytics.slowKandidaten.map((k) => {
              const daysWaiting = Math.floor(
                (analytics.now - new Date(k.created_at).getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div
                  key={k.id}
                  className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <div>
                    <span className="font-medium text-neutral-900">ID: {k.id.substring(0, 8)}...</span>
                    <span className="ml-3 text-sm text-neutral-600">
                      Status: {k.onboarding_status}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-orange-700">
                    {daysWaiting} dagen
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
