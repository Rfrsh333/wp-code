// Gedeeld type voor het business-analytics dashboard.
// Bron: /api/admin/analytics/business — gebruikt door het dashboard, de CSV-export
// en het PDF-rapport, zodat die drie niet uit elkaar lopen.

export interface BusinessMetrics {
  pipeline: {
    total: number;
    byStage: {
      nieuw: number;
      benaderd: number;
      interesse: number;
      offerte: number;
      klant: number;
      afgewezen: number;
    };
    conversionRate: number;
    recentLeads: number;
    avgEngagement: number;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    trend: number;
    total: number;
  };
  operations: {
    activeDiensten: number;
    completedDiensten: number;
    fillRate: number;
    activeMedewerkers: number;
  };
  candidates: {
    newApplications: number;
    pendingReview: number;
    approvedThisMonth: number;
  };
  engagement: {
    totalContacts: number;
    positiveRate: number;
    topChannel: string | null;
    avgResponseTime: number;
    emailOpenRate: number;
  };
  period: {
    from: string;
    to: string;
  };
  charts: {
    revenueTrend: Array<{ month: string; revenue: number }>;
    channelPerformance: Array<{ channel: string; contacts: number; positive: number }>;
    pipelineFunnel: Array<{ stage: string; count: number }>;
  };
}

/** Periodes die het dashboard aanbiedt. */
export type MetricsDateRange = "7d" | "30d" | "90d" | "6m" | "1y";
