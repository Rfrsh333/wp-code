# Runbook B: Supabase Storage Bucket Weg

**Laatst bijgewerkt:** 2026-04-22
**RTO doel:** < 4 uur (app functioneel zonder docs)
**RPO doel:** ONBEPERKT VERLIES (geen backup beschikbaar)

---

## Waarom dit het pijnlijkste scenario is

Supabase biedt GEEN automatische Storage backups. Er is momenteel GEEN eigen backup-script. Bij verlies van Storage buckets zijn alle bestanden permanent verloren:

- CV's van alle kandidaten
- ID-bewijzen van medewerkers (wettelijk verplichte bewaring — WID)
- Ondertekende contracten
- VSH-certificaten en andere documenten

**Dit is het scenario met de hoogste impact en de laagste herstelbaarheid.**

---

## Detectie

- Upload/download van documenten faalt (403/404)
- Medewerker-portaal toont "Document niet gevonden"
- Admin document-review pagina is leeg
- Kandidaat onboarding-flow blokkeert bij document-upload

---

## Stap-voor-stap

### T+0 tot T+10 min: Constatering

1. **Bevestig het incident**
   ```
   Supabase Dashboard → Project → Storage
   → Check of buckets bestaan:
     - kandidaat-documenten
     - medewerker-documenten
     - editorial-images
     - dienst-afbeeldingen
   ```

2. **Bepaal de scope**
   - Alle buckets weg? → Volledig Storage-verlies
   - Eén bucket weg? → Gedeeltelijk verlies
   - Objects weg maar bucket bestaat? → Mogelijk per-object herstel

3. **Neem contact op met Supabase support**
   - Open ticket via dashboard (prioriteit: urgent)
   - Supabase MAY hebben intern snapshots — vraag ernaar
   - Vermeld dat het PII-documenten betreft (AVG-compliance)

### T+10 tot T+30 min: App stabiliseren

4. **Voorkom errors voor gebruikers**
   - App blijft functioneel voor niet-document-acties (uren, diensten, facturen)
   - Document-gerelateerde pagina's tonen graceful "Document tijdelijk niet beschikbaar"

5. **Maak buckets opnieuw aan** (als verwijderd)
   ```sql
   -- Run in Supabase SQL Editor
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES
     ('kandidaat-documenten', 'kandidaat-documenten', false, 5242880, '{"application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/jpeg","image/png"}'),
     ('medewerker-documenten', 'medewerker-documenten', false, 10485760, NULL),
     ('editorial-images', 'editorial-images', true, 10485760, '{"image/jpeg","image/png","image/webp","image/gif"}'),
     ('dienst-afbeeldingen', 'dienst-afbeeldingen', false, 10485760, NULL)
   ON CONFLICT (id) DO NOTHING;
   ```

6. **RLS-policies herstellen** (vanuit migratie-bestanden)
   - `supabase-storage-kandidaat-documenten.sql` (root)
   - `supabase/migrations/20260317_create_editorial_images_bucket.sql`

### T+30 min tot T+2 uur: Herstelpoging

7. **Check of bestanden elders staan**
   - Lokale ontwikkelmachine: zijn er test-uploads bewaard?
   - E-mail: zijn CV's ooit als bijlage verstuurd?
   - Kandidaat-portaal: kunnen kandidaten opnieuw uploaden?

8. **Herstel editorial-images** (laag risico)
   - AI-gegenereerde images: opnieuw genereren via editorial-pipeline
   - Dienst-afbeeldingen: opnieuw uploaden door klanten

### T+2 tot T+4 uur: Communicatie naar betrokkenen

9. **E-mail naar medewerkers** (template)
   ```
   Onderwerp: Actie vereist — Documenten opnieuw uploaden

   Beste [naam],

   Door een technisch incident zijn wij helaas een aantal
   documenten in ons systeem kwijtgeraakt. We vragen je
   vriendelijk om de volgende documenten opnieuw te uploaden
   via je medewerker-portaal:

   - ID-bewijs (voorkant)
   - [overige documenten op basis van DB-records]

   Je kunt inloggen via: https://www.toptalentjobs.nl/medewerker

   Excuses voor het ongemak. Neem contact op als je vragen hebt.

   Met vriendelijke groet,
   TopTalent Jobs
   ```

10. **E-mail naar kandidaten met openstaande documenten**
    ```
    -- Vind kandidaten met geüploade docs (DB kent de metadata)
    SELECT k.voornaam, k.email, d.document_type
    FROM kandidaat_documenten d
    JOIN inschrijvingen k ON k.id = d.kandidaat_id
    WHERE d.review_status != 'afgekeurd';
    ```

### T+4 uur: Juridische verplichtingen

11. **WID-compliance (Wet op de Identificatieplicht)**
    - Zonder ID-kopieën zijn we niet WID-compliant
    - Prioriteer het opnieuw verzamelen van ID-bewijzen voor ACTIEVE medewerkers
    - Documenteer het incident voor eventuele SNA-audit

12. **AVG-melding beoordelen**
    - Als PII-data verloren is gegaan (ID-bewijzen, BSN-gerelateerd)
    - Overweeg melding bij Autoriteit Persoonsgegevens (AP) binnen 72 uur
    - Documenteer in verwerkingsregister

### T+1 week: Preventieve maatregelen

13. **Implementeer Storage backup**
    ```bash
    # Wekelijks backup-script
    #!/bin/bash
    BACKUP_DIR="backups/storage/$(date +%Y-%m-%d)"
    mkdir -p "$BACKUP_DIR"

    for BUCKET in kandidaat-documenten medewerker-documenten editorial-images dienst-afbeeldingen; do
      npx supabase storage cp -r "storage://$BUCKET" "$BACKUP_DIR/$BUCKET/"
    done

    # Sync naar externe opslag (Cloudflare R2, Backblaze B2, etc.)
    rclone sync "$BACKUP_DIR" remote:toptalent-storage-backup/
    ```

---

## Prioritering documenten

| Document | Prioriteit | Reden |
|----------|-----------|-------|
| ID-bewijzen actieve medewerkers | P0 | WID-verplichting, SNA-audit |
| Ondertekende contracten | P0 | Juridisch bewijs |
| VSH-certificaten | P1 | Alcoholwet-compliance |
| CV's van kandidaten | P2 | Opnieuw opvraagbaar |
| Editorial images | P3 | Opnieuw te genereren |
| Dienst-afbeeldingen | P3 | Cosmetisch |

---

## Benodigde toegang

| Systeem | Actie |
|---------|-------|
| Supabase Dashboard | Buckets aanmaken, policies herstellen |
| Supabase Support | Vragen naar interne snapshots |
| E-mail (Resend) | Bulk-mail naar medewerkers/kandidaten |
| Autoriteit Persoonsgegevens | AVG-melding indien nodig |
