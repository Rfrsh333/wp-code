'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Helper to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token
    ? { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

// === QUERY KEYS ===
export const adminKeys = {
  all: ['admin'] as const,
  overzicht: () => [...adminKeys.all, 'overzicht'] as const,
  medewerkers: () => [...adminKeys.all, 'medewerkers'] as const,
  diensten: () => [...adminKeys.all, 'diensten'] as const,
  uren: (filter?: string) => filter ? [...adminKeys.all, 'uren', filter] as const : [...adminKeys.all, 'uren'] as const,
  facturen: () => [...adminKeys.all, 'facturen'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  berichten: () => [...adminKeys.all, 'berichten'] as const,
  boetes: () => [...adminKeys.all, 'boetes'] as const,
  klanten: () => [...adminKeys.all, 'klanten'] as const,
  tickets: () => [...adminKeys.all, 'tickets'] as const,
  faq: () => [...adminKeys.all, 'faq'] as const,
  content: () => [...adminKeys.all, 'content'] as const,
  acquisitie: () => [...adminKeys.all, 'acquisitie'] as const,
  pricing: () => [...adminKeys.all, 'pricing'] as const,
  reviews: () => [...adminKeys.all, 'reviews'] as const,
  matching: () => [...adminKeys.all, 'matching'] as const,
  livechat: () => [...adminKeys.all, 'livechat'] as const,
  referrals: () => [...adminKeys.all, 'referrals'] as const,
  planning: (week?: string) => week ? [...adminKeys.all, 'planning', week] as const : [...adminKeys.all, 'planning'] as const,
  leads: () => [...adminKeys.all, 'leads'] as const,
  offertes: () => [...adminKeys.all, 'offertes'] as const,
  onboarding: () => [...adminKeys.all, 'onboarding'] as const,
  dashboardExtended: () => [...adminKeys.all, 'dashboard-extended'] as const,
};

// === QUERIES ===

export function useAdminOverzicht() {
  return useQuery({
    queryKey: adminKeys.overzicht(),
    queryFn: async () => {
      const headers = await getAuthHeaders();

      const [aanvragenRes, inschrijvingenRes, contactRes, calculatorRes, opsRes, offertesRes] = await Promise.all([
        fetch('/api/admin/data?table=personeel_aanvragen', { headers }).then(r => r.json()),
        fetch('/api/admin/data?table=inschrijvingen', { headers }).then(r => r.json()),
        fetch('/api/admin/data?table=contact_berichten', { headers }).then(r => r.json()),
        fetch('/api/admin/data?table=calculator_leads', { headers }).then(r => r.json()),
        fetch('/api/admin/ops', { headers }).then(r => r.json()),
        fetch('/api/admin/data?table=offertes&orderBy=created_at&order=desc', { headers }).then(r => r.json()),
      ]);

      return {
        aanvragen: aanvragenRes.data || [],
        inschrijvingen: inschrijvingenRes.data || [],
        contactBerichten: contactRes.data || [],
        calculatorLeads: calculatorRes.data || [],
        opsSnapshot: !opsRes.error ? opsRes : null,
        offertes: offertesRes.data || [],
      };
    },
  });
}

export interface DashboardExtendedData {
  vandaag: {
    dienstenActief: number;
    medewerkerIngepland: number;
    openDiensten: number;
    noShows: number;
  };
  beschikbaarheid: {
    totaal: number;
    actief: number;
    ingepland: number;
    beschikbaar: number;
    gepauzeerd: number;
  };
  omzet: {
    dezeMaand: number;
    vorigeMaand: number;
    openstaand: number;
    weekData: { week: string; omzet: number }[];
  };
}

export function useAdminDashboardExtended() {
  return useQuery<DashboardExtendedData>({
    queryKey: adminKeys.dashboardExtended(),
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/dashboard-extended', { headers });
      if (!res.ok) throw new Error('Dashboard data ophalen mislukt');
      return res.json();
    },
    refetchInterval: 60_000, // refresh elke minuut
  });
}

// === MUTATIONS ===

export function useAdminDataAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { action: string; table: string; [key: string]: unknown }) => {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Actie mislukt');
      return data;
    },
    onSuccess: () => {
      // Invalidate all admin queries since admin actions can affect multiple views
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}
