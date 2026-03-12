alter table medewerkers
add column if not exists reset_token text,
add column if not exists reset_token_expires_at timestamptz;

create unique index if not exists idx_medewerkers_reset_token
on medewerkers(reset_token)
where reset_token is not null;
