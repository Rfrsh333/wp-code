# Real-time Dashboards Implementation Report

## Nieuwe bestanden

| Bestand | Doel |
|---------|------|
| `src/hooks/useSupabaseRealtime.ts` | Core hook: luistert naar Supabase Realtime en invalidateert React Query caches |
| `src/hooks/useRealtimeStatus.ts` | Hook voor online/offline connection status |
| `src/hooks/queries/index.ts` | Barrel exports |
| `src/hooks/queries/useMedewerkerQueries.ts` | React Query hooks voor medewerker data + mutations |
| `src/hooks/queries/useMedewerkerRealtime.ts` | Realtime subscriptions voor medewerker dashboard |
| `src/hooks/queries/useKlantQueries.ts` | React Query hooks voor klant data + mutations (11 queries, 8 mutations) |
| `src/hooks/queries/useKlantRealtime.ts` | Realtime subscriptions voor klant dashboard |
| `src/hooks/queries/useAdminQueries.ts` | React Query hooks voor admin overzicht + mutations |
| `src/hooks/queries/useAdminRealtime.ts` | Realtime subscriptions voor admin dashboard (11 tabellen) |
| `src/components/shared/RealtimeBadge.tsx` | Animerend badge component voor real-time count updates |
| `supabase/migrations/20260315_enable_realtime.sql` | Database migratie voor Realtime publicatie |

## Gewijzigde bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/QueryProvider.tsx` | staleTime 30s→10s, refetchOnWindowFocus: true, retry/gcTime config |
| `src/app/medewerker/layout.tsx` | QueryProvider wrapper toegevoegd |
| `src/app/klant/layout.tsx` | QueryProvider wrapper toegevoegd |
| `src/app/medewerker/dashboard/MedewerkerDashboard.tsx` | Volledig gemigreerd naar React Query + Realtime |
| `src/components/medewerker/DashboardHome.tsx` | Gemigreerd naar `useMedewerkerDashboard()` hook |
| `src/app/klant/uren/KlantUrenClient.tsx` | Alle fetch patronen gemigreerd (hoofdcomponent + 5 sub-tabs) |
| `src/components/admin/AdminDashboard.tsx` | Centralized fetch → `useAdminOverzicht()`, + Realtime |

## Supabase Realtime tabellen

De volgende tabellen moeten in de `supabase_realtime` publicatie staan:

- `medewerkers`
- `diensten`
- `dienst_aanmeldingen`
- `uren_registraties`
- `berichten`
- `boetes`
- `facturen`
- `klanten`
- `inschrijvingen`
- `chatbot_conversations` (stond al)
- `chatbot_messages` (stond al)
- `tickets` (indien tabel bestaat)

## Database migratie uitvoeren

Voer het SQL script uit in de Supabase SQL Editor:

```
supabase/migrations/20260315_enable_realtime.sql
```

Of via CLI: `supabase db push`

## Architectuur

```
QueryProvider (staleTime: 10s)
  ├── useSupabaseRealtime (Supabase postgres_changes → invalidateQueries)
  ├── useQuery hooks (data fetching met caching)
  └── useMutation hooks (acties met automatische cache invalidatie)
```

**Flow:**
1. Component mount → `useQuery` haalt data op via API
2. `useSupabaseRealtime` opent WebSocket naar Supabase
3. Database change → Supabase stuurt event → hook invalidateert relevante queries
4. React Query refetcht automatisch de geïnvalideerde queries
5. UI updatet real-time zonder page refresh

## Build status

`next build` succesvol zonder errors.

## Bekende limitaties

- Admin tab-componenten (MedewerkersTab, DienstenTab, etc.) behouden hun eigen `useEffect+fetch` patronen. Ze worden real-time geïnvalideerd via de Realtime hook maar gebruiken nog geen `useQuery` intern.
- Supabase Realtime vereist dat tabellen in de publicatie staan — voer de migratie uit.
- `useRealtimeStatus` hook is aangemaakt maar nog niet visueel geïntegreerd in de dashboards.
