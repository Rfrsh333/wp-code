'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// === QUERY KEYS ===
export const medewerkerKeys = {
  all: ['medewerker'] as const,
  dashboard: () => [...medewerkerKeys.all, 'dashboard'] as const,
  diensten: () => [...medewerkerKeys.all, 'diensten'] as const,
  beschikbaarheid: () => [...medewerkerKeys.all, 'beschikbaarheid'] as const,
  profiel: () => [...medewerkerKeys.all, 'profiel'] as const,
  financieel: () => [...medewerkerKeys.all, 'financieel'] as const,
  documenten: () => [...medewerkerKeys.all, 'documenten'] as const,
  ratings: () => [...medewerkerKeys.all, 'ratings'] as const,
  boetes: () => [...medewerkerKeys.all, 'boetes'] as const,
  referral: () => [...medewerkerKeys.all, 'referral'] as const,
};

// === QUERIES ===

export function useMedewerkerDashboard() {
  return useQuery({
    queryKey: medewerkerKeys.dashboard(),
    queryFn: async () => {
      const res = await fetch('/api/medewerker/dashboard-summary');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    },
  });
}

export function useMedewerkerDiensten() {
  return useQuery({
    queryKey: medewerkerKeys.diensten(),
    queryFn: async () => {
      const res = await fetch('/api/medewerker/diensten');
      if (!res.ok) throw new Error('Failed to fetch diensten');
      return res.json();
    },
  });
}

// === MUTATIONS ===

export function useDienstAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { action: string; [key: string]: unknown }) => {
      const res = await fetch('/api/medewerker/diensten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Actie mislukt');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medewerkerKeys.diensten() });
      queryClient.invalidateQueries({ queryKey: medewerkerKeys.dashboard() });
    },
  });
}

export function useBeschikbaarheidSave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch('/api/medewerker/beschikbaarheid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Opslaan mislukt');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medewerkerKeys.beschikbaarheid() });
    },
  });
}

export function usePhotoUpload() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch('/api/medewerker/profile', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload mislukt');
      return data;
    },
  });
}

export function usePhotoDelete() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/medewerker/profile', { method: 'DELETE' });
      if (!res.ok) throw new Error('Verwijderen mislukt');
      return res.json();
    },
  });
}

export function useBoeteBetaal() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/medewerker/betaal-boete', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kon betaallink niet aanmaken');
      return data;
    },
  });
}
