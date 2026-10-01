'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { klantKeys } from './useKlantQueries';

/**
 * Houdt het klantportaal actueel via polling (React Query invalidatie).
 *
 * Voorheen: Supabase Realtime op uren_registraties/diensten/dienst_aanmeldingen/facturen
 * zónder klant-filter, met de anon-client in de browser. Met RLS "service_role only" komt
 * daar niets binnen (dood), en zónder die RLS zou elke klant de wijzigingen van álle klanten
 * ontvangen (lek). Polling via de eigen, geauthenticeerde API's heeft geen van beide problemen.
 *
 * Alleen terwijl het tabblad zichtbaar is; bij terugkomen wordt direct ververst.
 */
const INTERVAL_MS = 60_000;

export function useKlantRealtime(klantId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!klantId) return;

    const ververs = () => {
      for (const key of [
        klantKeys.dashboard(),
        klantKeys.diensten(),
        klantKeys.uren(),
        klantKeys.facturen(),
        klantKeys.checkin(),
        klantKeys.beoordelingen(),
      ]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') ververs();
    }, INTERVAL_MS);

    const opZichtbaar = () => {
      if (document.visibilityState === 'visible') ververs();
    };
    document.addEventListener('visibilitychange', opZichtbaar);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', opZichtbaar);
    };
  }, [klantId, queryClient]);
}
