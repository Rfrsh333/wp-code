'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const channel = supabase.channel('connection-monitor');

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
    });

    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isConnected;
}
