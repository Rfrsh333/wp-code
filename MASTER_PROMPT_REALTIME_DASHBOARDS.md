# Master Prompt — Real-time Dashboards

> Kopieer de prompt hieronder en plak in je terminal met `claude --dangerously-skip-permissions`

---

```
Je bent een senior full-stack developer gespecialiseerd in real-time applicaties. Je gaat ALLE drie de dashboards (Medewerker, Klant, Admin) van het TopTalent Jobs platform volledig real-time maken met Supabase Realtime + React Query.

BELANGRIJK:
- Breek GEEN bestaande functionaliteit
- Run `npm run build` na elke grote wijziging
- Als iets de build breekt, REVERT onmiddellijk
- De huidige data moet EXACT hetzelfde blijven — alleen de manier waarop het geüpdatet wordt verandert

## HUIDIGE SITUATIE

Het project is een Next.js 16 app met React 19, TypeScript 5, Supabase, en Tailwind CSS 4.

### Wat er nu is:
- **React Query** is geïnstalleerd (`@tanstack/react-query` v5.90.21) maar wordt NIET gebruikt — alle data fetching is raw `useEffect` + `fetch()`
- **QueryProvider** bestaat al in `src/components/QueryProvider.tsx` met staleTime: 30_000 en refetchOnWindowFocus: false
- **QueryProvider** wraps ALLEEN het AdminDashboard — Medewerker en Klant portalen hebben het NIET
- **Supabase Realtime** is al werkend in `src/components/admin/LiveChatNotification.tsx` — dit is het voorbeeld om te volgen
- **Supabase client** in `src/lib/supabase.ts` ondersteunt Realtime via anon key (client-side)
- **Zustand stores** bestaan voor agenda en chatbot state

### Wat er moet veranderen:
1. QueryProvider toevoegen aan Medewerker en Klant layouts
2. Alle `useEffect + fetch()` patronen migreren naar React Query `useQuery` hooks
3. Supabase Realtime subscriptions toevoegen die React Query cache invalideren bij database changes
4. Alle mutaties migreren naar `useMutation` met automatische cache invalidatie

---

## FASE 1: REACT QUERY SETUP & HOOKS ARCHITECTUUR

### Stap 1.1: Update QueryProvider

Bewerk `src/components/QueryProvider.tsx`:
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,          // 10 seconden (was 30s — sneller voor real-time feel)
        refetchOnWindowFocus: true,  // WEL refetchen bij window focus (was false)
        refetchOnReconnect: true,    // Refetch na reconnect
        retry: 2,                    // Max 2 retries bij fout
        gcTime: 5 * 60 * 1000,      // 5 minuten garbage collection
      },
      mutations: {
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Stap 1.2: Voeg QueryProvider toe aan Medewerker layout

Zoek het Medewerker layout bestand (waarschijnlijk `src/components/medewerker/MedewerkerLayout.tsx` of `src/app/medewerker/layout.tsx`).
Wrap de children met `<QueryProvider>`:

```typescript
import QueryProvider from '@/components/QueryProvider';

// In de component return:
<QueryProvider>
  {/* bestaande layout content */}
</QueryProvider>
```

### Stap 1.3: Voeg QueryProvider toe aan Klant layout

Doe hetzelfde voor het Klant layout bestand (`src/app/klant/layout.tsx` of equivalent).

### Stap 1.4: Maak een custom hooks directory

Maak `src/hooks/queries/` met de volgende bestanden:

---

## FASE 2: SUPABASE REALTIME HOOK

### Stap 2.1: Maak `src/hooks/useSupabaseRealtime.ts`

Dit is de KERN van het hele systeem. Deze hook luistert naar Supabase Realtime changes en invalidateert de juiste React Query caches.

```typescript
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
  queryKeys: string[][]; // React Query keys to invalidate
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
        'postgres_changes',
        {
          event: sub.event || '*',
          schema: sub.schema || 'public',
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        },
        (payload) => {
          // Invalidate alle gerelateerde queries
          for (const key of sub.queryKeys) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        }
      );
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Channel ${channelName} subscribed`);
      }
      if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Channel ${channelName} error`);
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
```

BELANGRIJK: Supabase Realtime vereist dat de tabellen in de `supabase_realtime` publicatie staan. Maak een migratie die ALLE relevante tabellen toevoegt (zie Fase 5).

---

## FASE 3: MEDEWERKER DASHBOARD REAL-TIME

### Stap 3.1: Maak `src/hooks/queries/useMedewerkerQueries.ts`

Maak React Query hooks voor ALLE data die het medewerker dashboard ophaalt:

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// === QUERY KEYS ===
export const medewerkerKeys = {
  all: ['medewerker'] as const,
  dashboard: () => [...medewerkerKeys.all, 'dashboard'] as const,
  diensten: () => [...medewerkerKeys.all, 'diensten'] as const,
  berichten: () => [...medewerkerKeys.all, 'berichten'] as const,
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
      const res = await fetch('/api/medewerker/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    },
    staleTime: 10_000,
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
    staleTime: 10_000,
  });
}

// Maak vergelijkbare hooks voor: berichten, beschikbaarheid, financieel, documenten, ratings, boetes, referral
// Kijk naar de bestaande fetch calls in MedewerkerDashboard.tsx en DashboardHomeClient.tsx
// voor de exacte API endpoints en response types

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
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Actie mislukt');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate gerelateerde queries zodat ze automatisch refetchen
      queryClient.invalidateQueries({ queryKey: medewerkerKeys.diensten() });
      queryClient.invalidateQueries({ queryKey: medewerkerKeys.dashboard() });
    },
  });
}

// Maak vergelijkbare mutations voor: beschikbaarheid opslaan, profiel foto upload/delete, uren indienen, boete betalen
```

### Stap 3.2: Maak `src/hooks/queries/useMedewerkerRealtime.ts`

```typescript
'use client';

import { useMemo } from 'react';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { medewerkerKeys } from './useMedewerkerQueries';

export function useMedewerkerRealtime(medewerkerIdOrEnabled: string | null) {
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
      table: 'berichten',
      event: '*' as const,
      queryKeys: [medewerkerKeys.berichten()],
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
    `medewerker-dashboard-${medewerkerIdOrEnabled || 'anon'}`,
    subscriptions,
    !!medewerkerIdOrEnabled
  );
}
```

### Stap 3.3: Migreer MedewerkerDashboard.tsx

Open `src/app/medewerker/dashboard/MedewerkerDashboard.tsx` en:

1. **Vervang** alle `useState` + `useEffect` + `fetch()` patronen door de nieuwe hooks
2. **Vervang** alle handmatige `fetchDiensten()` calls na acties door de mutation hooks
3. **Voeg** `useMedewerkerRealtime(medewerkerData?.id)` toe aan het begin van de component
4. **Behoud** alle UI logica exact hetzelfde — alleen de data layer verandert

Voorbeeld van hoe de component eruit moet zien:

```typescript
// OUD patroon (verwijder):
const [diensten, setDiensten] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('/api/medewerker/diensten')
    .then(res => res.json())
    .then(data => { setDiensten(data.diensten); setLoading(false); });
}, []);

// NIEUW patroon (vervang door):
const { data: dienstenData, isLoading: dienstenLoading } = useMedewerkerDiensten();
const diensten = dienstenData?.diensten ?? [];

// OUD patroon voor acties (verwijder):
const handleAanmelden = async (dienstId: string) => {
  await fetch('/api/medewerker/diensten', { method: 'POST', body: JSON.stringify({ action: 'aanmelden', dienst_id: dienstId }) });
  fetchDiensten(); // handmatige refetch
};

// NIEUW patroon (vervang door):
const dienstAction = useDienstAction();
const handleAanmelden = (dienstId: string) => {
  dienstAction.mutate({ action: 'aanmelden', dienst_id: dienstId });
};
```

BELANGRIJK: Behoud ALLE bestaande error handling, loading states, toast notifications, en UI logica. Alleen de data fetching en mutation patronen veranderen.

### Stap 3.4: Migreer DashboardHomeClient.tsx

Doe hetzelfde voor `src/app/medewerker/dashboard/DashboardHomeClient.tsx`:
- Vervang de dashboard stats fetch door `useMedewerkerDashboard()`
- De stats data structuur blijft exact hetzelfde

---

## FASE 4: KLANT DASHBOARD REAL-TIME

### Stap 4.1: Maak `src/hooks/queries/useKlantQueries.ts`

Zelfde patroon als medewerker. De Klant dashboard (`src/app/klant/uren/KlantUrenClient.tsx` of `src/app/klant/dashboard/`) haalt deze data op:

```typescript
export const klantKeys = {
  all: ['klant'] as const,
  dashboard: () => [...klantKeys.all, 'dashboard'] as const,
  uren: () => [...klantKeys.all, 'uren'] as const,
  diensten: () => [...klantKeys.all, 'diensten'] as const,
  facturen: () => [...klantKeys.all, 'facturen'] as const,
  beoordelingen: () => [...klantKeys.all, 'beoordelingen'] as const,
  berichten: () => [...klantKeys.all, 'berichten'] as const,
  rooster: () => [...klantKeys.all, 'rooster'] as const,
};
```

Maak hooks voor:
- `useKlantDashboard()` → GET `/api/klant/dashboard`
- `useKlantUren()` → GET `/api/klant/uren`
- `useKlantDiensten()` → GET `/api/klant/diensten`
- `useKlantFacturen()` → GET `/api/klant/facturen`
- `useKlantBeoordelingen()` → GET `/api/klant/beoordelingen`
- `useKlantBerichten()` → GET `/api/klant/berichten`

Mutations voor:
- `useUrenAction()` → POST `/api/klant/uren` (goedkeuren/afkeuren)
- `useFactuurAction()` → POST `/api/klant/facturen`
- `useBeoordelingAction()` → POST `/api/klant/beoordelingen`

### Stap 4.2: Maak `src/hooks/queries/useKlantRealtime.ts`

```typescript
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
      queryKeys: [klantKeys.diensten(), klantKeys.dashboard()],
    },
    {
      table: 'dienst_aanmeldingen',
      event: '*' as const,
      queryKeys: [klantKeys.diensten(), klantKeys.dashboard()],
    },
    {
      table: 'facturen',
      event: '*' as const,
      queryKeys: [klantKeys.facturen(), klantKeys.dashboard()],
    },
    {
      table: 'berichten',
      event: '*' as const,
      queryKeys: [klantKeys.berichten()],
    },
  ], []);

  useSupabaseRealtime(
    `klant-dashboard-${klantId || 'anon'}`,
    subscriptions,
    !!klantId
  );
}
```

### Stap 4.3: Migreer het Klant Dashboard

Open het klant dashboard component (waarschijnlijk `src/app/klant/uren/KlantUrenClient.tsx`) en:
- Vervang alle `useState` + `useEffect` + `fetch()` door de nieuwe hooks
- Voeg `useKlantRealtime(klantId)` toe
- Behoud alle UI logica

---

## FASE 5: ADMIN DASHBOARD REAL-TIME

### Stap 5.1: Maak `src/hooks/queries/useAdminQueries.ts`

Het Admin dashboard heeft 22+ tabs. Maak hooks per tab-groep:

```typescript
export const adminKeys = {
  all: ['admin'] as const,
  medewerkers: () => [...adminKeys.all, 'medewerkers'] as const,
  diensten: () => [...adminKeys.all, 'diensten'] as const,
  uren: () => [...adminKeys.all, 'uren'] as const,
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
  planning: (week?: string) => [...adminKeys.all, 'planning', week] as const,
};
```

Maak hooks voor ELKE tab. Kijk naar de bestaande fetch calls in `src/components/admin/AdminDashboard.tsx` en de individuele tab componenten in `src/components/admin/tabs/` voor de exacte API endpoints.

BELANGRIJK: Het admin dashboard laadt tabs dynamisch. Queries moeten `enabled: isTabActive` gebruiken zodat ze ALLEEN data ophalen als de tab zichtbaar is.

### Stap 5.2: Maak `src/hooks/queries/useAdminRealtime.ts`

```typescript
export function useAdminRealtime() {
  const subscriptions = useMemo(() => [
    // Medewerker gerelateerd
    {
      table: 'medewerkers',
      event: '*' as const,
      queryKeys: [adminKeys.medewerkers(), adminKeys.stats()],
    },
    // Diensten gerelateerd
    {
      table: 'diensten',
      event: '*' as const,
      queryKeys: [adminKeys.diensten(), adminKeys.stats(), adminKeys.planning()],
    },
    {
      table: 'dienst_aanmeldingen',
      event: '*' as const,
      queryKeys: [adminKeys.diensten(), adminKeys.matching(), adminKeys.planning()],
    },
    // Uren gerelateerd
    {
      table: 'uren_registraties',
      event: '*' as const,
      queryKeys: [adminKeys.uren(), adminKeys.stats(), adminKeys.facturen()],
    },
    // Berichten
    {
      table: 'berichten',
      event: '*' as const,
      queryKeys: [adminKeys.berichten()],
    },
    // Chatbot/livechat
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
    // Facturen
    {
      table: 'facturen',
      event: '*' as const,
      queryKeys: [adminKeys.facturen(), adminKeys.stats()],
    },
    // Boetes
    {
      table: 'boetes',
      event: '*' as const,
      queryKeys: [adminKeys.boetes()],
    },
    // Tickets
    {
      table: 'tickets',
      event: '*' as const,
      queryKeys: [adminKeys.tickets()],
    },
    // Klanten
    {
      table: 'klanten',
      event: '*' as const,
      queryKeys: [adminKeys.klanten(), adminKeys.stats()],
    },
    // Acquisitie leads
    {
      table: 'acquisitie_leads',
      event: '*' as const,
      queryKeys: [adminKeys.acquisitie()],
    },
    // Inschrijvingen (kandidaten)
    {
      table: 'inschrijvingen',
      event: '*' as const,
      queryKeys: [adminKeys.stats()],
    },
  ], []);

  useSupabaseRealtime('admin-dashboard-realtime', subscriptions, true);
}
```

### Stap 5.3: Migreer Admin Dashboard tabs

Dit is het meeste werk. Werk tab voor tab:

1. Open `src/components/admin/AdminDashboard.tsx`
2. Identificeer alle `useState` + `useEffect` + `fetch()` patronen
3. Vervang door de nieuwe `useQuery` hooks
4. Voeg `useAdminRealtime()` toe aan het begin van AdminDashboard

Voor elke tab component (als de tabs aparte componenten zijn):
- Vervang interne fetches door `useQuery` hooks met `enabled` property
- Vervang mutaties door `useMutation` hooks

WAARSCHUWING: Het AdminDashboard.tsx bestand is GROOT (~45K tokens). Werk voorzichtig en in kleine stappen. Test na elke tab migratie.

### Stap 5.4: Update LiveChatNotification.tsx

De bestaande Realtime implementatie in `src/components/admin/LiveChatNotification.tsx` kan nu vereenvoudigd worden:
- Verwijder de handmatige Supabase channel subscription (dat doet `useAdminRealtime` nu)
- Gebruik `useQuery` voor de fetchWaiting call
- Behoud de audio notification logica

OF laat het zoals het is als het werkt — het is geen probleem om twee channels te hebben.

---

## FASE 6: DATABASE MIGRATIE (REALTIME PUBLICATIE)

### Stap 6.1: Maak een Supabase migratie

Maak het bestand `supabase/migrations/20260315_enable_realtime.sql`:

```sql
-- Enable Realtime for all dashboard-relevant tables
-- Note: chatbot_conversations en chatbot_messages staan al in de publicatie

DO $$
BEGIN
  -- Medewerker/Klant gerelateerd
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'medewerkers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE medewerkers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'diensten'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE diensten;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'dienst_aanmeldingen'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dienst_aanmeldingen;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'uren_registraties'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE uren_registraties;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'berichten'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE berichten;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'boetes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE boetes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'facturen'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE facturen;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'klanten'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE klanten;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'inschrijvingen'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE inschrijvingen;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'acquisitie_leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE acquisitie_leads;
  END IF;

  -- Tickets (als de tabel bestaat)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'tickets'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
    END IF;
  END IF;
END $$;
```

BELANGRIJK: Deze migratie moet uitgevoerd worden op de Supabase database. Als je `supabase db push` of `supabase migration up` gebruikt, voeg het daar toe. Anders moet de gebruiker het handmatig uitvoeren in de Supabase SQL editor.

---

## FASE 7: REAL-TIME NOTIFICATIE INDICATORS

### Stap 7.1: Maak een NotificationBadge component

Maak `src/components/shared/RealtimeBadge.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';

interface RealtimeBadgeProps {
  count: number;
  previousCount: number;
}

export function RealtimeBadge({ count, previousCount }: RealtimeBadgeProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (count > previousCount) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 600);
      return () => clearTimeout(timer);
    }
  }, [count, previousCount]);

  if (count === 0) return null;

  return (
    <span className={`
      inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
      text-xs font-bold text-white bg-red-500 rounded-full
      ${animate ? 'animate-bounce' : ''}
    `}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
```

### Stap 7.2: Voeg visuele feedback toe bij real-time updates

Voeg een subtiele pulse animatie toe aan dashboard cards die net geüpdatet zijn. Maak een CSS utility class:

```css
@keyframes realtime-pulse {
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}

.realtime-updated {
  animation: realtime-pulse 0.8s ease-out;
}
```

Voeg dit toe aan de globale CSS of Tailwind config.

### Stap 7.3: Online/connection status indicator

Maak `src/hooks/useRealtimeStatus.ts`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Monitor de Supabase Realtime connectie
    const channel = supabase.channel('connection-monitor');

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
    });

    // Browser online/offline events
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
```

Voeg een klein status indicatortje toe in de header/sidebar van elk dashboard:
- Groen bolletje = live verbinding
- Rood bolletje = geen verbinding (met "Verbinding verbroken, probeer te herladen" tooltip)

---

## FASE 8: INDEX BESTAND & EXPORTS

### Maak `src/hooks/queries/index.ts`

```typescript
export * from './useMedewerkerQueries';
export * from './useMedewerkerRealtime';
export * from './useKlantQueries';
export * from './useKlantRealtime';
export * from './useAdminQueries';
export * from './useAdminRealtime';
```

---

## FASE 9: BUILD VERIFICATIE & RAPPORT

Na ALLE fases:
1. Run `npm run build` — moet ZONDER errors slagen
2. Run `npm run lint` — fix eventuele lint errors
3. Run `npx tsc --noEmit` — fix TypeScript errors

Maak een rapport als `REALTIME_IMPLEMENTATION_REPORT.md` in de project root met:
- Lijst van alle nieuwe bestanden
- Lijst van alle gewijzigde bestanden
- Welke tabellen in Supabase Realtime staan
- Instructies voor het uitvoeren van de database migratie
- Bekende limitaties of items voor follow-up
- Build status

## WERKWIJZE

1. Begin met Fase 1 (QueryProvider setup) — klein en veilig
2. Dan Fase 2 (useSupabaseRealtime hook) — de kern
3. Dan Fase 6 (database migratie bestand maken) — nodig voor testen
4. Dan Fase 3 (Medewerker) — dit is het eenvoudigste dashboard
5. Run `npm run build` na Fase 3
6. Dan Fase 4 (Klant)
7. Run `npm run build` na Fase 4
8. Dan Fase 5 (Admin) — dit is het meeste werk, doe het tab voor tab
9. Run `npm run build` na elke 3-4 tabs
10. Dan Fase 7 (notificatie indicators)
11. Dan Fase 8-9 (exports + rapport)

Als een wijziging de build breekt, REVERT onmiddellijk en documenteer waarom.

Begin NU en werk alles af zonder te stoppen.
```
