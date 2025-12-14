import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Section from "@/components/Section";

// Blog artikel data met volledige content
const blogArticles: Record<string, {
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  image: string;
  content: string;
  relatedSlugs: string[];
}> = {
  "horecapersoneel-inhuren-gids-2025": {
    title: "Horecapersoneel inhuren: De complete gids voor 2025",
    excerpt: "Alles wat u moet weten over het inhuren van horecapersoneel.",
    category: "Recruitment",
    author: "TopTalent Team",
    date: "14 december 2024",
    image: "/images/dienst-recruitment.png",
    relatedSlugs: ["personeelstekort-horeca-oplossen", "kosten-uitzendkracht-horeca-tarieven"],
    content: `
## Waarom horecapersoneel inhuren via een uitzendbureau?

De horeca is een dynamische branche waar flexibiliteit cruciaal is. Of u nu een restaurant, hotel, café of cateringbedrijf runt, het vinden van goed personeel is vaak een uitdaging. Een gespecialiseerd uitzendbureau zoals TopTalent Jobs kan u helpen met:

- **Snelle beschikbaarheid**: Binnen 24 uur gekwalificeerd personeel
- **Flexibiliteit**: Opschalen bij drukte, afschalen in rustige periodes
- **Geen administratieve lasten**: Wij regelen contracten, loonstroken en verzekeringen
- **Kwaliteitsgarantie**: Alle medewerkers zijn gescreend en ervaren

## Welke opties heeft u voor het inhuren van horecapersoneel?

### 1. Uitzenden
Ideaal voor tijdelijke inzet, piekperiodes of vervanging bij ziekte. U betaalt per gewerkt uur en heeft geen langdurige verplichtingen.

### 2. Detachering
Voor langere periodes waarbij de medewerker exclusief voor u werkt. Meer binding met uw bedrijf, maar nog steeds flexibel.

### 3. Werving & Selectie (Recruitment)
Wij zoeken de perfecte kandidaat voor een vaste aanstelling bij uw bedrijf. U betaalt een eenmalige fee bij succesvolle plaatsing.

## Wat kost het inhuren van horecapersoneel?

De kosten variëren per functie en ervaringsniveau. Gemiddelde uurtarieven via een uitzendbureau:

- **Bediening**: €16 - €22 per uur
- **Barmedewerker**: €17 - €24 per uur
- **Keukenhulp**: €15 - €20 per uur
- **Kok**: €20 - €35 per uur
- **Gastheer/vrouw**: €17 - €23 per uur

*Tarieven zijn inclusief alle werkgeverslasten en onze dienstverlening.*

## Tips voor het succesvol inhuren van horecapersoneel

1. **Plan vooruit**: Wacht niet tot het laatste moment, zeker in drukke periodes
2. **Wees specifiek**: Geef duidelijk aan welke vaardigheden en ervaring u zoekt
3. **Investeer in inwerken**: Ook tijdelijk personeel heeft een goede introductie nodig
4. **Communiceer verwachtingen**: Bespreek huisregels, dresscode en werkwijze
5. **Geef feedback**: Dit helpt het uitzendbureau om steeds beter te matchen

## Waarom kiezen voor TopTalent Jobs?

TopTalent Jobs is 100% gespecialiseerd in de horeca. Wij begrijpen de branche, kennen de uitdagingen en hebben een groot netwerk van gemotiveerde horecamedewerkers.

**Onze voordelen:**
- 24/7 bereikbaar, ook in het weekend
- Persoonlijke aanpak en vaste contactpersoon
- Snelle responstijd: vaak dezelfde dag nog personeel
- Kwaliteitsgarantie met gratis vervanging

Neem vandaag nog contact op voor een vrijblijvend gesprek over uw personeelsbehoefte.
    `,
  },
  "personeelstekort-horeca-oplossen": {
    title: "Personeelstekort horeca oplossen: 7 bewezen strategieën",
    excerpt: "Het personeelstekort in de horeca is een grote uitdaging.",
    category: "HR",
    author: "TopTalent Team",
    date: "12 december 2024",
    image: "/images/dienst-uitzenden.png",
    relatedSlugs: ["horecapersoneel-inhuren-gids-2025", "seizoenspersoneel-horeca-zomer"],
    content: `
## Het personeelstekort in de horeca: feiten en cijfers

De horeca kampt al jaren met een groot personeelstekort. Na de coronapandemie is dit probleem alleen maar groter geworden. Veel ervaren krachten hebben de branche verlaten en zijn niet teruggekeerd.

Toch zijn er effectieve strategieën om dit probleem aan te pakken.

## 7 strategieën om het personeelstekort op te lossen

### 1. Werk samen met een gespecialiseerd uitzendbureau

Een uitzendbureau zoals TopTalent Jobs heeft toegang tot een groot bestand van horecamedewerkers. Wij kunnen snel inspringen bij tekorten en helpen u door drukke periodes.

**Voordelen:**
- Direct toegang tot gekwalificeerd personeel
- Geen wervingskosten
- Flexibel op- en afschalen

### 2. Maak werken in uw zaak aantrekkelijk

Goede arbeidsvoorwaarden, een prettige werksfeer en doorgroeimogelijkheden maken het verschil. Denk aan:

- Marktconform salaris (of beter)
- Flexibele roosters waar mogelijk
- Gratis maaltijden tijdens dienst
- Teamuitjes en personeelsfeesten

### 3. Investeer in opleiding en ontwikkeling

Bied trainingen aan en help medewerkers doorgroeien. Dit vergroot de loyaliteit en maakt uw bedrijf aantrekkelijker voor sollicitanten.

### 4. Kijk naar onbenut arbeidspotentieel

Er zijn groepen die vaak over het hoofd worden gezien:

- Studenten die parttime willen werken
- Gepensioneerden met ervaring
- Zij-instromers uit andere branches
- Mensen met een afstand tot de arbeidsmarkt

### 5. Optimaliseer uw processen

Met slimmer werken kunt u soms met minder mensen toe:

- Efficiëntere keukenindeling
- Digitale bestellingen en betalingen
- Betere personeelsplanning

### 6. Zorg voor goede onboarding

Een nieuwe medewerker die zich welkom voelt, blijft langer. Investeer in een degelijk inwerkprogramma.

### 7. Vraag om referrals

Uw huidige medewerkers kennen vaak anderen in de branche. Beloon hen voor succesvolle doorverwijzingen.

## Hulp nodig bij het vinden van personeel?

TopTalent Jobs helpt horecaondernemers door heel Nederland met het vinden van betrouwbaar personeel. Neem contact op voor een vrijblijvend gesprek.
    `,
  },
  "kosten-uitzendkracht-horeca-tarieven": {
    title: "Wat kost een uitzendkracht in de horeca? Tarieven 2025",
    excerpt: "Een transparant overzicht van de kosten voor het inhuren van uitzendkrachten in de horeca.",
    category: "Uitzenden",
    author: "TopTalent Team",
    date: "10 december 2024",
    image: "/images/dienst-detachering.png",
    relatedSlugs: ["horecapersoneel-inhuren-gids-2025", "detachering-vs-uitzenden-verschil"],
    content: `
## Hoe zijn de tarieven van een uitzendkracht opgebouwd?

Wanneer u een uitzendkracht inhuurt, betaalt u een "all-in" uurtarief. Dit tarief bestaat uit:

- **Bruto uurloon** van de medewerker
- **Werkgeverslasten** (ca. 25-30%): sociale premies, pensioenbijdrage, verzekeringen
- **Reserveringen** (ca. 20%): vakantiegeld, vakantiedagen, feestdagen
- **Bureaumarge** (ca. 15-25%): onze dienstverlening, administratie, werving

## Gemiddelde uurtarieven per functie (2025)

### Bediening & Service
| Functie | Uurtarief |
|---------|-----------|
| Medewerker bediening | €16 - €20 |
| Ervaren bediening | €19 - €23 |
| Gastheer/gastvrouw | €18 - €24 |
| Sommelier | €24 - €32 |

### Bar
| Functie | Uurtarief |
|---------|-----------|
| Barmedewerker | €17 - €21 |
| Bartender | €19 - €25 |
| Cocktail bartender | €22 - €30 |

### Keuken
| Functie | Uurtarief |
|---------|-----------|
| Afwasser | €15 - €18 |
| Keukenhulp | €16 - €20 |
| Kok | €20 - €28 |
| Sous-chef | €26 - €35 |

### Evenementen
| Functie | Uurtarief |
|---------|-----------|
| Cateringmedewerker | €17 - €22 |
| Evenementenhost | €19 - €25 |
| Runner | €16 - €20 |

*Tarieven kunnen variëren op basis van regio, ervaring en specifieke eisen.*

## Factoren die de prijs beïnvloeden

### Ervaring en vaardigheden
Een ervaren kok kost meer dan een keukenhulp, maar is ook direct productief.

### Tijdstip van inzet
Avond-, weekend- en feestdagendiensten kennen toeslagen volgens de CAO Horeca.

### Last-minute aanvragen
Bij spoedaanvragen (< 24 uur) kan een toeslag gelden.

### Volume en frequentie
Bij regelmatige of grote afnames zijn volumekortingen mogelijk.

## Wat bespaart u door een uitzendbureau in te schakelen?

- Geen wervingskosten (vacatures, tijd)
- Geen administratieve lasten
- Geen risico bij ziekte
- Geen ontslagprocedures

## Vrijblijvende offerte aanvragen

Wilt u weten wat horecapersoneel voor uw specifieke situatie kost? Neem contact op met TopTalent Jobs voor een offerte op maat.
    `,
  },
  "werken-uitzendkracht-horeca-salaris": {
    title: "Werken als uitzendkracht in de horeca: salaris en voordelen",
    excerpt: "Overweeg je om als uitzendkracht in de horeca te werken?",
    category: "Carrière",
    author: "TopTalent Team",
    date: "8 december 2024",
    image: "/images/barista.png",
    relatedSlugs: ["horecamedewerker-worden-zonder-ervaring", "meest-gevraagde-horecafuncties-nederland"],
    content: `
## Waarom kiezen voor uitzendwerk in de horeca?

Werken via een uitzendbureau biedt veel voordelen, vooral in de horeca. Of je nu student bent, een carrièreswitch overweegt, of gewoon flexibiliteit zoekt - uitzendwerk kan de perfecte oplossing zijn.

## Voordelen van werken als uitzendkracht

### 1. Flexibiliteit
Je bepaalt zelf wanneer je werkt. Geef je beschikbaarheid door en wij matchen je met passende opdrachten. Ideaal te combineren met studie, zorgtaken of andere werkzaamheden.

### 2. Variatie
Werk bij verschillende horecazaken en doe ervaring op in restaurants, hotels, cafés, cateringbedrijven en evenementen. Zo ontdek je wat het beste bij je past.

### 3. Snel aan de slag
Geen lange sollicitatieprocedures. Na inschrijving en een kennismakingsgesprek kun je vaak binnen een week je eerste opdracht starten.

### 4. Zekerheid
Als uitzendkracht heb je recht op hetzelfde salaris als vaste medewerkers (inlenersbeloning). Daarnaast bouw je vakantiegeld, vakantiedagen en pensioen op.

### 5. Kans op vast werk
Veel horecaondernemers nemen goed presterende uitzendkrachten in vaste dienst. Uitzendwerk is een uitstekende manier om jezelf te bewijzen.

## Wat verdien je als uitzendkracht in de horeca?

Het salaris is gebaseerd op de CAO Horeca en je functie/ervaring:

- **Bediening**: €12 - €15 bruto per uur
- **Bar**: €12,50 - €16 bruto per uur
- **Keuken**: €12 - €20 bruto per uur (afhankelijk van functie)
- **Evenementen**: €12 - €15 bruto per uur

**Extra's:**
- Avondtoeslag (na 20:00)
- Weekendtoeslag
- Feestdagentoeslag (tot 200%)
- Vakantiegeld (8%)

## Hoe schrijf je je in?

Inschrijven bij TopTalent Jobs is gratis en eenvoudig:

1. Vul het online inschrijfformulier in
2. Upload je cv (of bel ons voor hulp)
3. We nemen binnen 48 uur contact op
4. Na een kort kennismakingsgesprek kun je starten

## Veelgestelde vragen

**Moet ik ervaring hebben?**
Nee, ervaring is een plus maar niet vereist. We zoeken vooral gemotiveerde mensen.

**Hoeveel uur moet ik werken?**
Dat bepaal je zelf. Van een paar uur per week tot fulltime is alles mogelijk.

**Krijg ik ook betaald als ik ziek ben?**
Ja, als uitzendkracht heb je recht op doorbetaling bij ziekte.

Klaar om te starten? Schrijf je vandaag nog in!
    `,
  },
  "evenementenpersoneel-inhuren-checklist": {
    title: "Evenementenpersoneel inhuren: checklist voor organisatoren",
    excerpt: "Organiseert u een evenement, festival of bedrijfsfeest?",
    category: "Evenementen",
    author: "TopTalent Team",
    date: "5 december 2024",
    image: "/images/dienst-recruitment.png",
    relatedSlugs: ["horecapersoneel-inhuren-gids-2025", "kosten-uitzendkracht-horeca-tarieven"],
    content: `
## Evenementenpersoneel: de sleutel tot een geslaagd event

Een goed evenement valt of staat met het personeel. Of het nu gaat om een bedrijfsfeest, bruiloft, festival of conferentie - professionele medewerkers maken het verschil.

## Checklist voor het inhuren van evenementenpersoneel

### 4-6 weken voor het evenement

- [ ] Bepaal welke functies u nodig heeft
- [ ] Schat het aantal benodigde medewerkers in
- [ ] Neem contact op met een uitzendbureau
- [ ] Vraag een offerte aan
- [ ] Bespreek specifieke wensen en dresscode

### 2-4 weken voor het evenement

- [ ] Bevestig de definitieve aantallen
- [ ] Stuur een briefing met alle eventdetails
- [ ] Deel het programma en tijdschema
- [ ] Geef aan waar personeel zich moet melden
- [ ] Bespreek eventuele allergenen bij catering

### 1 week voor het evenement

- [ ] Stuur een reminder naar het uitzendbureau
- [ ] Bevestig parkeer- en reismogelijkheden
- [ ] Zorg voor personeelsmaaltijden
- [ ] Wijs een contactpersoon aan voor de dag zelf

### Op de dag zelf

- [ ] Ontvang het personeel en geef een korte briefing
- [ ] Wijs taken en werkplekken toe
- [ ] Zorg voor duidelijke communicatielijnen
- [ ] Geef feedback waar nodig

## Welke functies heeft u nodig?

### Service & Hospitality
- **Gastheer/gastvrouw**: Ontvangst en begeleiding van gasten
- **Bediening**: Serveren van eten en drinken
- **Runners**: Ondersteuning in de bediening
- **Garderobe**: Beheer van jassen en tassen

### Bar & Catering
- **Bartenders**: Bereiden en serveren van drankjes
- **Barbacks**: Ondersteuning achter de bar
- **Cateringmedewerkers**: Buffetservice en afruimen

### Overig
- **Keukenhulp**: Ondersteuning bij de bereiding
- **Afwas**: Schone glazen en servies
- **Opbouw/afbouw**: Hulp bij in- en uitrichten

## Hoeveel personeel heeft u nodig?

Een vuistregel:

| Type evenement | Ratio personeel:gasten |
|----------------|------------------------|
| Zittend diner | 1:10 tot 1:15 |
| Lopend buffet | 1:20 tot 1:30 |
| Borrel/receptie | 1:25 tot 1:35 |
| Festival | 1:50 tot 1:75 |

## Waarom TopTalent Jobs voor uw evenement?

- Ervaren evenementenpersoneel
- Beschikbaar voor events door heel Nederland
- Last-minute aanvragen mogelijk
- Flexibel in aantallen tot op het laatste moment
- Persoonlijke begeleiding

Neem contact op voor een vrijblijvende offerte!
    `,
  },
  "detachering-vs-uitzenden-verschil": {
    title: "Detachering vs uitzenden: welke vorm past bij uw bedrijf?",
    excerpt: "Wat is het verschil tussen detachering en uitzenden?",
    category: "Detachering",
    author: "TopTalent Team",
    date: "3 december 2024",
    image: "/images/dienst-detachering.png",
    relatedSlugs: ["horecapersoneel-inhuren-gids-2025", "kosten-uitzendkracht-horeca-tarieven"],
    content: `
## Uitzenden vs detacheren: wat is het verschil?

Beide vormen zijn manieren om flexibel personeel in te zetten, maar er zijn belangrijke verschillen.

## Uitzenden: maximale flexibiliteit

Bij uitzenden werkt een medewerker op basis van een uitzendovereenkomst. U huurt de medewerker in voor een bepaalde periode of opdracht.

**Kenmerken:**
- Korte tot middellange inzet
- Per uur of per dag te boeken
- Makkelijk op- en afschalen
- Uitzendbureau is juridisch werkgever
- Snelle beschikbaarheid

**Ideaal voor:**
- Piekmomenten en drukte
- Vervanging bij ziekte of vakantie
- Seizoenswerk
- Evenementen en catering
- Proefperiode voor vast personeel

## Detachering: langdurige inzet met binding

Bij detachering wordt een medewerker voor langere tijd exclusief bij uw bedrijf geplaatst. De medewerker werkt bij u, maar is in dienst bij het detacheringsbureau.

**Kenmerken:**
- Langere inzetperiode (maanden tot jaren)
- Vaste medewerker op uw locatie
- Meer binding met uw bedrijf
- Vaak hoger gekwalificeerd personeel
- Vast tarief per maand mogelijk

**Ideaal voor:**
- Tijdelijke versterking managementfuncties
- Projectmatige inzet
- Specialistische functies
- Wanneer u (nog) niet vast wilt aannemen

## Vergelijking in een tabel

| Aspect | Uitzenden | Detachering |
|--------|-----------|-------------|
| Duur | Kort - middel | Middel - lang |
| Flexibiliteit | Zeer hoog | Gemiddeld |
| Binding | Laag | Hoog |
| Kosten per uur | Lager | Hoger |
| Inwerktijd | Kort | Langer |
| Werkgever | Uitzendbureau | Detacheringsbureau |

## Wat past bij uw situatie?

**Kies voor uitzenden als:**
- U flexibel wilt inspelen op drukte
- U personeel nodig heeft voor korte periodes
- U verschillende mensen wilt uitproberen
- U kosten variabel wilt houden

**Kies voor detachering als:**
- U een vaste kracht zoekt voor langere tijd
- Binding en betrokkenheid belangrijk zijn
- U een specifieke functie wilt invullen
- U nog niet klaar bent voor vast personeel

## TopTalent Jobs biedt beide opties

Wij adviseren u graag over de beste keuze voor uw situatie. Vaak is een combinatie het meest effectief: vaste kern via detachering, aangevuld met uitzendkrachten voor piekperiodes.

Neem contact op voor een vrijblijvend adviesgesprek.
    `,
  },
  "horecamedewerker-worden-zonder-ervaring": {
    title: "Horecamedewerker worden zonder ervaring: zo begin je",
    excerpt: "Wil je in de horeca werken maar heb je geen ervaring?",
    category: "Carrière",
    author: "TopTalent Team",
    date: "1 december 2024",
    image: "/images/dienst-uitzenden.png",
    relatedSlugs: ["werken-uitzendkracht-horeca-salaris", "meest-gevraagde-horecafuncties-nederland"],
    content: `
## Geen ervaring? Geen probleem!

De horeca is een van de weinige branches waar je zonder diploma of werkervaring kunt starten. Wat je nodig hebt: motivatie, een gastvrije instelling en de bereidheid om te leren.

## Waarom de horeca een goede keuze is voor starters

- **Lage instapdrempel**: Geen diploma vereist voor veel functies
- **Direct aan de slag**: Geen lange sollicitatieprocedures
- **Leren op de werkvloer**: Ervaring doe je al werkend op
- **Sociale contacten**: Leuke collega's en gasten
- **Flexibele uren**: Combineerbaar met studie of andere verplichtingen
- **Doorgroeimogelijkheden**: Van bediening naar leidinggevende

## Welke functies zijn geschikt voor beginners?

### 1. Afwasser
De perfecte startersfunctie. Je leert de keuken kennen en kunt doorgroeien naar keukenhulp of kok.

### 2. Runner
Je brengt borden van de keuken naar de bediening. Goed om de gang van zaken te leren.

### 3. Medewerker bediening (inwerkperiode)
Met een korte training kun je snel zelfstandig werken als medewerker bediening.

### 4. Barback
Je ondersteunt de bartender en leert alles over de bar.

### 5. Cateringmedewerker
Bij evenementen is vaak extra personeel nodig. Perfecte manier om ervaring op te doen.

## Tips om te starten zonder ervaring

### 1. Schrijf je in bij een uitzendbureau
Bij TopTalent Jobs geven we ook starters een kans. We kijken naar motivatie en persoonlijkheid.

### 2. Wees eerlijk over je ervaring
Geef aan dat je nieuw bent maar graag wilt leren. De meeste werkgevers waarderen dat.

### 3. Begin klein
Start met een paar diensten per week om te wennen aan het werk.

### 4. Vraag om feedback
Laat merken dat je wilt verbeteren en sta open voor tips.

### 5. Observeer ervaren collega's
Kijk hoe zij werken en stel vragen als je iets niet weet.

## Wat kun je verwachten in je eerste diensten?

De eerste keren kunnen spannend zijn. Je leert:
- Hoe de zaak werkt
- Waar alles staat
- Hoe je met gasten omgaat
- De basishandelingen van je functie

Na een paar diensten voel je je al veel zekerder. De meeste mensen zijn binnen een maand ingewerkt.

## Direct starten?

Bij TopTalent Jobs kun je je kosteloos inschrijven. We helpen je aan je eerste horecabaan, ook zonder ervaring.

Vul het inschrijfformulier in of bel ons voor meer informatie!
    `,
  },
  "meest-gevraagde-horecafuncties-nederland": {
    title: "De 10 meest gevraagde horecafuncties in Nederland",
    excerpt: "Van barista tot sous-chef: dit zijn de meest gevraagde functies.",
    category: "Carrière",
    author: "TopTalent Team",
    date: "28 november 2024",
    image: "/images/barista.png",
    relatedSlugs: ["werken-uitzendkracht-horeca-salaris", "horecamedewerker-worden-zonder-ervaring"],
    content: `
## De top 10 meest gevraagde horecafuncties

De horeca kent een grote variëteit aan functies. Dit zijn de meest gevraagde in Nederland.

## 1. Medewerker bediening

De klassieke horecafunctie. Je neemt bestellingen op, serveert eten en drinken, en zorgt dat gasten een fijne ervaring hebben.

**Salaris:** €12 - €15 bruto per uur
**Vereisten:** Geen, maar ervaring is een plus
**Doorgroeien naar:** Hoofd bediening, bedrijfsleider

## 2. Kok

Van lunchkok tot souschef - koks zijn altijd gevraagd. Je bereidt gerechten volgens het menu en recepten.

**Salaris:** €14 - €22 bruto per uur
**Vereisten:** Koksdipolma of relevante ervaring
**Doorgroeien naar:** Sous-chef, chef-kok

## 3. Barista

Specialiteit: koffie. Je maakt koffiespecialiteiten en helpt gasten bij hun keuze.

**Salaris:** €12 - €15 bruto per uur
**Vereisten:** Barista training is een plus
**Doorgroeien naar:** Leidinggevende, eigen koffiebar

## 4. Bartender

Je mixt cocktails, tapt bier en creëert een gezellige sfeer achter de bar.

**Salaris:** €13 - €17 bruto per uur
**Vereisten:** Kennis van dranken, sociale vaardigheden
**Doorgroeien naar:** Hoofdbartender, bar manager

## 5. Gastheer/gastvrouw

Het eerste contact met de gast. Je verwelkomt bezoekers en begeleidt ze naar hun tafel.

**Salaris:** €12 - €16 bruto per uur
**Vereisten:** Representatief, goede communicatie
**Doorgroeien naar:** Restaurant manager, F&B manager

## 6. Keukenhulp

Je ondersteunt de koks met voorbereiding, afwas en schoonmaak.

**Salaris:** €11 - €14 bruto per uur
**Vereisten:** Geen
**Doorgroeien naar:** Kok

## 7. Receptionist (hotel)

Je ontvangt gasten, handelt reserveringen af en beantwoordt vragen.

**Salaris:** €13 - €17 bruto per uur
**Vereisten:** Talen, klantvriendelijkheid
**Doorgroeien naar:** Front office manager

## 8. Cateringmedewerker

Je werkt bij evenementen, bedrijfscatering of partijen.

**Salaris:** €12 - €15 bruto per uur
**Vereisten:** Flexibiliteit, representatief
**Doorgroeien naar:** Catering coördinator

## 9. Afwasser

Essentieel in elke keuken. Je zorgt voor schone borden, pannen en bestek.

**Salaris:** €11 - €13 bruto per uur
**Vereisten:** Geen
**Doorgroeien naar:** Keukenhulp, kok

## 10. Bedrijfsleider

Je runt de dagelijkse operatie van een horecazaak.

**Salaris:** €2.500 - €4.000 bruto per maand
**Vereisten:** Ervaring, leidinggevende capaciteiten
**Doorgroeien naar:** Regiomanager, eigen zaak

## Op zoek naar een horecabaan?

Bij TopTalent Jobs hebben we vacatures voor al deze functies. Schrijf je in en we helpen je aan de perfecte baan!
    `,
  },
  "restaurant-openen-team-samenstellen": {
    title: "Restaurant openen? Zo stel je het perfecte team samen",
    excerpt: "Een nieuw restaurant openen begint met het juiste team.",
    category: "Management",
    author: "TopTalent Team",
    date: "25 november 2024",
    image: "/images/dienst-recruitment.png",
    relatedSlugs: ["horecapersoneel-inhuren-gids-2025", "meest-gevraagde-horecafuncties-nederland"],
    content: `
## Het belang van een goed team bij het openen van een restaurant

Een nieuw restaurant openen is spannend, maar ook uitdagend. Naast een goed concept, locatie en financiering is uw team misschien wel de belangrijkste succesfactor. Met de juiste mensen om u heen kan uw restaurant floreren.

## Welke functies heeft u nodig?

### Kernteam (vanaf de start)

**Chef-kok of Hoofdkok**
De creatieve motor achter uw keuken. Verantwoordelijk voor het menu, inkoop en kwaliteit.
- Salaris: €2.800 - €4.500 bruto per maand
- Tip: Zoek iemand die past bij uw concept

**Bedrijfsleider / Manager**
Runt de dagelijkse operatie, aanspreekpunt voor personeel en gasten.
- Salaris: €2.500 - €3.800 bruto per maand
- Kan in het begin uzelf zijn

**Souschef**
Rechterhand van de chef, neemt over bij afwezigheid.
- Salaris: €2.200 - €3.200 bruto per maand

### Operationeel team

**Bediening**
- 1 medewerker per 15-20 zitplaatsen (lunchservice)
- 1 medewerker per 10-15 zitplaatsen (diner)

**Keukenmedewerkers**
- Afhankelijk van uw menukaart en volume
- Start met minimaal 2 krachten naast de chef

**Afwas**
- Minimaal 1 persoon tijdens drukke diensten

## Hoeveel personeel heeft u nodig?

Een vuistregel voor een restaurant met 50 zitplaatsen:

| Functie | Aantal (FTE) |
|---------|--------------|
| Chef-kok | 1 |
| Souschef | 1 |
| Koks/keukenhulp | 2-3 |
| Bediening | 4-6 |
| Afwas | 1-2 |
| Manager | 1 |

## Tips voor het samenstellen van uw team

### 1. Begin op tijd met werven
Start minimaal 2-3 maanden voor opening met het zoeken naar personeel. Goede mensen zijn schaars.

### 2. Investeer in training
Neem tijd om uw team te trainen vóór de opening. Dit voorkomt opstartproblemen.

### 3. Zoek mensen die passen bij uw concept
Een fine dining restaurant vraagt ander personeel dan een casual eetcafé.

### 4. Combineer ervaring met enthousiasme
Een mix van ervaren krachten en gemotiveerde starters werkt vaak goed.

### 5. Overweeg flexibel personeel
Gebruik uitzendkrachten voor de opstartfase of drukke periodes.

## Hulp nodig bij het vinden van personeel?

TopTalent Jobs helpt nieuwe horecaondernemers met het samenstellen van hun team. Van chef-kok tot afwasser - wij hebben de juiste mensen.

Neem contact op voor een vrijblijvend gesprek!
    `,
  },
  "seizoenspersoneel-horeca-zomer": {
    title: "Seizoenspersoneel horeca: voorbereid op de zomer",
    excerpt: "De zomer betekent terrassen en drukte. Leer hoe u tijdig seizoenspersoneel werft.",
    category: "Uitzenden",
    author: "TopTalent Team",
    date: "22 november 2024",
    image: "/images/dienst-uitzenden.png",
    relatedSlugs: ["personeelstekort-horeca-oplossen", "horecapersoneel-inhuren-gids-2025"],
    content: `
## Waarom seizoenspersoneel essentieel is

De zomermaanden zijn voor veel horecazaken de drukste periode van het jaar. Terrassen stromen vol, toeristen komen langs en evenementen volgen elkaar op. Zonder voldoende personeel kunt u deze kansen niet optimaal benutten.

## Wanneer begint u met werven?

### Tijdlijn voor seizoenspersoneel

**Februari - Maart**
- Bepaal uw personeelsbehoefte
- Neem contact op met uitzendbureaus
- Plaats vacatures

**April**
- Voer sollicitatiegesprekken
- Selecteer kandidaten
- Start met contracten

**Mei**
- Inwerken van nieuwe medewerkers
- Training en kennismaking met het team

**Juni - Augustus**
- Zomerseizoen: alle hens aan dek!

## Hoeveel extra personeel heeft u nodig?

Een indicatie voor de zomermaanden:

- **Terras**: +50-100% bediening ten opzichte van winter
- **Strandtent**: vaak volledig seizoensteam
- **Restaurant in toeristisch gebied**: +30-50% personeel
- **Evenementen/festivals**: projectmatig inhuren

## Voordelen van seizoenspersoneel via een uitzendbureau

### Flexibiliteit
Schaal makkelijk op en af op basis van het weer en drukte.

### Geen vaste lasten
U betaalt alleen voor gewerkte uren.

### Snel beschikbaar
Uitzendkrachten kunnen vaak op korte termijn starten.

### Minder administratie
Het uitzendbureau regelt contracten, loon en verzekeringen.

## Tips voor succesvol werken met seizoenspersoneel

### 1. Zorg voor goede onboarding
Ook tijdelijke krachten hebben een degelijke inwerkperiode nodig.

### 2. Creëer een prettige werksfeer
Seizoenswerkers die zich welkom voelen, presteren beter.

### 3. Bied doorgroeikansen
Goede seizoenskrachten kunt u wellicht behouden voor vast werk.

### 4. Communiceer duidelijk
Bespreek verwachtingen, roosters en huisregels vooraf.

### 5. Plan vooruit
Wacht niet tot het laatste moment met werven.

## Wat zoeken seizoenswerkers?

- Flexibele roosters
- Leuke werksfeer
- Eerlijk loon
- Mogelijkheid om veel uren te maken
- Eventueel kost en inwoning (bij ver weg)

## TopTalent Jobs helpt u aan seizoenspersoneel

Wij hebben een groot netwerk van ervaren horecamedewerkers die beschikbaar zijn voor seizoenswerk. Neem tijdig contact op voor de beste selectie!
    `,
  },
  "cao-horeca-2025-wijzigingen": {
    title: "CAO Horeca 2025: dit verandert er voor werkgevers",
    excerpt: "De nieuwe CAO Horeca brengt veranderingen in salaris, toeslagen en arbeidsvoorwaarden.",
    category: "HR",
    author: "TopTalent Team",
    date: "20 november 2024",
    image: "/images/dienst-detachering.png",
    relatedSlugs: ["kosten-uitzendkracht-horeca-tarieven", "horecapersoneel-inhuren-gids-2025"],
    content: `
## CAO Horeca 2025: de belangrijkste wijzigingen

De CAO Horeca wordt regelmatig vernieuwd. Als werkgever is het belangrijk om op de hoogte te blijven van de laatste wijzigingen. Hier vindt u een overzicht van de belangrijkste veranderingen.

## Salariswijzigingen

### Minimumuurlonen per functiegroep

De salarissen in de horeca stijgen. Hieronder een indicatie van de minimumuurlonen:

| Functiegroep | Uurloon 2025 (indicatie) |
|--------------|--------------------------|
| Groep 1 (starter) | €13,50 - €14,50 |
| Groep 2 | €14,00 - €15,50 |
| Groep 3 | €15,00 - €17,00 |
| Groep 4 | €16,50 - €19,00 |
| Groep 5 | €18,00 - €22,00 |

*Let op: dit zijn indicaties. Raadpleeg altijd de officiële CAO tekst.*

### Periodieken
Medewerkers hebben recht op jaarlijkse periodieken (salarisverhogingen) tot ze het maximum van hun schaal bereiken.

## Toeslagen

### Overwerktoeslag
- Meer dan 38 uur per week: 125% of 150% afhankelijk van het moment

### Feestdagentoeslag
- Werken op officiële feestdagen: tot 200% van het uurloon

### Onregelmatigheidstoeslag
Voor werk op onregelmatige tijden (avond, nacht, weekend) kunnen toeslagen gelden.

## Arbeidsvoorwaarden

### Vakantiedagen
Minimaal 20 vakantiedagen per jaar (bij fulltime dienstverband), plus eventuele bovenwettelijke dagen.

### Vakantiegeld
8% van het bruto jaarsalaris, uit te betalen in mei/juni.

### Pensioen
Pensioenopbouw via het pensioenfonds Horeca & Catering.

## Wat betekent dit voor u als werkgever?

### Hogere loonkosten
De salarissverhogingen betekenen hogere personeelskosten. Calculeer dit mee in uw tarieven.

### Administratieve verplichtingen
Zorg dat uw loonadministratie up-to-date is met de nieuwe bedragen.

### Uitzendkrachten
Ook uitzendkrachten hebben recht op dezelfde beloning als uw vaste personeel (inlenersbeloning).

## Tip: werk samen met een uitzendbureau

Een gespecialiseerd uitzendbureau zoals TopTalent Jobs is altijd op de hoogte van de laatste CAO wijzigingen. Wij zorgen dat uw uitzendkrachten correct worden betaald, zodat u zich daar geen zorgen over hoeft te maken.

Neem contact op voor meer informatie!
    `,
  },
  "horeca-personeelsplanning-rooster-tips": {
    title: "Horeca personeelsplanning: tips voor een efficiënt rooster",
    excerpt: "Een goede personeelsplanning bespaart kosten en voorkomt stress.",
    category: "Management",
    author: "TopTalent Team",
    date: "18 november 2024",
    image: "/images/barista.png",
    relatedSlugs: ["personeelstekort-horeca-oplossen", "seizoenspersoneel-horeca-zomer"],
    content: `
## Waarom is goede personeelsplanning zo belangrijk?

Een efficiënt rooster zorgt voor:
- Lagere personeelskosten
- Minder stress bij uw team
- Betere service voor gasten
- Hogere medewerkerstevredenheid
- Minder uitval en ziekteverzuim

## 10 tips voor een efficiënt horecapersoneel rooster

### 1. Ken uw drukke en rustige momenten

Analyseer uw omzetdata per dag en per uur. Wanneer is het druk? Wanneer rustig? Plan personeel in op basis van verwachte drukte.

### 2. Gebruik planningssoftware

Excel werkt, maar gespecialiseerde software (Dyflexis, Shiftbase, etc.) bespaart tijd en voorkomt fouten.

### 3. Plan minimaal 2 weken vooruit

Medewerkers waarderen voorspelbaarheid. Publiceer roosters minimaal 2 weken van tevoren.

### 4. Houd rekening met pauzes

Wettelijk verplicht en belangrijk voor de energie van uw team.

### 5. Zorg voor een goede mix

Combineer ervaren krachten met minder ervaren medewerkers. Zo kunnen nieuwelingen leren.

### 6. Wees flexibel met beschikbaarheid

Vraag medewerkers naar hun beschikbaarheid en houd hier waar mogelijk rekening mee.

### 7. Bouw een flexibele schil

Gebruik uitzendkrachten voor piekmomenten of onverwachte drukte.

### 8. Communiceer wijzigingen tijdig

Roosterwijzigingen altijd zo snel mogelijk communiceren.

### 9. Evalueer regelmatig

Kijk maandelijks of uw planning aansluit bij de werkelijke drukte.

### 10. Luister naar feedback

Uw team weet vaak goed wat wel en niet werkt.

## Veelgemaakte fouten bij personeelsplanning

### Te weinig personeel inplannen
Leidt tot stress, slechte service en uitval.

### Te veel personeel inplannen
Verspilling van loonkosten.

### Geen rekening houden met vakanties
Plan vakanties tijdig in en zorg voor vervanging.

### Altijd dezelfde mensen op drukke dagen
Wissel af om overbelasting te voorkomen.

## De flexibele schil: uitzendkrachten als buffer

Niet elke dienst is voorspelbaar. Met een flexibele schil van uitzendkrachten kunt u:

- Snel opschalen bij onverwachte drukte
- Ziekteverzuim opvangen
- Piekmomenten managen
- Vakanties overbruggen

TopTalent Jobs levert betrouwbare uitzendkrachten, vaak binnen 24 uur beschikbaar.

## Hulp nodig?

Heeft u moeite met uw personeelsplanning of zoekt u flexibele krachten? Neem contact op met TopTalent Jobs voor advies en ondersteuning!
    `,
  },
};

// Generate static params for all blog articles
export function generateStaticParams() {
  return Object.keys(blogArticles).map((slug) => ({
    slug,
  }));
}

// Generate metadata for SEO
export function generateMetadata({ params }: { params: { slug: string } }) {
  const article = blogArticles[params.slug];

  if (!article) {
    return {
      title: "Artikel niet gevonden - TopTalent Jobs",
    };
  }

  return {
    title: `${article.title} | TopTalent Jobs Blog`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.date,
      authors: [article.author],
    },
  };
}

export default function BlogArticlePage({ params }: { params: { slug: string } }) {
  const article = blogArticles[params.slug];

  if (!article) {
    notFound();
  }

  const relatedArticles = article.relatedSlugs
    .map((slug) => ({ slug, ...blogArticles[slug] }))
    .filter((a) => a.title);

  return (
    <>
      {/* Hero Section */}
      <section className="pt-28 pb-12 bg-gradient-to-b from-white to-neutral-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
            <Link href="/" className="hover:text-[#F97316] transition-colors">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-[#F97316] transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-neutral-700">{article.category}</span>
          </nav>

          <span className="inline-block bg-[#F97316] text-white text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wide mb-4">
            {article.category}
          </span>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-6 leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center gap-6 text-sm text-neutral-500">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {article.author}
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {article.date}
            </span>
          </div>
        </div>
      </section>

      {/* Featured Image */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 mb-12">
        <div className="relative aspect-[21/9] rounded-2xl overflow-hidden shadow-xl">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* Article Content */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <div className="max-w-3xl mx-auto">
            <article className="prose prose-lg prose-neutral max-w-none prose-headings:text-neutral-900 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-neutral-600 prose-p:leading-relaxed prose-li:text-neutral-600 prose-strong:text-neutral-900 prose-a:text-[#F97316] prose-a:no-underline hover:prose-a:underline prose-table:text-sm prose-th:bg-neutral-100 prose-th:p-3 prose-td:p-3 prose-td:border-b">
              <div dangerouslySetInnerHTML={{ __html: formatContent(article.content) }} />
            </article>

            {/* CTA Box */}
            <div className="mt-12 bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-3">
                Hulp nodig bij het vinden van horecapersoneel?
              </h3>
              <p className="text-white/90 mb-6">
                TopTalent Jobs helpt u graag. Neem contact op voor een vrijblijvend gesprek.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center bg-white text-[#F97316] px-6 py-3 rounded-xl font-semibold hover:bg-neutral-100 transition-colors"
                >
                  Neem contact op
                </Link>
                <Link
                  href="/personeel-aanvragen"
                  className="inline-flex items-center justify-center border-2 border-white/30 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors"
                >
                  Direct personeel aanvragen
                </Link>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="mt-10 pt-8 border-t border-neutral-200">
              <p className="text-sm font-medium text-neutral-600 mb-4">Deel dit artikel:</p>
              <div className="flex gap-3">
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=https://toptalentjobs.nl/blog/${params.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-[#0077B5] text-white rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(article.title + ' - https://toptalentjobs.nl/blog/' + params.slug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-[#25D366] text-white rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent('Bekijk dit artikel: https://toptalentjobs.nl/blog/' + params.slug)}`}
                  className="w-10 h-10 bg-neutral-600 text-white rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </Section.Container>
      </Section>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <Section variant="tinted" spacing="large">
          <Section.Container>
            <h2 className="text-2xl font-bold text-neutral-900 mb-8 text-center">
              Gerelateerde artikelen
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {relatedArticles.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="bg-white rounded-2xl overflow-hidden border border-neutral-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Image
                      src={related.image}
                      alt={related.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <span className="text-xs font-semibold text-[#F97316] uppercase tracking-wide">
                      {related.category}
                    </span>
                    <h3 className="font-bold text-lg text-neutral-900 mt-2 group-hover:text-[#F97316] transition-colors">
                      {related.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </Section.Container>
        </Section>
      )}
    </>
  );
}

// Helper function to format markdown-like content to HTML
function formatContent(content: string): string {
  return content
    // Headers
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Lists
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)\n(?=<li>)/g, '$1')
    .replace(/(<li>.*<\/li>)(?!\n<li>)/g, '<ul>$1</ul>')
    // Checkboxes
    .replace(/- \[ \] (.*$)/gim, '<li class="flex items-start gap-2"><span class="w-5 h-5 border-2 border-neutral-300 rounded mt-0.5 flex-shrink-0"></span>$1</li>')
    // Tables (simple)
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.some(c => c.includes('---'))) return '';
      const isHeader = match.includes('Functie') || match.includes('Aspect') || match.includes('Type');
      const tag = isHeader ? 'th' : 'td';
      return `<tr>${cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('')}</tr>`;
    })
    // Wrap tables
    .replace(/(<tr>.*<\/tr>)\n(<tr>)/g, '$1$2')
    .replace(/((?:<tr>.*<\/tr>)+)/g, '<table class="w-full border-collapse border border-neutral-200 my-6"><tbody>$1</tbody></table>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hultop])(.+)$/gim, '<p>$1</p>')
    // Clean up empty paragraphs
    .replace(/<p><\/p>/g, '')
    .replace(/<p>\s*<\/p>/g, '');
}
