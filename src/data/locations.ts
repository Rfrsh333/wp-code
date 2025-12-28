export interface LocationData {
  name: string;
  slug: string;
  title: string;
  description: string;
  heroText: string;
  usps: Array<{
    icon: string;
    text: string;
  }>;
  services: string[];
  functions: string[];
  ctaText: string;
  serviceAreas: string[];
  statistics: {
    restaurants: number;
    hotels: number;
    events: number;
  };
  address?: {
    street: string;
    postalCode: string;
    city: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  localEvents: string[];
  uniqueSellingPoints: string[];
}

export const locations: Record<string, LocationData> = {
  utrecht: {
    name: "Utrecht",
    slug: "utrecht",
    title: "Horeca Uitzendbureau Utrecht | TopTalent Jobs",
    description: "Snel en betrouwbaar horeca personeel in Utrecht. Ervaren krachten voor restaurants, hotels en evenementen. Binnen 24 uur beschikbaar.",
    heroText: "TopTalent Jobs is uw betrouwbare partner voor horeca personeel in Utrecht en omgeving. Met jarenlange ervaring in de Utrechtse horeca kennen wij de markt en leveren wij snel gekwalificeerd personeel.",
    usps: [
      {
        icon: "🏢",
        text: "Lokale expertise: wij kennen de Utrechtse horeca vanaf de grond"
      },
      {
        icon: "⚡",
        text: "Binnen 24 uur personeel beschikbaar, vaak zelfs sneller"
      },
      {
        icon: "👥",
        text: "Ervaren medewerkers die Utrecht en omgeving door en door kennen"
      },
      {
        icon: "🎯",
        text: "Flexibel inzetbaar voor evenementen, festivals en reguliere diensten"
      }
    ],
    services: [
      "Uitzenden voor tijdelijke inzet",
      "Detachering voor langere periode",
      "Recruitment voor vaste medewerkers",
      "Evenementenpersoneel"
    ],
    functions: [
      "Barista's & bartenders",
      "Bediening & horecamedewerkers",
      "Koks & keukenpersoneel",
      "Gastheren & gastvrouwen"
    ],
    ctaText: "Neem contact op en ontvang binnen 24 uur gekwalificeerd personeel voor uw zaak in Utrecht.",
    serviceAreas: [
      "Utrecht Centrum",
      "Utrecht Oost",
      "Utrecht West",
      "Leidsche Rijn",
      "De Meern",
      "Vleuten",
      "Nieuwegein",
      "IJsselstein",
      "Houten"
    ],
    statistics: {
      restaurants: 25,
      hotels: 15,
      events: 30
    },
    address: {
      street: "Kanaalstraat 15",
      postalCode: "3531 CJ",
      city: "Utrecht"
    },
    geo: {
      latitude: 52.0907,
      longitude: 5.1214
    },
    localEvents: [
      "Utrecht Culinair",
      "Le Guess Who? Festival",
      "Utrechtse Introductietijd (UIT)",
      "TivoliVredenburg concerten",
      "Jaarbeurs evenementen"
    ],
    uniqueSellingPoints: [
      "Hoofdkantoor in hartje Utrecht - directe bereikbaarheid",
      "Samenwerking met 25+ restaurants in Utrecht centrum",
      "Ervaring met grote studentenevenementen (UIT, introductieweken)",
      "Gespecialiseerd in snelle levering voor Jaarbeurs events"
    ]
  },

  amsterdam: {
    name: "Amsterdam",
    slug: "amsterdam",
    title: "Horeca Uitzendbureau Amsterdam | TopTalent Jobs",
    description: "Horeca personeel Amsterdam. TopTalent Jobs levert betrouwbaar personeel voor restaurants, hotels en evenementen. Binnen 24 uur beschikbaar.",
    heroText: "Of het nu gaat om een druk restaurant in het centrum, een hotel bij Schiphol of een evenement in de RAI - TopTalent Jobs levert snel en flexibel horeca personeel in heel Amsterdam en omgeving.",
    usps: [
      {
        icon: "🌍",
        text: "Uitgebreid netwerk in de Amsterdamse horeca met 40+ vaste klanten"
      },
      {
        icon: "⚡",
        text: "Snelle levering: vaak binnen 24 uur personeel, spoed mogelijk"
      },
      {
        icon: "🗣️",
        text: "Meertalig personeel (Nederlands, Engels, Duits, Frans) voor internationale gasten"
      },
      {
        icon: "🎪",
        text: "Ruime ervaring met grote evenementen, festivals en conferenties"
      }
    ],
    services: [
      "Uitzenden voor tijdelijke inzet",
      "Detachering voor langere periode",
      "Recruitment voor vaste medewerkers",
      "Evenementen & festivals personeel"
    ],
    functions: [
      "Barista's & bartenders",
      "Bediening & horecamedewerkers",
      "Koks & keukenpersoneel",
      "Gastheren & gastvrouwen"
    ],
    ctaText: "Van centrum tot Zuidoost, van Noord tot Amstelveen - wij leveren overal snel personeel.",
    serviceAreas: [
      "Amsterdam Centrum",
      "Amsterdam Noord",
      "Amsterdam Oost",
      "Amsterdam Zuid",
      "Amsterdam West",
      "Amsterdam Zuidoost",
      "Amstelveen",
      "Diemen",
      "Schiphol Area",
      "RAI gebied"
    ],
    statistics: {
      restaurants: 40,
      hotels: 25,
      events: 50
    },
    geo: {
      latitude: 52.3676,
      longitude: 4.9041
    },
    localEvents: [
      "Amsterdam Dance Event (ADE)",
      "King's Day festiviteiten",
      "Amsterdam Restaurant Week",
      "RAI conventies en beurzen",
      "Grachtenfestival"
    ],
    uniqueSellingPoints: [
      "Meertalig personeel voor internationale toeristen en zakelijke gasten",
      "Ervaring met high-end restaurants en Michelin-ster zaken",
      "Gespecialiseerd in grote evenementen (ADE, Koningsdag, RAI events)",
      "Directe beschikbaarheid voor hotel-keten bij Schiphol"
    ]
  },

  rotterdam: {
    name: "Rotterdam",
    slug: "rotterdam",
    title: "Horeca Uitzendbureau Rotterdam | TopTalent Jobs",
    description: "Flexibel horeca personeel Rotterdam. TopTalent Jobs levert ervaren krachten voor restaurants, hotels en evenementen. Direct beschikbaar.",
    heroText: "Rotterdam bruist met energie en zo werken wij ook. TopTalent Jobs levert snel en betrouwbaar horeca personeel voor de dynamische Rotterdamse horecascene - van Markthal tot Erasmus MC events.",
    usps: [
      {
        icon: "🏗️",
        text: "Expertise in de diverse Rotterdamse horeca - van foodhallen tot fine dining"
      },
      {
        icon: "⚡",
        text: "Binnen 24 uur personeel op locatie, ook voor havengebied"
      },
      {
        icon: "🌐",
        text: "Internationaal personeel voor de multiculturele Rotterdamse markt"
      },
      {
        icon: "🎯",
        text: "Ervaring met grootschalige events in Ahoy en cruise terminal personeel"
      }
    ],
    services: [
      "Uitzenden voor piekdrukte",
      "Detachering voor langere projecten",
      "Recruitment voor vaste posities",
      "Evenementen & beurzen personeel"
    ],
    functions: [
      "Barista's & bartenders",
      "Bediening & horecamedewerkers",
      "Koks & keukenpersoneel",
      "Gastheren & gastvrouwen"
    ],
    ctaText: "Van centrum tot Kralingen, van Noord tot Zuid - wij leveren overal in Rotterdam snel gekwalificeerd personeel.",
    serviceAreas: [
      "Rotterdam Centrum",
      "Rotterdam Noord",
      "Rotterdam Zuid",
      "Kralingen-Crooswijk",
      "Delfshaven",
      "Feijenoord",
      "Schiedam",
      "Vlaardingen",
      "Capelle aan den IJssel",
      "Havengebied"
    ],
    statistics: {
      restaurants: 30,
      hotels: 20,
      events: 40
    },
    geo: {
      latitude: 51.9225,
      longitude: 4.47917
    },
    localEvents: [
      "Rotterdam Marathon festiviteiten",
      "North Sea Jazz Festival",
      "Maritiem evenementen cruise terminal",
      "Ahoy concerten en beurzen",
      "Dak van Rotterdam events"
    ],
    uniqueSellingPoints: [
      "Sterke aanwezigheid in Markthal en Fenix Food Factory",
      "Ervaring met cruise terminal hospitality (100.000+ passagiers/jaar)",
      "Gespecialiseerd in Ahoy Rotterdam events tot 15.000 bezoekers",
      "Personeel gewend aan diverse, multiculturele werkomgevingen"
    ]
  }
};

export const cityOrder = ["utrecht", "amsterdam", "rotterdam"];

export function getLocation(slug: string): LocationData | undefined {
  return locations[slug];
}

export function getAllLocations(): LocationData[] {
  return cityOrder.map(slug => locations[slug]);
}

export function getOtherLocations(currentSlug: string): LocationData[] {
  return cityOrder
    .filter(slug => slug !== currentSlug)
    .map(slug => locations[slug]);
}
