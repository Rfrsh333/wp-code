-- ============================================================================
-- NL Compliance Migratie
-- Datum: 2026-04-22
-- Scope: Ontbrekende velden voor Nederlandse wet- en regelgeving
-- ============================================================================

-- ============================================================================
-- C-06: Klant-tabel uitbreiden met KvK, BTW, adresgegevens
-- ============================================================================
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS kvk_nummer TEXT;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS btw_nummer TEXT;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS adres TEXT;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS postcode TEXT;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS stad TEXT;

-- ============================================================================
-- C-08: Medewerker-velden voor loonadministratie (Wet LB art. 28)
-- ============================================================================
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS geboorteplaats TEXT;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS nationaliteit TEXT;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS loonheffingskorting BOOLEAN DEFAULT FALSE;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS datum_in_dienst DATE;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS datum_uit_dienst DATE;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS geslacht TEXT;

-- C-24: Medewerker bruto-uurloon apart van klanttarief
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS bruto_uurloon NUMERIC(10,2);

-- C-17: Werkvergunning/nationaliteit tracking (WAV)
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS werkvergunning_nodig BOOLEAN DEFAULT FALSE;
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS werkvergunning_geldig_tot DATE;

-- ============================================================================
-- C-09: Functiegroep-veld voor CAO-inschaling
-- ============================================================================
ALTER TABLE diensten ADD COLUMN IF NOT EXISTS functiegroep TEXT;

-- ============================================================================
-- C-10: Toeslagberekening - toeslag-velden op uren_registraties
-- ============================================================================
ALTER TABLE uren_registraties ADD COLUMN IF NOT EXISTS toeslag_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE uren_registraties ADD COLUMN IF NOT EXISTS toeslag_type TEXT; -- avond, nacht, weekend, feestdag
ALTER TABLE uren_registraties ADD COLUMN IF NOT EXISTS toeslag_bedrag NUMERIC(10,2) DEFAULT 0;
ALTER TABLE uren_registraties ADD COLUMN IF NOT EXISTS bruto_loon NUMERIC(10,2);

-- ============================================================================
-- C-16: G-rekening ondersteuning
-- ============================================================================
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS g_rekening_iban TEXT;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS g_rekening_actief BOOLEAN DEFAULT FALSE;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS g_rekening_bedrag NUMERIC(10,2);
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS g_rekening_iban TEXT;

-- ============================================================================
-- C-22: BTW-verleggingsregel
-- ============================================================================
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS btw_verlegd BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- C-21: Fase A/B/C systeem voor uitzendovereenkomsten
-- ============================================================================
ALTER TABLE contracten ADD COLUMN IF NOT EXISTS uitzend_fase TEXT CHECK (uitzend_fase IN ('A', 'B', 'C'));
ALTER TABLE contracten ADD COLUMN IF NOT EXISTS fase_start_datum DATE;
ALTER TABLE contracten ADD COLUMN IF NOT EXISTS aantal_contracten_in_fase INTEGER DEFAULT 1;
ALTER TABLE contracten ADD COLUMN IF NOT EXISTS gewerkte_weken_in_fase INTEGER DEFAULT 0;

-- ============================================================================
-- C-20: Document-types uitbreiden
-- Voeg nieuwe document-types toe aan de CHECK constraint (indien aanwezig)
-- ============================================================================
-- Nieuwe document types worden op applicatieniveau afgehandeld:
-- verblijfsvergunning, werkvergunning, loonheffingsverklaring

-- ============================================================================
-- C-18: ID-retentiebeleid - tracking voor 5 jaar na uitdienst
-- ============================================================================
ALTER TABLE medewerker_documenten ADD COLUMN IF NOT EXISTS bewaar_tot DATE;
ALTER TABLE kandidaat_documenten ADD COLUMN IF NOT EXISTS bewaar_tot DATE;

-- ============================================================================
-- Indexes voor nieuwe velden
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_medewerkers_nationaliteit ON medewerkers(nationaliteit);
CREATE INDEX IF NOT EXISTS idx_medewerkers_datum_uit_dienst ON medewerkers(datum_uit_dienst);
CREATE INDEX IF NOT EXISTS idx_medewerkers_werkvergunning ON medewerkers(werkvergunning_nodig, werkvergunning_geldig_tot);
CREATE INDEX IF NOT EXISTS idx_contracten_uitzend_fase ON contracten(uitzend_fase);
CREATE INDEX IF NOT EXISTS idx_klanten_kvk ON klanten(kvk_nummer);
