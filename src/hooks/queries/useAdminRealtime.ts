'use client';

import { useMemo } from 'react';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { adminKeys } from './useAdminQueries';

export function useAdminRealtime() {
  const subscriptions = useMemo(() => [
    {
      table: 'medewerkers',
      event: '*' as const,
      queryKeys: [adminKeys.medewerkers(), adminKeys.overzicht()],
    },
    {
      table: 'diensten',
      event: '*' as const,
      queryKeys: [adminKeys.diensten(), adminKeys.overzicht(), adminKeys.planning()],
    },
    {
      table: 'dienst_aanmeldingen',
      event: '*' as const,
      queryKeys: [adminKeys.diensten(), adminKeys.matching(), adminKeys.planning()],
    },
    {
      table: 'uren_registraties',
      event: '*' as const,
      queryKeys: [adminKeys.uren(), adminKeys.overzicht(), adminKeys.facturen()],
    },
    {
      table: 'chatbot_conversations',
      event: '*' as const,
      queryKeys: [adminKeys.livechat()],
    },
    {
      table: 'chatbot_messages',
      event: '*' as const,
      queryKeys: [adminKeys.livechat()],
    },
    {
      table: 'facturen',
      event: '*' as const,
      queryKeys: [adminKeys.facturen(), adminKeys.overzicht()],
    },
    {
      table: 'boetes',
      event: '*' as const,
      queryKeys: [adminKeys.boetes()],
    },
    {
      table: 'klanten',
      event: '*' as const,
      queryKeys: [adminKeys.klanten(), adminKeys.overzicht()],
    },
    {
      table: 'inschrijvingen',
      event: '*' as const,
      queryKeys: [adminKeys.overzicht(), adminKeys.onboarding()],
    },
    {
      table: 'berichten',
      event: '*' as const,
      queryKeys: [adminKeys.berichten()],
    },
  ], []);

  useSupabaseRealtime('admin-dashboard-realtime', subscriptions, true);
}
