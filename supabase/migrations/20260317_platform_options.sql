-- Platform options: admin-managed lists for functies, vaardigheden, etc.
CREATE TABLE IF NOT EXISTS platform_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,           -- 'functie', 'vaardigheid', etc.
  value TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(type, value)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_platform_options_type_active ON platform_options(type, active, sort_order);

-- Seed functies
INSERT INTO platform_options (type, value, sort_order) VALUES
  ('functie', 'Administratief medewerker', 0),
  ('functie', 'Barista', 1),
  ('functie', 'Bartending', 2),
  ('functie', 'Bediening', 3),
  ('functie', 'Bedrijfscatering', 4),
  ('functie', 'Bezorging', 5),
  ('functie', 'Catering', 6),
  ('functie', 'Festivalmedewerker', 7),
  ('functie', 'Garderobe', 8),
  ('functie', 'Gebruikersonderzoeken', 9),
  ('functie', 'Hosting', 10),
  ('functie', 'Housekeeping', 11),
  ('functie', 'Hulpkok', 12),
  ('functie', 'Productiemedewerker', 13),
  ('functie', 'Receptie medewerker', 14),
  ('functie', 'Roomservice', 15),
  ('functie', 'Schoonmaak', 16),
  ('functie', 'Sitecrew - Hospitality', 17),
  ('functie', 'Spoelkeuken medewerker', 18),
  ('functie', 'Training', 19),
  ('functie', 'Zelfstandig werkend kok', 20)
ON CONFLICT (type, value) DO NOTHING;

-- Seed vaardigheden
INSERT INTO platform_options (type, value, sort_order) VALUES
  ('vaardigheid', 'Barista ervaring', 0),
  ('vaardigheid', 'Cocktail making', 1),
  ('vaardigheid', 'Food handling certificaat', 2),
  ('vaardigheid', 'HACCP certificaat', 3),
  ('vaardigheid', 'Kassa ervaring', 4),
  ('vaardigheid', 'POS systeem kennis', 5),
  ('vaardigheid', 'Engels spreken', 6),
  ('vaardigheid', 'Zweeds spreken', 7),
  ('vaardigheid', 'Leiding geven', 8),
  ('vaardigheid', 'Event ervaring', 9),
  ('vaardigheid', 'Rijbewijs B', 10),
  ('vaardigheid', 'Heftruckcertificaat', 11),
  ('vaardigheid', 'VCA certificaat', 12),
  ('vaardigheid', 'BHV diploma', 13),
  ('vaardigheid', 'Schoonmaak ervaring', 14),
  ('vaardigheid', 'Klantenservice', 15)
ON CONFLICT (type, value) DO NOTHING;
