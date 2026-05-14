import { ContentBlock } from "@/components/blog/BlogContentRenderer";

// ============================================================
// Blog Article Type Definition
// ============================================================
export interface BlogArticle {
  title: string;
  metaTitle?: string; // Override for <title> tag (max 60 chars). Falls back to title.
  excerpt: string;
  category: string;
  author: string;
  date: string;
  datePublished: string; // ISO-8601 format
  image: string;
  relatedSlugs: string[];
  blocks: ContentBlock[];
}

// ============================================================
// All Blog Articles
// ============================================================
export const blogArticles: Record<string, BlogArticle> = {
  // ============================================================
  // ARTICLE 1: Horecapersoneel inhuren gids 2025
  // ============================================================
  "horecapersoneel-inhuren-gids-2025": {
    title: "Horecapersoneel inhuren: De complete gids voor 2025",
    excerpt: "Alles wat u moet weten over het inhuren van horecapersoneel – van uitzendkrachten tot vaste medewerkers.",
    category: "Recruitment",
    author: "TopTalent Team",
    date: "14 december 2024",
    datePublished: "2024-12-14",
    image: "/images/blog-horecapersoneel-inhuren.jpg",
    relatedSlugs: ["personeelstekort-horeca-oplossen"],
    blocks: [
      {
        type: "paragraph",
        content: "Het tekort aan goed horecapersoneel blijft ook in 2025 een grote uitdaging. Wij zien dagelijks hoe restaurants, cafés, hotels en evenementenlocaties worstelen met roosters, uitval en piekmomenten."
      },
      {
        type: "highlight",
        variant: "info",
        title: "De realiteit van 2025",
        content: "Flexibiliteit is essentieel — maar tegelijkertijd wilt u kwaliteit en zekerheid. Of u nu tijdelijk extra personeel nodig heeft of structureel wilt opschalen: horecapersoneel inhuren vraagt om een doordachte aanpak."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Waarom horecapersoneel inhuren steeds belangrijker wordt"
      },
      {
        type: "paragraph",
        content: "De horeca verandert snel. Seizoensdrukte, personeelstekorten, strengere wetgeving en last-minute afmeldingen maken het steeds lastiger om alles met alleen vast personeel op te vangen. Daarom kiezen steeds meer ondernemers voor flexibele oplossingen."
      },
      {
        type: "relatedLink",
        href: "/blog/personeelstekort-horeca-oplossen",
        text: "Personeelstekort in de horeca oplossen"
      },
      {
        type: "checklist",
        title: "De voordelen van horecapersoneel inhuren",
        variant: "benefits",
        items: [
          { text: "Snel kunnen schakelen bij drukte of evenementen" },
          { text: "Geen langdurige personeelsverplichtingen" },
          { text: "Minder administratieve lasten" },
          { text: "Direct inzetbaar en ervaren personeel" }
        ]
      },
      {
        type: "quote",
        quote: "In 2025 is flexibiliteit geen luxe meer — het is noodzaak.",
        variant: "highlight"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Welke vormen van horecapersoneel kunt u inhuren?"
      },
      {
        type: "heading3",
        content: "Uitzendkrachten in de horeca"
      },
      {
        type: "paragraph",
        content: "Een van de meest gekozen oplossingen is werken met uitzendkrachten via een gespecialiseerd horeca-uitzendbureau."
      },
      {
        type: "comparison",
        title: "Uitzendkrachten: voordelen vs. aandachtspunten",
        headers: ["Aspect", "Voordelen", "Aandachtspunten"],
        rows: [
          { feature: "Beschikbaarheid", optionA: "Snel beschikbaar", optionB: "Wisselende bezetting" },
          { feature: "Administratie", optionA: "Volledig geregeld", optionB: "-" },
          { feature: "Kosten", optionA: "All-in tarief", optionB: "Hogere uurkosten" },
          { feature: "Binding", optionA: "Flexibel inzetbaar", optionB: "Minder lange termijn" }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        title: "Onze tip",
        content: "Uitzenden is vooral populair bij restaurants, cafés, hotels en evenementenlocaties die flexibiliteit nodig hebben zonder risico's."
      },
      {
        type: "cta",
        title: "Bekijk onze uitzendservice",
        description: "Snel, flexibel en betrouwbaar horecapersoneel binnen 24 uur.",
        primaryLink: { href: "/diensten/uitzenden", text: "Meer informatie" },
        variant: "orange"
      },
      {
        type: "divider"
      },
      {
        type: "heading3",
        content: "ZZP'ers in de horeca"
      },
      {
        type: "paragraph",
        content: "ZZP'ers worden vaak ingezet voor specifieke functies, zoals ervaren koks of zelfstandig werkende bartenders."
      },
      {
        type: "checklist",
        title: "Voordelen van ZZP'ers",
        variant: "benefits",
        items: [
          { text: "Veel ervaring" },
          { text: "Snel inzetbaar" },
          { text: "Geen loonadministratie" }
        ]
      },
      {
        type: "highlight",
        variant: "warning",
        title: "Let op in 2025",
        content: "Door strengere handhaving op schijnzelfstandigheid is het cruciaal om zzp'ers correct in te zetten. Wij adviseren ondernemers hier altijd zorgvuldig over om risico's te voorkomen."
      },
      {
        type: "divider"
      },
      {
        type: "heading3",
        content: "Detachering in de horeca"
      },
      {
        type: "paragraph",
        content: "Voor langdurige bezetting zonder direct een vast contract aan te bieden is detachering een sterke optie. De medewerker werkt volledig bij u, maar staat op de loonlijst van het detacheringsbureau."
      },
      {
        type: "relatedLink",
        href: "/diensten/detachering",
        text: "Meer over detachering in de horeca"
      },
      {
        type: "divider"
      },
      {
        type: "heading3",
        content: "Vaste horecamedewerkers aannemen"
      },
      {
        type: "paragraph",
        content: "Voor structurele bezetting blijft vast personeel onmisbaar."
      },
      {
        type: "checklist",
        title: "Voordelen van vast personeel",
        variant: "benefits",
        items: [
          { text: "Meer betrokkenheid bij uw bedrijf" },
          { text: "Sterkere teamcultuur" },
          { text: "Continuïteit" }
        ]
      },
      {
        type: "quote",
        quote: "In de praktijk zien wij dat de beste resultaten worden behaald met een combinatie van vaste krachten en flexibel ingehuurd personeel.",
        variant: "insight"
      },
      {
        type: "relatedLink",
        href: "/diensten/recruitment",
        text: "Bekijk onze recruitment dienst"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wat kost horecapersoneel inhuren in 2025?"
      },
      {
        type: "paragraph",
        content: "De kosten hangen af van meerdere factoren: functie, ervaring, type dienst en contractvorm."
      },
      {
        type: "priceTable",
        title: "Gemiddelde tarieven 2025",
        rows: [
          { item: "Bediening via uitzendbureau", price: "€25 – €35", note: "per uur" },
          { item: "Ervaren kok", price: "€35 – €50", note: "per uur" },
          { item: "ZZP'er in de horeca", price: "Variabel", note: "afhankelijk van afspraken" }
        ],
        footer: "Bij uitzendkrachten zijn alle kosten inbegrepen: loon, premies, verzekeringen en administratie."
      },
      {
        type: "relatedLink",
        href: "/kosten-calculator",
        text: "Bereken direct wat horecapersoneel inhuren kost"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Waar moet u op letten bij horecapersoneel inhuren?"
      },
      {
        type: "checklist",
        title: "Vier belangrijke criteria",
        variant: "steps",
        items: [
          { text: "**Betrouwbaarheid** — Werk samen met een partij die de horeca écht begrijpt en ervaring heeft met verschillende type zaken." },
          { text: "**Snelheid** — In de horeca telt elke minuut. Wij weten hoe belangrijk het is om ook bij spoed direct te kunnen leveren." },
          { text: "**Kwaliteit** — Goed personeel voorkomt stress op de werkvloer en zorgt voor tevreden gasten." },
          { text: "**Wet- en regelgeving** — Correcte contracten en naleving van wetgeving zijn essentieel om problemen achteraf te voorkomen." }
        ]
      },
      {
        type: "relatedLink",
        href: "/blog/cao-horeca-2025-wijzigingen",
        text: "Lees meer over de CAO Horeca 2025 wijzigingen"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Horecapersoneel inhuren bij spoed"
      },
      {
        type: "paragraph",
        content: "Spoedaanvragen komen in de horeca dagelijks voor. Een ziekmelding of onverwachte drukte kan uw hele planning onderuit halen."
      },
      {
        type: "highlight",
        variant: "tip",
        title: "Snelle oplossing",
        content: "Wij zien dat ondernemers vooral kiezen voor een uitzendbureau omdat zij dan snel kunnen schakelen. In veel gevallen kan er binnen enkele uren een geschikte medewerker worden ingezet."
      },
      {
        type: "cta",
        title: "Direct personeel nodig?",
        description: "Vraag nu personeel aan en wij regelen het binnen 24 uur.",
        primaryLink: { href: "/personeel-aanvragen", text: "Personeel aanvragen" },
        variant: "orange"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "De slimste keuze in 2025: flexibel én zeker"
      },
      {
        type: "paragraph",
        content: "Onze ervaring leert dat de meest succesvolle horecabedrijven werken met een hybride personeelsmodel:"
      },
      {
        type: "checklist",
        title: "Het hybride model",
        variant: "checklist",
        items: [
          { text: "Een **vaste kern** van medewerkers", checked: true },
          { text: "Een **flexibele schil** van uitzendkrachten", checked: true },
          { text: "Eventueel aangevuld met **zzp'ers**", checked: false }
        ]
      },
      {
        type: "quote",
        quote: "Zo blijft u wendbaar, zonder in te leveren op kwaliteit of continuïteit.",
        variant: "highlight"
      },
      {
        type: "relatedLink",
        href: "/blog/horeca-personeelsplanning-rooster-tips",
        text: "Tips voor een efficiënte personeelsplanning"
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samenvatting",
        points: [
          "Horecapersoneel inhuren is in 2025 geen noodoplossing meer, maar een bewuste strategische keuze",
          "Door slim gebruik te maken van flexibiliteit voorkomt u personeelstekorten",
          "Samenwerken met een gespecialiseerd horeca-uitzendbureau is de meest veilige en efficiënte manier",
          "Geen zorgen over administratie of wetgeving"
        ]
      },
      {
        type: "cta",
        title: "Klaar om de volgende stap te zetten?",
        description: "Wij denken graag met u mee over de beste personeelsoplossing voor uw zaak.",
        primaryLink: { href: "/contact", text: "Neem contact op" },
        secondaryLink: { href: "/diensten", text: "Bekijk onze diensten" },
        variant: "dark"
      }
    ]
  },

  // ============================================================
  // ARTICLE 2: Personeelstekort horeca oplossen
  // ============================================================
  "personeelstekort-horeca-oplossen": {
    title: "Personeelstekort horeca oplossen: 7 bewezen strategieën",
    excerpt: "Het personeelstekort in de horeca is een grote uitdaging. Wij laten zien hoe u toch vooruitkomt.",
    category: "HR",
    author: "TopTalent Team",
    date: "12 december 2024",
    datePublished: "2024-12-12",
    image: "/images/blog-personeelstekort.jpg",
    relatedSlugs: ["horecapersoneel-inhuren-gids-2025", "seizoenspersoneel-horeca-zomer"],
    blocks: [
      {
        type: "paragraph",
        content: "Het personeelstekort in de horeca is al jaren voelbaar — en in 2025 is dat niet anders. Wij spreken dagelijks horecaondernemers die te maken hebben met volle reserveringsboeken, maar te weinig handen op de werkvloer."
      },
      {
        type: "highlight",
        variant: "warning",
        title: "De impact",
        content: "Dat zorgt voor stress, hogere werkdruk en soms zelfs omzetverlies. Toch zien wij dat bedrijven die het slim aanpakken, het personeelstekort wél onder controle krijgen."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Waarom is het personeelstekort zo groot?"
      },
      {
        type: "paragraph",
        content: "Voordat we naar oplossingen kijken, is het belangrijk om het probleem te begrijpen."
      },
      {
        type: "checklist",
        title: "Oorzaken van het tekort",
        variant: "checklist",
        items: [
          { text: "Onregelmatige werktijden", checked: true },
          { text: "Hoge werkdruk", checked: true },
          { text: "Concurrentie van andere sectoren", checked: true },
          { text: "Minder instroom van jong personeel", checked: true },
          { text: "Strengere wet- en regelgeving", checked: true }
        ]
      },
      {
        type: "quote",
        quote: "Wij zien dat ondernemers die alleen blijven zoeken naar vast personeel vaak vastlopen. Een bredere aanpak is noodzakelijk.",
        variant: "insight"
      },
      {
        type: "relatedLink",
        href: "/blog/horecapersoneel-inhuren-gids-2025",
        text: "Lees onze complete gids over horecapersoneel inhuren"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Strategie 1: Werk met flexibel horecapersoneel"
      },
      {
        type: "paragraph",
        content: "Een van de meest effectieve manieren om het personeelstekort op te vangen, is het inzetten van flexibel personeel via een horeca-uitzendbureau."
      },
      {
        type: "checklist",
        title: "Waarom dit werkt",
        variant: "benefits",
        items: [
          { text: "U kunt snel opschalen bij drukte" },
          { text: "U zit niet vast aan langdurige contracten" },
          { text: "Ziekte en no-shows zijn makkelijker op te vangen" }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        content: "Wij merken dat vooral restaurants en evenementenlocaties hiermee veel rust creëren in hun planning."
      },
      {
        type: "relatedLink",
        href: "/diensten/uitzenden",
        text: "Bekijk onze uitzendservice voor de horeca"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Strategie 2: Combineer vast en flexibel personeel"
      },
      {
        type: "paragraph",
        content: "Alleen flexibel personeel inzetten is vaak niet ideaal. Wat wél werkt, is een hybride model."
      },
      {
        type: "checklist",
        title: "Ons advies",
        variant: "steps",
        items: [
          { text: "Een vaste kern voor continuïteit" },
          { text: "Flexibele krachten voor piekmomenten" },
          { text: "Eventueel zzp'ers voor specialistische functies" }
        ]
      },
      {
        type: "quote",
        quote: "Deze combinatie zorgt voor stabiliteit én flexibiliteit.",
        variant: "highlight"
      },
      {
        type: "relatedLink",
        href: "/blog/detachering-vs-uitzenden-verschil",
        text: "Lees meer over het verschil tussen detachering en uitzenden"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Strategie 3: Maak werken in uw zaak aantrekkelijker"
      },
      {
        type: "paragraph",
        content: "Personeel behouden is minstens zo belangrijk als personeel vinden. Wij zien dat horecaondernemers hier steeds creatiever in worden."
      },
      {
        type: "checklist",
        title: "Denk aan",
        variant: "benefits",
        items: [
          { text: "Betere roosters" },
          { text: "Duidelijke werktijden" },
          { text: "Doorgroeimogelijkheden" },
          { text: "Waardering en aandacht voor het team" }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        content: "Kleine verbeteringen maken vaak een groot verschil."
      },
      {
        type: "relatedLink",
        href: "/blog/horeca-personeelsplanning-rooster-tips",
        text: "Tips voor een efficiënte personeelsplanning"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Strategie 4: Schakel sneller bij spoed"
      },
      {
        type: "paragraph",
        content: "In de horeca is snelheid cruciaal. Wie te laat reageert op een uitval, loopt direct achter de feiten aan."
      },
      {
        type: "checklist",
        title: "Ondernemers met vaste afspraken bij een uitzendbureau",
        variant: "benefits",
        items: [
          { text: "Ervaren minder stress" },
          { text: "Hebben sneller personeel geregeld" },
          { text: "Zijn minder afhankelijk van last-minute oplossingen" }
        ]
      },
      {
        type: "cta",
        title: "Direct personeel nodig?",
        description: "Wij leveren vaak binnen 24 uur gekwalificeerd personeel.",
        primaryLink: { href: "/personeel-aanvragen", text: "Vraag direct personeel aan" },
        variant: "orange"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Strategie 5: Kijk verder dan alleen ervaring"
      },
      {
        type: "paragraph",
        content: "Veel ondernemers zoeken uitsluitend naar ervaren krachten. Begrijpelijk, maar dit verkleint de vijver."
      },
      {
        type: "checklist",
        title: "Wij adviseren om ook te kijken naar",
        variant: "checklist",
        items: [
          { text: "Motivatie", checked: true },
          { text: "Inzetbaarheid", checked: true },
          { text: "Leergierigheid", checked: true }
        ]
      },
      {
        type: "quote",
        quote: "Met de juiste begeleiding groeien nieuwe medewerkers vaak snel door.",
        variant: "insight"
      },
      {
        type: "relatedLink",
        href: "/blog/horecamedewerker-worden-zonder-ervaring",
        text: "Horecamedewerker worden zonder ervaring"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Strategie 6: Zet technologie slim in"
      },
      {
        type: "paragraph",
        content: "Een efficiënte planning kan het personeelstekort deels opvangen."
      },
      {
        type: "checklist",
        title: "Denk aan",
        variant: "benefits",
        items: [
          { text: "Betere urenregistratie" },
          { text: "Inzicht in drukke momenten" },
          { text: "Slimmere roosters" }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        content: "Wij zien dat ondernemers die grip hebben op hun planning minder vaak in de knel komen."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Strategie 7: Werk samen met een specialist"
      },
      {
        type: "paragraph",
        content: "Tot slot zien wij dat samenwerking met een gespecialiseerde partner vaak het verschil maakt. Een horeca-uitzendbureau begrijpt de sector, de pieken en de uitdagingen."
      },
      {
        type: "checklist",
        title: "De voordelen",
        variant: "benefits",
        items: [
          { text: "Toegang tot een groot netwerk" },
          { text: "Snel beschikbare krachten" },
          { text: "Minder administratieve zorgen" },
          { text: "Kennis van wet- en regelgeving" }
        ]
      },
      {
        type: "quote",
        quote: "Zo kunt u zich focussen op uw zaak en uw gasten.",
        variant: "highlight"
      },
      {
        type: "relatedLink",
        href: "/locaties",
        text: "Bekijk in welke regio's wij horecapersoneel leveren"
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samenvatting",
        points: [
          "Het personeelstekort in de horeca is een serieus probleem, maar zeker niet onoplosbaar",
          "Met de juiste strategie, flexibiliteit en partnerschap blijft uw onderneming draaien",
          "Een slimme combinatie van vaste medewerkers en flexibel personeel is de sleutel tot succes in 2025"
        ]
      },
      {
        type: "cta",
        title: "Klaar om het personeelstekort aan te pakken?",
        description: "Wij denken graag met u mee over de beste aanpak voor uw situatie.",
        primaryLink: { href: "/contact", text: "Neem contact op" },
        secondaryLink: { href: "/diensten", text: "Onze diensten" },
        variant: "dark"
      }
    ]
  },

  // ============================================================
  // ARTICLE 4: Werken als uitzendkracht
  // ============================================================
  "werken-uitzendkracht-horeca-salaris": {
    title: "Werken als uitzendkracht in de horeca: salaris en voordelen",
    excerpt: "Overweeg je om als uitzendkracht in de horeca te werken? Ontdek de salarissen, voordelen en hoe je snel kunt starten.",
    category: "Carrière",
    author: "TopTalent Team",
    date: "8 december 2024",
    datePublished: "2024-12-08",
    image: "/images/blog-werken-als-uitzendkracht.jpg",
    relatedSlugs: ["horecamedewerker-worden-zonder-ervaring", "meest-gevraagde-horecafuncties-nederland"],
    blocks: [
      {
        type: "paragraph",
        content: "Overweeg je om als uitzendkracht in de horeca te gaan werken? Dit is een slimme keuze — of je nu flexibel wilt bijverdienen, net begint in de horeca of gewoon het maximale uit je uren wilt halen."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wat verdien je als uitzendkracht?"
      },
      {
        type: "paragraph",
        content: "Als uitzendkracht in de horeca word je betaald volgens de CAO Horeca, aangevuld met toeslagen en vakantiegeld. De hoogte van je salaris hangt af van je functie, ervaring en het tijdstip waarop je werkt."
      },
      {
        type: "priceTable",
        title: "Indicatie bruto uurlonen · 2025",
        rows: [
          { item: "Bedieningsmedewerker", price: "€21 – €25" },
          { item: "Bartender", price: "€22 – €26" },
          { item: "Kok", price: "€24 – €30" },
          { item: "Afwasser", price: "€20 – €23" }
        ],
        footer: "Daarbovenop ontvang je toeslagen voor avond-, weekend- en feestdagendiensten."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "De voordelen van uitzendwerk"
      },
      {
        type: "heading3",
        content: "Flexibiliteit"
      },
      {
        type: "paragraph",
        content: "Je bepaalt zelf wanneer je werkt. Je geeft je beschikbaarheid door en wij plannen je in op basis van jouw agenda. Ideaal voor studenten, ouders of iedereen die vrijheid zoekt."
      },
      {
        type: "heading3",
        content: "Variatie"
      },
      {
        type: "paragraph",
        content: "Je komt op verschillende locaties en maakt kennis met diverse horecazaken — van drukke restaurants tot exclusieve evenementen. Zo bouw je snel ervaring op én ontdek je wat écht bij je past."
      },
      {
        type: "heading3",
        content: "Goed verdienen"
      },
      {
        type: "paragraph",
        content: "Uitzendwerk in de horeca is goed betaald. Door avond- en weekendtoeslagen en het 8% vakantiegeld verdien je vaak meer dan je denkt."
      },
      {
        type: "heading3",
        content: "Snel starten"
      },
      {
        type: "paragraph",
        content: "Geen eindeloze sollicitatieprocedures. Na je inschrijving nemen wij contact met je op en kun je vaak al binnen enkele dagen aan de slag."
      },
      {
        type: "heading3",
        content: "Zekerheid"
      },
      {
        type: "highlight",
        variant: "info",
        title: "Belangrijk voordeel",
        content: "Als uitzendkracht ben je verzekerd, bouw je pensioen op en krijg je doorbetaald bij ziekte. Geen financiële risico's zoals bij zzp."
      },
      {
        type: "relatedLink",
        href: "/blog/horecamedewerker-worden-zonder-ervaring",
        text: "Lees ook: Horecamedewerker worden zonder ervaring"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Is uitzendwerk iets voor jou?"
      },
      {
        type: "checklist",
        title: "Uitzendwerk past perfect als je",
        variant: "checklist",
        items: [
          { text: "Flexibel wilt werken rond studie of andere verplichtingen", checked: true },
          { text: "Snel wilt starten zonder lange sollicitatieronde", checked: true },
          { text: "Op zoek bent naar afwisseling", checked: true },
          { text: "Geen risico wilt lopen (zoals bij zzp)", checked: true }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Uitzendkracht vs. ZZP"
      },
      {
        type: "paragraph",
        content: "Veel mensen twijfelen: ga ik als zzp'er werken of via een uitzendbureau?"
      },
      {
        type: "comparison",
        title: "Vergelijking: Uitzendkracht vs. ZZP",
        headers: ["Aspect", "Uitzendkracht", "ZZP'er"],
        rows: [
          { feature: "Administratie", optionA: "Wordt geregeld", optionB: "Zelf doen" },
          { feature: "Verzekeringen", optionA: "Inbegrepen", optionB: "Zelf regelen" },
          { feature: "Pensioenopbouw", optionA: "Ja", optionB: "Nee" },
          { feature: "Doorbetaling bij ziekte", optionA: "Ja", optionB: "Nee" },
          { feature: "Risico", optionA: "Minimaal", optionB: "Volledig zelf" }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "cta",
        title: "Direct aan de slag?",
        description: "Wil je werken als uitzendkracht in de horeca? Bij TopTalent kun je je eenvoudig inschrijven. Wij helpen je snel aan leuke opdrachten bij gezellige horecazaken.",
        primaryLink: { href: "/inschrijven", text: "Schrijf je nu in" },
        secondaryLink: { href: "/contact", text: "Neem contact op" },
        variant: "orange"
      }
    ]
  },

  // ============================================================
  // ARTICLE 5: Evenementenpersoneel checklist
  // ============================================================
  "evenementenpersoneel-inhuren-checklist": {
    title: "Evenementenpersoneel inhuren: checklist voor organisatoren",
    excerpt: "Organiseert u een evenement, festival of bedrijfsfeest? Gebruik onze checklist voor een succesvolle personeelsplanning.",
    category: "Evenementen",
    author: "TopTalent Team",
    date: "5 december 2024",
    datePublished: "2024-12-05",
    image: "/images/blog-evenementenpersoneel.jpg",
    relatedSlugs: ["horecapersoneel-inhuren-gids-2025"],
    blocks: [
      {
        type: "paragraph",
        content: "Een goed evenement valt of staat met het personeel. Of het nu gaat om een bedrijfsfeest, bruiloft, festival of conferentie — professionele medewerkers maken het verschil."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Checklist · 4-6 weken vooraf"
      },
      {
        type: "paragraph",
        content: "De voorbereiding begint ruim op tijd:"
      },
      {
        type: "checklist",
        variant: "checklist",
        items: [
          { text: "Bepaal welke functies u nodig heeft", checked: false },
          { text: "Schat het aantal benodigde medewerkers in", checked: false },
          { text: "Neem contact op met een uitzendbureau", checked: false },
          { text: "Vraag een offerte aan", checked: false },
          { text: "Bespreek specifieke wensen en dresscode", checked: false }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Checklist · 2-4 weken vooraf"
      },
      {
        type: "paragraph",
        content: "De details worden concreet:"
      },
      {
        type: "checklist",
        variant: "checklist",
        items: [
          { text: "Bevestig de definitieve aantallen", checked: false },
          { text: "Stuur een briefing met alle eventdetails", checked: false },
          { text: "Deel het programma en tijdschema", checked: false },
          { text: "Geef aan waar personeel zich moet melden", checked: false },
          { text: "Bespreek eventuele allergenen bij catering", checked: false }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Checklist · 1 week vooraf"
      },
      {
        type: "paragraph",
        content: "De laatste voorbereidingen:"
      },
      {
        type: "checklist",
        variant: "checklist",
        items: [
          { text: "Stuur een reminder naar het uitzendbureau", checked: false },
          { text: "Bevestig parkeer- en reismogelijkheden", checked: false },
          { text: "Zorg voor personeelsmaaltijden", checked: false },
          { text: "Wijs een contactpersoon aan voor de dag zelf", checked: false }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Checklist · Op de dag zelf"
      },
      {
        type: "paragraph",
        content: "Een vlotte start is essentieel:"
      },
      {
        type: "checklist",
        variant: "checklist",
        items: [
          { text: "Ontvang het personeel en geef een korte briefing", checked: false },
          { text: "Wijs taken en werkplekken toe", checked: false },
          { text: "Zorg voor duidelijke communicatielijnen", checked: false },
          { text: "Geef feedback waar nodig", checked: false }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Welke functies heeft u nodig?"
      },
      {
        type: "heading3",
        content: "Service & Hospitality"
      },
      {
        type: "list",
        items: [
          "**Gastheer/gastvrouw** — Ontvangst en begeleiding van gasten",
          "**Bediening** — Serveren van eten en drinken",
          "**Runners** — Ondersteuning in de bediening",
          "**Garderobe** — Beheer van jassen en tassen"
        ]
      },
      {
        type: "heading3",
        content: "Bar & Catering"
      },
      {
        type: "list",
        items: [
          "**Bartenders** — Bereiden en serveren van drankjes",
          "**Barbacks** — Ondersteuning achter de bar",
          "**Cateringmedewerkers** — Buffetservice en afruimen"
        ]
      },
      {
        type: "heading3",
        content: "Overig"
      },
      {
        type: "list",
        items: [
          "**Keukenhulp** — Ondersteuning bij de bereiding",
          "**Afwas** — Schone glazen en servies",
          "**Opbouw/afbouw** — Hulp bij in- en uitrichten"
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Hoeveel personeel heeft u nodig?"
      },
      {
        type: "paragraph",
        content: "Een praktische vuistregel:"
      },
      {
        type: "table",
        headers: ["Type evenement", "Ratio personeel:gasten"],
        rows: [
          ["Zittend diner", "1:10 tot 1:15"],
          ["Lopend buffet", "1:20 tot 1:30"],
          ["Borrel/receptie", "1:25 tot 1:35"],
          ["Festival", "1:50 tot 1:75"]
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        content: "Bij twijfel adviseren wij graag over de juiste bezetting."
      },
      {
        type: "relatedLink",
        href: "/kosten-calculator",
        text: "Bereken de kosten voor evenementenpersoneel"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Waarom TopTalent voor uw evenement?"
      },
      {
        type: "checklist",
        variant: "benefits",
        items: [
          { text: "Ervaren evenementenpersoneel" },
          { text: "Beschikbaar door heel Nederland" },
          { text: "Last-minute aanvragen mogelijk" },
          { text: "Flexibel in aantallen tot op het laatste moment" },
          { text: "Persoonlijke begeleiding" }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "cta",
        title: "Vrijblijvende offerte aanvragen",
        description: "Een succesvol evenement begint met de juiste mensen. Wij denken graag met u mee.",
        primaryLink: { href: "/contact", text: "Neem contact op" },
        secondaryLink: { href: "/personeel-aanvragen", text: "Vraag personeel aan" },
        variant: "dark"
      }
    ]
  },

  // ============================================================
  // ARTICLE 6: Detachering vs uitzenden
  // ============================================================
  "detachering-vs-uitzenden-verschil": {
    title: "Detachering vs uitzenden: welke vorm past bij uw bedrijf?",
    excerpt: "Wij vergelijken detachering en uitzenden op kosten, flexibiliteit en risico's. Ontdek welke vorm past bij uw bedrijf.",
    category: "Detachering",
    author: "TopTalent Team",
    date: "3 december 2024",
    datePublished: "2024-12-03",
    image: "/images/blog-detachering-vs-uitzenden.jpg",
    relatedSlugs: ["horecapersoneel-inhuren-gids-2025"],
    blocks: [
      {
        type: "paragraph",
        content: "Veel ondernemers in de horeca lopen tegen dezelfde vraag aan: kiezen we voor detachering of uitzenden?"
      },
      {
        type: "highlight",
        variant: "info",
        content: "Beide vormen bieden flexibiliteit, maar de verschillen zijn groter dan vaak wordt gedacht. De juiste keuze kan u tijd, geld en zorgen besparen."
      },
      {
        type: "relatedLink",
        href: "/blog/horecapersoneel-inhuren-gids-2025",
        text: "Lees ook: Complete gids over horecapersoneel inhuren"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wat is uitzenden?"
      },
      {
        type: "paragraph",
        content: "Bij uitzenden huurt u personeel in via een uitzendbureau voor tijdelijke inzet. De uitzendkracht staat bij het uitzendbureau op de loonlijst en kan flexibel worden ingezet — vaak per dienst of per week."
      },
      {
        type: "checklist",
        title: "Kenmerken van uitzenden",
        variant: "benefits",
        items: [
          { text: "Zeer flexibel inzetbaar" },
          { text: "Geschikt voor piekmomenten en spoed" },
          { text: "Geen langdurige verplichtingen" },
          { text: "Loonbetaling en administratie worden volledig geregeld" }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        content: "Wij zien dat uitzenden vooral populair is in de horeca, evenementenbranche en seizoensgebonden sectoren."
      },
      {
        type: "relatedLink",
        href: "/diensten/uitzenden",
        text: "Meer over onze uitzendservice"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wat is detachering?"
      },
      {
        type: "paragraph",
        content: "Bij detachering wordt een medewerker voor een langere periode bij uw organisatie geplaatst. De medewerker blijft in dienst bij het detacheringsbureau, maar werkt fulltime of voor een vast aantal uren bij u."
      },
      {
        type: "checklist",
        title: "Kenmerken van detachering",
        variant: "benefits",
        items: [
          { text: "Langere inzetperiode" },
          { text: "Meer continuïteit" },
          { text: "Minder wisselingen" },
          { text: "Meer betrokkenheid bij uw organisatie" }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        content: "Detachering wordt vaak gebruikt wanneer u tijdelijk extra capaciteit nodig heeft, maar geen vaste medewerker wilt aannemen."
      },
      {
        type: "relatedLink",
        href: "/diensten/detachering",
        text: "Meer over onze detacheringsservice"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "De belangrijkste verschillen"
      },
      {
        type: "comparison",
        title: "Uitzenden vs. Detachering",
        headers: ["Aspect", "Uitzenden", "Detachering"],
        rows: [
          { feature: "Flexibiliteit", optionA: "Maximaal", optionB: "Gemiddeld" },
          { feature: "Duur", optionA: "Kort", optionB: "Middellang tot lang" },
          { feature: "Kosten", optionA: "Per uur", optionB: "Vaak vast per maand" },
          { feature: "Binding", optionA: "Beperkt", optionB: "Hoog" }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Welke vorm past bij u?"
      },
      {
        type: "heading3",
        content: "Kies voor uitzenden als:"
      },
      {
        type: "checklist",
        variant: "checklist",
        items: [
          { text: "U te maken heeft met piekdrukte", checked: true },
          { text: "U personeel nodig heeft bij ziekte of uitval", checked: true },
          { text: "Flexibiliteit voorop staat", checked: true },
          { text: "U snel wilt kunnen schakelen", checked: true }
        ]
      },
      {
        type: "heading3",
        content: "Kies voor detachering als:"
      },
      {
        type: "checklist",
        variant: "checklist",
        items: [
          { text: "U voor langere tijd extra capaciteit nodig heeft", checked: true },
          { text: "Continuïteit belangrijk is", checked: true },
          { text: "U kennis wilt behouden binnen uw team", checked: true },
          { text: "U geen vaste contracten wilt aangaan", checked: true }
        ]
      },
      {
        type: "quote",
        quote: "Veel bedrijven combineren beide vormen om flexibel én stabiel te blijven.",
        variant: "insight"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wat betekent dit voor horecaondernemers?"
      },
      {
        type: "paragraph",
        content: "In de horeca zien wij dat uitzenden vaak de voorkeur heeft. De sector vraagt om snelle oplossingen, flexibiliteit en het kunnen opvangen van onverwachte drukte."
      },
      {
        type: "highlight",
        variant: "info",
        title: "Detachering kan interessant zijn bij",
        content: "Keukenpersoneel voor langere periodes, managementfuncties, of structurele ondersteuning tijdens seizoenen."
      },
      {
        type: "relatedLink",
        href: "/blog/personeelstekort-horeca-oplossen",
        text: "Lees ook: Personeelstekort in de horeca oplossen"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Waar moet u op letten?"
      },
      {
        type: "checklist",
        title: "Welke vorm u ook kiest, let altijd op",
        variant: "steps",
        items: [
          { text: "Duidelijke afspraken" },
          { text: "Transparante tarieven" },
          { text: "Correcte naleving van wet- en regelgeving" },
          { text: "Betrouwbare partners" }
        ]
      },
      {
        type: "quote",
        quote: "Wij zien dat samenwerken met een gespecialiseerde partij veel risico's wegneemt en zorgt voor rust.",
        variant: "highlight"
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samengevat",
        points: [
          "Detachering en uitzenden zijn beide waardevolle oplossingen, mits ze op de juiste manier worden ingezet",
          "Uitzenden biedt maximale flexibiliteit en snelheid",
          "Detachering zorgt voor continuïteit en stabiliteit",
          "In veel gevallen is een combinatie van beide de meest effectieve oplossing"
        ]
      },
      {
        type: "cta",
        title: "Hulp nodig bij uw keuze?",
        description: "Twijfelt u tussen detachering en uitzenden? Wij denken graag met u mee en kijken naar wat het beste past bij uw personeelsbehoefte.",
        primaryLink: { href: "/contact", text: "Neem contact op" },
        secondaryLink: { href: "/personeel-aanvragen", text: "Vraag direct personeel aan" },
        variant: "dark"
      }
    ]
  },

  // ============================================================
  // ARTICLE 7: Horecamedewerker worden zonder ervaring
  // ============================================================
  "horecamedewerker-worden-zonder-ervaring": {
    title: "Horecamedewerker worden zonder ervaring: zo begin je",
    excerpt: "Wil je in de horeca werken maar heb je geen ervaring? Wij leggen uit hoe je kunt starten.",
    category: "Carrière",
    author: "TopTalent Team",
    date: "1 december 2024",
    datePublished: "2024-12-01",
    image: "/images/blog-horecamedewerker-zonder-ervaring.jpg",
    relatedSlugs: ["werken-uitzendkracht-horeca-salaris", "meest-gevraagde-horecafuncties-nederland"],
    blocks: [
      {
        type: "paragraph",
        content: "De horeca is een van de weinige branches waar je zonder diploma of werkervaring kunt starten. Wat je nodig hebt: motivatie, een gastvrije instelling en de bereidheid om te leren."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Waarom de horeca perfect is voor starters"
      },
      {
        type: "checklist",
        variant: "benefits",
        items: [
          { text: "**Lage instapdrempel** — Geen diploma vereist voor veel functies" },
          { text: "**Direct aan de slag** — Geen lange sollicitatieprocedures" },
          { text: "**Leren op de werkvloer** — Ervaring doe je al werkend op" },
          { text: "**Sociale contacten** — Leuke collega's en gasten" },
          { text: "**Flexibele uren** — Combineerbaar met studie of andere verplichtingen" },
          { text: "**Doorgroeimogelijkheden** — Van bediening naar leidinggevende" }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Functies voor beginners"
      },
      {
        type: "heading3",
        content: "Afwasser"
      },
      {
        type: "paragraph",
        content: "De perfecte startersfunctie. Je leert de keuken kennen en kunt doorgroeien naar keukenhulp of kok."
      },
      {
        type: "heading3",
        content: "Runner"
      },
      {
        type: "paragraph",
        content: "Je brengt borden van de keuken naar de bediening. Goed om de gang van zaken te leren."
      },
      {
        type: "heading3",
        content: "Medewerker bediening"
      },
      {
        type: "paragraph",
        content: "Met een korte training kun je snel zelfstandig werken als medewerker bediening."
      },
      {
        type: "heading3",
        content: "Barback"
      },
      {
        type: "paragraph",
        content: "Je ondersteunt de bartender en leert alles over de bar."
      },
      {
        type: "heading3",
        content: "Cateringmedewerker"
      },
      {
        type: "paragraph",
        content: "Bij evenementen is vaak extra personeel nodig. Perfecte manier om ervaring op te doen."
      },
      {
        type: "relatedLink",
        href: "/blog/meest-gevraagde-horecafuncties-nederland",
        text: "Bekijk alle populaire horecafuncties"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Tips om te starten"
      },
      {
        type: "timeline",
        title: "Stappenplan voor beginners",
        steps: [
          { title: "Schrijf je in bij een uitzendbureau", description: "Bij TopTalent geven we ook starters een kans. We kijken naar motivatie en persoonlijkheid — niet alleen naar ervaring." },
          { title: "Wees eerlijk", description: "Geef aan dat je nieuw bent maar graag wilt leren. De meeste werkgevers waarderen dat." },
          { title: "Begin klein", description: "Start met een paar diensten per week om te wennen aan het werk." },
          { title: "Vraag om feedback", description: "Laat merken dat je wilt verbeteren en sta open voor tips." },
          { title: "Observeer ervaren collega's", description: "Kijk hoe zij werken en stel vragen als je iets niet weet." }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wat kun je verwachten?"
      },
      {
        type: "paragraph",
        content: "De eerste diensten kunnen spannend zijn. Je leert:"
      },
      {
        type: "list",
        items: [
          "Hoe de zaak werkt",
          "Waar alles staat",
          "Hoe je met gasten omgaat",
          "De basishandelingen van je functie"
        ]
      },
      {
        type: "quote",
        quote: "Na een paar diensten voel je je al veel zekerder. De meeste mensen zijn binnen een maand ingewerkt.",
        variant: "insight"
      },
      {
        type: "relatedLink",
        href: "/blog/werken-uitzendkracht-horeca-salaris",
        text: "Lees ook: Wat verdien je als uitzendkracht in de horeca?"
      },
      {
        type: "divider"
      },
      {
        type: "cta",
        title: "Direct starten?",
        description: "Bij TopTalent kun je je kosteloos inschrijven. Wij helpen je aan je eerste horecabaan — ook zonder ervaring.",
        primaryLink: { href: "/inschrijven", text: "Schrijf je in" },
        secondaryLink: { href: "/contact", text: "Neem contact op" },
        variant: "orange"
      }
    ]
  },

  // ============================================================
  // ARTICLE 8: Meest gevraagde horecafuncties
  // ============================================================
  "meest-gevraagde-horecafuncties-nederland": {
    title: "De 10 meest gevraagde horecafuncties in Nederland",
    excerpt: "Ontdek de 10 meest gevraagde horecafuncties in Nederland. Van barista tot sous-chef. Inclusief trends en tips.",
    category: "Carrière",
    author: "TopTalent Team",
    date: "28 november 2024",
    datePublished: "2024-11-28",
    image: "/images/blog-meest-gevraagde-functies.jpg",
    relatedSlugs: ["werken-uitzendkracht-horeca-salaris", "horecamedewerker-worden-zonder-ervaring"],
    blocks: [
      {
        type: "paragraph",
        content: "De Nederlandse horeca draait op mensen. Toch zien wij dagelijks hoe lastig het is om de juiste medewerkers te vinden. Sommige functies zijn structureel moeilijk in te vullen, terwijl de vraag alleen maar toeneemt."
      },
      {
        type: "relatedLink",
        href: "/blog/personeelstekort-horeca-oplossen",
        text: "Lees ook: Personeelstekort in de horeca oplossen"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "1 · Bedieningsmedewerker"
      },
      {
        type: "paragraph",
        content: "De bedieningsmedewerker blijft de meest gevraagde horecafunctie. Gastvrijheid, overzicht en snelheid zijn hierbij essentieel."
      },
      {
        type: "highlight",
        variant: "info",
        title: "Waarom veel gevraagd",
        content: "Direct contact met gasten, onmisbaar tijdens piekuren, groot tekort aan ervaren krachten."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "2 · Bartender"
      },
      {
        type: "paragraph",
        content: "Van cocktailbars tot festivals: goede bartenders zijn schaars. Wij merken dat opdrachtgevers vooral zoeken naar mensen die snelheid combineren met kwaliteit."
      },
      {
        type: "checklist",
        title: "Belangrijkste vaardigheden",
        variant: "benefits",
        items: [
          { text: "Snel en nauwkeurig werken" },
          { text: "Drankkennis" },
          { text: "Gastgerichtheid" }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "3 · Barista"
      },
      {
        type: "paragraph",
        content: "De vraag naar barista's blijft groeien, vooral bij koffiebars en lunchzaken."
      },
      {
        type: "highlight",
        variant: "tip",
        title: "Waarom populair",
        content: "Gespecialiseerde functie, klanten verwachten kwaliteit, veel vraag in stedelijke gebieden."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "4 · Zelfstandig werkend kok"
      },
      {
        type: "paragraph",
        content: "Een goede kok is goud waard. Wij zien dat zelfstandig werkend koks continu worden gezocht."
      },
      {
        type: "highlight",
        variant: "warning",
        title: "Waarom moeilijk te vinden",
        content: "Hoge werkdruk, veel verantwoordelijkheid, ervaring vereist."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "5 · Sous-chef"
      },
      {
        type: "paragraph",
        content: "De sous-chef ondersteunt de chef-kok en houdt overzicht in de keuken. Cruciaal voor continuïteit."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "6 · Afwasser / keukenhulp"
      },
      {
        type: "paragraph",
        content: "Hoewel vaak onderschat, is deze functie essentieel. Zonder afwassers en keukenhulpen loopt een keuken vast — een uitstekende instapfunctie."
      },
      {
        type: "relatedLink",
        href: "/blog/horecamedewerker-worden-zonder-ervaring",
        text: "Lees ook: Horecamedewerker worden zonder ervaring"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "7 · Allround horecamedewerker"
      },
      {
        type: "paragraph",
        content: "Flexibiliteit is belangrijk in de horeca. Allround medewerkers die meerdere taken aankunnen, zijn daarom zeer gewild."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "8 · Floormanager / shiftleader"
      },
      {
        type: "paragraph",
        content: "Goede aansturing op de werkvloer maakt het verschil. Floormanagers zorgen voor structuur en overzicht."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "9 · Evenementenmedewerker"
      },
      {
        type: "paragraph",
        content: "Festivals, beurzen en grote evenementen blijven groeien. Hierdoor is de vraag naar tijdelijke evenementenmedewerkers groot."
      },
      {
        type: "relatedLink",
        href: "/blog/evenementenpersoneel-inhuren-checklist",
        text: "Bekijk onze checklist voor evenementenpersoneel"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "10 · Hotelmedewerker (front office & F&B)"
      },
      {
        type: "paragraph",
        content: "Hotels zoeken continu personeel voor receptie en food & beverage. Vooral flexibel inzetbare medewerkers zijn populair."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "De rode draad"
      },
      {
        type: "quote",
        quote: "Flexibiliteit, gastgerichtheid en ervaring — dat is waar ondernemers naar zoeken. Medewerkers die snel inzetbaar zijn en weten wat er van hen verwacht wordt.",
        variant: "highlight"
      },
      {
        type: "relatedLink",
        href: "/locaties",
        text: "Bekijk waar wij horecapersoneel leveren"
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samenvatting",
        points: [
          "De vraag naar goed horecapersoneel blijft in 2025 onverminderd groot",
          "Vooral de functies in deze top 10 zijn lastig in te vullen",
          "Bedrijven die tijdig schakelen en flexibel omgaan met personeel zijn beter voorbereid"
        ]
      },
      {
        type: "cta",
        title: "Personeel nodig of aan de slag in de horeca?",
        description: "Voor werkgevers: vraag direct personeel aan. Wil je zelf werken in de horeca? Schrijf je in!",
        primaryLink: { href: "/personeel-aanvragen", text: "Personeel aanvragen" },
        secondaryLink: { href: "/inschrijven", text: "Schrijf je in" },
        variant: "orange"
      }
    ]
  },

  // ============================================================
  // ARTICLE 9: Restaurant openen team samenstellen
  // ============================================================
  "restaurant-openen-team-samenstellen": {
    title: "Restaurant openen? Zo stel je het perfecte team samen",
    excerpt: "Een nieuw restaurant openen begint met het juiste team. Wij delen tips voor de samenstelling.",
    category: "Management",
    author: "TopTalent Team",
    date: "25 november 2024",
    datePublished: "2024-11-25",
    image: "/images/blog-restaurant-openen.jpg",
    relatedSlugs: ["horecapersoneel-inhuren-gids-2025", "meest-gevraagde-horecafuncties-nederland"],
    blocks: [
      {
        type: "paragraph",
        content: "Een nieuw restaurant openen is spannend, maar ook uitdagend. Naast een goed concept, locatie en financiering is uw team misschien wel de belangrijkste succesfactor."
      },
      {
        type: "quote",
        quote: "Met de juiste mensen om u heen kan uw restaurant floreren.",
        variant: "highlight"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Het kernteam · Vanaf de start"
      },
      {
        type: "heading3",
        content: "Chef-kok of Hoofdkok"
      },
      {
        type: "paragraph",
        content: "De creatieve motor achter uw keuken. Verantwoordelijk voor het menu, inkoop en kwaliteit."
      },
      {
        type: "highlight",
        variant: "info",
        content: "Salaris indicatie: €2.800 – €4.500 bruto per maand"
      },
      {
        type: "heading3",
        content: "Bedrijfsleider / Manager"
      },
      {
        type: "paragraph",
        content: "Runt de dagelijkse operatie, aanspreekpunt voor personeel en gasten."
      },
      {
        type: "highlight",
        variant: "info",
        content: "Salaris indicatie: €2.500 – €3.800 bruto per maand"
      },
      {
        type: "heading3",
        content: "Souschef"
      },
      {
        type: "paragraph",
        content: "Rechterhand van de chef, neemt over bij afwezigheid."
      },
      {
        type: "highlight",
        variant: "info",
        content: "Salaris indicatie: €2.200 – €3.200 bruto per maand"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Het operationele team"
      },
      {
        type: "heading3",
        content: "Bediening"
      },
      {
        type: "list",
        items: [
          "1 medewerker per 15-20 zitplaatsen (lunch)",
          "1 medewerker per 10-15 zitplaatsen (diner)"
        ]
      },
      {
        type: "heading3",
        content: "Keukenmedewerkers"
      },
      {
        type: "list",
        items: [
          "Afhankelijk van uw menukaart en volume",
          "Start met minimaal 2 krachten naast de chef"
        ]
      },
      {
        type: "heading3",
        content: "Afwas"
      },
      {
        type: "paragraph",
        content: "Minimaal 1 persoon tijdens drukke diensten."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Hoeveel personeel heeft u nodig?"
      },
      {
        type: "paragraph",
        content: "Een vuistregel voor een restaurant met 50 zitplaatsen:"
      },
      {
        type: "table",
        headers: ["Functie", "Aantal (FTE)"],
        rows: [
          ["Chef-kok", "1"],
          ["Souschef", "1"],
          ["Koks/keukenhulp", "2-3"],
          ["Bediening", "4-6"],
          ["Afwas", "1-2"],
          ["Manager", "1"]
        ]
      },
      {
        type: "relatedLink",
        href: "/blog/meest-gevraagde-horecafuncties-nederland",
        text: "Bekijk alle populaire horecafuncties"
      },
      {
        type: "relatedLink",
        href: "/kosten-calculator",
        text: "Bereken wat horecapersoneel kost voor uw restaurant"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Tips voor de teamsamenstelling"
      },
      {
        type: "timeline",
        steps: [
          { title: "Begin op tijd met werven", description: "Start minimaal 2-3 maanden voor opening met het zoeken naar personeel. Goede mensen zijn schaars." },
          { title: "Investeer in training", description: "Neem tijd om uw team te trainen vóór de opening. Dit voorkomt opstartproblemen." },
          { title: "Zoek mensen die passen bij uw concept", description: "Een fine dining restaurant vraagt ander personeel dan een casual eetcafé." },
          { title: "Combineer ervaring met enthousiasme", description: "Een mix van ervaren krachten en gemotiveerde starters werkt vaak goed." },
          { title: "Overweeg flexibel personeel", description: "Gebruik uitzendkrachten voor de opstartfase of drukke periodes." }
        ]
      },
      {
        type: "relatedLink",
        href: "/blog/horecapersoneel-inhuren-gids-2025",
        text: "Lees onze complete inhuur gids"
      },
      {
        type: "divider"
      },
      {
        type: "cta",
        title: "Hulp nodig bij het vinden van personeel?",
        description: "Wij helpen nieuwe horecaondernemers met het samenstellen van hun team. Van chef-kok tot afwasser — wij hebben de juiste mensen.",
        primaryLink: { href: "/contact", text: "Neem contact op" },
        secondaryLink: { href: "/diensten/recruitment", text: "Bekijk onze recruitment dienst" },
        variant: "dark"
      }
    ]
  },

  // ============================================================
  // ARTICLE 10: Seizoenspersoneel horeca zomer
  // ============================================================
  "seizoenspersoneel-horeca-zomer": {
    title: "Seizoenspersoneel horeca: voorbereid op de zomer",
    excerpt: "De zomer betekent terrassen en drukte. Wij delen tips voor het tijdig werven van seizoenspersoneel.",
    category: "Uitzenden",
    author: "TopTalent Team",
    date: "22 november 2024",
    datePublished: "2024-11-22",
    image: "/images/blog-seizoenspersoneel.jpg",
    relatedSlugs: ["personeelstekort-horeca-oplossen", "horecapersoneel-inhuren-gids-2025"],
    blocks: [
      {
        type: "paragraph",
        content: "De zomermaanden zijn voor veel horecazaken de drukste periode van het jaar. Terrassen stromen vol, toeristen komen langs en evenementen volgen elkaar op."
      },
      {
        type: "highlight",
        variant: "warning",
        content: "Zonder voldoende personeel kunt u deze kansen niet optimaal benutten."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Tijdlijn voor seizoenspersoneel"
      },
      {
        type: "timeline",
        title: "Wanneer wat regelen?",
        steps: [
          { title: "Februari – Maart", description: "Bepaal uw personeelsbehoefte, neem contact op met uitzendbureaus, plaats vacatures." },
          { title: "April", description: "Voer sollicitatiegesprekken, selecteer kandidaten, start met contracten." },
          { title: "Mei", description: "Inwerken van nieuwe medewerkers, training en kennismaking met het team." },
          { title: "Juni – Augustus", description: "Zomerseizoen: alle hens aan dek." }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        content: "Begin vroeg. Goede seizoenskrachten zijn snel weg."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Hoeveel extra personeel heeft u nodig?"
      },
      {
        type: "paragraph",
        content: "Een indicatie voor de zomermaanden:"
      },
      {
        type: "table",
        headers: ["Situatie", "Extra personeel"],
        rows: [
          ["Terras", "+50-100% bediening"],
          ["Strandtent", "Vaak volledig seizoensteam"],
          ["Restaurant toeristisch gebied", "+30-50%"],
          ["Evenementen/festivals", "Projectmatig"]
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Voordelen van seizoenspersoneel via een uitzendbureau"
      },
      {
        type: "checklist",
        variant: "benefits",
        items: [
          { text: "**Flexibiliteit** — Schaal makkelijk op en af op basis van het weer en drukte" },
          { text: "**Geen vaste lasten** — U betaalt alleen voor gewerkte uren" },
          { text: "**Snel beschikbaar** — Uitzendkrachten kunnen vaak op korte termijn starten" },
          { text: "**Minder administratie** — Het uitzendbureau regelt contracten, loon en verzekeringen" }
        ]
      },
      {
        type: "relatedLink",
        href: "/diensten/uitzenden",
        text: "Meer over uitzenden in de horeca"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Tips voor succesvol werken met seizoenspersoneel"
      },
      {
        type: "checklist",
        title: "Best practices",
        variant: "steps",
        items: [
          { text: "**Zorg voor goede onboarding** — Ook tijdelijke krachten hebben een degelijke inwerkperiode nodig" },
          { text: "**Creëer een prettige werksfeer** — Seizoenswerkers die zich welkom voelen, presteren beter" },
          { text: "**Bied doorgroeikansen** — Goede seizoenskrachten kunt u wellicht behouden voor vast werk" },
          { text: "**Communiceer duidelijk** — Bespreek verwachtingen, roosters en huisregels vooraf" },
          { text: "**Plan vooruit** — Wacht niet tot het laatste moment met werven" }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wat zoeken seizoenswerkers?"
      },
      {
        type: "list",
        items: [
          "Flexibele roosters",
          "Leuke werksfeer",
          "Eerlijk loon",
          "Mogelijkheid om veel uren te maken",
          "Eventueel kost en inwoning"
        ]
      },
      {
        type: "relatedLink",
        href: "/blog/werken-uitzendkracht-horeca-salaris",
        text: "Lees ook: Wat verdien je als uitzendkracht?"
      },
      {
        type: "divider"
      },
      {
        type: "cta",
        title: "Klaar voor het seizoen?",
        description: "Wij hebben een groot netwerk van ervaren horecamedewerkers die beschikbaar zijn voor seizoenswerk. Neem tijdig contact op voor de beste selectie.",
        primaryLink: { href: "/contact", text: "Neem contact op" },
        secondaryLink: { href: "/personeel-aanvragen", text: "Vraag personeel aan" },
        variant: "orange"
      }
    ]
  },

  // ============================================================
  // ARTICLE 11: CAO Horeca 2025 wijzigingen
  // ============================================================
  "cao-horeca-2025-wijzigingen": {
    title: "CAO Horeca 2025: dit verandert er voor werkgevers",
    excerpt: "De nieuwe CAO Horeca brengt veranderingen in salaris, toeslagen en arbeidsvoorwaarden. Wij leggen uit wat u als werkgever moet weten.",
    category: "HR",
    author: "TopTalent Team",
    date: "20 november 2024",
    datePublished: "2024-11-20",
    image: "/images/blog-cao-horeca.jpg",
    relatedSlugs: ["horecapersoneel-inhuren-gids-2025"],
    blocks: [
      {
        type: "paragraph",
        content: "Als horecaondernemer heeft u te maken met regels voor arbeidsvoorwaarden en lonen die regelmatig veranderen."
      },
      {
        type: "highlight",
        variant: "info",
        title: "CAO Horeca 2025–2026",
        content: "Voor 2025 is er een nieuwe Collectieve Arbeidsovereenkomst (CAO) Horeca afgesproken die loopt van 1 januari 2025 tot en met 31 december 2026. Deze cao bevat belangrijke wijzigingen die direct effect hebben op uw personeelsbeleid en arbeidskosten."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wat is de CAO Horeca 2025–2026?"
      },
      {
        type: "paragraph",
        content: "De Horeca-CAO is een collectieve arbeidsovereenkomst tussen werkgevers- en werknemersorganisaties. Deze cao bepaalt:"
      },
      {
        type: "list",
        items: [
          "Minimumlonen en loonsverhogingen",
          "Arbeidsvoorwaarden",
          "Functiegroepen",
          "Werktijden en meer"
        ]
      },
      {
        type: "highlight",
        variant: "warning",
        content: "Vanaf 2 augustus 2025 is de cao algemeen verbindend verklaard — ook voor werkgevers die niet bij de cao-onderhandelende organisaties zijn aangesloten."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "1 · Loonsverhogingen"
      },
      {
        type: "paragraph",
        content: "De afgesproken loonsverhogingen voor 2025 en 2026:"
      },
      {
        type: "table",
        headers: ["Datum", "Verhoging"],
        rows: [
          ["1 januari 2025", "ca. 2,5%"],
          ["1 juli 2025", "ca. 1%"],
          ["1 januari 2026", "ca. 2,5%"]
        ]
      },
      {
        type: "highlight",
        variant: "info",
        title: "Wettelijk minimumloon",
        content: "Vanaf 1 juli 2025 bedraagt het minimumuurloon €14,40 bruto voor werknemers vanaf 21 jaar."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "2 · Transparantere loonstructuur"
      },
      {
        type: "paragraph",
        content: "De vernieuwde cao maakt de structuur van functiegroepen en loonschalen transparanter. Dit helpt werkgevers én medewerkers om beter te begrijpen:"
      },
      {
        type: "list",
        items: [
          "Welke functie in welke loonschaal hoort",
          "Wat de doorgroeimogelijkheden zijn"
        ]
      },
      {
        type: "quote",
        quote: "Dit kan bijdragen aan personeelsbinding en minder verloop.",
        variant: "insight"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "3 · Loyaliteitsverlof"
      },
      {
        type: "paragraph",
        content: "Werknemers die langer dan 10 jaar in dienst zijn, kunnen extra verlofuren opbouwen als beloning voor hun loyaliteit."
      },
      {
        type: "highlight",
        variant: "tip",
        content: "Daarnaast krijgen werknemers meer inspraak over het opnemen van meeruren en overwerk."
      },
      {
        type: "relatedLink",
        href: "/blog/horeca-personeelsplanning-rooster-tips",
        text: "Tips voor efficiënte personeelsplanning"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "4 · Verhoogde stagevergoeding"
      },
      {
        type: "paragraph",
        content: "Vanaf 1 januari 2025 geldt een verhoogde minimum stagevergoeding:"
      },
      {
        type: "stats",
        stats: [
          { value: "€400", label: "bruto per maand voor fulltime stage" }
        ]
      },
      {
        type: "highlight",
        variant: "warning",
        content: "Controleer of uw stagevergoedingen voldoen aan de nieuwe cao-normen."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "5 · Werk-privébalans"
      },
      {
        type: "paragraph",
        content: "De cao geeft medewerkers meer mogelijkheden om zelf mee te denken over wanneer zij overuren opnemen."
      },
      {
        type: "highlight",
        variant: "tip",
        content: "Voor werkgevers betekent dit meer aandacht voor planning en communicatie — u behoudt de regie, maar moet rekening houden met verzoeken van medewerkers."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Praktische tips"
      },
      {
        type: "checklist",
        title: "Wij adviseren horecaondernemers om",
        variant: "checklist",
        items: [
          { text: "Tijdig de loonadministratie aan te passen", checked: false },
          { text: "Functieomschrijvingen te toetsen aan de nieuwe structuur", checked: false },
          { text: "Stagevergoedingen te actualiseren", checked: false },
          { text: "Rooster- en urenprocessen te evalueren", checked: false }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Uitzendkrachten en de CAO"
      },
      {
        type: "paragraph",
        content: "Ook voor uitzendkrachten geldt de inlenersbeloning: zij hebben recht op dezelfde beloning als uw vaste personeel."
      },
      {
        type: "quote",
        quote: "Bij samenwerking met een gespecialiseerd horeca-uitzendbureau hoeft u zich hier geen zorgen over te maken — wij zorgen dat alle cao-bepalingen correct worden toegepast.",
        variant: "insight"
      },
      {
        type: "relatedLink",
        href: "/kosten-calculator",
        text: "Bereken wat horecapersoneel kost inclusief CAO-tarieven"
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samengevat",
        points: [
          "Periodieke loonsverhogingen (2,5% + 1% in 2025)",
          "Transparantere functie- en loonstructuur",
          "Extra verlofregelingen voor loyale medewerkers",
          "Hogere stagevergoedingen (€400/maand)",
          "Tijdig doorvoeren in loonadministratie en personeelsbeleid"
        ]
      },
      {
        type: "cta",
        title: "Hulp nodig?",
        description: "Heeft u vragen over de CAO of zoekt u flexibel horecapersoneel dat correct wordt verloond? Wij helpen u graag.",
        primaryLink: { href: "/personeel-aanvragen", text: "Vraag personeel aan" },
        secondaryLink: { href: "/contact", text: "Neem contact op" },
        variant: "dark"
      },
      {
        type: "paragraph",
        content: "*Bronnen: Koninklijke Horeca Nederland (KHN), Horecava.nl*"
      }
    ]
  },

  // ============================================================
  // ARTICLE 12: Horeca personeelsplanning rooster tips
  // ============================================================
  "horeca-personeelsplanning-rooster-tips": {
    title: "Horeca personeelsplanning: tips voor een efficiënt rooster",
    excerpt: "Wij delen praktische tips voor een efficiënte personeelsplanning in de horeca. Bespaar kosten en voorkom stress.",
    category: "Management",
    author: "TopTalent Team",
    date: "18 november 2024",
    datePublished: "2024-11-18",
    image: "/images/blog-personeelsplanning.jpg",
    relatedSlugs: ["personeelstekort-horeca-oplossen", "seizoenspersoneel-horeca-zomer"],
    blocks: [
      {
        type: "paragraph",
        content: "Een goede personeelsplanning is één van de grootste uitdagingen in de horeca. Piekmomenten, wisselende beschikbaarheid, ziekte en last-minute wijzigingen — het maakt roosteren tot een vak apart."
      },
      {
        type: "highlight",
        variant: "warning",
        content: "Wij zien dagelijks wat een slechte planning kan aanrichten: stress op de werkvloer, onnodige kosten en ontevreden medewerkers. Maar we zien ook het tegenovergestelde. Een doordacht rooster brengt rust, grip en betere prestaties."
      },
      {
        type: "relatedLink",
        href: "/blog/horecapersoneel-inhuren-gids-2025",
        text: "Lees ook: Complete gids voor horecapersoneel inhuren"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Waarom personeelsplanning zo cruciaal is"
      },
      {
        type: "paragraph",
        content: "In de horeca draait alles om timing. Te weinig handen betekent lange wachttijden en ontevreden gasten. Te veel personeel leidt tot onnodige loonkosten."
      },
      {
        type: "table",
        headers: ["Voordeel", "Impact"],
        rows: [
          ["Kostenbesparing", "Minder overuren, efficiëntere inzet"],
          ["Minder stress", "Rust op de werkvloer"],
          ["Lager ziekteverzuim", "Minder uitval door overbelasting"],
          ["Hogere tevredenheid", "Gemotiveerde medewerkers"],
          ["Betere service", "Tevreden gasten"]
        ]
      },
      {
        type: "quote",
        quote: "Een efficiënt rooster is geen luxe — het is een voorwaarde voor succes.",
        variant: "highlight"
      },
      {
        type: "relatedLink",
        href: "/blog/personeelstekort-horeca-oplossen",
        text: "Lees ook: Personeelstekort in de horeca oplossen"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "1 · Breng piek- en dalmomenten in kaart"
      },
      {
        type: "paragraph",
        content: "De basis van elke goede planning begint bij inzicht. Welke momenten zijn structureel druk? Wanneer is het rustig?"
      },
      {
        type: "checklist",
        title: "Analyseer",
        variant: "checklist",
        items: [
          { text: "Drukke dagen en tijdstippen", checked: false },
          { text: "Seizoensinvloeden", checked: false },
          { text: "Geplande evenementen en reserveringen", checked: false },
          { text: "Historische omzetgegevens", checked: false }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        content: "Door deze data te combineren, plant u gerichter. U voorkomt structurele over- of onderbezetting — en dat scheelt direct in kosten."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "2 · Combineer vast en flexibel personeel"
      },
      {
        type: "paragraph",
        content: "De meest succesvolle horecabedrijven werken met een hybride model:"
      },
      {
        type: "checklist",
        variant: "benefits",
        items: [
          { text: "**Vaste kern** — voor continuïteit, bedrijfscultuur en kennisbehoud" },
          { text: "**Flexibele schil** — voor pieken, uitval en seizoensdrukte" }
        ]
      },
      {
        type: "quote",
        quote: "Via een horeca-uitzendbureau kunt u snel schakelen zonder uw vaste team te overbelasten. U behoudt rust in de planning én flexibiliteit wanneer nodig.",
        variant: "insight"
      },
      {
        type: "relatedLink",
        href: "/blog/detachering-vs-uitzenden-verschil",
        text: "Lees ook: Verschil tussen detachering en uitzenden"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "3 · Maak beschikbaarheid inzichtelijk"
      },
      {
        type: "paragraph",
        content: "Een veelvoorkomende oorzaak van planningsproblemen: onduidelijke beschikbaarheid. Wie kan wanneer?"
      },
      {
        type: "checklist",
        title: "Zorg ervoor dat",
        variant: "steps",
        items: [
          { text: "Medewerkers hun beschikbaarheid tijdig doorgeven" },
          { text: "Wijzigingen direct worden gecommuniceerd" },
          { text: "Iedereen toegang heeft tot het actuele rooster" }
        ]
      },
      {
        type: "quote",
        quote: "Duidelijke afspraken vooraf voorkomen misverstanden achteraf.",
        variant: "highlight"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "4 · Plan vooruit, maar blijf flexibel"
      },
      {
        type: "paragraph",
        content: "Een goede planning begint weken van tevoren. Maar in de horeca loopt het zelden precies zoals gepland."
      },
      {
        type: "checklist",
        title: "Houd daarom altijd rekening met",
        variant: "checklist",
        items: [
          { text: "Ziekmeldingen", checked: true },
          { text: "Onverwachte drukte", checked: true },
          { text: "Last-minute reserveringen", checked: true }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        content: "Door een flexibele buffer achter de hand te houden, blijft u in control — ook als het onverwacht druk wordt."
      },
      {
        type: "relatedLink",
        href: "/blog/seizoenspersoneel-horeca-zomer",
        text: "Lees ook: Seizoenspersoneel in de horeca"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "5 · Zorg voor de juiste mix per dienst"
      },
      {
        type: "paragraph",
        content: "Niet elke dienst vraagt om dezelfde vaardigheden. Let bij het plannen niet alleen op aantallen, maar ook op functies en ervaring."
      },
      {
        type: "table",
        headers: ["Moment", "Bezetting"],
        rows: [
          ["Piekmomenten", "Ervaren, snelle krachten"],
          ["Rustige momenten", "Allround medewerkers"],
          ["Kritieke diensten", "Leidinggevende aanwezig"]
        ]
      },
      {
        type: "quote",
        quote: "De juiste persoon op de juiste plek maakt het verschil.",
        variant: "highlight"
      },
      {
        type: "relatedLink",
        href: "/blog/meest-gevraagde-horecafuncties-nederland",
        text: "Lees ook: Meest gevraagde horecafuncties"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "6 · Houd rekening met werk-privébalans"
      },
      {
        type: "paragraph",
        content: "Medewerkers die structureel overbelast worden, vallen eerder uit. Dat kost meer dan een goed rooster."
      },
      {
        type: "checklist",
        title: "Een eerlijke planning houdt rekening met",
        variant: "benefits",
        items: [
          { text: "Voldoende rusttijd tussen diensten" },
          { text: "Eerlijke verdeling van weekenden" },
          { text: "Afwisseling in shifts" }
        ]
      },
      {
        type: "quote",
        quote: "Tevreden medewerkers blijven langer. En dat bespaart wervingskosten.",
        variant: "insight"
      },
      {
        type: "relatedLink",
        href: "/blog/cao-horeca-2025-wijzigingen",
        text: "Let ook op: CAO Horeca 2025 regels"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "7 · Evalueer en optimaliseer regelmatig"
      },
      {
        type: "paragraph",
        content: "Geen enkele planning is perfect. Daarom is evalueren essentieel."
      },
      {
        type: "checklist",
        title: "Vraag uzelf na elke week af",
        variant: "checklist",
        items: [
          { text: "Wat ging goed?", checked: false },
          { text: "Waar liep het vast?", checked: false },
          { text: "Klopte de bezetting bij de drukte?", checked: false }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        content: "Door regelmatig bij te sturen, wordt uw planning steeds scherper. Kleine aanpassingen leiden tot grote verbeteringen."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Uitzendkrachten als flexibele buffer"
      },
      {
        type: "paragraph",
        content: "Niet elke dienst is voorspelbaar. Met uitzendkrachten als flexibele schil kunt u:"
      },
      {
        type: "checklist",
        variant: "benefits",
        items: [
          { text: "Snel opschalen bij onverwachte drukte" },
          { text: "Ziekteverzuim direct opvangen" },
          { text: "Piekmomenten professioneel managen" },
          { text: "Vakanties soepel overbruggen" }
        ]
      },
      {
        type: "quote",
        quote: "Flexibiliteit zonder de lasten van vast personeel.",
        variant: "highlight"
      },
      {
        type: "relatedLink",
        href: "/diensten/uitzenden",
        text: "Bekijk onze uitzendservice voor flexibele inzet"
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samenvatting",
        points: [
          "Analyseer uw piek- en dalmomenten voor gerichte planning",
          "Combineer vaste medewerkers met een flexibele schil",
          "Communiceer helder over beschikbaarheid en roosters",
          "Plan vooruit, maar houd ruimte voor aanpassingen",
          "Match de juiste mensen aan de juiste diensten",
          "Respecteer werk-privébalans om uitval te voorkomen",
          "Evalueer regelmatig en stuur bij waar nodig"
        ]
      },
      {
        type: "quote",
        quote: "Een goed rooster is geen einddoel — het is een doorlopend proces van verbeteren.",
        variant: "insight"
      },
      {
        type: "cta",
        title: "Wij helpen u graag verder",
        description: "Heeft u moeite met roosters, uitval of piekdrukte? Wij denken graag mee over een personeelsoplossing die past bij uw planning en bedrijfsvoering.",
        primaryLink: { href: "/personeel-aanvragen", text: "Personeel aanvragen" },
        secondaryLink: { href: "/contact", text: "Contact opnemen" },
        variant: "orange"
      }
    ]
  },

  // ============================================================
  // ARTICLE 12: Horecapersoneel kosten 2025
  // ============================================================
  "horecapersoneel-kosten-per-uur": {
    title: "Horecapersoneel kosten 2025: wat betaalt u écht per uur?",
    metaTitle: "Horecapersoneel kosten per uur 2025 | Tarieven",
    excerpt: "Wat kost horecapersoneel inhuren via een uitzendbureau, als zzp'er of in vaste dienst? Wij vergelijken de werkelijke kosten per uur inclusief bijkomende lasten.",
    category: "Kosten",
    author: "TopTalent Team",
    date: "14 mei 2025",
    datePublished: "2025-05-14",
    image: "/images/blog-horecapersoneel-inhuren.jpg",
    relatedSlugs: ["horecapersoneel-inhuren-gids-2025", "cao-horeca-2025-wijzigingen"],
    blocks: [
      {
        type: "paragraph",
        content: "Een van de meest gestelde vragen die wij krijgen: wat kost horecapersoneel inhuren? Het antwoord is niet één getal. De kosten hangen af van de functie, de contractvorm, de ervaring en het moment van inzet."
      },
      {
        type: "paragraph",
        content: "In dit artikel zetten wij de werkelijke kosten per uur uiteen — inclusief bijkomende lasten die vaak worden vergeten. Zo kunt u een eerlijke vergelijking maken tussen uitzendkrachten, zzp'ers en vast personeel."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Tarieven per functie in 2025"
      },
      {
        type: "paragraph",
        content: "Onderstaande tarieven zijn gebaseerd op marktgemiddelden voor uitzendkrachten in de horeca. De tarieven zijn all-in: loon, vakantiegeld, pensioen, verzekeringen en administratie zijn inbegrepen."
      },
      {
        type: "priceTable",
        title: "Indicatie uurtarieven horecapersoneel · 2025",
        rows: [
          { item: "Bedieningsmedewerker", price: "€25 – €32", note: "per uur" },
          { item: "Bartender", price: "€26 – €34", note: "per uur" },
          { item: "Zelfstandig werkend kok", price: "€30 – €42", note: "per uur" },
          { item: "Sous-chef", price: "€35 – €48", note: "per uur" },
          { item: "Afwasser / keukenhulp", price: "€22 – €28", note: "per uur" },
          { item: "Barista", price: "€24 – €30", note: "per uur" },
          { item: "Gastheer/gastvrouw", price: "€25 – €32", note: "per uur" },
          { item: "Evenementenmedewerker", price: "€25 – €35", note: "per uur" }
        ],
        footer: "Tarieven zijn indicatief en variëren per regio, ervaring en inzetmoment (avond/weekend toeslagen)."
      },
      {
        type: "highlight",
        variant: "info",
        title: "All-in tarief",
        content: "Bij een uitzendbureau zijn de tarieven all-in. Dat betekent: brutoloon, vakantiegeld (8%), pensioen, sociale premies, verzekeringen en administratie zijn inbegrepen. U betaalt één transparant uurtarief."
      },
      {
        type: "relatedLink",
        href: "/kosten-calculator",
        text: "Bereken direct wat horecapersoneel kost voor uw situatie"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Vergelijking: uitzendkracht vs. vast personeel vs. zzp'er"
      },
      {
        type: "paragraph",
        content: "Het uurtarief van een uitzendkracht lijkt hoger dan het brutoloon van een vaste medewerker. Maar als u alle werkgeverskosten meetelt, valt het verschil kleiner uit dan verwacht."
      },
      {
        type: "heading3",
        content: "Werkelijke kosten vast personeel"
      },
      {
        type: "paragraph",
        content: "Naast het brutoloon betaalt u als werkgever circa 25-35% aan aanvullende kosten:"
      },
      {
        type: "checklist",
        title: "Bijkomende werkgeverskosten",
        variant: "checklist",
        items: [
          { text: "Vakantiegeld (8%)", checked: true },
          { text: "Pensioenpremie (circa 6-8%)", checked: true },
          { text: "Sociale premies en werkgeversheffingen (circa 15-20%)", checked: true },
          { text: "Doorbetaling bij ziekte (tot 2 jaar)", checked: true },
          { text: "Vakantiedagen en feestdagen", checked: true },
          { text: "Werving, inwerken en verloop", checked: true }
        ]
      },
      {
        type: "comparison",
        title: "Kostenvergelijking per uur · Bedieningsmedewerker",
        headers: ["Kostenpost", "Uitzendkracht", "Vast personeel"],
        rows: [
          { feature: "Brutoloon", optionA: "Inbegrepen", optionB: "€14 – €17" },
          { feature: "Vakantiegeld (8%)", optionA: "Inbegrepen", optionB: "+ €1,10 – €1,35" },
          { feature: "Sociale premies", optionA: "Inbegrepen", optionB: "+ €2,50 – €3,50" },
          { feature: "Pensioen", optionA: "Inbegrepen", optionB: "+ €0,85 – €1,35" },
          { feature: "Ziekteverzuim risico", optionA: "Inbegrepen", optionB: "Eigen risico" },
          { feature: "Werving en administratie", optionA: "Inbegrepen", optionB: "Eigen kosten" },
          { feature: "Totaal per uur", optionA: "€25 – €32", optionB: "€19 – €24 + risico's" }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        title: "Wanneer is vast personeel goedkoper?",
        content: "Bij structurele inzet van meer dan 32 uur per week, minimaal 6 maanden. Hoe hoger het aantal vaste uren, hoe voordeliger vast personeel. Voor piekdrukte, seizoenswerk en flexibele inzet is uitzenden vrijwel altijd kostenefficiënter."
      },
      {
        type: "heading3",
        content: "Zzp'er in de horeca"
      },
      {
        type: "paragraph",
        content: "Zzp-tarieven liggen doorgaans tussen €20 en €35 per uur voor horecafuncties. Dat lijkt scherp, maar let op:"
      },
      {
        type: "checklist",
        title: "Aandachtspunten zzp'ers",
        variant: "checklist",
        items: [
          { text: "Geen verzekering bij uitval — u staat met lege handen", checked: true },
          { text: "Risico op schijnzelfstandigheid (Wet DBA)", checked: true },
          { text: "Geen vervanging bij ziekte of no-show", checked: true },
          { text: "Administratieve verplichtingen voor u als opdrachtgever", checked: true }
        ]
      },
      {
        type: "relatedLink",
        href: "/blog/cao-horeca-2025-wijzigingen",
        text: "Lees ook: CAO Horeca 2025 wijzigingen en tariefimpact"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Factoren die het tarief beïnvloeden"
      },
      {
        type: "paragraph",
        content: "Het exacte tarief hangt af van meerdere variabelen:"
      },
      {
        type: "list",
        items: [
          "**Functie en ervaring** — Een zelfstandig werkend kok kost meer dan een afwasser",
          "**Inzetmoment** — Avond-, weekend- en feestdagtoeslagen verhogen het tarief",
          "**Regio** — Tarieven in Amsterdam liggen gemiddeld 5-10% hoger dan in andere steden",
          "**Duur van de inzet** — Langdurige plaatsingen zijn per uur voordeliger",
          "**Seizoen** — In het hoogseizoen kan de vraag de tarieven opdrijven"
        ]
      },
      {
        type: "relatedLink",
        href: "/locaties",
        text: "Bekijk tarieven en beschikbaarheid per regio"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Veelgestelde vragen over kosten"
      },
      {
        type: "heading3",
        content: "Zijn er opstartkosten of inschrijfkosten?"
      },
      {
        type: "paragraph",
        content: "Nee. Bij TopTalent Jobs betaalt u alleen voor daadwerkelijk gewerkte uren. Er zijn geen inschrijfkosten, opstartkosten of verborgen fees."
      },
      {
        type: "heading3",
        content: "Wat als de uitzendkracht niet voldoet?"
      },
      {
        type: "paragraph",
        content: "Wij regelen kosteloos een vervanging. Dit is een van de voordelen ten opzichte van een vaste medewerker of zzp'er, waar u zelf verantwoordelijk bent voor het vinden van een alternatief."
      },
      {
        type: "heading3",
        content: "Kan ik een indicatie krijgen voor mijn situatie?"
      },
      {
        type: "paragraph",
        content: "Ja. Via onze kosten calculator kunt u zelf een indicatie berekenen. Voor een offerte op maat nemen wij graag persoonlijk contact met u op."
      },
      {
        type: "heading3",
        content: "Zijn de tarieven inclusief toeslagen?"
      },
      {
        type: "paragraph",
        content: "De genoemde tarieven zijn basistarieven. Voor avond-, weekend- en feestdagdiensten gelden toeslagen conform de CAO Horeca. Deze worden transparant meegerekend in uw factuur."
      },
      {
        type: "relatedLink",
        href: "/veelgestelde-vragen",
        text: "Meer veelgestelde vragen over tarieven en werkwijze"
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samenvatting",
        points: [
          "Uurtarieven voor horecapersoneel via een uitzendbureau liggen tussen €22 en €48, afhankelijk van functie en ervaring",
          "All-in tarieven van uitzendbureaus bevatten loon, premies, verzekeringen en administratie",
          "Vast personeel is goedkoper bij structurele, langdurige inzet — maar duurder bij ziekte, verloop en flexibele uren",
          "Zzp'ers lijken scherp geprijsd, maar brengen risico's mee rond verzekering, vervanging en wet- en regelgeving",
          "Het juiste model hangt af van uw personeelsbehoefte: vast, flex of een combinatie"
        ]
      },
      {
        type: "cta",
        title: "Bereken wat horecapersoneel kost",
        description: "Gebruik onze gratis calculator en ontvang binnen 2 minuten een helder kostenoverzicht voor uw situatie. Vergelijk vast, flex en zzp.",
        primaryLink: { href: "/kosten-calculator", text: "Kosten berekenen" },
        secondaryLink: { href: "/contact", text: "Offerte op maat" },
        variant: "orange"
      }
    ]
  },

  // ============================================================
  // ARTICLE 13: Last-minute horecapersoneel
  // ============================================================
  "last-minute-horecapersoneel": {
    title: "Last-minute horecapersoneel nodig? Zo regelt u het snel",
    excerpt: "Ziekmelding, no-show of onverwachte drukte? Zo regelt u op korte termijn betrouwbaar horecapersoneel zonder concessies aan kwaliteit.",
    category: "Uitzenden",
    author: "TopTalent Team",
    date: "14 mei 2025",
    datePublished: "2025-05-14",
    image: "/images/blog-personeelstekort.jpg",
    relatedSlugs: ["horecapersoneel-inhuren-gids-2025", "personeelstekort-horeca-oplossen"],
    blocks: [
      {
        type: "paragraph",
        content: "Het is vrijdagochtend, 10 uur. Uw chef-kok belt zich ziek. De reserveringslijst voor vanavond staat vol. U heeft binnen een paar uur een oplossing nodig."
      },
      {
        type: "paragraph",
        content: "Dit scenario is in de horeca eerder regel dan uitzondering. Wij zien het dagelijks: ziekmeldingen, no-shows, onverwachte drukte of een last-minute evenement dat erbij komt. De vraag is niet óf het gebeurt, maar hoe snel u kunt schakelen."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wanneer heeft u last-minute personeel nodig?"
      },
      {
        type: "paragraph",
        content: "De meest voorkomende situaties waarin horecaondernemers op korte termijn personeel zoeken:"
      },
      {
        type: "checklist",
        title: "Typische spoedscenario's",
        variant: "checklist",
        items: [
          { text: "Ziekmelding van een sleutelmedewerker (kok, bediening)", checked: true },
          { text: "No-show van een uitzendkracht of zzp'er", checked: true },
          { text: "Onverwacht grote reservering of groep", checked: true },
          { text: "Last-minute catering of evenement opdracht", checked: true },
          { text: "Uitval door persoonlijke omstandigheden", checked: true }
        ]
      },
      {
        type: "highlight",
        variant: "warning",
        title: "De kosten van leegstand",
        content: "Een dienst met te weinig personeel leidt niet alleen tot stress, maar ook tot lagere gasttevredenheid, langere wachttijden en in het ergste geval: omzetverlies. Het alternatief — een dienst sluiten — kost gemiddeld honderden tot duizenden euro's aan gederfde inkomsten."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Hoe regelt u snel horecapersoneel?"
      },
      {
        type: "heading3",
        content: "Stap 1: Neem direct contact op met een uitzendbureau"
      },
      {
        type: "paragraph",
        content: "Een gespecialiseerd horeca-uitzendbureau heeft een pool van gescreende medewerkers die direct beschikbaar zijn. Anders dan bij eigen werving of vacaturesites, hoeft u niet zelf te selecteren, contracten op te stellen of referenties te checken."
      },
      {
        type: "highlight",
        variant: "tip",
        title: "Hoe wij het aanpakken",
        content: "Bij TopTalent Jobs reageren wij binnen 15 minuten op spoedaanvragen. Wij matchen op functie, ervaring en locatie en bevestigen de inzet zo snel mogelijk. In veel gevallen is uw vervanging dezelfde dag nog op de werkvloer."
      },
      {
        type: "heading3",
        content: "Stap 2: Wees helder over uw behoefte"
      },
      {
        type: "paragraph",
        content: "Hoe duidelijker u communiceert, hoe sneller wij de juiste match vinden. Geef aan:"
      },
      {
        type: "list",
        items: [
          "Welke functie u nodig heeft (kok, bediening, afwas, bar)",
          "Wanneer de dienst begint en hoe lang deze duurt",
          "Locatie en eventuele parkeergelegenheid",
          "Dresscode of specifieke eisen (allergenen, talen)",
          "Of het een eenmalige of terugkerende inzet betreft"
        ]
      },
      {
        type: "heading3",
        content: "Stap 3: Briefing en ontvangst"
      },
      {
        type: "paragraph",
        content: "Een korte briefing bij aankomst maakt een groot verschil. Wijs de medewerker de werkplek, leg de huisregels uit en stel hem of haar voor aan het team. Ervaren uitzendkrachten zijn gewend snel mee te draaien, maar een warm welkom helpt altijd."
      },
      {
        type: "relatedLink",
        href: "/diensten/uitzenden",
        text: "Meer over onze uitzendservice en snelle beschikbaarheid"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Hoe voorkomt u spoedaanvragen?"
      },
      {
        type: "paragraph",
        content: "Last-minute situaties zijn niet altijd te voorkomen, maar u kunt de frequentie en impact beperken:"
      },
      {
        type: "timeline",
        title: "Preventieve maatregelen",
        steps: [
          { title: "Bouw een vaste flexpool", description: "Werk structureel samen met een uitzendbureau zodat er altijd medewerkers beschikbaar zijn die uw zaak al kennen." },
          { title: "Plan een buffer in uw rooster", description: "Reken bij drukke diensten altijd 1 medewerker extra mee. Dit voorkomt dat 1 ziekmelding de hele avond ontregelt." },
          { title: "Bespreek beschikbaarheid vooraf", description: "Vraag uw team wekelijks naar hun beschikbaarheid en anticipeer op uitval." },
          { title: "Gebruik vaste afspraken", description: "Een raamovereenkomst met een uitzendbureau zorgt voor prioriteit bij spoedaanvragen en mogelijk gunstiger tarieven." }
        ]
      },
      {
        type: "relatedLink",
        href: "/blog/horeca-personeelsplanning-rooster-tips",
        text: "Tips voor een efficiënte personeelsplanning"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Waar let u op bij spoedpersoneel?"
      },
      {
        type: "checklist",
        title: "Kwaliteitschecklist last-minute inzet",
        variant: "steps",
        items: [
          { text: "**Ervaring** — Vraag om medewerkers met relevante ervaring voor uw type zaak" },
          { text: "**Screening** — Controleer of het uitzendbureau vooraf screent (ID, referenties, werkvergunning)" },
          { text: "**Vervanging** — Vraag of er een vervanging mogelijk is als de medewerker niet past" },
          { text: "**Tarieftransparantie** — Spoedtarieven kunnen hoger liggen; vraag hier vooraf naar" }
        ]
      },
      {
        type: "relatedLink",
        href: "/kosten-calculator",
        text: "Bereken wat last-minute personeel kost"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Veelgestelde vragen"
      },
      {
        type: "heading3",
        content: "Hoe snel kan ik horecapersoneel krijgen?"
      },
      {
        type: "paragraph",
        content: "Bij een gespecialiseerd uitzendbureau vaak dezelfde dag nog. Wij streven ernaar om spoedaanvragen binnen enkele uren in te vullen, afhankelijk van functie en locatie."
      },
      {
        type: "heading3",
        content: "Kost last-minute personeel meer?"
      },
      {
        type: "paragraph",
        content: "Dat hangt af van het uitzendbureau en het moment. Bij TopTalent Jobs werken wij met transparante tarieven. Avond- en weekendtoeslagen gelden conform de CAO, maar er zijn geen spoedtoeslagen."
      },
      {
        type: "heading3",
        content: "Wat als de medewerker niet past bij mijn zaak?"
      },
      {
        type: "paragraph",
        content: "Wij regelen kosteloos een vervanging. Dat is een van de voordelen van werken met een uitzendbureau: u draagt het risico niet zelf."
      },
      {
        type: "heading3",
        content: "Kan ik ook 's avonds of in het weekend een aanvraag doen?"
      },
      {
        type: "paragraph",
        content: "Ja. Wij zijn telefonisch en via WhatsApp bereikbaar, ook buiten kantooruren. Spoedaanvragen worden met voorrang behandeld."
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samenvatting",
        points: [
          "Last-minute personeelsvragen zijn in de horeca onvermijdelijk",
          "Een gespecialiseerd uitzendbureau kan vaak dezelfde dag nog personeel leveren",
          "Wees helder over functie, tijdstip en locatie voor de snelste match",
          "Voorkom spoedaanvragen door een flexpool op te bouwen en buffers in te plannen",
          "Vraag altijd naar vervanging bij mismatch en transparante tarieven"
        ]
      },
      {
        type: "cta",
        title: "Direct personeel nodig?",
        description: "Vraag nu horecapersoneel aan. Wij reageren binnen 15 minuten en leveren vaak dezelfde dag.",
        primaryLink: { href: "/personeel-aanvragen", text: "Personeel aanvragen" },
        secondaryLink: { href: "/contact", text: "Bel of WhatsApp ons" },
        variant: "orange"
      }
    ]
  },

  // ============================================================
  // ARTICLE 14: No-shows in de horeca voorkomen
  // ============================================================
  "no-shows-horeca-voorkomen": {
    title: "No-shows in de horeca voorkomen: 4 bewezen methoden",
    excerpt: "No-shows van personeel kosten horecaondernemers geld en stress. Wij delen 4 methoden die aantoonbaar werken om uitval te voorkomen.",
    category: "Management",
    author: "TopTalent Team",
    date: "14 mei 2025",
    datePublished: "2025-05-14",
    image: "/images/blog-personeelsplanning.jpg",
    relatedSlugs: ["horeca-personeelsplanning-rooster-tips", "personeelstekort-horeca-oplossen"],
    blocks: [
      {
        type: "paragraph",
        content: "Een no-show is een van de meest frustrerende situaties voor een horecaondernemer. U heeft een dienst gepland, het rooster staat vast, maar de medewerker verschijnt niet. Het gevolg: stress op de werkvloer, overbelaste collega's en in het ergste geval een mindere gastervaring."
      },
      {
        type: "paragraph",
        content: "In dit artikel bespreken wij vier methoden die in de praktijk werken om no-shows te voorkomen of de impact ervan te beperken."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Waarom verschijnen medewerkers niet?"
      },
      {
        type: "paragraph",
        content: "Voordat we naar oplossingen kijken, is het nuttig om de meest voorkomende oorzaken te begrijpen:"
      },
      {
        type: "list",
        items: [
          "**Lage betrokkenheid** — Medewerkers die zich niet verbonden voelen met de zaak of het team stappen sneller af",
          "**Slechte communicatie** — Onduidelijkheid over roosters, werktijden of verwachtingen leidt tot misverstanden",
          "**Privéomstandigheden** — Ziekte, vervoersproblemen of persoonlijke situaties zijn niet altijd te voorkomen",
          "**Onregelmatige roosters** — Te late roosterbekendmaking of frequente wijzigingen zorgen voor frustratie",
          "**Geen consequenties** — Als een no-show geen gevolgen heeft, herhaalt het zich"
        ]
      },
      {
        type: "quote",
        quote: "De meeste no-shows zijn geen kwaadwillendheid. Ze zijn het resultaat van gebrekkige communicatie, lage betrokkenheid of organisatorische onduidelijkheid.",
        variant: "insight"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Methode 1: Bouw een vaste flexpool"
      },
      {
        type: "paragraph",
        content: "De meest effectieve manier om no-shows op te vangen is het hebben van een groep bekende, betrouwbare medewerkers die op korte termijn inzetbaar zijn."
      },
      {
        type: "checklist",
        title: "Hoe een flexpool werkt",
        variant: "benefits",
        items: [
          { text: "Een vaste groep uitzendkrachten die uw zaak al kennen" },
          { text: "Bij uitval belt u één nummer en de vervanging wordt direct geregeld" },
          { text: "De poolmedewerkers zijn al ingewerkt en vertrouwd met uw werkwijze" },
          { text: "Minder afhankelijkheid van onbekende invallers" }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        title: "Hoe u dit opzet",
        content: "Vraag uw uitzendbureau om een vaste pool samen te stellen voor uw zaak. Bij TopTalent Jobs doen wij dit standaard voor klanten met regelmatige inzet. De poolmedewerkers draaien mee in uw team en zijn bij spoed direct beschikbaar."
      },
      {
        type: "relatedLink",
        href: "/diensten/uitzenden",
        text: "Meer over uitzenden met een vaste flexpool"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Methode 2: Verbeter roostering en communicatie"
      },
      {
        type: "paragraph",
        content: "Veel no-shows zijn te voorkomen met betere planning en heldere communicatie."
      },
      {
        type: "checklist",
        title: "Concrete verbeteringen",
        variant: "steps",
        items: [
          { text: "**Publiceer roosters minstens 1 week vooraf** — Hoe eerder medewerkers weten wanneer ze werken, hoe minder last-minute uitval" },
          { text: "**Bevestig diensten 24 uur van tevoren** — Een kort berichtje of appje verlaagt de kans op vergeten of miscommunicatie" },
          { text: "**Gebruik één centraal kanaal** — Voorkom verwarring door roosters, wijzigingen en communicatie via één systeem te laten lopen" },
          { text: "**Maak beschikbaarheid bespreekbaar** — Geef medewerkers de ruimte om tijdig aan te geven als ze niet kunnen, in plaats van simpelweg niet te verschijnen" }
        ]
      },
      {
        type: "relatedLink",
        href: "/blog/horeca-personeelsplanning-rooster-tips",
        text: "Meer tips voor een efficiënt rooster"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Methode 3: Vergroot betrokkenheid"
      },
      {
        type: "paragraph",
        content: "Medewerkers die zich gewaardeerd en onderdeel van het team voelen, verschijnen betrouwbaarder. Dit geldt voor zowel vaste medewerkers als uitzendkrachten."
      },
      {
        type: "list",
        items: [
          "Stel nieuwe medewerkers persoonlijk voor aan het team",
          "Geef na een dienst kort feedback — ook als het goed ging",
          "Behandel uitzendkrachten hetzelfde als vast personeel",
          "Zorg voor goede werkomstandigheden: pauzes, maaltijden, een prettige sfeer"
        ]
      },
      {
        type: "quote",
        quote: "Medewerkers die zich welkom voelen, komen terug. Zo simpel is het.",
        variant: "highlight"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Methode 4: Werk met een betrouwbare partner"
      },
      {
        type: "paragraph",
        content: "Niet elk uitzendbureau werkt op dezelfde manier. De mate van screening, begeleiding en vervanging verschilt sterk."
      },
      {
        type: "checklist",
        title: "Waar u op moet letten bij een uitzendbureau",
        variant: "steps",
        items: [
          { text: "**Screening vooraf** — Worden medewerkers gescreend op identiteit, werkervaring en referenties?" },
          { text: "**Vervangingsgarantie** — Hoe snel wordt een no-show vervangen?" },
          { text: "**Persoonlijke begeleiding** — Heeft de medewerker een vast aanspreekpunt?" },
          { text: "**WAADI-registratie** — Is het uitzendbureau wettelijk geregistreerd?" }
        ]
      },
      {
        type: "highlight",
        variant: "info",
        title: "Onze aanpak",
        content: "Bij TopTalent Jobs screenen wij alle medewerkers persoonlijk vóór de eerste inzet. Bij een no-show regelen wij vervanging. En elke medewerker heeft een vast aanspreekpunt bij ons."
      },
      {
        type: "relatedLink",
        href: "/over-ons",
        text: "Meer over onze werkwijze en screening"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wat doet u als het toch gebeurt?"
      },
      {
        type: "paragraph",
        content: "Ondanks alle preventie kan een no-show voorkomen. Zo beperkt u de schade:"
      },
      {
        type: "timeline",
        title: "Actieplan bij een no-show",
        steps: [
          { title: "Bel direct uw uitzendbureau", description: "Hoe sneller u belt, hoe sneller de vervanging geregeld is." },
          { title: "Herverdeel taken in uw team", description: "Prioriteer de kritieke functies en vereenvoudig waar mogelijk het menu of de service." },
          { title: "Informeer uw team", description: "Communiceer open dat er iemand minder is en verdeel taken eerlijk." },
          { title: "Evalueer achteraf", description: "Bespreek de situatie met uw uitzendbureau om herhaling te voorkomen." }
        ]
      },
      {
        type: "cta",
        title: "Minder no-shows, meer rust",
        description: "Met een vaste flexpool en persoonlijke screening verlaagt u het risico op no-shows. Wij vertellen u graag hoe.",
        primaryLink: { href: "/personeel-aanvragen", text: "Personeel aanvragen" },
        secondaryLink: { href: "/diensten/uitzenden", text: "Meer over uitzenden" },
        variant: "dark"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Veelgestelde vragen"
      },
      {
        type: "heading3",
        content: "Hoe vaak komen no-shows voor in de horeca?"
      },
      {
        type: "paragraph",
        content: "Dit varieert sterk per bedrijf en per type medewerker. Bij goed gescreende uitzendkrachten via een gespecialiseerd bureau is het percentage aanzienlijk lager dan bij zzp'ers of eigen werving via sociale media."
      },
      {
        type: "heading3",
        content: "Kan ik een uitzendkracht aansprakelijk stellen voor een no-show?"
      },
      {
        type: "paragraph",
        content: "Nee, de uitzendkracht is in dienst bij het uitzendbureau. Uw overeenkomst is met het bureau. Een goed uitzendbureau neemt verantwoordelijkheid en regelt een vervanging."
      },
      {
        type: "heading3",
        content: "Helpt een hogere vergoeding tegen no-shows?"
      },
      {
        type: "paragraph",
        content: "Een eerlijke vergoeding is belangrijk, maar betrokkenheid, goede communicatie en screening zijn effectiever dan alleen een hoger tarief. Medewerkers die zich gewaardeerd voelen en weten wat er verwacht wordt, verschijnen betrouwbaarder."
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samenvatting",
        points: [
          "No-shows zijn een veelvoorkomend probleem in de horeca, maar grotendeels te voorkomen",
          "Een vaste flexpool geeft u altijd een betrouwbare backup",
          "Betere roostering en communicatie verlagen het risico op miscommunicatie",
          "Betrokkenheid en waardering maken medewerkers betrouwbaarder",
          "Werk met een uitzendbureau dat screent, begeleidt en vervanging garandeert"
        ]
      },
      {
        type: "cta",
        title: "Betrouwbaar personeel, elke dienst",
        description: "Wij leveren gescreend horecapersoneel met persoonlijke begeleiding. Geen verrassingen, wél betrouwbaarheid.",
        primaryLink: { href: "/personeel-aanvragen", text: "Personeel aanvragen" },
        secondaryLink: { href: "/contact", text: "Neem contact op" },
        variant: "orange"
      }
    ]
  },

  // ============================================================
  // ARTICLE 15: Inlenersbeloning horeca
  // ============================================================
  "inlenersbeloning-horeca": {
    title: "Inlenersbeloning horeca: wat werkgevers moeten weten",
    metaTitle: "Inlenersbeloning horeca — wat u moet weten",
    excerpt: "Wat is de inlenersbeloning en hoe werkt het in de horeca? Praktische uitleg over regels, uitzonderingen en wat het voor uw kosten betekent.",
    category: "Wetgeving",
    author: "TopTalent Team",
    date: "14 mei 2025",
    datePublished: "2025-05-14",
    image: "/images/blog-horecapersoneel-inhuren.jpg",
    relatedSlugs: ["horecapersoneel-kosten-per-uur", "cao-horeca-2025-wijzigingen"],
    blocks: [
      {
        type: "paragraph",
        content: "Als u horecapersoneel inhuurt via een uitzendbureau, krijgt u te maken met de inlenersbeloning. Dit is een wettelijke regeling die bepaalt dat uitzendkrachten recht hebben op dezelfde arbeidsvoorwaarden als uw eigen medewerkers in vergelijkbare functies."
      },
      {
        type: "paragraph",
        content: "In de praktijk roept dit veel vragen op. Wat valt er precies onder? Hoe werkt het in combinatie met de CAO Horeca? En wat betekent het voor uw uurtarieven? In dit artikel leggen wij het praktisch uit."
      },
      {
        type: "highlight",
        variant: "warning",
        title: "Disclaimer",
        content: "Dit artikel is bedoeld als praktische toelichting en is geen juridisch advies. Wet- en regelgeving kan wijzigen. Raadpleeg bij specifieke vragen altijd een juridisch adviseur of uw branchevereniging."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wat is de inlenersbeloning?"
      },
      {
        type: "paragraph",
        content: "De inlenersbeloning is vastgelegd in de Wet allocatie arbeidskrachten door intermediairs (Waadi) en uitgewerkt in de ABU- en NBBU-cao's. Het principe: een uitzendkracht die bij u werkt, heeft recht op hetzelfde loon en dezelfde vergoedingen als een vergelijkbare werknemer in uw bedrijf."
      },
      {
        type: "heading3",
        content: "Welke elementen vallen eronder?"
      },
      {
        type: "paragraph",
        content: "De inlenersbeloning omvat zes onderdelen:"
      },
      {
        type: "checklist",
        title: "De zes elementen",
        variant: "checklist",
        items: [
          { text: "Het geldende periodeloon (functieloon conform uw cao of bedrijfsregeling)", checked: true },
          { text: "Arbeidsduurverkorting (ADV) of de compensatie daarvan", checked: true },
          { text: "Toeslagen voor overwerk, onregelmatige uren, ploegendienst en fysieke arbeidsomstandigheden", checked: true },
          { text: "Initiële loonsverhoging (periodieken bij de inlener)", checked: true },
          { text: "Kostenvergoedingen (reiskosten, maaltijdvergoedingen)", checked: true },
          { text: "Eenmalige uitkeringen die voor uw personeel gelden", checked: true }
        ]
      },
      {
        type: "highlight",
        variant: "info",
        title: "Vanaf dag 1",
        content: "De inlenersbeloning geldt vanaf de eerste werkdag van de uitzendkracht bij uw bedrijf. Er is geen wachtperiode."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Hoe werkt het in de horeca?"
      },
      {
        type: "paragraph",
        content: "In de horeca is de CAO Horeca de leidende cao. Dit betekent dat uitzendkrachten in uw zaak dezelfde loonschalen, toeslagen en vergoedingen krijgen als uw eigen horecamedewerkers."
      },
      {
        type: "heading3",
        content: "Toeslagen in de horeca"
      },
      {
        type: "paragraph",
        content: "De CAO Horeca kent specifieke toeslagen die onderdeel zijn van de inlenersbeloning:"
      },
      {
        type: "list",
        items: [
          "**Avondtoeslag** — Voor uren na 20:00 uur",
          "**Weekendtoeslag** — Voor werk op zaterdag en zondag",
          "**Feestdagentoeslag** — Voor werk op erkende feestdagen",
          "**Overwerkvergoeding** — Voor uren boven de contractuele arbeidsduur"
        ]
      },
      {
        type: "paragraph",
        content: "Een uitzendkracht die op zaterdagavond achter de bar staat, heeft dus recht op dezelfde toeslagen als uw eigen bartender op dat moment."
      },
      {
        type: "relatedLink",
        href: "/blog/cao-horeca-2025-wijzigingen",
        text: "CAO Horeca 2025: alle actuele wijzigingen op een rij"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wat betekent dit voor uw kosten?"
      },
      {
        type: "paragraph",
        content: "De inlenersbeloning verhoogt niet automatisch uw kosten ten opzichte van eigen personeel. Het zorgt ervoor dat de loonkosten van uitzendkrachten in lijn liggen met die van uw eigen team."
      },
      {
        type: "paragraph",
        content: "Het uurtarief dat u betaalt aan het uitzendbureau is hoger dan het brutoloon, maar dat verschil is de marge van het bureau. Daarin zitten: werkgeverslasten, verzekeringen, pensioen, administratie en wervingskosten."
      },
      {
        type: "highlight",
        variant: "tip",
        title: "Transparantie vragen",
        content: "Vraag uw uitzendbureau altijd om een tariefopbouw. Een goed bureau kan precies uitleggen waaruit het uurtarief is opgebouwd: brutoloon, toeslagen, reserveringen, werkgeverskosten en marge."
      },
      {
        type: "relatedLink",
        href: "/kosten-calculator",
        text: "Bereken wat horecapersoneel kost voor uw situatie"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Veelgemaakte fouten"
      },
      {
        type: "paragraph",
        content: "In de praktijk zien wij dat inleners en bureaus niet altijd correct omgaan met de inlenersbeloning. De meest voorkomende fouten:"
      },
      {
        type: "list",
        items: [
          "**Verkeerde functie-inschaling** — De uitzendkracht wordt in een lagere loonschaal ingedeeld dan het werk rechtvaardigt",
          "**Ontbrekende toeslagen** — Avond- en weekendtoeslagen worden niet doorberekend",
          "**Geen periodieken** — De uitzendkracht krijgt geen loonsverhoging terwijl vergelijkbare eigen medewerkers die wel krijgen",
          "**Oude cao-tabellen** — Het bureau werkt met verouderde loontabellen na een cao-verhoging"
        ]
      },
      {
        type: "highlight",
        variant: "warning",
        title: "Risico voor de inlener",
        content: "Als de inlenersbeloning niet correct wordt toegepast, kan de uitzendkracht een loonvordering indienen. Hoewel de claim primair bij het uitzendbureau ligt, kan dit ook voor u als inlener tot complicaties leiden — bijvoorbeeld bij ketenaansprakelijkheid."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Hoe controleert u of het correct wordt toegepast?"
      },
      {
        type: "checklist",
        title: "Controlestappen",
        variant: "steps",
        items: [
          { text: "Controleer of het uitzendbureau NEN 4400-1 gecertificeerd is (SNA-keurmerk)" },
          { text: "Vraag om een tariefopbouw en vergelijk het brutoloon met uw eigen loontabellen" },
          { text: "Check of toeslagen correct worden doorberekend bij avond- en weekenddiensten" },
          { text: "Verifieer dat het bureau werkt met de actuele CAO Horeca-tabellen" },
          { text: "Controleer WAADI-registratie via het register van de KvK" }
        ]
      },
      {
        type: "relatedLink",
        href: "/diensten/uitzenden",
        text: "Hoe TopTalent Jobs de inlenersbeloning toepast"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Veelgestelde vragen"
      },
      {
        type: "heading3",
        content: "Geldt de inlenersbeloning ook voor oproepkrachten?"
      },
      {
        type: "paragraph",
        content: "Ja. De inlenersbeloning geldt voor alle uitzendkrachten, ongeacht hun contractvorm bij het uitzendbureau. Of het nu gaat om een oproepcontract, fase A of fase B: het recht op gelijke beloning bij de inlener blijft bestaan."
      },
      {
        type: "heading3",
        content: "Wat als ik geen cao heb?"
      },
      {
        type: "paragraph",
        content: "Als er geen cao van toepassing is op uw bedrijf, geldt de inlenersbeloning op basis van uw eigen loongebouw. De uitzendkracht krijgt dan hetzelfde loon als een vergelijkbare eigen medewerker. In de horeca is de CAO Horeca vrijwel altijd van toepassing."
      },
      {
        type: "heading3",
        content: "Is het uitzendbureau of de inlener verantwoordelijk?"
      },
      {
        type: "paragraph",
        content: "Het uitzendbureau is de formele werkgever en daarmee primair verantwoordelijk voor correcte toepassing. Maar als inlener bent u verplicht om de juiste informatie aan te leveren over uw loongebouw, toeslagen en arbeidsvoorwaarden."
      },
      {
        type: "heading3",
        content: "Verandert de inlenersbeloning bij langere inzet?"
      },
      {
        type: "paragraph",
        content: "Ja. Bij langdurige inzet kan de uitzendkracht recht krijgen op periodieken (loonsverhogingen) die ook voor uw eigen medewerkers gelden. Na 78 weken (fase C bij ABU) gaan aanvullende rechten gelden."
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samenvatting",
        points: [
          "De inlenersbeloning geeft uitzendkrachten recht op hetzelfde loon en dezelfde toeslagen als vergelijkbare eigen medewerkers",
          "Dit geldt vanaf dag 1 en omvat loon, toeslagen, ADV, periodieken, kostenvergoedingen en eenmalige uitkeringen",
          "In de horeca is de CAO Horeca de basis voor de inlenersbeloning",
          "Controleer of uw uitzendbureau NEN 4400-1 gecertificeerd is en actuele cao-tabellen gebruikt",
          "Lever als inlener correcte informatie aan over uw eigen arbeidsvoorwaarden"
        ]
      },
      {
        type: "cta",
        title: "Transparant en correct inhuren",
        description: "Bij TopTalent Jobs passen wij de inlenersbeloning correct toe, inclusief alle toeslagen conform de CAO Horeca. Vraag een transparante tariefopbouw aan.",
        primaryLink: { href: "/diensten/uitzenden", text: "Bekijk onze uitzendservice" },
        secondaryLink: { href: "/kosten-calculator", text: "Kosten berekenen" },
        variant: "orange"
      }
    ]
  },

  // ============================================================
  // ARTICLE 16: Wet DBA en horeca
  // ============================================================
  "wet-dba-horeca-zzp-inhuren": {
    title: "Wet DBA en horeca: zzp'er inhuren in 2025",
    metaTitle: "Wet DBA horeca: zzp'er inhuren in 2025",
    excerpt: "Wat betekent de Wet DBA voor horecaondernemers die zzp'ers inhuren? Praktische uitleg over schijnzelfstandigheid, risico's en alternatieven.",
    category: "Wetgeving",
    author: "TopTalent Team",
    date: "14 mei 2025",
    datePublished: "2025-05-14",
    image: "/images/blog-personeelstekort.jpg",
    relatedSlugs: ["inlenersbeloning-horeca", "horecapersoneel-kosten-per-uur"],
    blocks: [
      {
        type: "paragraph",
        content: "Veel horecaondernemers werken met zzp'ers: een kok voor het weekend, een barman voor een evenement, een gastvrouw voor het seizoen. Dat lijkt praktisch en flexibel, maar de Wet DBA (Deregulering Beoordeling Arbeidsrelaties) brengt risico's mee die u moet kennen."
      },
      {
        type: "paragraph",
        content: "In dit artikel leggen wij uit wat de Wet DBA inhoudt, waarom de horeca extra kwetsbaar is voor handhaving, en welke alternatieven er zijn."
      },
      {
        type: "highlight",
        variant: "warning",
        title: "Disclaimer",
        content: "Dit artikel biedt een praktische toelichting op de Wet DBA en is geen juridisch advies. De handhaving en interpretatie van de wet ontwikkelen zich. Raadpleeg bij twijfel een fiscalist of arbeidsrechtjurist."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wat is de Wet DBA?"
      },
      {
        type: "paragraph",
        content: "De Wet DBA vervangt sinds 2016 de oude VAR-verklaring. Het doel: duidelijk maken wanneer iemand als zelfstandige werkt en wanneer er feitelijk sprake is van een dienstverband. De Belastingdienst beoordeelt de arbeidsrelatie op basis van drie criteria:"
      },
      {
        type: "checklist",
        title: "Beoordelingscriteria",
        variant: "checklist",
        items: [
          { text: "**Gezagsverhouding** — Geeft u instructies over hoe het werk moet worden uitgevoerd?", checked: true },
          { text: "**Inbedding in de organisatie** — Doet de zzp'er hetzelfde werk als uw vaste medewerkers, op dezelfde manier?", checked: true },
          { text: "**Ondernemerschap** — Draagt de zzp'er ondernemersrisico, heeft hij meerdere opdrachtgevers, investeert hij in zijn bedrijf?", checked: true }
        ]
      },
      {
        type: "paragraph",
        content: "Als de Belastingdienst oordeelt dat er feitelijk een dienstverband is, heet dat schijnzelfstandigheid. De gevolgen kunnen aanzienlijk zijn."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Waarom is de horeca extra kwetsbaar?"
      },
      {
        type: "paragraph",
        content: "De horecasector heeft kenmerken die het risico op schijnzelfstandigheid vergroten:"
      },
      {
        type: "list",
        items: [
          "**Vast rooster** — Zzp'ers die wekelijks op vaste tijden werken, lijken op reguliere werknemers",
          "**Instructies op de werkvloer** — In een keuken of bediening geeft u instructies over werkwijze, presentatie en tempo",
          "**Geen eigen klantenkring** — De zzp-kok werkt niet voor eigen klanten maar draait mee in uw team",
          "**Langdurige inzet** — Een zzp'er die maandenlang bij dezelfde zaak werkt, verliest het karakter van zelfstandige",
          "**Zelfde werk als vast personeel** — Als de zzp-bediening exact hetzelfde doet als uw vaste bediening, is inbedding moeilijk te weerleggen"
        ]
      },
      {
        type: "highlight",
        variant: "info",
        title: "Handhaving sinds 2025",
        content: "Na jaren van een handhavingsmoratorium is de Belastingdienst begonnen met actief controleren. Horecabedrijven behoren tot de sectoren die prioriteit krijgen vanwege het hoge percentage zzp-inzet."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wat zijn de risico's?"
      },
      {
        type: "paragraph",
        content: "Bij geconstateerde schijnzelfstandigheid kunnen de gevolgen ingrijpend zijn:"
      },
      {
        type: "checklist",
        title: "Mogelijke gevolgen",
        variant: "checklist",
        items: [
          { text: "Naheffing loonbelasting en premies volksverzekeringen over de gehele inzetperiode", checked: true },
          { text: "Boetes van de Belastingdienst (tot 100% van de naheffing bij opzet)", checked: true },
          { text: "Werkgeverspremies sociale verzekeringen met terugwerkende kracht", checked: true },
          { text: "De zzp'er kan een dienstverband claimen met bijbehorende rechten (ontslagbescherming, ziektegeld)", checked: true }
        ]
      },
      {
        type: "paragraph",
        content: "De kosten van een naheffing lopen snel op. Bij een zzp-kok die een jaar lang structureel ingehuurd is, kan de naheffing tienduizenden euro's bedragen."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wanneer mag u wél een zzp'er inhuren?"
      },
      {
        type: "paragraph",
        content: "Een zzp-constructie kan in de horeca verdedigbaar zijn wanneer:"
      },
      {
        type: "list",
        items: [
          "De zzp'er een specifieke expertise brengt die u niet in huis heeft (bijv. een gespecialiseerde patissier voor een event)",
          "Het gaat om een eenmalige of incidentele opdracht met een duidelijk eindresultaat",
          "De zzp'er zelf bepaalt hoe het werk wordt uitgevoerd, zonder uw instructies",
          "De zzp'er meerdere opdrachtgevers heeft en aantoonbaar ondernemersrisico loopt",
          "Er een modelovereenkomst is die door de Belastingdienst is goedgekeurd"
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        title: "Vuistregel",
        content: "Hoe meer de zzp'er lijkt op uw eigen personeel — qua werk, rooster, aansturing en duur — hoe groter het risico op schijnzelfstandigheid. Bij twijfel: kies voor uitzenden."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Alternatieven voor zzp-inhuur"
      },
      {
        type: "paragraph",
        content: "Als u flexibel personeel nodig heeft maar het risico van zzp-inhuur wilt vermijden, zijn er concrete alternatieven:"
      },
      {
        type: "heading3",
        content: "Uitzendkrachten"
      },
      {
        type: "paragraph",
        content: "Bij uitzenden is de medewerker in dienst bij het uitzendbureau. Er is geen risico op schijnzelfstandigheid voor u als inlener. Het bureau regelt loonheffingen, premies, contracten en administratie."
      },
      {
        type: "heading3",
        content: "Payrolling"
      },
      {
        type: "paragraph",
        content: "Bij payrolling werft u zelf de medewerker, maar komt hij of zij in dienst bij de payrollpartij. Dit elimineert het zzp-risico terwijl u de keuze houdt over wie u inzet."
      },
      {
        type: "heading3",
        content: "Tijdelijk contract"
      },
      {
        type: "paragraph",
        content: "Voor langdurige, regelmatige inzet kan een tijdelijk contract de eenvoudigste en veiligste optie zijn. U heeft dan volledige duidelijkheid over de arbeidsrelatie."
      },
      {
        type: "relatedLink",
        href: "/diensten",
        text: "Bekijk alle personeelsdiensten van TopTalent Jobs"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Veelgestelde vragen"
      },
      {
        type: "heading3",
        content: "Mag een kok als zzp'er werken in mijn restaurant?"
      },
      {
        type: "paragraph",
        content: "Dat hangt af van de feitelijke situatie. Een zzp-kok die wekelijks op vaste tijden bij u werkt, uw recepten volgt en meedraait in uw keukenbrigade, loopt een hoog risico op schijnzelfstandigheid. Een zzp-kok die eenmalig een cateringklus doet met eigen receptuur en materiaal is beter verdedigbaar."
      },
      {
        type: "heading3",
        content: "Wat is een modelovereenkomst?"
      },
      {
        type: "paragraph",
        content: "Een modelovereenkomst is een door de Belastingdienst beoordeeld contract dat de arbeidsrelatie beschrijft. Het gebruik ervan biedt enige zekerheid, maar alleen als de praktijk overeenkomt met wat in het contract staat. Een modelovereenkomst beschermt niet als de feitelijke situatie afwijkt."
      },
      {
        type: "heading3",
        content: "Kan ik aansprakelijk worden gesteld als opdrachtgever?"
      },
      {
        type: "paragraph",
        content: "Ja. Als de Belastingdienst schijnzelfstandigheid constateert, bent u als opdrachtgever aansprakelijk voor de naheffing van loonbelasting en premies. De zzp'er kan daarnaast een dienstverband claimen."
      },
      {
        type: "heading3",
        content: "Geldt de Wet DBA ook voor incidentele inhuur?"
      },
      {
        type: "paragraph",
        content: "Formeel geldt de Wet DBA voor elke arbeidsrelatie. Bij incidentele, kortdurende opdrachten met een duidelijk resultaat en eigen werkwijze is het risico echter beduidend lager dan bij structurele inzet."
      },
      {
        type: "heading3",
        content: "Is uitzenden altijd veiliger dan zzp?"
      },
      {
        type: "paragraph",
        content: "Vanuit het perspectief van schijnzelfstandigheid: ja. Bij uitzenden is er een duidelijke arbeidsrelatie tussen de medewerker en het uitzendbureau. U loopt als inlener geen risico op naheffingen voor schijnzelfstandigheid."
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samenvatting",
        points: [
          "De Wet DBA bepaalt wanneer iemand zzp'er is en wanneer er sprake is van een verkapt dienstverband",
          "De horeca is extra kwetsbaar door vaste roosters, instructies op de werkvloer en langdurige inzet",
          "Bij schijnzelfstandigheid riskeert u naheffingen, boetes en claims van de zzp'er",
          "Alternatieven als uitzenden en payrolling bieden flexibiliteit zonder zzp-risico",
          "Raadpleeg bij twijfel een fiscalist — de Belastingdienst handhaaft actief sinds 2025"
        ]
      },
      {
        type: "cta",
        title: "Flexibel personeel zonder zzp-risico",
        description: "Via uitzenden heeft u dezelfde flexibiliteit als zzp-inhuur, maar zonder het risico op schijnzelfstandigheid. Wij regelen alles.",
        primaryLink: { href: "/diensten", text: "Bekijk onze diensten" },
        secondaryLink: { href: "/contact", text: "Neem contact op" },
        variant: "dark"
      }
    ]
  },

  // ============================================================
  // ARTICLE 17: VOG voor horecapersoneel
  // ============================================================
  "vog-horecapersoneel": {
    title: "VOG voor horecapersoneel: wanneer is het verplicht?",
    metaTitle: "VOG horecapersoneel: wanneer verplicht?",
    excerpt: "Wanneer is een VOG verplicht voor horecapersoneel? Uitleg over regels, aanvraagproces, kosten en wat u als werkgever moet weten.",
    category: "Wetgeving",
    author: "TopTalent Team",
    date: "14 mei 2025",
    datePublished: "2025-05-14",
    image: "/images/blog-personeelsplanning.jpg",
    relatedSlugs: ["inlenersbeloning-horeca", "horecapersoneel-inhuren-gids-2025"],
    blocks: [
      {
        type: "paragraph",
        content: "Een Verklaring Omtrent het Gedrag (VOG) is een veelbesproken onderwerp in de horeca. Sommige werkgevers vragen het standaard, anderen weten niet dat het bestaat. Maar wanneer is een VOG eigenlijk verplicht? En wanneer is het verstandig om er wél om te vragen, ook als het niet wettelijk moet?"
      },
      {
        type: "paragraph",
        content: "In dit artikel leggen wij uit hoe de VOG werkt, wanneer u er in de horeca mee te maken krijgt, en hoe het aanvraagproces verloopt."
      },
      {
        type: "highlight",
        variant: "warning",
        title: "Disclaimer",
        content: "Dit artikel biedt een praktische toelichting op de VOG en is geen juridisch advies. Regels kunnen per gemeente of sector verschillen. Raadpleeg bij specifieke situaties Justis.nl of een juridisch adviseur."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wat is een VOG?"
      },
      {
        type: "paragraph",
        content: "Een Verklaring Omtrent het Gedrag is een officieel document van het Ministerie van Justitie en Veiligheid. Het toont aan dat het gedrag van een persoon in het verleden geen bezwaar oplevert voor het uitoefenen van een specifieke functie."
      },
      {
        type: "paragraph",
        content: "De VOG is functie-specifiek. Een VOG voor horecawerk wordt getoetst op andere aspecten dan een VOG voor de kinderopvang. De screeningsautoriteit Justis beoordeelt of er strafbare feiten in het Justitieel Documentatie Systeem staan die relevant zijn voor de beoogde functie."
      },
      {
        type: "highlight",
        variant: "info",
        title: "Geen strafblad-check",
        content: "Een veel voorkomend misverstand: de VOG is geen strafblad-check. Iemand met een strafblad kan alsnog een VOG krijgen als de delicten niet relevant zijn voor de specifieke functie. Andersom is een schoon strafblad geen garantie — het hangt af van de toetsing."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wanneer is een VOG verplicht in de horeca?"
      },
      {
        type: "paragraph",
        content: "In de reguliere horeca is een VOG niet wettelijk verplicht voor alle functies. Maar er zijn situaties waarin het wél verplicht is of sterk wordt aangeraden:"
      },
      {
        type: "heading3",
        content: "Wettelijk verplicht"
      },
      {
        type: "checklist",
        title: "VOG is verplicht bij",
        variant: "checklist",
        items: [
          { text: "Drank- en Horecawetvergunning: leidinggevenden die op de vergunning staan, hebben een VOG nodig", checked: true },
          { text: "Werken met minderjarigen: bij jeugdevenementen of horeca gericht op jongeren", checked: true },
          { text: "Gemeentelijke eisen: sommige gemeenten stellen een VOG-eis als voorwaarde voor een exploitatievergunning", checked: true }
        ]
      },
      {
        type: "heading3",
        content: "Sterk aangeraden"
      },
      {
        type: "checklist",
        title: "VOG is verstandig bij",
        variant: "checklist",
        items: [
          { text: "Medewerkers met kassaverantwoordelijkheid of toegang tot kluizen", checked: true },
          { text: "Personeel in nachthoreca (extra risicoprofiel qua veiligheid)", checked: true },
          { text: "Functies met sleutelverantwoordelijkheid of alleenwerk", checked: true },
          { text: "Cateringpersoneel dat werkt bij bedrijven met beveiligingseisen", checked: true }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Hoe vraagt u een VOG aan?"
      },
      {
        type: "paragraph",
        content: "Het aanvraagproces verloopt in een aantal stappen:"
      },
      {
        type: "timeline",
        title: "Aanvraagproces VOG",
        steps: [
          { title: "Werkgever start de aanvraag", description: "U als werkgever vult het aanvraagformulier in via Justis.nl of op papier. U geeft aan voor welke functie de VOG nodig is." },
          { title: "Medewerker ontvangt uitnodiging", description: "De medewerker ontvangt een link (digitaal) of het formulier (papier) en vult zijn of haar gegevens in." },
          { title: "Justis beoordeelt", description: "Screeningsautoriteit Justis toetst het Justitieel Documentatie Systeem op relevante antecedenten voor de opgegeven functie." },
          { title: "VOG wordt afgegeven of geweigerd", description: "Bij goedkeuring ontvangt de medewerker de VOG. Bij twijfel volgt een extra beoordeling. Bij weigering kan bezwaar worden gemaakt." }
        ]
      },
      {
        type: "heading3",
        content: "Kosten en doorlooptijd"
      },
      {
        type: "list",
        items: [
          "**Digitale aanvraag:** circa €41,35 (tarief 2025)",
          "**Papieren aanvraag:** circa €41,35 plus gemeenteleges",
          "**Doorlooptijd digitaal:** gemiddeld 1 tot 4 weken",
          "**Doorlooptijd papier:** gemiddeld 4 tot 8 weken"
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        title: "Wie betaalt?",
        content: "Er is geen wettelijke regel over wie betaalt. In de praktijk betaalt de werkgever de VOG-kosten vaak als onderdeel van het onboardingproces. Dit is een klein bedrag dat veel vertrouwen oplevert."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "VOG bij uitzendkrachten"
      },
      {
        type: "paragraph",
        content: "Als u horecapersoneel inhuurt via een uitzendbureau, is de vraag: wie is verantwoordelijk voor de VOG?"
      },
      {
        type: "paragraph",
        content: "Het uitzendbureau is de formele werkgever. Als u als inlener een VOG-eis stelt, dient u dit vooraf aan te geven. Een gespecialiseerd horeca-uitzendbureau heeft vaak al medewerkers met een geldige VOG in de pool, of kan de aanvraag snel regelen."
      },
      {
        type: "highlight",
        variant: "info",
        title: "Geldigheid",
        content: "Een VOG heeft geen officiële vervaldatum, maar veel werkgevers en uitzendbureaus hanteren een gangbare richtlijn van maximaal 3 tot 6 maanden oud bij indiensttreding. Dit is geen wettelijke eis maar een praktijkstandaard."
      },
      {
        type: "relatedLink",
        href: "/personeel-aanvragen",
        text: "Vraag personeel aan met eventueel VOG-vereiste"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Veelgestelde vragen"
      },
      {
        type: "heading3",
        content: "Kan een medewerker zonder VOG beginnen?"
      },
      {
        type: "paragraph",
        content: "Als de VOG wettelijk verplicht is (bijvoorbeeld voor de Drank- en Horecawetvergunning), mag de medewerker niet starten zonder VOG. Bij niet-verplichte functies is het uw eigen afweging: u kunt ervoor kiezen om de medewerker te laten starten terwijl de VOG-aanvraag loopt."
      },
      {
        type: "heading3",
        content: "Wat als de VOG wordt geweigerd?"
      },
      {
        type: "paragraph",
        content: "Bij weigering kan de medewerker bezwaar maken bij Justis. Als werkgever kunt u de medewerker niet verplichten om de reden van weigering te delen. Bij een verplichte VOG-functie kunt u de medewerker niet in die functie inzetten."
      },
      {
        type: "heading3",
        content: "Moet ik voor alle horecamedewerkers een VOG vragen?"
      },
      {
        type: "paragraph",
        content: "Niet wettelijk verplicht voor alle functies. Het is een keuze die u als werkgever maakt. Veel horecaondernemers kiezen ervoor om het standaard te doen voor functies met kassa- of sleutelverantwoordelijkheid, of bij nachthoreca."
      },
      {
        type: "heading3",
        content: "Hoe zit het met buitenlandse medewerkers?"
      },
      {
        type: "paragraph",
        content: "Een medewerker die korter dan 5 jaar in Nederland woont, kan mogelijk geen VOG krijgen omdat Justis onvoldoende gegevens heeft. In dat geval kan een vergelijkbaar document uit het land van herkomst worden gevraagd. Bespreek dit vooraf met het uitzendbureau."
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samenvatting",
        points: [
          "Een VOG is verplicht voor leidinggevenden op de Drank- en Horecawetvergunning en bij werk met minderjarigen",
          "Voor reguliere horecafuncties is het niet wettelijk verplicht, maar wel verstandig bij kassaverantwoordelijkheid of nachthoreca",
          "De aanvraag verloopt via Justis.nl, kost circa €41 en duurt 1–4 weken digitaal",
          "Bij uitzendkrachten geeft u de VOG-eis vooraf aan bij het uitzendbureau",
          "Een VOG heeft geen officiële vervaldatum maar wordt in de praktijk maximaal 3–6 maanden oud gehanteerd"
        ]
      },
      {
        type: "cta",
        title: "Personeel met de juiste screening",
        description: "Wij screenen al ons horecapersoneel persoonlijk. Heeft u specifieke eisen zoals een VOG? Geef het aan bij uw aanvraag.",
        primaryLink: { href: "/personeel-aanvragen", text: "Personeel aanvragen" },
        secondaryLink: { href: "/contact", text: "Neem contact op" },
        variant: "orange"
      }
    ]
  },

  // ============================================================
  // ARTICLE 18: Uitzenden vs detachering horeca
  // ============================================================
  "uitzenden-vs-detachering-horeca": {
    title: "Uitzenden vs detachering in de horeca: wat past bij u?",
    metaTitle: "Uitzenden vs detachering horeca | Vergelijking",
    excerpt: "Wat is het verschil tussen uitzenden en detachering in de horeca? Vergelijk contractvormen, kosten, flexibiliteit en ontdek welke oplossing bij uw situatie past.",
    category: "Diensten",
    author: "TopTalent Team",
    date: "14 mei 2025",
    datePublished: "2025-05-14",
    image: "/images/blog-horecapersoneel-inhuren.jpg",
    relatedSlugs: ["detachering-vs-uitzenden-verschil", "horecapersoneel-kosten-per-uur"],
    blocks: [
      {
        type: "paragraph",
        content: "U heeft personeel nodig voor uw horecazaak, maar twijfelt: kiest u voor uitzenden of voor detachering? Beide vormen bieden flexibiliteit, maar de voorwaarden, kosten en contractduur verschillen wezenlijk."
      },
      {
        type: "paragraph",
        content: "In dit artikel vergelijken wij de twee constructies specifiek voor de horeca. Zodat u een keuze kunt maken die past bij uw personeelsbehoefte, planning en budget."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "De kern van het verschil"
      },
      {
        type: "paragraph",
        content: "Bij zowel uitzenden als detachering is de medewerker in dienst bij het bureau — niet bij u. Maar de manier waarop de samenwerking is ingericht verschilt."
      },
      {
        type: "heading3",
        content: "Uitzenden in het kort"
      },
      {
        type: "paragraph",
        content: "Bij uitzenden plaatst het uitzendbureau een medewerker bij u voor een bepaalde periode of opdracht. De focus ligt op flexibiliteit: u kunt de inzet per week of per dienst aanpassen, opschalen bij drukte en afschalen bij rust. Het uitzendbureau selecteert de medewerker, maar u kunt de inzet op korte termijn beëindigen."
      },
      {
        type: "heading3",
        content: "Detachering in het kort"
      },
      {
        type: "paragraph",
        content: "Bij detachering wordt een medewerker voor langere tijd exclusief bij u geplaatst. De medewerker functioneert als onderdeel van uw team en groeit mee met uw organisatie. De contractduur is doorgaans minimaal 3 tot 6 maanden. Detachering is geschikt wanneer u structureel personeel nodig heeft maar niet direct een vast dienstverband wilt aangaan."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Vergelijking op de belangrijkste punten"
      },
      {
        type: "comparison",
        title: "Uitzenden vs detachering in de horeca",
        headers: ["Kenmerk", "Uitzenden", "Detachering"],
        rows: [
          { feature: "Contractduur", optionA: "Flexibel, per dienst/week", optionB: "Minimaal 3–6 maanden" },
          { feature: "Opzegtermijn", optionA: "Kort (vaak per dag/week)", optionB: "Langer (conform afspraak)" },
          { feature: "Binding met uw team", optionA: "Wisselend, pool-basis", optionB: "Vast, groeit mee" },
          { feature: "Uurtarief", optionA: "Hoger per uur", optionB: "Lager per uur bij langere inzet" },
          { feature: "Selectieproces", optionA: "Bureau selecteert", optionB: "U bent nauw betrokken" },
          { feature: "Geschikt voor", optionA: "Piekdrukte, seizoen, vervanging", optionB: "Structurele bezetting, groei" },
          { feature: "Overname mogelijk", optionA: "Ja, na afgesproken periode", optionB: "Ja, vaak na 6–12 maanden" }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wanneer kiest u voor uitzenden?"
      },
      {
        type: "paragraph",
        content: "Uitzenden is de juiste keuze wanneer u flexibiliteit nodig heeft en uw personeelsbehoefte schommelt."
      },
      {
        type: "checklist",
        title: "Uitzenden past bij u als",
        variant: "benefits",
        items: [
          { text: "U wisselende drukte heeft door seizoenen, evenementen of weekendpieken" },
          { text: "U snel personeel nodig heeft bij ziekte of uitval" },
          { text: "U nog niet weet hoeveel personeel u structureel nodig heeft" },
          { text: "U een nieuwe zaak opent en eerst flexibel wilt opschalen" },
          { text: "U extra handen nodig heeft voor een specifieke periode (terras, feestdagen)" }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        title: "Flexpool opbouwen",
        content: "Bij regelmatig uitzenden is het verstandig om een vaste flexpool op te bouwen: een groep medewerkers die uw zaak al kennen en op afroep beschikbaar zijn. Dat combineert de flexibiliteit van uitzenden met de vertrouwdheid van vast personeel."
      },
      {
        type: "relatedLink",
        href: "/diensten/uitzenden",
        text: "Meer over uitzenden bij TopTalent Jobs"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wanneer kiest u voor detachering?"
      },
      {
        type: "paragraph",
        content: "Detachering is de betere optie wanneer u een stabiel team wilt opbouwen zonder direct de verantwoordelijkheid van een vast dienstverband."
      },
      {
        type: "checklist",
        title: "Detachering past bij u als",
        variant: "benefits",
        items: [
          { text: "U een vaste functie wilt invullen maar eerst de match wilt testen" },
          { text: "U een ervaren kok, sous-chef of bedrijfsleider zoekt voor langere tijd" },
          { text: "U het werkgeverschap (administratie, verzuim, contracten) wilt uitbesteden" },
          { text: "U een medewerker wilt die volledig integreert in uw team en cultuur" },
          { text: "U op termijn de mogelijkheid wilt om de medewerker in vaste dienst te nemen" }
        ]
      },
      {
        type: "highlight",
        variant: "info",
        title: "Overnameregeling",
        content: "Bij detachering is het gebruikelijk dat u de medewerker na een afgesproken periode in vaste dienst kunt nemen. De voorwaarden hiervoor worden vooraf vastgelegd. Bij TopTalent Jobs bespreken wij dit transparant bij aanvang van de samenwerking."
      },
      {
        type: "relatedLink",
        href: "/diensten/detachering",
        text: "Meer over detachering bij TopTalent Jobs"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "De kosten vergeleken"
      },
      {
        type: "paragraph",
        content: "Het uurtarief bij uitzenden is doorgaans hoger dan bij detachering. Dat komt doordat bij uitzenden meer flexibiliteit is ingeprijsd: kortere opzegtermijnen, wisselende inzet en hogere administratieve kosten per uur."
      },
      {
        type: "paragraph",
        content: "Bij detachering zijn de kosten per uur lager, maar u committeert zich voor een langere periode. De totale kosten hangen af van uw specifieke situatie: het aantal uren, de duur, de functie en het ervaringsniveau."
      },
      {
        type: "relatedLink",
        href: "/kosten-calculator",
        text: "Bereken de kosten voor uw specifieke situatie"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Combineren kan ook"
      },
      {
        type: "paragraph",
        content: "Veel horecaondernemers combineren uitzenden en detachering. De kern van uw team — koks, vaste bediening, bedrijfsleiding — plaatst u via detachering. Voor piekdrukte, weekenden en evenementen schakelt u uitzendkrachten in."
      },
      {
        type: "paragraph",
        content: "Deze hybride aanpak geeft u het beste van twee werelden: stabiliteit in de basis en flexibiliteit voor schommelingen."
      },
      {
        type: "relatedLink",
        href: "/diensten",
        text: "Bekijk al onze personeelsdiensten"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Veelgestelde vragen"
      },
      {
        type: "heading3",
        content: "Kan ik van uitzenden overstappen naar detachering?"
      },
      {
        type: "paragraph",
        content: "Ja. Als een uitzendkracht goed functioneert en u hem of haar structureel wilt inzetten, kan de constructie omgezet worden naar detachering. De medewerker blijft in dienst bij het bureau, maar de contractvorm verandert."
      },
      {
        type: "heading3",
        content: "Wat als de gedetacheerde medewerker niet past?"
      },
      {
        type: "paragraph",
        content: "Bij detachering is er doorgaans een proefperiode of evaluatiemoment ingebouwd. Voldoet de medewerker niet, dan zoekt het bureau een vervanging. De exacte voorwaarden worden vooraf vastgelegd in de overeenkomst."
      },
      {
        type: "heading3",
        content: "Is detachering duurder dan zelf werven?"
      },
      {
        type: "paragraph",
        content: "Op het eerste gezicht betaalt u meer per uur. Maar zelf werven brengt kosten mee die vaak worden onderschat: vacatureplaatsing, gesprekken, inwerken, administratie, en het risico van een mismatch. Bij detachering zijn deze kosten inbegrepen."
      },
      {
        type: "heading3",
        content: "Hoe lang duurt het om een gedetacheerde te plaatsen?"
      },
      {
        type: "paragraph",
        content: "Dat hangt af van de functie en het ervaringsniveau. Voor bediening en barwerk is plaatsing vaak binnen een week mogelijk. Voor gespecialiseerde functies zoals een sous-chef of bedrijfsleider kan het langer duren omdat de selectie zorgvuldiger is."
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samenvatting",
        points: [
          "Uitzenden biedt maximale flexibiliteit en is geschikt voor piekdrukte, seizoen en vervanging",
          "Detachering biedt stabiliteit en is geschikt voor structurele functies en teamopbouw",
          "Het uurtarief bij uitzenden is hoger, maar u kunt per dienst opschalen en afschalen",
          "Bij detachering zijn de kosten per uur lager bij langere inzet",
          "Combineren van beide vormen geeft de meeste flexibiliteit voor horecaondernemers"
        ]
      },
      {
        type: "cta",
        title: "Welke vorm past bij uw zaak?",
        description: "Wij adviseren u graag over de juiste personeelsoplossing. Of het nu uitzenden, detachering of een combinatie is — wij denken mee.",
        primaryLink: { href: "/diensten/uitzenden", text: "Uitzenden bekijken" },
        secondaryLink: { href: "/diensten/detachering", text: "Detachering bekijken" },
        variant: "orange"
      }
    ]
  },

  // ============================================================
  // ARTICLE 19: Horecapersoneel Amsterdam
  // ============================================================
  "horecapersoneel-amsterdam": {
    title: "Horecapersoneel Amsterdam: markt, tarieven en beschikbaarheid",
    metaTitle: "Horecapersoneel Amsterdam | Markt & tarieven",
    excerpt: "Hoe vindt u horecapersoneel in Amsterdam? Overzicht van de arbeidsmarkt, gangbare tarieven, beschikbaarheid per seizoen en praktische tips.",
    category: "Lokaal",
    author: "TopTalent Team",
    date: "14 mei 2025",
    datePublished: "2025-05-14",
    image: "/images/blog-personeelstekort.jpg",
    relatedSlugs: ["horecapersoneel-kosten-per-uur", "personeelstekort-horeca-oplossen"],
    blocks: [
      {
        type: "paragraph",
        content: "Amsterdam is de grootste horecastad van Nederland. Met ruim 4.000 horecagelegenheden, een continue stroom toeristen en een bruisend evenementenleven is de vraag naar horecapersoneel hier het hoogst — en het aanbod het krapst."
      },
      {
        type: "paragraph",
        content: "In dit artikel geven wij een overzicht van de Amsterdamse horecaarbeidsmarkt: wat u kunt verwachten qua beschikbaarheid, welke tarieven gangbaar zijn, en hoe u in deze competitieve markt toch aan goed personeel komt."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "De Amsterdamse horecaarbeidsmarkt"
      },
      {
        type: "paragraph",
        content: "Amsterdam kent een unieke dynamiek die de personeelsmarkt beïnvloedt:"
      },
      {
        type: "list",
        items: [
          "**Hoge vraag** — Restaurants, hotels, bars, clubs, cateraars en evenementenlocaties concurreren om dezelfde pool medewerkers",
          "**Hoge kosten van levensonderhoud** — Wonen in Amsterdam is duur, waardoor potentiële medewerkers uitwijken naar randgemeenten of andere steden",
          "**Internationaal personeelsbestand** — Een groot deel van het Amsterdamse horecapersoneel is internationaal, met name in de keuken en achter de bar",
          "**Seizoenspieken** — De zomermaanden, Koningsdag, Pride, ADE en de decemberperiode zorgen voor extreme vraagpieken",
          "**Hoog verloop** — De combinatie van hoge druk en veel alternatieven leidt tot bovengemiddeld verloop"
        ]
      },
      {
        type: "highlight",
        variant: "info",
        title: "Krapte in perspectief",
        content: "Het personeelstekort in de Amsterdamse horeca is structureel. Veel ondernemers geven aan dat zij vacatures maanden openstaan hebben. Een gespecialiseerd uitzendbureau met een lokale pool biedt vaak de snelste oplossing."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Tarieven in Amsterdam"
      },
      {
        type: "paragraph",
        content: "De tarieven voor horecapersoneel liggen in Amsterdam gemiddeld 5 tot 15% hoger dan in andere Nederlandse steden. Dit komt door de hogere vraag, het beperkte aanbod en de hogere levenskosten."
      },
      {
        type: "priceTable",
        title: "Indicatie uurtarieven Amsterdam · uitzendkrachten 2025",
        rows: [
          { item: "Bedieningsmedewerker", price: "€27 – €35", note: "per uur" },
          { item: "Bartender", price: "€28 – €37", note: "per uur" },
          { item: "Zelfstandig werkend kok", price: "€32 – €45", note: "per uur" },
          { item: "Afwasser / keukenhulp", price: "€24 – €30", note: "per uur" },
          { item: "Gastheer/gastvrouw", price: "€27 – €34", note: "per uur" },
          { item: "Evenementenmedewerker", price: "€27 – €38", note: "per uur" }
        ],
        footer: "All-in tarieven, inclusief loon, premies, verzekeringen en administratie. Avond-, weekend- en feestdagtoeslagen komen hier bovenop."
      },
      {
        type: "paragraph",
        content: "De variatie hangt af van ervaring, taalvaardigheid, functie en het type zaak. Fine dining hanteert hogere tarieven dan een lunchzaak."
      },
      {
        type: "relatedLink",
        href: "/kosten-calculator",
        text: "Bereken de kosten voor uw situatie in Amsterdam"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Beschikbaarheid per seizoen"
      },
      {
        type: "paragraph",
        content: "De beschikbaarheid van horecapersoneel in Amsterdam fluctueert sterk door het jaar:"
      },
      {
        type: "timeline",
        title: "Seizoenspatroon Amsterdam",
        steps: [
          { title: "Januari – maart (rustig)", description: "Na de feestdagen is de beschikbaarheid relatief goed. Dit is het beste moment om een vaste flexpool op te bouwen of gedetacheerd personeel te zoeken." },
          { title: "April – juni (opbouw)", description: "Vanaf Koningsdag neemt de drukte toe. Terrassen openen, festivals starten. Vraag stijgt snel, tijdig reserveren van personeel is verstandig." },
          { title: "Juli – augustus (piek)", description: "Zomerterras, toeristendrukte, festivals. De beschikbaarheid is het laagst. Last-minute aanvragen zijn moeilijker in te vullen." },
          { title: "September – oktober (herfstpiek)", description: "ADE, congresperiode en zakelijke evenementen. Tweede piek in het jaar, met name voor evenementenpersoneel." },
          { title: "November – december (feestmaand)", description: "Kerstdiners, bedrijfsfeesten, oud-en-nieuw. De derde piek, waarbij vooral koks en bediening schaars zijn." }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        title: "Vroeg plannen loont",
        content: "Horecaondernemers die hun personeelsbehoefte per kwartaal vooruit plannen en een samenwerking met een uitzendbureau onderhouden, hebben bij piekdrukte voorrang op beschikbare medewerkers."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Hoe vindt u horecapersoneel in Amsterdam?"
      },
      {
        type: "paragraph",
        content: "De meest effectieve aanpakken in de Amsterdamse markt:"
      },
      {
        type: "checklist",
        title: "Effectieve wervingskanalen",
        variant: "steps",
        items: [
          { text: "**Gespecialiseerd horeca-uitzendbureau** — Met een lokale pool van gescreende medewerkers die Amsterdam kennen. De snelste optie." },
          { text: "**Eigen netwerk en team** — Vraag uw huidige medewerkers om referenties. In de horeca werkt mond-tot-mondreclame sterk." },
          { text: "**Horecaplatforms** — Platforms als Hospitality.nl en horecavacaturebanken bereiken actief zoekende kandidaten." },
          { text: "**Social media** — Instagram en Facebook werken goed voor het bereiken van jong horecatalent in Amsterdam." },
          { text: "**Internationaal werven** — Veel Amsterdamse horecazaken werken succesvol met Engelstalig personeel, met name in de keuken en achter de bar." }
        ]
      },
      {
        type: "relatedLink",
        href: "/locaties/amsterdam",
        text: "Horecapersoneel in Amsterdam via TopTalent Jobs"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Tips voor Amsterdamse horecaondernemers"
      },
      {
        type: "list",
        items: [
          "**Bied een competitief tarief** — In een krappe markt maken enkele euro's per uur het verschil bij het aantrekken van goede medewerkers",
          "**Zorg voor goede bereikbaarheid** — Medewerkers vanuit randgemeenten willen weten hoe ze uw zaak bereiken, zeker bij late diensten",
          "**Maaltijden en sfeer** — Kleine extra's als een goede personeelsmaaltijd en een prettige sfeer verlagen het verloop aanzienlijk",
          "**Bouw relaties** — Behandel uitzendkrachten als teamleden. Wie zich welkom voelt, komt terug",
          "**Combineer vast en flex** — Een kern van vaste medewerkers aangevuld met een flexibele schil is het meest robuuste model voor Amsterdam"
        ]
      },
      {
        type: "relatedLink",
        href: "/blog/personeelstekort-horeca-oplossen",
        text: "Meer strategieën tegen personeelstekort in de horeca"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Veelgestelde vragen"
      },
      {
        type: "heading3",
        content: "Waarom zijn de tarieven in Amsterdam hoger?"
      },
      {
        type: "paragraph",
        content: "De combinatie van hoge vraag, beperkt aanbod en hogere levenskosten drijft de tarieven op. Medewerkers hebben in Amsterdam meer keuze en verwachten een tarief dat de hogere kosten van wonen en reizen compenseert."
      },
      {
        type: "heading3",
        content: "Kan ik ook Engelstalig personeel inhuren?"
      },
      {
        type: "paragraph",
        content: "Ja. Een groot deel van het Amsterdamse horecapersoneel is internationaal. Veel zaken in het centrum, de Zuidas en rond hotels werken standaard met Engelstalig personeel. Geef bij uw aanvraag aan welke taalvereisten u heeft."
      },
      {
        type: "heading3",
        content: "Hoe snel kan ik personeel krijgen in Amsterdam?"
      },
      {
        type: "paragraph",
        content: "Via een gespecialiseerd uitzendbureau met een Amsterdamse pool vaak dezelfde dag of de volgende dag. In de piekperiodes (zomer, ADE, december) is vroegtijdig plannen aan te raden."
      },
      {
        type: "heading3",
        content: "Levert TopTalent Jobs ook personeel voor de Zuidas?"
      },
      {
        type: "paragraph",
        content: "Ja. Wij leveren horecapersoneel in heel Amsterdam, inclusief Zuidas, centrum, de Pijp, Oud-Zuid, Noord en Oost. Wij kennen de specifieke eisen van zakelijke locaties, hotels en restaurants in elk stadsdeel."
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samenvatting",
        points: [
          "Amsterdam is de krapste horecaarbeidsmarkt van Nederland met de hoogste tarieven",
          "Uurtarieven liggen 5–15% hoger dan in andere steden",
          "Beschikbaarheid fluctueert sterk per seizoen, met pieken in zomer, ADE-periode en december",
          "Een samenwerking met een gespecialiseerd uitzendbureau geeft voorrang bij piekdrukte",
          "Combineer vast en flex personeel voor het meest robuuste model"
        ]
      },
      {
        type: "cta",
        title: "Horecapersoneel nodig in Amsterdam?",
        description: "Wij hebben een vaste pool van gescreende horecamedewerkers in Amsterdam en omgeving. Vraag personeel aan of bekijk de mogelijkheden.",
        primaryLink: { href: "/locaties/amsterdam", text: "Amsterdam bekijken" },
        secondaryLink: { href: "/personeel-aanvragen", text: "Personeel aanvragen" },
        variant: "orange"
      }
    ]
  },

  // ============================================================
  // ARTICLE 20: Personeelsplanning horeca tips
  // ============================================================
  "personeelsplanning-horeca-tips": {
    title: "Personeelsplanning horeca: tips voor minder stress en betere bezetting",
    metaTitle: "Personeelsplanning horeca | Praktische tips",
    excerpt: "Praktische tips voor een betere personeelsplanning in de horeca. Voorkom onderbezetting, verlaag stress en optimaliseer uw roostering.",
    category: "Management",
    author: "TopTalent Team",
    date: "14 mei 2025",
    datePublished: "2025-05-14",
    image: "/images/blog-personeelsplanning.jpg",
    relatedSlugs: ["horeca-personeelsplanning-rooster-tips", "no-shows-horeca-voorkomen"],
    blocks: [
      {
        type: "paragraph",
        content: "Een goede personeelsplanning is het fundament van een draaiende horecazaak. Toch is het een van de grootste stressfactoren voor ondernemers: te weinig mensen op drukke momenten, te veel personeel op rustige dagen, en het eeuwige puzzelen met beschikbaarheid."
      },
      {
        type: "paragraph",
        content: "In dit artikel delen wij praktische tips die u direct kunt toepassen om uw planning te verbeteren. Geen theoretische modellen, maar aanpakken die werken in de dagelijkse horecapraktijk."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Begin bij de basis: ken uw patronen"
      },
      {
        type: "paragraph",
        content: "Voordat u aan een rooster begint, heeft u inzicht nodig in uw eigen bedrijfspatronen. Veel horecaondernemers plannen op gevoel, terwijl hun kassasysteem al de data bevat die zij nodig hebben."
      },
      {
        type: "checklist",
        title: "Analyseer uw bedrijfspatronen",
        variant: "steps",
        items: [
          { text: "**Omzet per dagdeel** — Op welke dagdelen draait u de meeste omzet? Stem uw bezetting hierop af" },
          { text: "**Drukte per dag van de week** — Maandag is geen zaterdag. Differentieer uw bezetting per dag" },
          { text: "**Seizoenspatronen** — Terrasseizoen, feestdagen, zomervakantie: ken uw pieken en dalen" },
          { text: "**Reserveringsdata** — Gebruik uw reserveringssysteem als voorspeller voor de bezettingsbehoefte" },
          { text: "**Historische uitval** — Hoeveel ziekmeldingen of no-shows heeft u gemiddeld per maand?" }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        title: "Data gebruiken",
        content: "De meeste kassasystemen bieden rapporten per uur, per dag en per maand. Exporteer deze data en leg ze naast uw rooster. U zult patronen ontdekken die uw planning direct verbeteren."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Bouw uw rooster in lagen"
      },
      {
        type: "paragraph",
        content: "Een effectief horecatrooster bestaat uit drie lagen:"
      },
      {
        type: "heading3",
        content: "Laag 1: De vaste kern"
      },
      {
        type: "paragraph",
        content: "Uw vaste medewerkers vormen de basis. Zij kennen de zaak, het menu, de werkwijze. Plan hen in op de diensten die structureel bezet moeten zijn. De vaste kern moet uw minimumdraai kunnen garanderen."
      },
      {
        type: "heading3",
        content: "Laag 2: De flexibele schil"
      },
      {
        type: "paragraph",
        content: "Boven de vaste kern komt de flexibele schil: uitzendkrachten, oproepkrachten of parttimers die op drukke momenten bijspringen. Deze groep schakelt u in op basis van verwachte drukte."
      },
      {
        type: "heading3",
        content: "Laag 3: De noodreserve"
      },
      {
        type: "paragraph",
        content: "De derde laag is uw vangnet bij onverwachte uitval: een samenwerking met een uitzendbureau dat op korte termijn kan leveren, of collega-ondernemers met wie u personeel kunt delen."
      },
      {
        type: "relatedLink",
        href: "/diensten/uitzenden",
        text: "Een flexibele schil opbouwen met uitzendpersoneel"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Praktische tips voor de dagelijkse planning"
      },
      {
        type: "heading3",
        content: "1. Publiceer het rooster minstens 1 week vooraf"
      },
      {
        type: "paragraph",
        content: "Hoe eerder medewerkers hun rooster kennen, hoe minder last-minute wijzigingen en uitval. Streef naar 2 weken vooruit, met 1 week als absoluut minimum."
      },
      {
        type: "heading3",
        content: "2. Plan een buffer op drukke diensten"
      },
      {
        type: "paragraph",
        content: "Reken bij verwachte drukte altijd 1 persoon extra mee. De kosten van een extra medewerker op een drukke avond zijn lager dan de kosten van onderbezetting: langere wachttijden, lagere gasttevredenheid en overbelaste medewerkers."
      },
      {
        type: "heading3",
        content: "3. Gebruik een digitaal planningssysteem"
      },
      {
        type: "paragraph",
        content: "Papieren roosters en WhatsApp-groepen zijn foutgevoelig. Een planningsapp geeft overzicht, laat medewerkers zelf beschikbaarheid opgeven en stuurt automatische herinneringen."
      },
      {
        type: "heading3",
        content: "4. Maak beschikbaarheid bespreekbaar"
      },
      {
        type: "paragraph",
        content: "Vraag uw team wekelijks naar hun beschikbaarheid. Medewerkers die voelen dat er ruimte is voor persoonlijke wensen, zijn betrouwbaarder in hun aanwezigheid."
      },
      {
        type: "heading3",
        content: "5. Evalueer maandelijks"
      },
      {
        type: "paragraph",
        content: "Vergelijk maandelijks uw geplande bezetting met de werkelijke drukte. Waar was u overbezet? Waar onderbezet? Pas uw basisplanning aan op basis van deze evaluatie."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Kosten van slechte planning"
      },
      {
        type: "paragraph",
        content: "Slechte personeelsplanning kost meer dan alleen stress. De financiële impact is meetbaar:"
      },
      {
        type: "list",
        items: [
          "**Onderbezetting** — Langere wachttijden leiden tot lagere gasttevredenheid en minder herhalingsbezoek",
          "**Overbezetting** — Onnodige loonkosten op rustige momenten drukken uw marge",
          "**Hoog verloop** — Medewerkers die structureel overbelast zijn of onregelmatig worden ingeroosterd, vertrekken sneller",
          "**Last-minute oplossingen** — Spoedaanvragen bij een uitzendbureau zijn duurder dan structurele afspraken",
          "**Uitval** — Overwerkte medewerkers worden vaker ziek, wat de planning verder verstoort"
        ]
      },
      {
        type: "relatedLink",
        href: "/kosten-calculator",
        text: "Bereken wat een optimale personeelsmix kost"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Flexibele schil organiseren"
      },
      {
        type: "paragraph",
        content: "De flexibele schil is het verschil tussen stress en rust in uw planning. Zo organiseert u het:"
      },
      {
        type: "checklist",
        title: "Opbouw flexibele schil",
        variant: "benefits",
        items: [
          { text: "Sluit een raamovereenkomst met een horeca-uitzendbureau voor vaste tarieven en prioriteit" },
          { text: "Bouw een pool van 3–5 vertrouwde uitzendkrachten die uw zaak kennen" },
          { text: "Plan de flexibele schil standaard in voor weekenden en bekende piekdagen" },
          { text: "Gebruik de flexpool ook als vangnet bij ziekmeldingen en onverwachte drukte" }
        ]
      },
      {
        type: "relatedLink",
        href: "/blog/no-shows-horeca-voorkomen",
        text: "Zo voorkomt u no-shows en uitval"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Veelgestelde vragen"
      },
      {
        type: "heading3",
        content: "Hoe ver vooruit moet ik plannen?"
      },
      {
        type: "paragraph",
        content: "Publiceer uw basisrooster minstens 1 week vooraf, liefst 2 weken. Voor grote evenementen of seizoenspieken is 4–6 weken vooruit verstandig. Dit geeft u én uw medewerkers rust."
      },
      {
        type: "heading3",
        content: "Hoeveel extra personeel moet ik inplannen als buffer?"
      },
      {
        type: "paragraph",
        content: "Een vuistregel is 1 extra medewerker per 4–5 geplande medewerkers op drukke diensten. Dus bij een team van 8 op een zaterdagavond: plan 9–10 in. De kosten van die extra uren zijn lager dan de impact van onderbezetting."
      },
      {
        type: "heading3",
        content: "Welke planningssoftware is geschikt voor horeca?"
      },
      {
        type: "paragraph",
        content: "Er zijn diverse tools op de markt, van eenvoudig tot uitgebreid. Kies een systeem dat past bij uw teamgrootte en budget. De belangrijkste functies: beschikbaarheidsregistratie, automatische herinneringen en een mobiele app voor medewerkers."
      },
      {
        type: "heading3",
        content: "Hoe ga ik om met medewerkers die altijd dezelfde dagen willen?"
      },
      {
        type: "paragraph",
        content: "Maak afspraken over een eerlijke verdeling van populaire en minder populaire diensten. Communiceer dit helder en pas het consequent toe. Medewerkers accepteren wisselende diensten beter als de verdeling transparant en eerlijk is."
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samenvatting",
        points: [
          "Analyseer uw bedrijfspatronen op basis van data, niet op gevoel",
          "Bouw uw rooster in drie lagen: vaste kern, flexibele schil en noodreserve",
          "Publiceer roosters minstens 1 week vooraf en plan een buffer op drukke diensten",
          "Gebruik een digitaal planningssysteem voor overzicht en herinneringen",
          "Organiseer een flexibele schil via een uitzendbureau voor betrouwbare opschaling"
        ]
      },
      {
        type: "cta",
        title: "Hulp bij uw personeelsplanning?",
        description: "Wij denken mee over de juiste mix van vast en flex personeel. Bereken direct uw kosten of vraag personeel aan.",
        primaryLink: { href: "/kosten-calculator", text: "Kosten berekenen" },
        secondaryLink: { href: "/diensten/uitzenden", text: "Flexibele schil opbouwen" },
        variant: "dark"
      }
    ]
  },

  // ============================================================
  // ARTICLE 21: Kok inhuren tips
  // ============================================================
  "kok-inhuren-tips": {
    title: "Kok inhuren: waar let u op bij tijdelijk keukenpersoneel?",
    metaTitle: "Kok inhuren | Tips voor tijdelijk keukenpersoneel",
    excerpt: "Tijdelijk een kok inhuren voor uw restaurant, evenement of catering? Waar let u op bij selectie, briefing en samenwerking? Praktische tips.",
    category: "Functies",
    author: "TopTalent Team",
    date: "14 mei 2025",
    datePublished: "2025-05-14",
    image: "/images/blog-horecapersoneel-inhuren.jpg",
    relatedSlugs: ["horecapersoneel-inhuren-gids-2025", "horecapersoneel-kosten-per-uur"],
    blocks: [
      {
        type: "paragraph",
        content: "Een kok inhuren is niet hetzelfde als een bedieningsmedewerker inhuren. De keuken is het hart van uw zaak en een mismatch is direct voelbaar: in de kwaliteit van de gerechten, het tempo van de service en de sfeer in het team."
      },
      {
        type: "paragraph",
        content: "Toch zijn er veel situaties waarin tijdelijk keukenpersoneel de beste oplossing is. In dit artikel bespreken wij waar u op moet letten bij het inhuren van een kok — van selectie tot samenwerking op de werkvloer."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Wanneer huurt u een kok in?"
      },
      {
        type: "paragraph",
        content: "De meest voorkomende situaties waarin horecaondernemers tijdelijk keukenpersoneel zoeken:"
      },
      {
        type: "checklist",
        title: "Typische scenario's",
        variant: "checklist",
        items: [
          { text: "Uw vaste kok is ziek of op vakantie en u heeft een vervanging nodig", checked: true },
          { text: "U heeft een groot evenement, catering of banquet waarvoor extra keukencapaciteit nodig is", checked: true },
          { text: "Uw zaak is in een opstartfase en u wilt eerst flexibel keukenpersoneel testen", checked: true },
          { text: "U zoekt een specifiek profiel (patissier, wok-kok, sushi) dat u niet in huis heeft", checked: true },
          { text: "Seizoensdrukte: terrasperiode, feestdagen of zomerseizoen vragen om extra capaciteit", checked: true }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Waar let u op bij de selectie?"
      },
      {
        type: "paragraph",
        content: "Niet elke kok past in elke keuken. De selectie van tijdelijk keukenpersoneel vraagt om specifieke aandacht voor de volgende punten:"
      },
      {
        type: "heading3",
        content: "Niveau en ervaring"
      },
      {
        type: "paragraph",
        content: "Wees helder over het niveau dat u zoekt. Een zelfstandig werkend kok die een keuken kan aansturen is een ander profiel dan een commis die ondersteunt. Geef bij uw aanvraag aan welk niveau u nodig heeft en welk type gerechten bereid moet worden."
      },
      {
        type: "heading3",
        content: "Type keuken"
      },
      {
        type: "paragraph",
        content: "Een kok met ervaring in een bistro werkt anders dan een kok uit een fine dining keuken of een cateringomgeving. Hoe beter het profiel aansluit bij uw keukenstijl, hoe sneller de kok productief is."
      },
      {
        type: "heading3",
        content: "Zelfstandigheid"
      },
      {
        type: "paragraph",
        content: "Een tijdelijke kok heeft minder tijd om ingewerkt te worden. Zoek iemand die zelfstandig kan werken, initiatief neemt en snel kan schakelen. Ervaren uitzendkrachten in de keuken zijn hier doorgaans goed in: zij zijn gewend om in wisselende omgevingen te functioneren."
      },
      {
        type: "heading3",
        content: "Hygiëne en certificeringen"
      },
      {
        type: "paragraph",
        content: "Controleer of de kok beschikt over actuele kennis van voedselveiligheid. Veel uitzendbureaus screenen hier standaard op. Bij specifieke eisen — zoals allergenenbeheer of HACCP-kennis — geeft u dit bij uw aanvraag aan."
      },
      {
        type: "relatedLink",
        href: "/functies/kok-inhuren",
        text: "Bekijk ons aanbod koks en keukenpersoneel"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "De briefing: cruciaal voor een goede start"
      },
      {
        type: "paragraph",
        content: "Een goede briefing maakt het verschil tussen een stressvolle en een soepele dienst. Neem bij aankomst van de tijdelijke kok de tijd voor het volgende:"
      },
      {
        type: "checklist",
        title: "Briefing-checklist keukenpersoneel",
        variant: "steps",
        items: [
          { text: "**Menukaart en mise en place** — Loop de kaart door, wijs de mise en place aan en bespreek eventuele dagspecials" },
          { text: "**Werkplekindeling** — Waar staat wat? Welke apparatuur wordt gebruikt? Waar zijn de voorraadruimtes?" },
          { text: "**Allergenen en dieetwensen** — Hoe gaat uw keuken om met allergenen? Zijn er vaste protocollen?" },
          { text: "**Teamrollen** — Stel de kok voor aan het keukenteam en bespreek wie welke sectie doet" },
          { text: "**Huisregels** — Dresscode, pauzetijden, rookbeleid, telefoongebruik" },
          { text: "**Verwachtingen** — Tempo, kwaliteitsstandaard, presentatie van gerechten" }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        title: "Bereid een briefingsheet voor",
        content: "Maak een beknopt A4-document met uw menukaart, werkplekindeling, huisregels en contactpersonen. Dit bespaart tijd bij elke nieuwe inval-kok en voorkomt herhaalde vragen."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Kosten van een tijdelijke kok"
      },
      {
        type: "paragraph",
        content: "De kosten variëren sterk per niveau en ervaringsjaren:"
      },
      {
        type: "priceTable",
        title: "Indicatie uurtarieven keukenpersoneel · uitzendkrachten 2025",
        rows: [
          { item: "Afwasser / keukenhulp", price: "€22 – €28", note: "per uur" },
          { item: "Commis / hulpkok", price: "€24 – €32", note: "per uur" },
          { item: "Zelfstandig werkend kok", price: "€30 – €42", note: "per uur" },
          { item: "Sous-chef", price: "€35 – €48", note: "per uur" },
          { item: "Chef-kok (interim)", price: "€40 – €55", note: "per uur" }
        ],
        footer: "All-in tarieven via uitzendbureau, inclusief loon, premies en administratie. Toeslagen voor avond/weekend komen hier bovenop."
      },
      {
        type: "relatedLink",
        href: "/kosten-calculator",
        text: "Bereken de kosten voor keukenpersoneel in uw situatie"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Uitzendbureau vs. zelf zoeken"
      },
      {
        type: "paragraph",
        content: "U kunt zelf een kok zoeken via uw netwerk of via vacatureplatforms. Het voordeel: u kiest zelf. Het nadeel: het kost tijd, de screening ligt bij u, en bij een mismatch of no-show staat u er alleen voor."
      },
      {
        type: "paragraph",
        content: "Een gespecialiseerd horeca-uitzendbureau heeft een pool van gescreende koks die direct inzetbaar zijn. Bij een mismatch of uitval regelt het bureau vervanging. U betaalt een hoger uurtarief, maar de risico's en administratie liggen bij het bureau."
      },
      {
        type: "relatedLink",
        href: "/diensten/uitzenden",
        text: "Hoe uitzenden van keukenpersoneel werkt"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Veelgestelde vragen"
      },
      {
        type: "heading3",
        content: "Hoe snel kan ik een kok inhuren?"
      },
      {
        type: "paragraph",
        content: "Via een uitzendbureau met een actieve keukenpool vaak binnen 24 uur. Voor gespecialiseerde functies zoals een sous-chef of patissier kan het iets langer duren, afhankelijk van beschikbaarheid."
      },
      {
        type: "heading3",
        content: "Kan ik een kok eerst een proefdraaien laten doen?"
      },
      {
        type: "paragraph",
        content: "Bij uitzenden is de eerste dienst in feite al een proef. Voldoet de kok niet, dan regelt het bureau een vervanging. U zit nergens aan vast. Bij detachering wordt doorgaans een evaluatieperiode afgesproken."
      },
      {
        type: "heading3",
        content: "Wat als de kok mijn keuken niet kent?"
      },
      {
        type: "paragraph",
        content: "Ervaren uitzendkoks zijn gewend snel mee te draaien in nieuwe keukens. Een goede briefing is essentieel — maar een kok met horecaervaring via een uitzendbureau heeft doorgaans maar 15–30 minuten nodig om productief te zijn."
      },
      {
        type: "heading3",
        content: "Kan ik ook een kok inhuren voor een eenmalig evenement?"
      },
      {
        type: "paragraph",
        content: "Ja. Veel koks via een uitzendbureau zijn beschikbaar voor eenmalige inzet: catering, bedrijfsevenementen, bruiloften of pop-up diners. Geef bij uw aanvraag het type evenement en het verwachte aantal gasten aan."
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samenvatting",
        points: [
          "Een kok inhuren vraagt om specifieke aandacht voor niveau, keukenstijl en zelfstandigheid",
          "Een goede briefing bij aankomst voorkomt fouten en versnelt de productiviteit",
          "Tarieven variëren van €22 (keukenhulp) tot €55 (interim chef-kok) per uur all-in",
          "Via een uitzendbureau is vervanging bij mismatch of uitval geregeld",
          "Maak een briefingsheet voor uw keuken — het bespaart tijd bij elke nieuwe kok"
        ]
      },
      {
        type: "cta",
        title: "Kok nodig voor uw keuken?",
        description: "Van keukenhulp tot interim chef-kok. Wij leveren gescreend keukenpersoneel dat snel meedraait in uw keuken.",
        primaryLink: { href: "/functies/kok-inhuren", text: "Kok inhuren" },
        secondaryLink: { href: "/personeel-aanvragen", text: "Personeel aanvragen" },
        variant: "orange"
      }
    ]
  },

  // ============================================================
  // ARTICLE 22: Horecapersoneel Rotterdam
  // ============================================================
  "horecapersoneel-rotterdam": {
    title: "Horecapersoneel Rotterdam: markt, piekmomenten en beschikbaarheid",
    metaTitle: "Horecapersoneel Rotterdam | Markt & tips",
    excerpt: "Horecapersoneel zoeken in Rotterdam? Overzicht van de lokale arbeidsmarkt, piekmomenten, tarieven en tips voor ondernemers in de Maasstad.",
    category: "Lokaal",
    author: "TopTalent Team",
    date: "14 mei 2025",
    datePublished: "2025-05-14",
    image: "/images/blog-personeelstekort.jpg",
    relatedSlugs: ["horecapersoneel-amsterdam", "personeelstekort-horeca-oplossen"],
    blocks: [
      {
        type: "paragraph",
        content: "Rotterdam heeft zich de afgelopen jaren ontwikkeld tot een van de meest dynamische horecalandschappen van Nederland. Van de Markthal tot de Witte de Withstraat, van Katendrecht tot de Kop van Zuid — de Rotterdamse horeca groeit, en daarmee de vraag naar personeel."
      },
      {
        type: "paragraph",
        content: "In dit artikel geven wij een overzicht van de horecaarbeidsmarkt in Rotterdam: welke trends spelen er, wanneer zijn de piekmomenten, en hoe vindt u betrouwbaar personeel?"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "De Rotterdamse horecamarkt"
      },
      {
        type: "paragraph",
        content: "Rotterdam verschilt op een aantal punten van Amsterdam en andere grote steden:"
      },
      {
        type: "list",
        items: [
          "**Groeiende markt** — Nieuwe horecaconcepten openen regelmatig, met name in opkomende wijken als Katendrecht, M4H-gebied en Kralingen",
          "**Havenstad-dynamiek** — De haven en zakelijke evenementen (Ahoy, World Trade Center) creëren specifieke vraag naar catering- en evenementenpersoneel",
          "**Betaalbaarder dan Amsterdam** — De lagere levenskosten trekken horecamedewerkers die in Amsterdam niet meer willen of kunnen wonen",
          "**Diverse keukens** — Rotterdam staat bekend om culinaire diversiteit: Surinaams, Turks, Aziatisch, fusion — dit vraagt om koks met specifieke keukenvaardigheid",
          "**Sterke evenementenkalender** — North Sea Jazz, Wereldhavendagen, Rotterdam Unlimited en IFFR creëren seizoenspieken"
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Piekmomenten in Rotterdam"
      },
      {
        type: "paragraph",
        content: "De vraag naar horecapersoneel fluctueert door het jaar. Kennis van de Rotterdamse piekmomenten helpt u vooruit te plannen:"
      },
      {
        type: "timeline",
        title: "Seizoenspatroon Rotterdam",
        steps: [
          { title: "Januari – maart", description: "Relatief rustig na de feestdagen. Goed moment om een vaste samenwerking met een uitzendbureau op te bouwen en uw flexpool samen te stellen." },
          { title: "April – mei", description: "Terrasdrukte neemt toe. Koningsdag (27 april) is een eerste piek. Bediening en bar zijn het meest gevraagd." },
          { title: "Juni – juli", description: "North Sea Jazz (juli) en zomerdrukte zorgen voor hoge vraag. Evenementenpersoneel en koks zijn schaars. Vroegtijdig boeken is essentieel." },
          { title: "Augustus – september", description: "Wereldhavendagen en terugkeer uit vakantieperiode. De markt trekt weer aan na een korte zomerdip in reguliere horeca." },
          { title: "Oktober – december", description: "Congresperiode, bedrijfsfeesten en kerstdiners. Ahoy-evenementen creëren grote vraag naar catering- en bedienpersoneel." }
        ]
      },
      {
        type: "highlight",
        variant: "tip",
        title: "Plan per kwartaal",
        content: "Rotterdamse horecaondernemers die per kwartaal hun personeelsbehoefte in kaart brengen, ervaren minder stress bij piekdrukte. Combineer uw eigen reserveringsdata met het lokale evenementenkalender."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Tarieven in Rotterdam"
      },
      {
        type: "paragraph",
        content: "De tarieven in Rotterdam liggen iets onder het Amsterdamse niveau, maar boven het landelijk gemiddelde. De Maasstad trekt steeds meer horecatalent, wat de markt competitiever maakt."
      },
      {
        type: "priceTable",
        title: "Indicatie uurtarieven Rotterdam · uitzendkrachten 2025",
        rows: [
          { item: "Bedieningsmedewerker", price: "€25 – €33", note: "per uur" },
          { item: "Bartender", price: "€26 – €35", note: "per uur" },
          { item: "Zelfstandig werkend kok", price: "€30 – €43", note: "per uur" },
          { item: "Afwasser / keukenhulp", price: "€22 – €28", note: "per uur" },
          { item: "Evenementenmedewerker", price: "€26 – €36", note: "per uur" }
        ],
        footer: "All-in tarieven via uitzendbureau. Toeslagen voor avond, weekend en feestdagen conform CAO Horeca."
      },
      {
        type: "relatedLink",
        href: "/kosten-calculator",
        text: "Bereken de kosten voor uw situatie in Rotterdam"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Hoe vindt u horecapersoneel in Rotterdam?"
      },
      {
        type: "paragraph",
        content: "De Rotterdamse markt heeft eigen kenmerken die uw wervingsstrategie beïnvloeden:"
      },
      {
        type: "checklist",
        title: "Effectieve aanpakken",
        variant: "steps",
        items: [
          { text: "**Horeca-uitzendbureau met lokale pool** — Een bureau dat Rotterdam kent en medewerkers heeft die de stad en de typen zaak kennen" },
          { text: "**ROC en hotelscholen** — Rotterdam heeft sterke horecaopleidingen. Stages en bijbanen zijn een goede pipeline voor jong talent" },
          { text: "**Netwerk in de wijk** — Rotterdamse horeca is wijkgebonden. Katendrecht-ondernemers delen soms personeel; de Witte de Withstraat heeft een eigen dynamiek" },
          { text: "**Meertalig werven** — Net als Amsterdam heeft Rotterdam een internationaal personeelsbestand. Engelstalige en meertalige wervingskanalen verbreden uw bereik" }
        ]
      },
      {
        type: "relatedLink",
        href: "/locaties/rotterdam",
        text: "Horecapersoneel in Rotterdam via TopTalent Jobs"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Tips voor Rotterdamse horecaondernemers"
      },
      {
        type: "list",
        items: [
          "**Bied reiskostenvergoeding** — Veel horecamedewerkers wonen buiten Rotterdam-centrum. Een reiskostenvergoeding of OV-vergoeding maakt uw zaak aantrekkelijker",
          "**Benadruk uw concept** — Rotterdam staat bekend om vernieuwende concepten. Medewerkers kiezen bewust voor zaken met een duidelijke identiteit",
          "**Investeer in uw team** — Rotterdamse horecamedewerkers waarderen werkgevers die investeren in ontwikkeling: trainingen, barista-cursussen, wijncertificaten",
          "**Maak gebruik van evenementen** — Grote evenementen als North Sea Jazz trekken tijdelijk extra horecatalent naar de stad. Benader deze medewerkers voor structurele inzet"
        ]
      },
      {
        type: "relatedLink",
        href: "/blog/personeelstekort-horeca-oplossen",
        text: "Meer strategieën tegen personeelstekort"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Veelgestelde vragen"
      },
      {
        type: "heading3",
        content: "Is het makkelijker om personeel te vinden in Rotterdam dan in Amsterdam?"
      },
      {
        type: "paragraph",
        content: "Over het algemeen is het aanbod in Rotterdam iets ruimer dan in Amsterdam, maar het tekort is ook hier structureel. Het voordeel van Rotterdam: de lagere levenskosten trekken medewerkers die in Amsterdam niet meer willen wonen."
      },
      {
        type: "heading3",
        content: "Levert TopTalent Jobs ook personeel voor Ahoy-evenementen?"
      },
      {
        type: "paragraph",
        content: "Ja. Wij leveren evenementenpersoneel voor locaties in heel Rotterdam, inclusief Ahoy, de Kuip, Depot Boijmans, en kleinere eventlocaties. Geef bij uw aanvraag het type evenement en het verwachte aantal gasten aan."
      },
      {
        type: "heading3",
        content: "Zijn er veel internationale koks beschikbaar in Rotterdam?"
      },
      {
        type: "paragraph",
        content: "Ja. Rotterdam heeft een sterk internationaal horecabestand, met name in de keuken. Turkse, Surinaamse, Aziatische en Zuid-Europese koks zijn goed vertegenwoordigd. Geef bij uw aanvraag aan welke keukenstijl u zoekt."
      },
      {
        type: "heading3",
        content: "Hoe ver vooruit moet ik personeel reserveren voor North Sea Jazz?"
      },
      {
        type: "paragraph",
        content: "Minimaal 4–6 weken vooraf. North Sea Jazz is een van de grootste evenementen van het jaar en de vraag naar horecapersoneel is dan extreem hoog. Vroegtijdig contact met een uitzendbureau geeft u de beste kans op voldoende bezetting."
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samenvatting",
        points: [
          "Rotterdam is een groeiende horecamarkt met sterke evenementenpieken",
          "Tarieven liggen iets onder Amsterdam maar boven het landelijk gemiddelde",
          "North Sea Jazz, Wereldhavendagen en de decemberperiode zijn de grootste pieken",
          "Bied reiskostenvergoeding en benadruk uw concept om talent aan te trekken",
          "Plan per kwartaal en bouw vroegtijdig een flexpool op voor piekdrukte"
        ]
      },
      {
        type: "cta",
        title: "Horecapersoneel nodig in Rotterdam?",
        description: "Wij kennen de Rotterdamse horecamarkt en hebben een lokale pool van gescreende medewerkers. Van Markthal tot Ahoy — wij leveren.",
        primaryLink: { href: "/locaties/rotterdam", text: "Rotterdam bekijken" },
        secondaryLink: { href: "/personeel-aanvragen", text: "Personeel aanvragen" },
        variant: "orange"
      }
    ]
  },

  // ============================================================
  // ARTICLE 23: Horecapersoneel behouden retentie
  // ============================================================
  "horecapersoneel-behouden-retentie": {
    title: "Horecapersoneel behouden: retentietips voor werkgevers",
    metaTitle: "Horecapersoneel behouden | Retentietips",
    excerpt: "Hoog verloop in de horeca? Praktische retentietips voor werkgevers om goed personeel te behouden, van onboarding tot waardering.",
    category: "Management",
    author: "TopTalent Team",
    date: "14 mei 2025",
    datePublished: "2025-05-14",
    image: "/images/blog-personeelsplanning.jpg",
    relatedSlugs: ["personeelstekort-horeca-oplossen", "no-shows-horeca-voorkomen"],
    blocks: [
      {
        type: "paragraph",
        content: "Het personeelstekort in de horeca is een veelbesproken probleem. Maar minstens zo belangrijk als het vinden van personeel is het behouden ervan. Hoog verloop kost geld, energie en kwaliteit — en het versterkt het tekort."
      },
      {
        type: "paragraph",
        content: "In dit artikel delen wij concrete retentietips die u als horecaondernemer direct kunt toepassen. Geen theoretische HR-modellen, maar praktische aanpakken die in de dagelijkse horecapraktijk werken."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Waarom verloop in de horeca zo hoog is"
      },
      {
        type: "paragraph",
        content: "De horeca staat bekend om bovengemiddeld verloop. De oorzaken zijn structureel:"
      },
      {
        type: "list",
        items: [
          "**Onregelmatige werktijden** — Avonden, weekenden en feestdagen werken weegt zwaar, zeker bij jonge medewerkers",
          "**Hoge werkdruk** — Piekmomenten vragen veel van lichaam en geest",
          "**Beperkte doorgroeimogelijkheden** — Veel medewerkers zien geen pad naar een hogere functie",
          "**Arbeidsvoorwaarden** — De horeca concurreert met andere sectoren die betere voorwaarden bieden",
          "**Gebrek aan waardering** — Medewerkers die zich niet gezien voelen, vertrekken sneller"
        ]
      },
      {
        type: "highlight",
        variant: "info",
        title: "De kosten van verloop",
        content: "Het vervangen van een horecamedewerker kost naar schatting 50 tot 200% van het maandsalaris aan werving, selectie, inwerken en productiviteitsverlies. Bij een kok of bedrijfsleider kan dit oplopen tot duizenden euro's per vertrek."
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Tip 1: Investeer in onboarding"
      },
      {
        type: "paragraph",
        content: "De eerste weken bepalen of een medewerker blijft of vertrekt. Een slechte start is moeilijk te herstellen."
      },
      {
        type: "checklist",
        title: "Onboarding-checklist",
        variant: "steps",
        items: [
          { text: "**Welkom op de eerste dag** — Stel de medewerker persoonlijk voor aan het team. Geen koude start." },
          { text: "**Buddy-systeem** — Koppel nieuwe medewerkers aan een ervaren collega die hen begeleidt" },
          { text: "**Duidelijke verwachtingen** — Bespreek in de eerste week wat u verwacht en wat de medewerker van u kan verwachten" },
          { text: "**Evalueer na 2 weken** — Een kort gesprek na de inwerkperiode laat zien dat u betrokken bent" }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Tip 2: Bied perspectief"
      },
      {
        type: "paragraph",
        content: "Medewerkers die een toekomst zien in uw zaak, blijven langer. Dat hoeft geen ingewikkeld carrièrepad te zijn:"
      },
      {
        type: "list",
        items: [
          "Laat een barmedewerker doorgroeien naar hoofdbar of cocktailspecialist",
          "Bied een commis de kans om zelfstandig werkend kok te worden",
          "Geef verantwoordelijkheid: voorraad, sluiting, inwerkbuddy, sociale media",
          "Investeer in trainingen: barista-cursus, wijncertificaat, leiderschapstraining",
          "Bespreek ambities — niet iedereen wil doorgroeien, maar iedereen wil gehoord worden"
        ]
      },
      {
        type: "relatedLink",
        href: "/diensten/recruitment",
        text: "Structureel de juiste mensen aantrekken via recruitment"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Tip 3: Waardeer actief"
      },
      {
        type: "paragraph",
        content: "Waardering is de meest onderschatte retentiefactor in de horeca. Het kost niets en levert veel op."
      },
      {
        type: "checklist",
        title: "Vormen van waardering",
        variant: "benefits",
        items: [
          { text: "Zeg regelmatig dank voor goed werk — specifiek, niet generiek" },
          { text: "Vier successen: een goed draaiende avond, een compliment van een gast, een persoonlijk record" },
          { text: "Geef een goede personeelsmaaltijd — het is een klein gebaar met grote impact" },
          { text: "Organiseer af en toe iets buiten werktijd: borrel, uitje, teamdiner" },
          { text: "Behandel uitzendkrachten hetzelfde als vaste medewerkers — wie zich buitengesloten voelt, komt niet terug" }
        ]
      },
      {
        type: "quote",
        quote: "Medewerkers vergeten wat u zegt. Ze onthouden hoe u hen behandelt.",
        variant: "highlight"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Tip 4: Zorg voor een gezond rooster"
      },
      {
        type: "paragraph",
        content: "Het rooster is de grootste bron van ontevredenheid in de horeca. Een eerlijk, voorspelbaar rooster verlaagt verloop:"
      },
      {
        type: "list",
        items: [
          "**Publiceer op tijd** — Minstens 1 week vooraf, liefst 2 weken",
          "**Verdeel eerlijk** — Niet altijd dezelfde mensen op de onpopulaire diensten",
          "**Respecteer vrije dagen** — Als iemand vrij is, is die vrij. Bel niet om te vragen of ze toch kunnen",
          "**Bied ruilmogelijkheid** — Laat medewerkers onderling diensten ruilen, met goedkeuring",
          "**Plan pauzes** — Een keuken zonder pauzes is een keuken met hoog verloop"
        ]
      },
      {
        type: "relatedLink",
        href: "/blog/personeelsplanning-horeca-tips",
        text: "Praktische tips voor een betere personeelsplanning"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Tip 5: Luister en reageer"
      },
      {
        type: "paragraph",
        content: "De meeste vertrekredenen zijn vooraf kenbaar als u de signalen herkent en ernaar vraagt."
      },
      {
        type: "checklist",
        title: "Luisteren in de praktijk",
        variant: "steps",
        items: [
          { text: "**Periodieke 1-op-1 gesprekken** — Niet alleen bij problemen, maar ook als het goed gaat. Vraag hoe het gaat, wat beter kan, wat zij nodig hebben." },
          { text: "**Signalen herkennen** — Minder motivatie, vaker te laat, minder initiatief: dit zijn vroege vertrekindicatoren" },
          { text: "**Actie ondernemen** — Luisteren zonder actie is erger dan niet luisteren. Als iemand aangeeft dat het rooster een probleem is, los het op." },
          { text: "**Exitgesprekken** — Als iemand toch vertrekt: vraag waarom. Niet om te overtuigen, maar om te leren." }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Retentie van uitzendkrachten"
      },
      {
        type: "paragraph",
        content: "Ook uitzendkrachten kunt u behouden. Medewerkers die via een uitzendbureau bij u werken en zich gewaardeerd voelen, vragen zelf om teruggeplaatst te worden. Zo bouwt u een vaste flexpool op van mensen die uw zaak kennen."
      },
      {
        type: "paragraph",
        content: "De beste retentiestrategie voor uitzendkrachten: behandel ze als teamleden, niet als nummers. Geef ze dezelfde briefing, dezelfde personeelsmaaltijd en dezelfde bedanking als uw vaste medewerkers."
      },
      {
        type: "relatedLink",
        href: "/diensten/uitzenden",
        text: "Een vaste flexpool opbouwen via uitzenden"
      },
      {
        type: "divider"
      },
      {
        type: "heading2",
        content: "Veelgestelde vragen"
      },
      {
        type: "heading3",
        content: "Wat is de gemiddelde verblijfsduur in de horeca?"
      },
      {
        type: "paragraph",
        content: "Dit verschilt sterk per functie en type zaak. Bediening en barwerk kennen het hoogste verloop — gemiddeld 6 tot 12 maanden. Keukenpersoneel en leidinggevenden blijven doorgaans langer, vooral bij zaken die investeren in ontwikkeling."
      },
      {
        type: "heading3",
        content: "Helpt een hoger salaris om personeel te behouden?"
      },
      {
        type: "paragraph",
        content: "Een eerlijk salaris is een basisvoorwaarde, maar geen garantie voor retentie. Onderzoek laat consistent zien dat waardering, werksfeer, doorgroeimogelijkheden en roosterkwaliteit minstens zo belangrijk zijn als beloning."
      },
      {
        type: "heading3",
        content: "Hoe behoud ik jonge medewerkers?"
      },
      {
        type: "paragraph",
        content: "Jonge medewerkers hechten veel waarde aan sfeer, flexibiliteit en leermogelijkheden. Bied ze verantwoordelijkheid, luister naar hun ideeën en geef regelmatig feedback. Rigide hiërarchieën werken bij deze groep averechts."
      },
      {
        type: "heading3",
        content: "Kan ik een uitzendkracht in vaste dienst nemen?"
      },
      {
        type: "paragraph",
        content: "Ja. Bij de meeste uitzendbureaus is het mogelijk om een uitzendkracht na een afgesproken periode in vaste dienst te nemen. De voorwaarden worden vooraf vastgelegd. Dit is een veelgebruikte route om een bewezen match vast te leggen."
      },
      {
        type: "divider"
      },
      {
        type: "summary",
        title: "Samenvatting",
        points: [
          "Verloop in de horeca is hoog, maar grotendeels te beïnvloeden door de werkgever",
          "Investeer in onboarding: de eerste weken bepalen of een medewerker blijft",
          "Bied perspectief en doorgroeimogelijkheden, ook in kleine stappen",
          "Actieve waardering kost niets en is de meest onderschatte retentiefactor",
          "Een eerlijk rooster, luisteren en actie ondernemen verlagen het verloop structureel"
        ]
      },
      {
        type: "cta",
        title: "De juiste mensen vinden én behouden",
        description: "Recruitment is stap één. Retentie is stap twee. Wij helpen u bij beide: van werving en selectie tot een vaste flexpool die bij uw team past.",
        primaryLink: { href: "/diensten/recruitment", text: "Recruitment bekijken" },
        secondaryLink: { href: "/contact", text: "Neem contact op" },
        variant: "dark"
      }
    ]
  }
};

// Helper to get all article slugs
export const getAllBlogSlugs = () => Object.keys(blogArticles);

// Helper to get article by slug
export const getBlogArticle = (slug: string) => blogArticles[slug];
