'use client';

import { useMemo } from 'react';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { klantKeys } from './useKlantQueries';

export function useKlantRealtime(klantId: string | null) {
  const subscriptions = useMemo(() => [
    {
      table: 'uren_registraties',
      event: '*' as const,
      queryKeys: [klantKeys.uren(), klantKeys.dashboard()],
    },
    {
      table: 'diensten',
      event: '*' as const,
      queryKeys: [klantKeys.diensten(), klantKeys.dashboard(), ['klant', 'rooster'] as const],
    },
    {
      table: 'dienst_aanmeldingen',
      event: '*' as const,
      queryKeys: [klantKeys.diensten(), klantKeys.dashboard(), klantKeys.checkin()],
    },
    {
      table: 'facturen',
      event: '*' as const,
      queryKeys: [klantKeys.facturen(), klantKeys.dashboard()],
    },
  ], []);

  useSupabaseRealtime(
    `klant-dashboard-${klantId || 'anon'}`,
    subscriptions,
    !!klantId
  );
}
