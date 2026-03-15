'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeSubscription {
  table: string;
  schema?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  queryKeys: readonly (readonly string[])[];
}

export function useSupabaseRealtime(
  channelName: string,
  subscriptions: RealtimeSubscription[],
  enabled: boolean = true
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || subscriptions.length === 0) return;

    let channel = supabase.channel(channelName);

    for (const sub of subscriptions) {
      channel = channel.on(
        'postgres_changes' as 'system',
        {
          event: sub.event || '*',
          schema: sub.schema || 'public',
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        } as unknown as { event: 'system' },
        () => {
          for (const key of sub.queryKeys) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        }
      );
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] ${channelName} connected`);
      }
      if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] ${channelName} error`);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, enabled, queryClient, subscriptions]);
}
