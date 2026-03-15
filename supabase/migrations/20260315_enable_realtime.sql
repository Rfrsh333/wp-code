-- Enable Realtime for all dashboard-relevant tables
-- chatbot_conversations en chatbot_messages staan mogelijk al in de publicatie

DO $$
BEGIN
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
