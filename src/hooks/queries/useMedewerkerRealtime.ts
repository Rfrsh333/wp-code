'use client';

import { useMemo } from 'react';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { medewerkerKeys } from './useMedewerkerQueries';

export function useMedewerkerRealtime(medewerkerId: string | null) {
  const subscriptions = useMemo(() => [
    {
      table: 'dienst_aanmeldingen',
      event: '*' as const,
      queryKeys: [medewerkerKeys.diensten(), medewerkerKeys.dashboard()],
    },
    {
      table: 'diensten',
      event: '*' as const,
      queryKeys: [medewerkerKeys.diensten(), medewerkerKeys.dashboard()],
    },
    {
      table: 'uren_registraties',
      event: '*' as const,
      queryKeys: [medewerkerKeys.dashboard(), medewerkerKeys.diensten()],
    },
    {
      table: 'boetes',
      event: '*' as const,
      queryKeys: [medewerkerKeys.boetes(), medewerkerKeys.dashboard()],
    },
  ], []);

  useSupabaseRealtime(
    `medewerker-dashboard-${medewerkerId || 'anon'}`,
    subscriptions,
    !!medewerkerId
  );
}
