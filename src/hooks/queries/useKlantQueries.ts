'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// === QUERY KEYS ===
export const klantKeys = {
  all: ['klant'] as const,
  dashboard: () => [...klantKeys.all, 'dashboard'] as const,
  uren: () => [...klantKeys.all, 'uren'] as const,
  diensten: () => [...klantKeys.all, 'diensten'] as const,
  facturen: () => [...klantKeys.all, 'facturen'] as const,
  beoordelingen: () => [...klantKeys.all, 'beoordelingen'] as const,
  favorieten: () => [...klantKeys.all, 'favorieten'] as const,
  templates: () => [...klantKeys.all, 'templates'] as const,
  rooster: (start?: string, end?: string) => [...klantKeys.all, 'rooster', start, end] as const,
  kosten: (jaar?: number) => [...klantKeys.all, 'kosten', jaar] as const,
  checkin: () => [...klantKeys.all, 'checkin'] as const,
  aanvraag: () => [...klantKeys.all, 'aanvraag'] as const,
};

// === QUERIES ===

export function useKlantDashboard() {
  return useQuery({
    queryKey: klantKeys.dashboard(),
    queryFn: async () => {
      const res = await fetch('/api/klant/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    },
  });
}

export function useKlantUren() {
  return useQuery({
    queryKey: klantKeys.uren(),
    queryFn: async () => {
      const res = await fetch('/api/klant/uren');
      if (!res.ok) throw new Error('Failed to fetch uren');
      return res.json();
    },
  });
}

export function useKlantBeoordelingen() {
  return useQuery({
    queryKey: klantKeys.beoordelingen(),
    queryFn: async () => {
      const res = await fetch('/api/klant/beoordelingen');
      if (!res.ok) throw new Error('Failed to fetch beoordelingen');
      return res.json();
    },
  });
}

export function useKlantDiensten() {
  return useQuery({
    queryKey: klantKeys.diensten(),
    queryFn: async () => {
      const res = await fetch('/api/klant/diensten');
      if (!res.ok) throw new Error('Failed to fetch diensten');
      return res.json();
    },
  });
}

export function useKlantFacturen() {
  return useQuery({
    queryKey: klantKeys.facturen(),
    queryFn: async () => {
      const res = await fetch('/api/klant/facturen');
      if (!res.ok) throw new Error('Failed to fetch facturen');
      return res.json();
    },
  });
}

export function useKlantFavorieten() {
  return useQuery({
    queryKey: klantKeys.favorieten(),
    queryFn: async () => {
      const res = await fetch('/api/klant/favorieten');
      if (!res.ok) throw new Error('Failed to fetch favorieten');
      return res.json();
    },
  });
}

export function useKlantTemplates() {
  return useQuery({
    queryKey: klantKeys.templates(),
    queryFn: async () => {
      const res = await fetch('/api/klant/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
  });
}

export function useKlantRooster(start: string, end: string, enabled: boolean = true) {
  return useQuery({
    queryKey: klantKeys.rooster(start, end),
    queryFn: async () => {
      const res = await fetch(`/api/klant/rooster?start=${start}&end=${end}`);
      if (!res.ok) throw new Error('Failed to fetch rooster');
      return res.json();
    },
    enabled,
  });
}

export function useKlantKosten(jaar: number) {
  return useQuery({
    queryKey: klantKeys.kosten(jaar),
    queryFn: async () => {
      const res = await fetch(`/api/klant/kosten?jaar=${jaar}`);
      if (!res.ok) throw new Error('Failed to fetch kosten');
      return res.json();
    },
  });
}

export function useKlantAanvraagLocaties() {
  return useQuery({
    queryKey: klantKeys.aanvraag(),
    queryFn: async () => {
      const res = await fetch('/api/klant/aanvraag');
      if (!res.ok) throw new Error('Failed to fetch aanvraag locaties');
      return res.json();
    },
  });
}

export function useKlantCheckins() {
  return useQuery({
    queryKey: klantKeys.checkin(),
    queryFn: async () => {
      const res = await fetch('/api/klant/checkin');
      if (!res.ok) throw new Error('Failed to fetch checkins');
      return res.json();
    },
  });
}

// === MUTATIONS ===

export function useUrenAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { action: string; [key: string]: unknown }) => {
      const res = await fetch('/api/klant/uren', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Actie mislukt');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: klantKeys.uren() });
      queryClient.invalidateQueries({ queryKey: klantKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: klantKeys.beoordelingen() });
    },
  });
}

export function useFactuurAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { uren_ids: string[] }) => {
      const res = await fetch('/api/klant/facturen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Factuur aanmaken mislukt');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: klantKeys.facturen() });
      queryClient.invalidateQueries({ queryKey: klantKeys.uren() });
      queryClient.invalidateQueries({ queryKey: klantKeys.dashboard() });
    },
  });
}

export function useBeoordelingAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch('/api/klant/beoordelingen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Beoordeling mislukt');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: klantKeys.beoordelingen() });
      queryClient.invalidateQueries({ queryKey: klantKeys.uren() });
      queryClient.invalidateQueries({ queryKey: klantKeys.dashboard() });
    },
  });
}

export function useDienstenAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { action: string; [key: string]: unknown }) => {
      const res = await fetch('/api/klant/diensten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Actie mislukt');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: klantKeys.diensten() });
      queryClient.invalidateQueries({ queryKey: klantKeys.dashboard() });
    },
  });
}

export function useFavorietAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { medewerker_id: string; method: 'POST' | 'DELETE' }) => {
      const res = await fetch('/api/klant/favorieten', {
        method: body.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medewerker_id: body.medewerker_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Actie mislukt');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: klantKeys.favorieten() });
    },
  });
}

export function useAanvraagAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch('/api/klant/aanvraag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Aanvraag mislukt');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: klantKeys.diensten() });
      queryClient.invalidateQueries({ queryKey: klantKeys.dashboard() });
    },
  });
}

export function useTemplateAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { method: 'POST' | 'PATCH'; data: Record<string, unknown> }) => {
      const res = await fetch('/api/klant/templates', {
        method: body.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body.data),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Template actie mislukt');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: klantKeys.templates() });
    },
  });
}

export function useCheckinAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { medewerker_id: string; dienst_id?: string }) => {
      const res = await fetch('/api/klant/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return { ...data, status: res.status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: klantKeys.checkin() });
      queryClient.invalidateQueries({ queryKey: klantKeys.diensten() });
    },
  });
}
