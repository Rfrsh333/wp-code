-- ============================================================================
-- Overeenkomst van Opdracht (OVO) - ZZP/Freelance Contract Template
-- ============================================================================
-- Template voor bemiddeling van ZZP'ers in de horeca.
-- Dit is een overeenkomst van opdracht (7:400 BW), GEEN arbeidsovereenkomst.
-- ============================================================================

-- Voeg 'overeenkomst_van_opdracht' toe als extra contract type
ALTER TABLE contract_templates
  DROP CONSTRAINT IF EXISTS contract_templates_type_check;

ALTER TABLE contract_templates
  ADD CONSTRAINT contract_templates_type_check
  CHECK (type IN ('arbeidsovereenkomst', 'uitzendovereenkomst', 'oproepovereenkomst', 'freelance', 'overeenkomst_van_opdracht', 'stage', 'custom'));

ALTER TABLE contracten
  DROP CONSTRAINT IF EXISTS contracten_type_check;

ALTER TABLE contracten
  ADD CONSTRAINT contracten_type_check
  CHECK (type IN ('arbeidsovereenkomst', 'uitzendovereenkomst', 'oproepovereenkomst', 'freelance', 'overeenkomst_van_opdracht', 'stage', 'custom'));

-- ============================================================================
-- Seed: Overeenkomst van Opdracht template
-- ============================================================================

INSERT INTO contract_templates (naam, slug, type, beschrijving, inhoud) VALUES
(
  'Overeenkomst van Opdracht (ZZP)',
  'overeenkomst-van-opdracht-zzp',
  'overeenkomst_van_opdracht',
  'Standaard overeenkomst van opdracht voor ZZP''ers in de horeca. Geen arbeidsovereenkomst.',
  '{
    "secties": [
      {
        "titel": "Partijen",
        "tekst": "De ondergetekenden:\n\n1. TopTalent, gevestigd te Utrecht, ingeschreven bij de Kamer van Koophandel onder nummer 73401161, hierna te noemen \"Opdrachtgever\" of \"TopTalent\";\n\n2. {{opdrachtnemer_naam}}, geboren op {{geboortedatum}}, wonende te {{adres}}, ingeschreven bij de Kamer van Koophandel onder nummer {{kvk_nummer}}, BTW-nummer: {{btw_nummer}}, hierna te noemen \"Opdrachtnemer\";\n\nHierna gezamenlijk te noemen \"Partijen\";\n\nOverwegende dat:\n- Opdrachtnemer een zelfstandig ondernemer is die zijn/haar beroep of bedrijf zelfstandig uitoefent;\n- TopTalent bemiddelt tussen opdrachtgevers in de horecasector en zelfstandige horecaprofessionals;\n- Partijen uitdrukkelijk NIET beogen een arbeidsovereenkomst aan te gaan in de zin van artikel 7:610 BW;\n- Deze overeenkomst een overeenkomst van opdracht is in de zin van artikel 7:400 BW;\n\nKomen het volgende overeen:",
        "volgorde": 1
      },
      {
        "titel": "Artikel 1 - Opdracht en werkzaamheden",
        "tekst": "1.1 Opdrachtnemer zal voor TopTalent werkzaamheden verrichten in de functie van {{functie}} bij {{klant_naam}}, gevestigd te {{werklocatie}}.\n\n1.2 De opdracht vangt aan op {{startdatum}} en wordt aangegaan voor de duur van de opdracht, tenzij eerder beëindigd conform artikel 8.\n\n1.3 De werkzaamheden worden verricht op basis van de concrete opdrachtbevestiging(en) die TopTalent aan Opdrachtnemer verstrekt.\n\n1.4 Opdrachtnemer bepaalt zelf de wijze waarop de werkzaamheden worden uitgevoerd, met inachtneming van de geldende hygiëne- en veiligheidsvoorschriften op de werklocatie.",
        "volgorde": 2
      },
      {
        "titel": "Artikel 2 - Zelfstandigheid en geen arbeidsovereenkomst",
        "tekst": "2.1 Opdrachtnemer verricht de werkzaamheden als zelfstandig ondernemer en uitdrukkelijk NIET op basis van een arbeidsovereenkomst.\n\n2.2 Er is geen sprake van een gezagsverhouding tussen TopTalent en Opdrachtnemer. TopTalent geeft geen aanwijzingen over de wijze waarop Opdrachtnemer de werkzaamheden uitvoert.\n\n2.3 Opdrachtnemer is vrij om opdrachten te aanvaarden of te weigeren.\n\n2.4 Opdrachtnemer is vrij om voor andere opdrachtgevers werkzaamheden te verrichten. Er geldt geen exclusiviteit.\n\n2.5 Opdrachtnemer heeft het recht zich te laten vervangen door een gelijkwaardige derde, mits deze beschikt over de vereiste kwalificaties en TopTalent hiervan vooraf op de hoogte is gesteld.\n\n2.6 Indien op enig moment de Belastingdienst of een rechterlijke instantie oordeelt dat sprake is van een arbeidsovereenkomst, zullen Partijen in overleg treden om de situatie in overeenstemming te brengen met de bedoeling van Partijen.",
        "volgorde": 3
      },
      {
        "titel": "Artikel 3 - Vereisten Opdrachtnemer",
        "tekst": "3.1 Opdrachtnemer verklaart en garandeert dat hij/zij:\n\na) Als zelfstandig ondernemer staat ingeschreven bij de Kamer van Koophandel;\nb) Beschikt over een geldig BTW-nummer;\nc) Zelf verantwoordelijk is voor de afdracht van inkomstenbelasting, BTW en overige belastingen en premies;\nd) Beschikt over een adequate aansprakelijkheidsverzekering (AVB) met een dekking van minimaal EUR 500.000,-;\ne) Beschikt over de voor de werkzaamheden vereiste diploma's, certificaten en/of vergunningen;\nf) In het bezit is van een geldig identiteitsbewijs;\ng) Gerechtigd is om in Nederland te werken.\n\n3.2 Opdrachtnemer dient op eerste verzoek van TopTalent bewijs te overleggen van het voorgaande.",
        "volgorde": 4
      },
      {
        "titel": "Artikel 4 - Tarief en facturatie",
        "tekst": "4.1 Het uurtarief bedraagt EUR {{uurtarief}} exclusief BTW.\n\n4.2 Opdrachtnemer factureert TopTalent voor de verrichte werkzaamheden op basis van de door de opdrachtgever geaccordeerde uren.\n\n4.3 De factuur dient te voldoen aan de wettelijke vereisten en vermeldt in ieder geval: het KvK-nummer, het BTW-nummer, een specificatie van de gewerkte uren en het toepasselijke tarief.\n\n4.4 TopTalent betaalt de factuur binnen 14 dagen na ontvangst, mits de uren zijn geaccordeerd door de opdrachtgever.\n\n4.5 Het tarief kan per opdracht verschillen en wordt vastgelegd in de opdrachtbevestiging.",
        "volgorde": 5
      },
      {
        "titel": "Artikel 5 - Geen doorbetaling bij ziekte of afwezigheid",
        "tekst": "5.1 Bij ziekte, vakantie of andere afwezigheid van Opdrachtnemer bestaat geen recht op doorbetaling.\n\n5.2 Opdrachtnemer meldt ziekte of verhindering zo spoedig mogelijk aan TopTalent, uiterlijk 4 uur voor aanvang van de geplande werkzaamheden.\n\n5.3 Opdrachtnemer is zelf verantwoordelijk voor een adequate arbeidsongeschiktheidsverzekering.",
        "volgorde": 6
      },
      {
        "titel": "Artikel 6 - Aansprakelijkheid en verzekeringen",
        "tekst": "6.1 Opdrachtnemer is aansprakelijk voor schade die hij/zij toebrengt aan TopTalent, de opdrachtgever of derden tijdens de uitvoering van de werkzaamheden, voor zover deze schade het gevolg is van opzet of bewuste roekeloosheid.\n\n6.2 Opdrachtnemer vrijwaart TopTalent tegen aanspraken van derden in verband met de uitvoering van de werkzaamheden door Opdrachtnemer.\n\n6.3 Opdrachtnemer dient gedurende de looptijd van deze overeenkomst te beschikken over een adequate aansprakelijkheidsverzekering.\n\n6.4 TopTalent is niet aansprakelijk voor schade die Opdrachtnemer lijdt tijdens of in verband met de uitvoering van de werkzaamheden.",
        "volgorde": 7
      },
      {
        "titel": "Artikel 7 - Geheimhouding",
        "tekst": "7.1 Opdrachtnemer zal strikte vertrouwelijkheid in acht nemen ten aanzien van alle informatie die hij/zij in het kader van de opdracht verkrijgt over TopTalent, de opdrachtgever en diens bedrijfsvoering.\n\n7.2 Deze geheimhoudingsverplichting geldt ook na beëindiging van de overeenkomst.",
        "volgorde": 8
      },
      {
        "titel": "Artikel 8 - Duur en beëindiging",
        "tekst": "8.1 Deze overeenkomst wordt aangegaan voor de duur van de opdracht.\n\n8.2 Beide partijen kunnen de overeenkomst tussentijds opzeggen met een opzegtermijn van 7 dagen.\n\n8.3 TopTalent kan de overeenkomst met onmiddellijke ingang beëindigen bij:\n- Ernstig plichtsverzuim door Opdrachtnemer;\n- Verlies van KvK-inschrijving of BTW-nummer;\n- Onbehoorlijk gedrag op de werklocatie;\n- Het niet beschikken over de vereiste verzekeringen.\n\n8.4 Bij beëindiging behoudt Opdrachtnemer recht op betaling voor reeds verrichte en geaccordeerde werkzaamheden.",
        "volgorde": 9
      },
      {
        "titel": "Artikel 9 - Toepasselijk recht",
        "tekst": "9.1 Op deze overeenkomst is Nederlands recht van toepassing.\n\n9.2 Geschillen worden voorgelegd aan de bevoegde rechter van de rechtbank Midden-Nederland, locatie Utrecht.\n\n9.3 Op deze overeenkomst zijn de Algemene Voorwaarden van TopTalent van toepassing, voor zover niet in strijd met het bepaalde in deze overeenkomst.",
        "volgorde": 10
      }
    ],
    "variabelen": [
      { "naam": "opdrachtnemer_naam", "label": "Naam ZZP''er", "type": "text", "verplicht": true },
      { "naam": "geboortedatum", "label": "Geboortedatum", "type": "date", "verplicht": true },
      { "naam": "adres", "label": "Adres", "type": "text", "verplicht": true },
      { "naam": "kvk_nummer", "label": "KvK-nummer ZZP''er", "type": "text", "verplicht": true },
      { "naam": "btw_nummer", "label": "BTW-nummer ZZP''er", "type": "text", "verplicht": true },
      { "naam": "functie", "label": "Functie", "type": "text", "verplicht": true },
      { "naam": "klant_naam", "label": "Opdrachtgever (horeca)", "type": "text", "verplicht": true },
      { "naam": "werklocatie", "label": "Werklocatie", "type": "text", "verplicht": true },
      { "naam": "startdatum", "label": "Startdatum", "type": "date", "verplicht": true },
      { "naam": "uurtarief", "label": "Uurtarief (excl. BTW)", "type": "number", "verplicht": true }
    ]
  }'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  inhoud = EXCLUDED.inhoud,
  beschrijving = EXCLUDED.beschrijving,
  updated_at = NOW();
