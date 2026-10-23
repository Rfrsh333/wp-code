# Demo-accounts voor de App Store- en Play-review

Apple en Google willen inloggegevens om de app te testen. Die reviewaccounts mogen niets in de echte
wereld veroorzaken. Daarom heeft `klanten` en `medewerkers` een kolom `is_demo` (migratie
`supabase/migrations/20261007_demo_accounts.sql`). De afscherming zit in de backend
(`src/lib/demo.ts`), dus ze werkt ook met oudere app-versies en in het webportaal.

## Wat een demo-account wel en niet doet

| Actie | Echt account | Demo-account |
|---|---|---|
| Werkgever vraagt personeel aan (`/api/klant/aanvraag`) | dienst + push naar alle medewerkers + Telegram | dienst wordt aangemaakt, push **alleen naar demo-medewerkers**, geen Telegram |
| Favorieten uitnodigen | echte favorieten | alleen demo-medewerkers |
| Diensten zien / aanmelden (Ontdekken, shifts) | alle diensten van echte klanten | **alleen diensten van demo-klanten**; aanmelden op een echte dienst geeft 404 |
| Echte medewerker ziet dienst van demo-klant | nee, nooit | – |
| Favorieten / recent gewerkt / admin-matching | zonder demo-medewerkers | alleen demo-medewerkers |
| Factuur maken (`/api/klant/facturen`) | factuurnummer uit de reeks | **geweigerd** (403, nette melding), uren blijven op "goedgekeurd" |
| Automatische facturatie (cron) en `/api/facturen/generate` | normaal | demo-klant wordt overgeslagen/geweigerd |
| Dienst annuleren met boete | concept-boetefactuur | geen boetefactuur (boete wordt wel getoond) |
| Account verwijderen (klant) | anonimiseren + uitloggen + Telegram | app krijgt "verwijderd" en logt uit, **account blijft bestaan** |
| Account verwijderen (medewerker) | verzoek aan TopTalent + audit-log | app krijgt "verzoek verstuurd", er gebeurt niets |
| Bericht aan TopTalent (klant) | Telegram-melding | opgeslagen, geen Telegram |
| Bevestigings- en herinneringsmails aan medewerker | normaal | niet verstuurd |
| Reviewverzoek-mail (cron) | normaal | niet verstuurd |

Waarom een factuur weigeren in plaats van een concept met DEMO-nummer: een concept staat nog steeds in
`facturen` (admin-overzichten, omzetcijfers, herinneringscron) en zet uren op `gefactureerd`. Weigeren
laat niets achter. De reviewer ziet de melding: "Dit is een demo-account. Facturen worden hier niet echt
aangemaakt, zodat er geen factuurnummer wordt verbruikt."

## Reviewaccounts aanmaken

1. Draai eerst de migratie `20261007_demo_accounts.sql` (Supabase SQL-editor).
2. Maak de accounts aan via de normale weg, met een e-mailadres dat van jou is (bijvoorbeeld
   `zenithzoommarketing+review-werkgever@gmail.com` en `…+review-werknemer@gmail.com`):
   - werkgever: registreren in de app of op de website (`/klant/registreren`);
   - werknemer: zoals elke medewerker (inschrijving → medewerker → activatielink).
3. Zet ze **direct** op demo, vóórdat je er iets mee doet:

```sql
-- Werkgever en werknemer als demo markeren
update public.klanten    set is_demo = true where lower(email) = lower('zenithzoommarketing+review-werkgever@gmail.com');
update public.medewerkers set is_demo = true where lower(email) = lower('zenithzoommarketing+review-werknemer@gmail.com');

-- Optioneel: een vast wachtwoord dat je in App Store Connect / Play Console invult
-- (bcrypt via pgcrypto; de app vergelijkt met bcryptjs, dat $2a$-hashes accepteert)
update public.klanten
   set wachtwoord = extensions.crypt('KIES-EEN-REVIEW-WACHTWOORD', extensions.gen_salt('bf', 12))
 where lower(email) = lower('zenithzoommarketing+review-werkgever@gmail.com') and is_demo;
update public.medewerkers
   set wachtwoord = extensions.crypt('KIES-EEN-REVIEW-WACHTWOORD', extensions.gen_salt('bf', 12)), status = 'actief'
 where lower(email) = lower('zenithzoommarketing+review-werknemer@gmail.com') and is_demo;

-- QR-check-in niet verplicht voor de demo-werkgever, zodat de reviewer zonder tweede toestel
-- uren kan invullen (optioneel; anders laat de app uitleg zien waarom indienen nog niet kan)
update public.klanten set qr_verplicht = false where is_demo;
```

Je kunt ook de bestaande testaccounts van 1-10 gebruiken (`+tt-klant` / `+tt-medewerker`): hun
testdiensten horen alleen bij elkaar, dus die kun je zonder risico op demo zetten.

4. Controleer:

```sql
select 'klant' as soort, id, email, is_demo from public.klanten where is_demo
union all
select 'medewerker', id, email, is_demo from public.medewerkers where is_demo;

-- Mag leeg zijn: aanmeldingen die de twee werelden mengen
select a.id, a.status, m.email as medewerker, k.email as klant
  from public.dienst_aanmeldingen a
  join public.medewerkers m on m.id = a.medewerker_id
  join public.diensten d on d.id = a.dienst_id
  left join public.klanten k on k.id = d.klant_id
 where m.is_demo <> coalesce(k.is_demo, false);
```

De backend onthoudt de lijst met demo-accounts maximaal 60 seconden per serverinstantie. Wacht na het
markeren dus een minuut voordat je de reviewer laat beginnen.

## Let op

- Zet nooit een account met echte diensten of medewerkers op demo: die raken dan uit elkaars beeld.
- Een demo-dienst staat gewoon in `diensten` (met de demo-klant als `klant_id`). Admin-overzichten en
  statistieken tellen hem mee; ruim demo-data na de review op of filter op `klanten.is_demo`.
- Admin kan in het dashboard nog handmatig een demo-medewerker op een echte dienst zetten (admin-acties
  zijn niet afgeschermd, alleen de matching-voorstellen en bulk-uitnodigingen).
- Weer een gewoon account maken: `update … set is_demo = false where …`.
