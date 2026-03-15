-- ===========================================
-- CATEGORIEËN TABEL
-- Hoofdcategorieën zoals: Bouw, Horeca, Logistiek, etc.
-- ===========================================
CREATE TABLE IF NOT EXISTS dienst_categorieen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,                              -- Optioneel: Lucide icon naam
  volgorde INT NOT NULL DEFAULT 0,        -- Voor sortering in UI
  actief BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- FUNCTIES TABEL
-- Functies binnen een categorie, bijv. Bouw → Timmerman, Stukadoor
-- ===========================================
CREATE TABLE IF NOT EXISTS dienst_functies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie_id UUID NOT NULL REFERENCES dienst_categorieen(id) ON DELETE CASCADE,
  naam TEXT NOT NULL,
  slug TEXT NOT NULL,
  actief BOOLEAN NOT NULL DEFAULT true,
  volgorde INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(categorie_id, slug)
);

-- ===========================================
-- TAGS TABEL
-- Vrije tags voor extra filtering
-- ===========================================
CREATE TABLE IF NOT EXISTS dienst_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  kleur TEXT DEFAULT '#6B7280',           -- Hex kleur voor UI badge
  actief BOOLEAN NOT NULL DEFAULT true,
  volgorde INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- KOPPELTABEL: diensten ↔ tags (many-to-many)
-- ===========================================
CREATE TABLE IF NOT EXISTS diensten_tags (
  dienst_id UUID NOT NULL REFERENCES diensten(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES dienst_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (dienst_id, tag_id)
);

-- ===========================================
-- NIEUWE KOLOMMEN OP DIENSTEN TABEL
-- ===========================================
ALTER TABLE diensten ADD COLUMN IF NOT EXISTS categorie_id UUID REFERENCES dienst_categorieen(id);
ALTER TABLE diensten ADD COLUMN IF NOT EXISTS functie_id UUID REFERENCES dienst_functies(id);
ALTER TABLE diensten ADD COLUMN IF NOT EXISTS vereiste_taal TEXT CHECK (vereiste_taal IN ('nl', 'en', 'nl_en', NULL));
-- nl = Alleen Nederlands, en = Alleen Engels, nl_en = beide, NULL = geen voorkeur

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_dienst_functies_categorie ON dienst_functies(categorie_id);
CREATE INDEX IF NOT EXISTS idx_diensten_categorie ON diensten(categorie_id);
CREATE INDEX IF NOT EXISTS idx_diensten_functie_id ON diensten(functie_id);
CREATE INDEX IF NOT EXISTS idx_diensten_taal ON diensten(vereiste_taal);
CREATE INDEX IF NOT EXISTS idx_diensten_tags_dienst ON diensten_tags(dienst_id);
CREATE INDEX IF NOT EXISTS idx_diensten_tags_tag ON diensten_tags(tag_id);

-- ===========================================
-- SEED DATA: Categorieën en Functies
-- ===========================================

-- Bouw
INSERT INTO dienst_categorieen (naam, slug, icon, volgorde) VALUES ('Bouw', 'bouw', 'HardHat', 1) ON CONFLICT (slug) DO NOTHING;
INSERT INTO dienst_functies (categorie_id, naam, slug, volgorde) VALUES
  ((SELECT id FROM dienst_categorieen WHERE slug='bouw'), 'Bouwhulp', 'bouwhulp', 1),
  ((SELECT id FROM dienst_categorieen WHERE slug='bouw'), 'Groenvoorziening medewerker', 'groenvoorziening-medewerker', 2),
  ((SELECT id FROM dienst_categorieen WHERE slug='bouw'), 'Schilder', 'schilder', 3),
  ((SELECT id FROM dienst_categorieen WHERE slug='bouw'), 'Stukadoor', 'stukadoor', 4),
  ((SELECT id FROM dienst_categorieen WHERE slug='bouw'), 'Timmerman', 'timmerman', 5),
  ((SELECT id FROM dienst_categorieen WHERE slug='bouw'), 'Vloerlegger', 'vloerlegger', 6)
ON CONFLICT (categorie_id, slug) DO NOTHING;

-- Facilitaire dienstverlening
INSERT INTO dienst_categorieen (naam, slug, icon, volgorde) VALUES ('Facilitaire dienstverlening', 'facilitair', 'Building2', 2) ON CONFLICT (slug) DO NOTHING;
INSERT INTO dienst_functies (categorie_id, naam, slug, volgorde) VALUES
  ((SELECT id FROM dienst_categorieen WHERE slug='facilitair'), 'Glazenwasser', 'glazenwasser-facilitair', 1),
  ((SELECT id FROM dienst_categorieen WHERE slug='facilitair'), 'Klushulp', 'klushulp-facilitair', 2),
  ((SELECT id FROM dienst_categorieen WHERE slug='facilitair'), 'Parkeerwachter', 'parkeerwachter', 3),
  ((SELECT id FROM dienst_categorieen WHERE slug='facilitair'), 'Receptie medewerker', 'receptie-medewerker-facilitair', 4),
  ((SELECT id FROM dienst_categorieen WHERE slug='facilitair'), 'Schoonmaak', 'schoonmaak-facilitair', 5),
  ((SELECT id FROM dienst_categorieen WHERE slug='facilitair'), 'Verhuizer', 'verhuizer-facilitair', 6),
  ((SELECT id FROM dienst_categorieen WHERE slug='facilitair'), 'Vloerreinigingsspecialist', 'vloerreinigingsspecialist-facilitair', 7)
ON CONFLICT (categorie_id, slug) DO NOTHING;

-- Horeca
INSERT INTO dienst_categorieen (naam, slug, icon, volgorde) VALUES ('Horeca', 'horeca', 'UtensilsCrossed', 3) ON CONFLICT (slug) DO NOTHING;
INSERT INTO dienst_functies (categorie_id, naam, slug, volgorde) VALUES
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Administratief medewerker', 'administratief-medewerker', 1),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Barista', 'barista', 2),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Bartending', 'bartending', 3),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Bediening', 'bediening', 4),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Bedrijfscatering', 'bedrijfscatering', 5),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Bezorging', 'bezorging-horeca', 6),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Catering', 'catering', 7),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Festivalmedewerker', 'festivalmedewerker', 8),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Garderobe', 'garderobe', 9),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Gebruikersonderzoeken', 'gebruikersonderzoeken', 10),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Hosting', 'hosting-horeca', 11),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Housekeeping', 'housekeeping', 12),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Hulpkok', 'hulpkok', 13),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Productiemedewerker', 'productiemedewerker-horeca', 14),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Receptie medewerker', 'receptie-medewerker', 15),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Roomservice', 'roomservice', 16),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Schoonmaak', 'schoonmaak', 17),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Sitecrew - Hospitality', 'sitecrew-hospitality', 18),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Spoelkeuken medewerker', 'spoelkeuken-medewerker', 19),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Training', 'training', 20),
  ((SELECT id FROM dienst_categorieen WHERE slug='horeca'), 'Zelfstandig werkend kok', 'zelfstandig-werkend-kok', 21)
ON CONFLICT (categorie_id, slug) DO NOTHING;

-- Logistiek
INSERT INTO dienst_categorieen (naam, slug, icon, volgorde) VALUES ('Logistiek', 'logistiek', 'Truck', 4) ON CONFLICT (slug) DO NOTHING;
INSERT INTO dienst_functies (categorie_id, naam, slug, volgorde) VALUES
  ((SELECT id FROM dienst_categorieen WHERE slug='logistiek'), 'Bezorging', 'bezorging-logistiek', 1),
  ((SELECT id FROM dienst_categorieen WHERE slug='logistiek'), 'Heftruckchauffeur', 'heftruckchauffeur', 2),
  ((SELECT id FROM dienst_categorieen WHERE slug='logistiek'), 'Magazijnmedewerker', 'magazijnmedewerker', 3),
  ((SELECT id FROM dienst_categorieen WHERE slug='logistiek'), 'Orderpicker', 'orderpicker', 4),
  ((SELECT id FROM dienst_categorieen WHERE slug='logistiek'), 'Productiemedewerker', 'productiemedewerker-logistiek', 5),
  ((SELECT id FROM dienst_categorieen WHERE slug='logistiek'), 'Verhuizer', 'verhuizer-logistiek', 6)
ON CONFLICT (categorie_id, slug) DO NOTHING;

-- Opleidingen
INSERT INTO dienst_categorieen (naam, slug, icon, volgorde) VALUES ('Opleidingen', 'opleidingen', 'GraduationCap', 5) ON CONFLICT (slug) DO NOTHING;
INSERT INTO dienst_functies (categorie_id, naam, slug, volgorde) VALUES
  ((SELECT id FROM dienst_categorieen WHERE slug='opleidingen'), 'Educatief Medewerker', 'educatief-medewerker', 1)
ON CONFLICT (categorie_id, slug) DO NOTHING;

-- Promotie
INSERT INTO dienst_categorieen (naam, slug, icon, volgorde) VALUES ('Promotie', 'promotie', 'Megaphone', 6) ON CONFLICT (slug) DO NOTHING;
INSERT INTO dienst_functies (categorie_id, naam, slug, volgorde) VALUES
  ((SELECT id FROM dienst_categorieen WHERE slug='promotie'), 'Productpromotie', 'productpromotie', 1),
  ((SELECT id FROM dienst_categorieen WHERE slug='promotie'), 'Straatverkoper', 'straatverkoper', 2)
ON CONFLICT (categorie_id, slug) DO NOTHING;

-- Retail
INSERT INTO dienst_categorieen (naam, slug, icon, volgorde) VALUES ('Retail', 'retail', 'ShoppingBag', 7) ON CONFLICT (slug) DO NOTHING;
INSERT INTO dienst_functies (categorie_id, naam, slug, volgorde) VALUES
  ((SELECT id FROM dienst_categorieen WHERE slug='retail'), 'Allround supermarkt hulp', 'allround-supermarkt-hulp', 1),
  ((SELECT id FROM dienst_categorieen WHERE slug='retail'), 'Hosting', 'hosting-retail', 2),
  ((SELECT id FROM dienst_categorieen WHERE slug='retail'), 'Klantenservice', 'klantenservice', 3),
  ((SELECT id FROM dienst_categorieen WHERE slug='retail'), 'Merchandiser', 'merchandiser', 4),
  ((SELECT id FROM dienst_categorieen WHERE slug='retail'), 'Sitecrew', 'sitecrew-retail', 5),
  ((SELECT id FROM dienst_categorieen WHERE slug='retail'), 'Verkoper', 'verkoper', 6),
  ((SELECT id FROM dienst_categorieen WHERE slug='retail'), 'Winkelmanager', 'winkelmanager', 7)
ON CONFLICT (categorie_id, slug) DO NOTHING;

-- Vrijwilligerswerk
INSERT INTO dienst_categorieen (naam, slug, icon, volgorde) VALUES ('Vrijwilligerswerk', 'vrijwilligerswerk', 'Heart', 8) ON CONFLICT (slug) DO NOTHING;
INSERT INTO dienst_functies (categorie_id, naam, slug, volgorde) VALUES
  ((SELECT id FROM dienst_categorieen WHERE slug='vrijwilligerswerk'), 'Vrijwilligerswerk', 'vrijwilligerswerk', 1)
ON CONFLICT (categorie_id, slug) DO NOTHING;

-- ===========================================
-- SEED DATA: Tags
-- ===========================================
INSERT INTO dienst_tags (naam, slug, kleur, volgorde) VALUES
  ('Geen aanmeldingen', 'geen-aanmeldingen', '#EF4444', 1),
  ('Weinig aanmeldingen', 'weinig-aanmeldingen', '#F59E0B', 2),
  ('Populaire shift', 'populaire-shift', '#10B981', 3),
  ('Vorige opdrachtgever', 'vorige-opdrachtgever', '#6366F1', 4),
  ('In flexpool', 'in-flexpool', '#3B82F6', 5),
  ('Vervangingen', 'vervangingen', '#8B5CF6', 6)
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- ENABLE REALTIME (optional, may already exist in publication)
-- ===========================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE dienst_categorieen;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE dienst_functies;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE dienst_tags;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
