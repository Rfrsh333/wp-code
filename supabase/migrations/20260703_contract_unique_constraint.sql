-- Voorkomt dat een medewerker of admin hetzelfde contract twee keer ondertekent
-- door een TOCTOU-race (check-dan-insert). De DB-constraint maakt de check atomair.
ALTER TABLE contract_ondertekeningen
  ADD CONSTRAINT contract_ondertekeningen_contract_id_type_unique
  UNIQUE (contract_id, ondertekenaar_type);
