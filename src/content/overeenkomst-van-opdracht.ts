/**
 * Overeenkomst van opdracht (zzp) voor de akkoordstap vóór reageren (B1).
 *
 * De tekst is LETTERLIJK overgenomen uit het bestaande contracttemplate in de repo:
 * supabase/migrations/20260415_overeenkomst_van_opdracht_template.sql (contract_templates,
 * slug "overeenkomst-van-opdracht-zzp"). Er is niets aan toegevoegd of herschreven.
 *
 * Let op: dit template is geschreven per opdracht (het noemt functie, opdrachtgever, werklocatie,
 * startdatum en uurtarief). Voor een akkoord vooraf vullen we de gegevens van de medewerker in en
 * tonen we de opdrachtgegevens als "[per opdracht]". Laat juridisch nakijken of dit als
 * raamovereenkomst volstaat, of lever een raamtekst aan. Pas bij een nieuwe tekst ook
 * OVEREENKOMST_VERSIE aan: dan moet iedereen opnieuw akkoord geven.
 */

/** Versie van de tekst waarop akkoord wordt gegeven (opgeslagen bij het akkoord). */
export const OVEREENKOMST_VERSIE = "ovo-zzp-2026-04-15";

export const OVEREENKOMST_TITEL = "Overeenkomst van Opdracht (ZZP)";

export const OVEREENKOMST_OMSCHRIJVING = "Standaard overeenkomst van opdracht voor ZZP'ers in de horeca. Geen arbeidsovereenkomst.";

export const OVEREENKOMST_SECTIES: readonly { titel: string; tekst: string }[] = [
  {
    "titel": "Partijen",
    "tekst": "De ondergetekenden:\n\n1. TopTalent, gevestigd te Utrecht, ingeschreven bij de Kamer van Koophandel onder nummer 73401161, hierna te noemen \"Opdrachtgever\" of \"TopTalent\";\n\n2. {{opdrachtnemer_naam}}, geboren op {{geboortedatum}}, wonende te {{adres}}, ingeschreven bij de Kamer van Koophandel onder nummer {{kvk_nummer}}, BTW-nummer: {{btw_nummer}}, hierna te noemen \"Opdrachtnemer\";\n\nHierna gezamenlijk te noemen \"Partijen\";\n\nOverwegende dat:\n- Opdrachtnemer een zelfstandig ondernemer is die zijn/haar beroep of bedrijf zelfstandig uitoefent;\n- TopTalent bemiddelt tussen opdrachtgevers in de horecasector en zelfstandige horecaprofessionals;\n- Partijen uitdrukkelijk NIET beogen een arbeidsovereenkomst aan te gaan in de zin van artikel 7:610 BW;\n- Deze overeenkomst een overeenkomst van opdracht is in de zin van artikel 7:400 BW;\n\nKomen het volgende overeen:"
  },
  {
    "titel": "Artikel 1 - Opdracht en werkzaamheden",
    "tekst": "1.1 Opdrachtnemer zal voor TopTalent werkzaamheden verrichten in de functie van {{functie}} bij {{klant_naam}}, gevestigd te {{werklocatie}}.\n\n1.2 De opdracht vangt aan op {{startdatum}} en wordt aangegaan voor de duur van de opdracht, tenzij eerder beëindigd conform artikel 8.\n\n1.3 De werkzaamheden worden verricht op basis van de concrete opdrachtbevestiging(en) die TopTalent aan Opdrachtnemer verstrekt.\n\n1.4 Opdrachtnemer bepaalt zelf de wijze waarop de werkzaamheden worden uitgevoerd, met inachtneming van de geldende hygiëne- en veiligheidsvoorschriften op de werklocatie."
  },
  {
    "titel": "Artikel 2 - Zelfstandigheid en geen arbeidsovereenkomst",
    "tekst": "2.1 Opdrachtnemer verricht de werkzaamheden als zelfstandig ondernemer en uitdrukkelijk NIET op basis van een arbeidsovereenkomst.\n\n2.2 Er is geen sprake van een gezagsverhouding tussen TopTalent en Opdrachtnemer. TopTalent geeft geen aanwijzingen over de wijze waarop Opdrachtnemer de werkzaamheden uitvoert.\n\n2.3 Opdrachtnemer is vrij om opdrachten te aanvaarden of te weigeren.\n\n2.4 Opdrachtnemer is vrij om voor andere opdrachtgevers werkzaamheden te verrichten. Er geldt geen exclusiviteit.\n\n2.5 Opdrachtnemer heeft het recht zich te laten vervangen door een gelijkwaardige derde, mits deze beschikt over de vereiste kwalificaties en TopTalent hiervan vooraf op de hoogte is gesteld.\n\n2.6 Indien op enig moment de Belastingdienst of een rechterlijke instantie oordeelt dat sprake is van een arbeidsovereenkomst, zullen Partijen in overleg treden om de situatie in overeenstemming te brengen met de bedoeling van Partijen."
  },
  {
    "titel": "Artikel 3 - Vereisten Opdrachtnemer",
    "tekst": "3.1 Opdrachtnemer verklaart en garandeert dat hij/zij:\n\na) Als zelfstandig ondernemer staat ingeschreven bij de Kamer van Koophandel;\nb) Beschikt over een geldig BTW-nummer;\nc) Zelf verantwoordelijk is voor de afdracht van inkomstenbelasting, BTW en overige belastingen en premies;\nd) Beschikt over een adequate aansprakelijkheidsverzekering (AVB) met een dekking van minimaal EUR 500.000,-;\ne) Beschikt over de voor de werkzaamheden vereiste diploma's, certificaten en/of vergunningen;\nf) In het bezit is van een geldig identiteitsbewijs;\ng) Gerechtigd is om in Nederland te werken.\n\n3.2 Opdrachtnemer dient op eerste verzoek van TopTalent bewijs te overleggen van het voorgaande."
  },
  {
    "titel": "Artikel 4 - Tarief en facturatie",
    "tekst": "4.1 Het uurtarief bedraagt EUR {{uurtarief}} exclusief BTW.\n\n4.2 Opdrachtnemer factureert TopTalent voor de verrichte werkzaamheden op basis van de door de opdrachtgever geaccordeerde uren.\n\n4.3 De factuur dient te voldoen aan de wettelijke vereisten en vermeldt in ieder geval: het KvK-nummer, het BTW-nummer, een specificatie van de gewerkte uren en het toepasselijke tarief.\n\n4.4 TopTalent betaalt de factuur binnen 14 dagen na ontvangst, mits de uren zijn geaccordeerd door de opdrachtgever.\n\n4.5 Het tarief kan per opdracht verschillen en wordt vastgelegd in de opdrachtbevestiging."
  },
  {
    "titel": "Artikel 5 - Geen doorbetaling bij ziekte of afwezigheid",
    "tekst": "5.1 Bij ziekte, vakantie of andere afwezigheid van Opdrachtnemer bestaat geen recht op doorbetaling.\n\n5.2 Opdrachtnemer meldt ziekte of verhindering zo spoedig mogelijk aan TopTalent, uiterlijk 4 uur voor aanvang van de geplande werkzaamheden.\n\n5.3 Opdrachtnemer is zelf verantwoordelijk voor een adequate arbeidsongeschiktheidsverzekering."
  },
  {
    "titel": "Artikel 6 - Aansprakelijkheid en verzekeringen",
    "tekst": "6.1 Opdrachtnemer is aansprakelijk voor schade die hij/zij toebrengt aan TopTalent, de opdrachtgever of derden tijdens de uitvoering van de werkzaamheden, voor zover deze schade het gevolg is van opzet of bewuste roekeloosheid.\n\n6.2 Opdrachtnemer vrijwaart TopTalent tegen aanspraken van derden in verband met de uitvoering van de werkzaamheden door Opdrachtnemer.\n\n6.3 Opdrachtnemer dient gedurende de looptijd van deze overeenkomst te beschikken over een adequate aansprakelijkheidsverzekering.\n\n6.4 TopTalent is niet aansprakelijk voor schade die Opdrachtnemer lijdt tijdens of in verband met de uitvoering van de werkzaamheden."
  },
  {
    "titel": "Artikel 7 - Geheimhouding",
    "tekst": "7.1 Opdrachtnemer zal strikte vertrouwelijkheid in acht nemen ten aanzien van alle informatie die hij/zij in het kader van de opdracht verkrijgt over TopTalent, de opdrachtgever en diens bedrijfsvoering.\n\n7.2 Deze geheimhoudingsverplichting geldt ook na beëindiging van de overeenkomst."
  },
  {
    "titel": "Artikel 8 - Duur en beëindiging",
    "tekst": "8.1 Deze overeenkomst wordt aangegaan voor de duur van de opdracht.\n\n8.2 Beide partijen kunnen de overeenkomst tussentijds opzeggen met een opzegtermijn van 7 dagen.\n\n8.3 TopTalent kan de overeenkomst met onmiddellijke ingang beëindigen bij:\n- Ernstig plichtsverzuim door Opdrachtnemer;\n- Verlies van KvK-inschrijving of BTW-nummer;\n- Onbehoorlijk gedrag op de werklocatie;\n- Het niet beschikken over de vereiste verzekeringen.\n\n8.4 Bij beëindiging behoudt Opdrachtnemer recht op betaling voor reeds verrichte en geaccordeerde werkzaamheden."
  },
  {
    "titel": "Artikel 9 - Toepasselijk recht",
    "tekst": "9.1 Op deze overeenkomst is Nederlands recht van toepassing.\n\n9.2 Geschillen worden voorgelegd aan de bevoegde rechter van de rechtbank Midden-Nederland, locatie Utrecht.\n\n9.3 Op deze overeenkomst zijn de Algemene Voorwaarden van TopTalent van toepassing, voor zover niet in strijd met het bepaalde in deze overeenkomst."
  }
];

/** Variabelen die per opdracht verschillen; die staan bij het akkoord vooraf nog niet vast. */
const PER_OPDRACHT = ["functie", "klant_naam", "werklocatie", "startdatum", "uurtarief"] as const;

export type OvereenkomstGegevens = {
  opdrachtnemer_naam?: string | null;
  geboortedatum?: string | null;
  adres?: string | null;
  kvk_nummer?: string | null;
  btw_nummer?: string | null;
};

/**
 * Vul de placeholders ({{naam}}) in: gegevens van de medewerker waar bekend, "[per opdracht]"
 * voor opdrachtgegevens en "[nog niet ingevuld]" voor ontbrekende persoonsgegevens.
 */
export function vulOvereenkomstIn(tekst: string, gegevens: OvereenkomstGegevens): string {
  return tekst.replace(/\{\{(\w+)\}\}/g, (_, naam: string) => {
    if ((PER_OPDRACHT as readonly string[]).includes(naam)) return "[per opdracht]";
    const waarde = gegevens[naam as keyof OvereenkomstGegevens];
    return typeof waarde === "string" && waarde.trim() ? waarde.trim() : "[nog niet ingevuld]";
  });
}

export function overeenkomstVoorMedewerker(gegevens: OvereenkomstGegevens) {
  return {
    versie: OVEREENKOMST_VERSIE,
    titel: OVEREENKOMST_TITEL,
    secties: OVEREENKOMST_SECTIES.map((s) => ({ titel: s.titel, tekst: vulOvereenkomstIn(s.tekst, gegevens) })),
  };
}
