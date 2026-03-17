'use client';

import { useQuery } from '@tanstack/react-query';

export interface PlatformOption {
  id: string;
  type: string;
  value: string;
  sort_order: number;
  active: boolean;
}

export const platformKeys = {
  all: ['platform-options'] as const,
  byType: (type: string) => ['platform-options', type] as const,
};

export function usePlatformOptions(type: string) {
  return useQuery<PlatformOption[]>({
    queryKey: platformKeys.byType(type),
    queryFn: async () => {
      const res = await fetch(`/api/platform-options?type=${type}`);
      if (!res.ok) throw new Error('Failed to fetch platform options');
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minuten cache — opties wijzigen zelden
  });
}
