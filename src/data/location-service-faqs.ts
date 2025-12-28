// Centrale FAQ data voor locatie service pagina's
// Single source of truth voor zowel UI als JSON-LD schema

export interface FAQItem {
  question: string;
  answer: string;
}

export const locationServiceFAQs = {
  uitzenden: {
    utrecht: [
      {
        question: "Hoe snel kan ik horeca personeel krijgen in Utrecht?",
        answer: "Vaak binnen 24 uur. Voor Jaarbeurs events of UIT-week kunnen we soms dezelfde dag personeel leveren in Utrecht centrum en omgeving, afhankelijk van beschikbaarheid."
      },
      {
        question: "Leveren jullie ook personeel voor Jaarbeurs evenementen?",
        answer: "Ja, wij hebben ruime ervaring met grote evenementen bij de Jaarbeurs Utrecht en TivoliVredenburg. Van congrespersoneel tot horecamedewerkers voor festivals."
      },
      {
        question: "Wat zijn de kosten voor uitzendpersoneel in Utrecht?",
        answer: "Tarieven variëren per functie en ervaring. Gebruik onze kosten calculator voor een indicatie of neem contact op voor een prijs op maat voor uw Utrechtse zaak."
      }
    ],
    amsterdam: [
      {
        question: "Hoe snel kan ik horeca personeel krijgen in Amsterdam?",
        answer: "Vaak binnen 24 uur. Voor centrum, Zuidas of Schiphol area kunnen we soms dezelfde dag meertalig personeel leveren, afhankelijk van beschikbaarheid."
      },
      {
        question: "Hebben jullie meertalig personeel voor internationale gasten?",
        answer: "Ja, ons personeel in Amsterdam spreekt vaak Nederlands, Engels, Duits en Frans. Ideaal voor hotels, restaurants met internationale gasten en RAI events."
      },
      {
        question: "Leveren jullie ook personeel voor RAI evenementen?",
        answer: "Ja, wij hebben uitgebreide ervaring met grote events in de RAI Amsterdam, ADE en andere conferenties. Van barpersoneel tot gastheren en gastvrouwen."
      }
    ],
    rotterdam: [
      {
        question: "Hoe snel kan ik horeca personeel krijgen in Rotterdam?",
        answer: "Vaak binnen 24 uur. Voor centrum, Markthal of havengebied kunnen we soms dezelfde dag personeel leveren in heel Rotterdam, afhankelijk van beschikbaarheid."
      },
      {
        question: "Leveren jullie ook personeel voor Ahoy evenementen?",
        answer: "Ja, wij hebben ruime ervaring met grootschalige events in Ahoy Rotterdam, North Sea Jazz en cruise terminal hospitality. Van barmedewerkers tot bediening."
      },
      {
        question: "Werken jullie ook in het havengebied van Rotterdam?",
        answer: "Ja, wij leveren personeel in heel Rotterdam inclusief het havengebied, Schiedam en Vlaardingen. Onze medewerkers kennen de regio goed."
      }
    ],
    "den-haag": [
      {
        question: "Hoe snel kan ik horeca personeel krijgen in Den Haag?",
        answer: "Vaak binnen 24 uur. Voor centrum, Scheveningen of World Forum kunnen we soms dezelfde dag meertalig personeel leveren in heel Den Haag, afhankelijk van beschikbaarheid."
      },
      {
        question: "Leveren jullie ook personeel voor Scheveningen?",
        answer: "Ja, wij hebben ruime ervaring met strandpaviljoens in Scheveningen, zowel voor zomer- als winterseizoen. Van barpersoneel tot bediening en gastvrouwen."
      },
      {
        question: "Hebben jullie ervaring met politieke en diplomatieke events?",
        answer: "Ja, ons personeel in Den Haag heeft ervaring met high-level events bij World Forum, Congresgebouw en politieke bijeenkomsten. Discreet en professioneel."
      }
    ],
    eindhoven: [
      {
        question: "Hoe snel kan ik horeca personeel krijgen in Eindhoven?",
        answer: "Vaak binnen 24 uur. Voor centrum, Strijp-S of High Tech Campus kunnen we soms dezelfde dag personeel leveren in heel Eindhoven en omgeving, afhankelijk van beschikbaarheid."
      },
      {
        question: "Leveren jullie ook personeel voor High Tech Campus?",
        answer: "Ja, wij hebben ervaring met zakelijke horeca op de High Tech Campus en innovatieve food concepts in Eindhoven. Van barista's tot bedieningspersoneel."
      },
      {
        question: "Werken jullie ook tijdens Dutch Design Week en GLOW?",
        answer: "Ja, wij hebben uitgebreide ervaring met grote evenementen zoals Dutch Design Week, GLOW Lichtfestival en PSV wedstrijden. Van hospitality tot event catering."
      }
    ]
  },
  detachering: {
    utrecht: [
      {
        question: "Wat is het verschil tussen uitzenden en detachering in Utrecht?",
        answer: "Bij detachering plaatsen we een medewerker voor langere tijd (3-12 maanden) bij uw Utrechtse zaak. Bij uitzenden gaat het om kortere, flexibele inzet voor piekdrukte of events."
      },
      {
        question: "Hoe lang duurt een detacheringsperiode gemiddeld?",
        answer: "Gemiddeld 3 tot 12 maanden. Dit biedt stabiliteit voor uw team zonder langdurige verplichtingen. Na afloop kunt u de medewerker eventueel overnemen."
      },
      {
        question: "Wat zijn de kosten van detachering in Utrecht?",
        answer: "Tarieven zijn afhankelijk van functie, ervaring en duur. Neem contact op voor een vrijblijvende offerte op maat voor uw Utrechtse restaurant of hotel."
      }
    ],
    amsterdam: [
      {
        question: "Wat is het verschil tussen uitzenden en detachering in Amsterdam?",
        answer: "Bij detachering plaatsen we een medewerker voor langere tijd (3-12 maanden) bij uw Amsterdamse zaak. Bij uitzenden gaat het om kortere, flexibele inzet."
      },
      {
        question: "Kan ik een gedetacheerde medewerker overnemen?",
        answer: "Ja, na de detacheringsperiode heeft u de optie om de medewerker in vaste dienst te nemen. Dit is ideaal om eerst te ervaren of de match goed is."
      },
      {
        question: "Regelen jullie ook de administratie?",
        answer: "Ja, wij verzorgen alle HR-administratie, loonadministratie, verzekeringen en belastingen. U heeft geen werkgeversrisico en administratieve rompslomp."
      }
    ],
    rotterdam: [
      {
        question: "Wat is het verschil tussen uitzenden en detachering in Rotterdam?",
        answer: "Bij detachering plaatsen we een medewerker voor langere tijd (3-12 maanden) bij uw Rotterdamse zaak. Bij uitzenden gaat het om kortere, tijdelijke inzet."
      },
      {
        question: "Is detachering geschikt voor mijn restaurant in Rotterdam?",
        answer: "Detachering is ideaal als u structureel extra capaciteit nodig heeft, maar geen vaste medewerker wilt aannemen. Perfect voor seizoenswerk of langere projecten."
      },
      {
        question: "Wat als de gedetacheerde medewerker niet bevalt?",
        answer: "U kunt het contract beëindigen met een korte opzegtermijn. Wij zorgen dan voor een passende vervanging. Uw tevredenheid staat voorop."
      }
    ],
    "den-haag": [
      {
        question: "Wat is het verschil tussen uitzenden en detachering in Den Haag?",
        answer: "Bij detachering plaatsen we een medewerker voor langere tijd (3-12 maanden) bij uw Haagse zaak. Bij uitzenden gaat het om kortere, flexibele inzet voor piekdrukte."
      },
      {
        question: "Is detachering geschikt voor mijn strandpaviljoen in Scheveningen?",
        answer: "Ja, detachering is ideaal voor het hele zomerseizoen of winterexploitatie. U heeft een vaste kracht zonder werkgeversrisico en flexibiliteit na het seizoen."
      },
      {
        question: "Regelen jullie ook de administratie bij detachering?",
        answer: "Ja, wij verzorgen alle HR-administratie, loonadministratie, verzekeringen en belastingen. U heeft geen werkgeversrisico en administratieve rompslomp."
      }
    ],
    eindhoven: [
      {
        question: "Wat is het verschil tussen uitzenden en detachering in Eindhoven?",
        answer: "Bij detachering plaatsen we een medewerker voor langere tijd (3-12 maanden) bij uw Eindhovense zaak. Bij uitzenden gaat het om kortere, tijdelijke inzet."
      },
      {
        question: "Kan ik een gedetacheerde medewerker overnemen na de periode?",
        answer: "Ja, na de detacheringsperiode heeft u de optie om de medewerker in vaste dienst te nemen. Ideaal voor zakelijke horeca of High Tech Campus locaties."
      },
      {
        question: "Wat zijn de kosten van detachering in Eindhoven?",
        answer: "Tarieven zijn afhankelijk van functie, ervaring en duur. Neem contact op voor een vrijblijvende offerte op maat voor uw Eindhovense restaurant, hotel of campus."
      }
    ]
  }
};

// Helper function om FAQ items op te halen
export function getLocationServiceFAQs(
  service: "uitzenden" | "detachering",
  city: "utrecht" | "amsterdam" | "rotterdam" | "den-haag" | "eindhoven"
): FAQItem[] {
  return locationServiceFAQs[service][city];
}
