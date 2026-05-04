-- Drop de bestaande foreign key constraint en maak een nieuwe met CASCADE
ALTER TABLE offertes
  DROP CONSTRAINT IF EXISTS offertes_aanvraag_id_fkey,
  ADD CONSTRAINT offertes_aanvraag_id_fkey
    FOREIGN KEY (aanvraag_id)
    REFERENCES personeel_aanvragen(id)
    ON DELETE CASCADE;

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_inschrijving_id_fkey,
  ADD CONSTRAINT bookings_inschrijving_id_fkey
    FOREIGN KEY (inschrijving_id)
    REFERENCES inschrijvingen(id)
    ON DELETE CASCADE;
