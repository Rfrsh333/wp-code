-- Medewerkerportaal (1-10-2026)
--
-- Alles idempotent. De code werkt ook zonder deze migratie (valt terug op het oude gedrag);
-- draai daarnaast ook 20261001_portaal_sessies.sql (sessie-intrekking, unieke aanmelding,
-- plekken-trigger) — de medewerkerroutes leunen daarop.

-- 1. Documenten: file_url niet meer verplicht --------------------------------------------
-- De bucket medewerker-documenten is privé; de app geeft per download een signed URL.
-- In de oorspronkelijke tabel (supabase-migration-portaal-redesign.sql) was file_url NOT NULL,
-- waardoor elke upload vanuit het portaal (file_url: null) mislukte. Tot deze migratie draait
-- schrijft de API het opslagpad in file_url.
alter table public.medewerker_documenten alter column file_url drop not null;
