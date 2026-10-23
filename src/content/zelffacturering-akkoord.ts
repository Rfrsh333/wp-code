/**
 * CONCEPT — akkoord zelffacturering (stap 6 "Geld", 23-10-2026).
 *
 * ⚠️ Deze tekst is een CONCEPT en is NIET juridisch of fiscaal gecontroleerd. Rachid laat hem eerst
 * nakijken door een boekhouder of jurist. Pas daarna ZELFFACTURERING_ACTIEF=1 zetten en de versie
 * ophogen (bijvoorbeeld "2026-11-01"): bij een nieuwe versie moet iedereen opnieuw akkoord geven.
 *
 * Opgesteld op basis van de eisen voor facturering door de afnemer (art. 34c en art. 35a Wet op de
 * omzetbelasting 1968 en het Uitvoeringsbesluit omzetbelasting 1968): een voorafgaand akkoord, een
 * procedure voor aanvaarding van elke factuur, de vermelding "Factuur uitgereikt door afnemer", de
 * btw/KOR-verantwoordelijkheid van de zzp'er en intrekking. Laat de artikelverwijzingen meecontroleren.
 *
 * Bewust NIET verzonnen: tarieven en termijnen. De betaaltermijn komt uit env
 * (UITBETAAL_TERMIJN_WERKDAGEN, lib/uitbetaling/config.ts). De bezwaartermijn van 14 dagen is het
 * voorbeeld uit de opdracht van Rachid en staat hieronder als voorstel.
 *
 * Let op (voor de jurist): art. 4.2 en 4.4 van de overeenkomst van opdracht
 * (src/content/overeenkomst-van-opdracht.ts) zeggen dat de opdrachtnemer zelf factureert en dat
 * TopTalent binnen 14 dagen na ontvangst betaalt. Dat past niet bij zelffacturering en betalen na
 * betaling door de werkgever; die artikelen moeten worden afgestemd.
 */

/** Versie waarop akkoord wordt gegeven (opgeslagen bij het akkoord). */
export const ZELFFACTURERING_VERSIE = "concept-1";

/**
 * true zolang de tekst niet is goedgekeurd: de pagina toont een CONCEPT-melding, niemand kan akkoord
 * geven, het checklistpunt doet niet mee en er kan geen uitbetaalronde worden gemaakt.
 */
export const ZELFFACTURERING_IS_CONCEPT = true;

/** Voorstel uit de opdracht ("bijvoorbeeld bezwaar binnen 14 dagen"); laten checken. */
export const BEZWAARTERMIJN_DAGEN = 14;

export const ZELFFACTURERING_TITEL = "Akkoord zelffacturering";

export const ZELFFACTURERING_AKKOORDZIN =
  "Ik heb het akkoord zelffacturering gelezen en geef TopTalent toestemming om namens mij de facturen voor mijn diensten op te maken en uit te reiken.";

const SECTIES: readonly { titel: string; tekst: string }[] = [
  {
    titel: "1. Partijen",
    tekst:
      "Dit akkoord geldt tussen {{afnemer_naam}} (KvK {{afnemer_kvk}}), hierna \"TopTalent\", en {{naam}}{{kvk_tekst}}, hierna \"jij\". Jij verricht als zelfstandig ondernemer diensten bij werkgevers via TopTalent.",
  },
  {
    titel: "2. Wat je afspreekt",
    tekst:
      "Je geeft TopTalent vooraf toestemming om de facturen voor de diensten die je via TopTalent verricht, namens jou op te maken en uit te reiken (zelffacturering, ook wel \"facturering door de afnemer\").\n\nVoor deze diensten stuur je zelf geen factuur meer naar TopTalent. Zo wordt niets dubbel gefactureerd.\n\nDit akkoord geldt voor alle facturen vanaf het moment dat je akkoord geeft, totdat je het intrekt (zie artikel 9).",
  },
  {
    titel: "3. Wat er op de factuur staat",
    tekst:
      "Elke factuur bevat de gegevens die de wet vraagt, waaronder:\n- de vermelding \"Factuur uitgereikt door afnemer\";\n- een opeenvolgend factuurnummer uit een eigen reeks voor jou (bijvoorbeeld ZF-…-0001);\n- de factuurdatum;\n- jouw naam, adres, KvK-nummer en btw-id;\n- de naam en het adres van TopTalent als afnemer;\n- per dienst: de datum, de werkgever, de uren, het uurtarief, een eventuele toeslag en de reiskosten;\n- het bedrag zonder btw, het btw-tarief en het btw-bedrag, of de vermelding dat je de kleineondernemersregeling (KOR) toepast.",
  },
  {
    titel: "4. Jouw gegevens",
    tekst:
      "TopTalent gebruikt de gegevens uit je profiel: naam, adres, KvK-nummer, btw-id, IBAN en je keuze voor de KOR. Jij zorgt dat deze gegevens kloppen en actueel zijn. Staat er op een factuur iets verkeerds omdat je gegevens niet klopten, dan is dat jouw verantwoordelijkheid; TopTalent corrigeert de factuur dan met een creditfactuur.",
  },
  {
    titel: "5. Controle en aanvaarding van elke factuur",
    tekst:
      "Je vindt elke factuur in je portaal onder Financieel > Facturen. Controleer elke factuur.\n\nKlopt er iets niet, laat het TopTalent dan binnen {{bezwaar_dagen}} dagen na de factuurdatum weten, via Berichten in je portaal of per e-mail aan {{contact_email}}. TopTalent maakt dan een creditfactuur en, als dat nodig is, een nieuwe factuur.\n\nHeb je binnen {{bezwaar_dagen}} dagen na de factuurdatum geen bezwaar gemaakt, dan geldt de factuur als door jou aanvaard.",
  },
  {
    titel: "6. Btw en KOR",
    tekst:
      "Je blijft als ondernemer zelf verantwoordelijk voor je btw-aangifte en voor het afdragen van de btw die op jouw facturen staat.\n\nOp de factuur staat 21% btw, tenzij je in je profiel hebt aangegeven dat je de KOR toepast. Dan staat er geen btw op de factuur en wel de vermelding dat je bent vrijgesteld. Of je de KOR mag toepassen, is jouw verantwoordelijkheid.\n\nBegin je met de KOR, zet het dan aan in je profiel. Stop je met de KOR of wijzigt je btw-id, laat het TopTalent dan direct weten. Facturen die al gemaakt zijn, worden alleen gecorrigeerd met een creditfactuur.",
  },
  {
    titel: "7. Betaling",
    tekst:
      "TopTalent betaalt het bedrag van de factuur (inclusief eventuele btw) op het IBAN in je profiel, binnen {{termijn_werkdagen}} werkdagen nadat de werkgever TopTalent heeft betaald voor de diensten op die factuur.\n\nDe factuur wordt gemaakt op het moment van uitbetalen. Zolang de werkgever niet heeft betaald, wordt er voor die diensten nog niet uitbetaald; je ziet de status in je portaal.",
  },
  {
    titel: "8. Bewaren",
    tekst:
      "Bewaar je facturen in je eigen administratie: ondernemers moeten hun administratie 7 jaar bewaren (fiscale bewaarplicht). Je kunt je facturen per kwartaal downloaden in je portaal. TopTalent bewaart de facturen ook 7 jaar.",
  },
  {
    titel: "9. Intrekken",
    tekst:
      "Je kunt dit akkoord altijd intrekken in je portaal, op de pagina Zelffacturering. Facturen die vóór de intrekking zijn gemaakt, blijven geldig.\n\nNa intrekking maakt TopTalent geen facturen meer namens jou. Zolang er geen akkoord is, kun je niet reageren op nieuwe diensten (zie de checklist op je dashboard). Neem contact op met TopTalent als je hierover wilt overleggen.",
  },
  {
    titel: "10. Wijzigingen",
    tekst:
      "Wijzigt TopTalent deze afspraken, dan zie je de nieuwe tekst in je portaal en vragen we je opnieuw akkoord te geven.",
  },
];

export type ZelffactureringInvulling = {
  naam: string | null;
  kvk_nummer: string | null;
  afnemer_naam: string;
  afnemer_kvk: string;
  contact_email: string;
  /** X uit UITBETAAL_TERMIJN_WERKDAGEN; null = nog niet vastgesteld. */
  termijn_werkdagen: number | null;
};

export const TERMIJN_ONBEKEND = "[aantal nog vast te stellen]";

/** Vult de tekst in voor één medewerker. Ontbrekende gegevens worden "[…]", niets wordt verzonnen. */
export function zelffactureringTekst(v: ZelffactureringInvulling): {
  versie: string;
  concept: boolean;
  titel: string;
  secties: { titel: string; tekst: string }[];
  akkoordzin: string;
} {
  const waarden: Record<string, string> = {
    naam: v.naam?.trim() || "[je naam]",
    kvk_tekst: v.kvk_nummer ? ` (KvK ${v.kvk_nummer})` : "",
    afnemer_naam: v.afnemer_naam,
    afnemer_kvk: v.afnemer_kvk,
    contact_email: v.contact_email,
    bezwaar_dagen: String(BEZWAARTERMIJN_DAGEN),
    termijn_werkdagen: v.termijn_werkdagen != null ? String(v.termijn_werkdagen) : TERMIJN_ONBEKEND,
  };
  const vul = (t: string) => t.replace(/\{\{(\w+)\}\}/g, (_, k: string) => waarden[k] ?? `[${k}]`);
  return {
    versie: ZELFFACTURERING_VERSIE,
    concept: ZELFFACTURERING_IS_CONCEPT,
    titel: ZELFFACTURERING_IS_CONCEPT ? `${ZELFFACTURERING_TITEL} (CONCEPT)` : ZELFFACTURERING_TITEL,
    secties: SECTIES.map((s) => ({ titel: s.titel, tekst: vul(s.tekst) })),
    akkoordzin: ZELFFACTURERING_AKKOORDZIN,
  };
}
