-- Demo-accounts voor de Apple/Google-review (3-10-2026).
--
-- Een klant of medewerker met is_demo = true zit in een afgeschermde "demo-wereld":
--   * demo-klanten en demo-medewerkers zien alleen elkaar (diensten, aanmelden, favorieten,
--     matching, uitnodigingen);
--   * acties van demo-accounts sturen geen push, mail of Telegram naar echte mensen;
--   * een demo-klant kan geen echte factuur maken (geen factuurnummer uit de reeks);
--   * "account verwijderen" van een demo-account laat het account bestaan.
-- Server-side geregeld in src/lib/demo.ts. Zonder deze migratie (kolom ontbreekt, 42703) werkt
-- alles zoals voorheen en is niemand demo. Aanmaken van reviewaccounts: docs/demo-account.md.

alter table public.klanten
  add column if not exists is_demo boolean not null default false;

alter table public.medewerkers
  add column if not exists is_demo boolean not null default false;

comment on column public.klanten.is_demo is
  'Reviewaccount (Apple/Google): afgeschermd van echte medewerkers, geen push/mail/factuurnummer. Zie docs/demo-account.md.';
comment on column public.medewerkers.is_demo is
  'Reviewaccount (Apple/Google): ziet alleen diensten van demo-klanten. Zie docs/demo-account.md.';

-- De app vraagt steeds "welke accounts zijn demo?": partiële index houdt dat goedkoop.
create index if not exists klanten_is_demo_idx on public.klanten (id) where is_demo;
create index if not exists medewerkers_is_demo_idx on public.medewerkers (id) where is_demo;

notify pgrst, 'reload schema';
