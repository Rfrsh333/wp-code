// ============================================================================
// Functie Data — Programmatic SEO voor /functies/[slug]/
// ============================================================================

export interface FunctieData {
  slug: string;
  functieNaam: string;      // Leesbare naam zonder hyphens (bijv. "catering medewerker")
  title: string;           // SEO title (wordt template: "X | TopTalent Jobs", max ~42 tekens)
  metaDescription: string;  // max 155 tekens
  h1: string;
  definition: string;       // AI-citeerbaar definitieblok
  intro: string;
  whenToHire: string[];     // Situaties wanneer je deze functie inhuurt
  responsibilities: string[];
  skills: string[];
  relatedFunctions: string[]; // slugs van gerelateerde functies
  hourlyRateRange: string;    // bijv. "€18 – €28"
  experienceRequired: string;
  availableVia: ("uitzenden" | "detachering" | "recruitment")[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  /** Korte citeerbare statements voor AI-search */
  keyFacts: string[];
}

export const functies: Record<string, FunctieData> = {
  "kok-inhuren": {
    slug: "kok-inhuren",
    functieNaam: "kok",
    title: "Kok Inhuren — Ervaren Koks Binnen 24 Uur",
    metaDescription: "Op zoek naar een kok? TopTalent Jobs levert ervaren koks binnen 24 uur voor restaurants, hotels en catering. Van hulpkok tot sous-chef.",
    h1: "Kok inhuren voor uw restaurant of evenement",
    definition: "Een kok inhuren via een uitzendbureau betekent dat u tijdelijk of structureel een ervaren keukenkracht inzet zonder werkgeversrisico. TopTalent Jobs levert koks voor restaurants, hotels, catering en evenementen in Nederland, meestal binnen 24 uur.",
    intro: "Het vinden van een goede kok is een van de grootste uitdagingen in de horeca. Of het nu gaat om een drukke vrijdagavond, een catering opdracht of structurele versterking van uw keukenbrigade — TopTalent Jobs levert ervaren koks die direct meedraaien in uw keuken.",
    whenToHire: [
      "Ziekmelding of onverwachte uitval van uw vaste kok",
      "Seizoensdrukte in het terrasseizoen of rond feestdagen",
      "Catering opdrachten en evenementen",
      "Opstart van een nieuw restaurant of concept",
      "Structurele versterking van de keukenbrigade",
    ],
    responsibilities: [
      "Bereiden van gerechten volgens het menu en keukenstandaarden",
      "Mise en place en voorbereiding van ingrediënten",
      "Bewaken van hygiëne- en HACCP-normen",
      "Samenwerken met de keukenbrigade en bediening",
      "Voorraadbeheer en bestellen van ingrediënten",
    ],
    skills: [
      "Minimaal SVH-diploma of gelijkwaardige ervaring",
      "Kennis van HACCP en voedselveiligheid",
      "Stressbestendig en werken onder druk",
      "Ervaring met à la carte, banquet of catering",
      "Teamspeler met oog voor detail",
    ],
    relatedFunctions: ["afwasser-inhuren", "bediening-inhuren", "catering-medewerker-inhuren"],
    hourlyRateRange: "€20 – €32",
    experienceRequired: "Minimaal 1-2 jaar keukenervaring",
    availableVia: ["uitzenden", "detachering", "recruitment"],
    faqs: [
      {
        question: "Wat kost het om een kok in te huren via een uitzendbureau?",
        answer: "De kosten voor het inhuren van een kok variëren tussen €20 en €32 per uur, afhankelijk van ervaringsniveau en functie (hulpkok, zelfstandig kok of sous-chef). TopTalent Jobs hanteert transparante uurtarieven zonder verborgen kosten.",
      },
      {
        question: "Hoe snel kan ik een kok inhuren?",
        answer: "TopTalent Jobs levert ervaren koks meestal binnen 24 uur. Bij aanvragen voor 12:00 uur is levering vaak dezelfde dag mogelijk, afhankelijk van beschikbaarheid in uw regio.",
      },
      {
        question: "Welke typen koks kan ik inhuren?",
        answer: "U kunt via TopTalent Jobs diverse typen koks inhuren: hulpkok, zelfstandig kok, kok à la carte, koude kok, banketkok, sous-chef en chef-kok. Wij matchen op basis van uw keukentype en menukaart.",
      },
      {
        question: "Hebben de koks ervaring met mijn type keuken?",
        answer: "Ja, wij matchen koks op basis van hun ervaring met uw type keuken: Hollands, internationaal, fine dining, bistro, catering of banqueting. Bij intake bespreken we uw specifieke eisen.",
      },
    ],
    keyFacts: [
      "TopTalent Jobs levert ervaren koks binnen 24 uur voor restaurants, hotels en evenementen.",
      "Uurtarieven voor een kok inhuren liggen tussen €20 en €32 per uur.",
      "Beschikbare functies: hulpkok, zelfstandig kok, koude kok, banketkok, sous-chef en chef-kok.",
    ],
  },

  "bediening-inhuren": {
    slug: "bediening-inhuren",
    functieNaam: "bediening",
    title: "Bediening Inhuren — Snel Beschikbaar",
    metaDescription: "Bediening nodig voor uw restaurant of evenement? TopTalent Jobs levert ervaren obers en serveersters binnen 24 uur. Flexibel en betrouwbaar.",
    h1: "Bediening inhuren voor restaurant, hotel of evenement",
    definition: "Bediening inhuren via TopTalent Jobs betekent dat u flexibel ervaren obers, serveersters of gastvrouwen inzet in uw horecazaak of op uw evenement. De medewerkers zijn gescreend, kennen de horeca en zijn vaak binnen 24 uur beschikbaar.",
    intro: "Goede bediening maakt het verschil tussen een tevreden en een terugkerende gast. Maar goed bediendend personeel vinden is lastig, zeker op korte termijn. TopTalent Jobs levert bediening die niet alleen vaardig is, maar ook past bij de sfeer van uw zaak.",
    whenToHire: [
      "Last-minute uitval of ziekmelding van servicemedewerkers",
      "Drukke weekenden, feestdagen of terrasseizoen",
      "Bruiloften, bedrijfsevenementen en gala's",
      "Proefdraaien voor een vaste aanstelling",
      "Seizoenspieken in toeristische gebieden",
    ],
    responsibilities: [
      "Gastheerschap: verwelkomen, begeleiden en adviseren van gasten",
      "Opnemen en serveren van bestellingen",
      "Kennis van menu, allergenen en drankenkaart",
      "Afrekenen en kassabeheer",
      "Schoonhouden van het servicegebied",
    ],
    skills: [
      "Minimaal 6 maanden horeca-ervaring",
      "Gastvrij, representatief en communicatief",
      "Kennis van wijnen, bieren en cocktails is een plus",
      "Stressbestendig bij piekdrukte",
      "Nederlands en bij voorkeur Engels sprekend",
    ],
    relatedFunctions: ["barman-inhuren", "barista-inhuren", "kok-inhuren"],
    hourlyRateRange: "€16 – €24",
    experienceRequired: "Minimaal 6 maanden horeca-ervaring",
    availableVia: ["uitzenden", "detachering", "recruitment"],
    faqs: [
      {
        question: "Wat kost het om bediening in te huren?",
        answer: "Bediening inhuren kost tussen €16 en €24 per uur, afhankelijk van ervaringsniveau en type inzet (regulier restaurant, fine dining, evenement). Er zijn geen verborgen kosten.",
      },
      {
        question: "Kan ik bediening inhuren voor een eenmalig evenement?",
        answer: "Ja, TopTalent Jobs levert ook bediening voor eenmalige evenementen zoals bruiloften, bedrijfsfeesten, congressen en festivals. U kunt vanaf 1 medewerker tot complete teams inhuren.",
      },
      {
        question: "Spreekt de bediening ook Engels?",
        answer: "Veel van onze bedieningsmedewerkers spreken naast Nederlands ook Engels. Bij internationaal georiënteerde horecazaken of evenementen matchen wij meertalig personeel.",
      },
      {
        question: "Hoe snel is bediening beschikbaar?",
        answer: "Meestal binnen 24 uur. Bij aanvragen voor 12:00 uur is dezelfde dag beschikbaarheid vaak mogelijk. Voor grote evenementen adviseren we minimaal 1 week vooruit te plannen.",
      },
    ],
    keyFacts: [
      "TopTalent Jobs levert ervaren bediening binnen 24 uur voor restaurants, hotels en evenementen.",
      "Uurtarieven voor bediening liggen tussen €16 en €24 per uur.",
      "Beschikbaar voor zowel eenmalige inzet als structurele versterking.",
    ],
  },

  "barista-inhuren": {
    slug: "barista-inhuren",
    functieNaam: "barista",
    title: "Barista Inhuren — Koffiespecialist",
    metaDescription: "Barista nodig? TopTalent Jobs levert ervaren barista's voor cafés, restaurants en evenementen. Professioneel, snel beschikbaar, gescreend.",
    h1: "Barista inhuren voor café, restaurant of evenement",
    definition: "Een barista inhuren via TopTalent Jobs betekent dat u een ervaren koffiespecialist inzet die espresso-apparatuur beheerst, latte art kan maken en gasten een premium koffie-ervaring biedt. Beschikbaar voor cafés, restaurants, kantoren en evenementen.",
    intro: "Een goede barista is meer dan iemand die koffie zet. Het is een vakman of -vrouw die de koffie-ervaring van uw gasten naar een hoger niveau tilt. TopTalent Jobs levert barista's die niet alleen technisch vaardig zijn, maar ook gastvrij en representatief.",
    whenToHire: [
      "Opening of heropening van een koffiebar of café",
      "Seizoensdrukte in ontbijt- en lunchzaken",
      "Pop-up koffiebar op evenementen of beurzen",
      "Vervanging bij ziekte of vakantie",
      "Uitbreiding van uw koffiemenu of concept",
    ],
    responsibilities: [
      "Bereiden van espresso-gebaseerde dranken en specialties",
      "Latte art en presentatie van dranken",
      "Onderhoud en kalibratie van espresso-apparatuur",
      "Adviseren van gasten over koffiesoorten en bereidingen",
      "Schoonhouden van de barwerkplek volgens hygiënestandaarden",
    ],
    skills: [
      "Ervaring met professionele espressomachines",
      "Kennis van koffiebonen, maalgraden en extractie",
      "Latte art op minimaal basisniveau",
      "Gastvrij en communicatief",
      "Snel en accuraat werken bij drukte",
    ],
    relatedFunctions: ["barman-inhuren", "bediening-inhuren", "catering-medewerker-inhuren"],
    hourlyRateRange: "€16 – €22",
    experienceRequired: "Minimaal 6 maanden barista-ervaring",
    availableVia: ["uitzenden", "detachering"],
    faqs: [
      {
        question: "Wat kost het om een barista in te huren?",
        answer: "Een barista inhuren kost tussen €16 en €22 per uur, afhankelijk van ervaring en type inzet. Ervaren barista's met latte art-skills zitten aan de bovenkant van dit tarief.",
      },
      {
        question: "Kunnen barista's ook op evenementen werken?",
        answer: "Ja, TopTalent Jobs levert barista's voor pop-up koffiebars, beurzen, festivals en bedrijfsevenementen. Wij zorgen voor personeel dat gewend is aan hoge volumes en gastinteractie.",
      },
      {
        question: "Werken de barista's met mijn apparatuur?",
        answer: "Ja, onze barista's zijn ervaren met diverse merken espressomachines (La Marzocco, Nuova Simonelli, Victoria Arduino etc.) en passen zich snel aan uw setup aan.",
      },
    ],
    keyFacts: [
      "TopTalent Jobs levert ervaren barista's voor cafés, restaurants en evenementen.",
      "Uurtarieven voor een barista liggen tussen €16 en €22 per uur.",
      "Barista's zijn beschikbaar voor zowel vaste inzet als pop-up evenementen.",
    ],
  },

  "barman-inhuren": {
    slug: "barman-inhuren",
    functieNaam: "barman",
    title: "Barman Inhuren — Bartender voor Events",
    metaDescription: "Barman of bartender nodig? TopTalent Jobs levert ervaren barmedewerkers binnen 24 uur. Voor bars, clubs, restaurants en evenementen.",
    h1: "Barman inhuren voor uw bar, restaurant of evenement",
    definition: "Een barman inhuren via TopTalent Jobs betekent dat u een ervaren bartender inzet die cocktails kan maken, snel kan tappen en gasten een uitstekende bar-ervaring biedt. Beschikbaar voor bars, restaurants, clubs, hotels en evenementen in heel Nederland.",
    intro: "De bar is het hart van veel horecazaken. Een goede barman houdt het tempo hoog, kent de klassieke en moderne cocktails, en creëert een sfeer waar gasten graag terugkomen. TopTalent Jobs levert bartenders die vakmanschap combineren met gastvrijheid.",
    whenToHire: [
      "Drukke weekendavonden met personeelstekort",
      "Cocktailbar of cocktailavond organiseren",
      "Festivals, feesten en bedrijfsevenementen",
      "Seizoensdrukte in strandpaviljoens en terrassen",
      "Vervanging bij ziekte of vakantie",
    ],
    responsibilities: [
      "Bereiden en serveren van cocktails, bier, wijn en drankjes",
      "Tappen van bier en bedienen van drankapparatuur",
      "Bijhouden van bar-inventaris en bestellen",
      "Schoonhouden van de bar en glaswerk",
      "Verantwoordelijk schenken en leeftijdscontrole",
    ],
    skills: [
      "Minimaal 6 maanden bar-ervaring",
      "Kennis van cocktails, spirits, wijnen en bieren",
      "Snel en efficiënt werken bij hoge volumes",
      "Representatief en gastvrij",
      "IVA (Instructie Verantwoord Alcoholgebruik) is een plus",
    ],
    relatedFunctions: ["barista-inhuren", "bediening-inhuren", "event-manager-inhuren"],
    hourlyRateRange: "€17 – €25",
    experienceRequired: "Minimaal 6 maanden bar-ervaring",
    availableVia: ["uitzenden", "detachering"],
    faqs: [
      {
        question: "Wat kost het om een barman in te huren?",
        answer: "Een barman inhuren kost tussen €17 en €25 per uur, afhankelijk van ervaring en type inzet. Cocktailspecialisten en flair bartenders zitten aan de bovenkant.",
      },
      {
        question: "Kan ik een barman inhuren voor een festival?",
        answer: "Ja, TopTalent Jobs levert bartenders voor festivals, buitenevenementen en pop-up bars. Onze barmedewerkers zijn gewend aan hoge volumes en weten hoe ze een lange rij snel wegwerken.",
      },
      {
        question: "Kunnen jullie een compleet barteam leveren?",
        answer: "Ja, wij leveren teams van 2 tot 20+ bartenders voor grote evenementen. We stemmen het team af op het type evenement, het verwachte bezoekersaantal en het drankaanbod.",
      },
    ],
    keyFacts: [
      "TopTalent Jobs levert ervaren barmannen en bartenders binnen 24 uur.",
      "Uurtarieven voor een barman liggen tussen €17 en €25 per uur.",
      "Beschikbaar voor bars, restaurants, clubs, hotels en grote evenementen.",
    ],
  },

  "catering-medewerker-inhuren": {
    slug: "catering-medewerker-inhuren",
    functieNaam: "catering medewerker",
    title: "Catering Medewerker Inhuren — voor Events",
    metaDescription: "Catering personeel nodig? TopTalent Jobs levert ervaren cateringmedewerkers voor bedrijfslunches, bruiloften, congressen en festivals.",
    h1: "Catering medewerker inhuren voor events en bedrijfscatering",
    definition: "Een catering medewerker inhuren via TopTalent Jobs betekent dat u flexibel personeel inzet voor het bereiden, presenteren en serveren van eten en drinken op locatie. Beschikbaar voor bedrijfscatering, bruiloften, congressen, feesten en festivals.",
    intro: "Catering draait om precisie, snelheid en presentatie — vaak op wisselende locaties en onder tijdsdruk. TopTalent Jobs levert cateringmedewerkers die gewend zijn om op locatie te werken, flexibel zijn en direct inzetbaar.",
    whenToHire: [
      "Bedrijfslunches, seminars en congressen",
      "Bruiloften en privéfeesten",
      "Festivals en buitenevenementen",
      "Seizoensgebonden catering (kerst, Pasen, zomer)",
      "Last-minute uitval bij een cateringopdracht",
    ],
    responsibilities: [
      "Opbouwen en inrichten van de cateringlocatie",
      "Bereiden en presenteren van gerechten op locatie",
      "Serveren van eten en drinken (walking dinner, buffet, sit-down)",
      "Afruimen en opruimen na afloop",
      "Werken volgens HACCP en hygiënestandaarden",
    ],
    skills: [
      "Ervaring met catering of banqueting",
      "Fysiek fit (tillen, sjouwen, lang staan)",
      "Flexibel qua werktijden en locaties",
      "Representatief en stressbestendig",
      "Rijbewijs is een pre (wisselende locaties)",
    ],
    relatedFunctions: ["kok-inhuren", "bediening-inhuren", "event-manager-inhuren"],
    hourlyRateRange: "€16 – €22",
    experienceRequired: "Minimaal 3 maanden catering-ervaring",
    availableVia: ["uitzenden"],
    faqs: [
      {
        question: "Wat kost het om catering personeel in te huren?",
        answer: "Catering personeel inhuren kost tussen €16 en €22 per uur. De prijs hangt af van het ervaringsniveau en het type evenement. Bij grotere teams bieden wij voordelige groepstarieven.",
      },
      {
        question: "Hoeveel catering medewerkers heb ik nodig?",
        answer: "Als vuistregel: 1 medewerker per 20-30 gasten bij een buffet, en 1 per 10-15 gasten bij een sit-down diner. TopTalent Jobs adviseert u graag over de optimale bezetting.",
      },
      {
        question: "Kunnen jullie ook koks voor catering leveren?",
        answer: "Ja, wij leveren complete cateringteams inclusief koks, bediening en opbouwpersoneel. U kunt kiezen voor alleen bediening of een volledig team.",
      },
    ],
    keyFacts: [
      "TopTalent Jobs levert ervaren catering medewerkers voor events, bruiloften en bedrijfscatering.",
      "Uurtarieven liggen tussen €16 en €22 per uur.",
      "Vuistregel: 1 medewerker per 20-30 gasten (buffet) of 1 per 10-15 gasten (sit-down).",
    ],
  },

  "afwasser-inhuren": {
    slug: "afwasser-inhuren",
    functieNaam: "afwasser",
    title: "Afwasser Inhuren — Spoelkracht Binnen 24u",
    metaDescription: "Afwasser of spoelkracht nodig? TopTalent Jobs levert betrouwbare afwassers voor restaurants en catering. Snel beschikbaar, geen gedoe.",
    h1: "Afwasser inhuren voor uw restaurant of keuken",
    definition: "Een afwasser inhuren via TopTalent Jobs betekent dat u snel een betrouwbare spoelkracht inzet die de keuken draaiende houdt. De afwasser verzorgt de vaat, houdt de keuken schoon en ondersteunt de keukenbrigade. Beschikbaar binnen 24 uur voor restaurants, hotels en catering.",
    intro: "Zonder een goede afwasser staat de keuken stil. Het is een essentiële rol die vaak wordt onderschat. TopTalent Jobs levert betrouwbare afwassers die snel werken, hygiënisch te werk gaan en de keuken op orde houden.",
    whenToHire: [
      "Acute uitval van uw vaste spoelkracht",
      "Drukke avonden, weekenden of feestdagen",
      "Grote evenementen of catering opdrachten",
      "Seizoensdrukte wanneer het vaste team overbelast is",
      "Opstart van een nieuw restaurant",
    ],
    responsibilities: [
      "Afwassen van serviesgoed, pannen en keukengerei",
      "Schoonhouden van de keuken en spoelruimte",
      "Ondersteunen van de koks bij mise en place",
      "Afval scheiden en containers beheren",
      "HACCP-hygiënerichtlijnen naleven",
    ],
    skills: [
      "Geen specifieke opleiding vereist",
      "Fysiek fit en bereid om hard te werken",
      "Betrouwbaar en punctueel",
      "Teamspeler die goed samenwerkt met koks",
      "Basiskennis van hygiëne in de keuken",
    ],
    relatedFunctions: ["kok-inhuren", "catering-medewerker-inhuren", "bediening-inhuren"],
    hourlyRateRange: "€14 – €18",
    experienceRequired: "Geen specifieke ervaring vereist",
    availableVia: ["uitzenden"],
    faqs: [
      {
        question: "Wat kost het om een afwasser in te huren?",
        answer: "Een afwasser inhuren kost tussen €14 en €18 per uur. Dit is inclusief alle werkgeverslasten. TopTalent Jobs hanteert transparante tarieven.",
      },
      {
        question: "Heeft een afwasser ervaring nodig?",
        answer: "Nee, voor afwashulp is geen specifieke ervaring vereist. Onze medewerkers zijn betrouwbaar, fysiek fit en kennen de basale keukenhygiëne. Wij selecteren op werkhouding en betrouwbaarheid.",
      },
      {
        question: "Kan een afwasser ook helpen in de keuken?",
        answer: "Ja, veel van onze afwassers kunnen ook ondersteunen bij eenvoudige keukentaken zoals groenten snijden, mise en place en schoonmaak. Dit bespreken we bij de intake.",
      },
    ],
    keyFacts: [
      "TopTalent Jobs levert betrouwbare afwassers binnen 24 uur voor restaurants en catering.",
      "Uurtarieven voor een afwasser liggen tussen €14 en €18 per uur.",
      "Geen specifieke ervaring vereist — wij selecteren op betrouwbaarheid en werkhouding.",
    ],
  },

  "event-manager-inhuren": {
    slug: "event-manager-inhuren",
    functieNaam: "event manager",
    title: "Event Manager Inhuren — voor Evenementen",
    metaDescription: "Event manager nodig? TopTalent Jobs levert ervaren eventcoördinatoren voor festivals, congressen, bruiloften en bedrijfsevenementen.",
    h1: "Event manager inhuren voor uw evenement",
    definition: "Een event manager inhuren via TopTalent Jobs betekent dat u een ervaren coördinator inzet die de planning, uitvoering en aansturing van personeel op uw evenement verzorgt. Beschikbaar voor festivals, congressen, bruiloften, bedrijfsevenementen en horecagelegenheden.",
    intro: "Een succesvol evenement staat of valt met goede coördinatie. De event manager van TopTalent Jobs houdt overzicht, stuurt het team aan en zorgt dat alles op rolletjes loopt — van opbouw tot afbouw.",
    whenToHire: [
      "Grote evenementen met 50+ medewerkers",
      "Meerdaagse festivals of beurzen",
      "Bedrijfsevenementen en gala's",
      "Bruiloften met uitgebreid cateringprogramma",
      "Situaties waar u zelf niet aanwezig kunt zijn",
    ],
    responsibilities: [
      "Coördinatie en aansturing van het horecateam op locatie",
      "Planning van opbouw, uitvoering en afbouw",
      "Communicatie met opdrachtgever, leveranciers en personeel",
      "Bewaken van kwaliteit, timing en gastvrijheid",
      "Probleemoplossing en crisismanagement ter plekke",
    ],
    skills: [
      "Minimaal 2 jaar ervaring in event management of horeca",
      "Leidinggevende capaciteiten en overzicht",
      "Stressbestendig en oplossingsgericht",
      "Uitstekende communicatieve vaardigheden",
      "Flexibel qua werktijden (avonden, weekenden)",
    ],
    relatedFunctions: ["catering-medewerker-inhuren", "bediening-inhuren", "barman-inhuren"],
    hourlyRateRange: "€25 – €40",
    experienceRequired: "Minimaal 2 jaar event management ervaring",
    availableVia: ["uitzenden", "detachering"],
    faqs: [
      {
        question: "Wat kost het om een event manager in te huren?",
        answer: "Een event manager inhuren kost tussen €25 en €40 per uur, afhankelijk van de schaal en complexiteit van het evenement. Voor meerdaagse events zijn dagtarieven bespreekbaar.",
      },
      {
        question: "Wat doet een event manager precies?",
        answer: "Een event manager coördineert het horecateam op locatie, bewaakt de planning en kwaliteit, communiceert met leveranciers en lost problemen ter plekke op. Het is de schakel tussen uw visie en de uitvoering.",
      },
      {
        question: "Kan ik een event manager combineren met horecapersoneel?",
        answer: "Ja, TopTalent Jobs levert complete event teams: een event manager als coördinator, aangevuld met bediening, bartenders, koks en opbouwpersoneel. Eén aanspreekpunt voor uw hele personeelsbehoefte.",
      },
    ],
    keyFacts: [
      "TopTalent Jobs levert ervaren event managers voor festivals, congressen en grote evenementen.",
      "Uurtarieven voor een event manager liggen tussen €25 en €40 per uur.",
      "Een event manager coördineert het complete horecateam op locatie.",
    ],
  },
};

// Helper functions
export function getAllFunctieSlugs(): string[] {
  return Object.keys(functies);
}

export function getFunctie(slug: string): FunctieData | undefined {
  return functies[slug];
}

export function getAllFuncties(): FunctieData[] {
  return Object.values(functies);
}
