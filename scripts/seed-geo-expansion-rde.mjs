/**
 * Seed: GEO Expansion — Rotterdam, Den Haag, Eindhoven (5 pagina's)
 *
 * Gebruik:  node scripts/seed-geo-expansion-rde.mjs
 * Vereist:  .env.local met NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const now = new Date().toISOString();

// ---------------------------------------------------------------------------
// Content data — elke pagina is uniek geschreven, geen keyword-swap
// ---------------------------------------------------------------------------

const pages = [
  // =========================================================================
  // 1. Kok inhuren Rotterdam
  // =========================================================================
  {
    content_type: "city_page",
    stad: "rotterdam",
    slug: "kok-inhuren-rotterdam",
    taal: "nl",
    title: "Kok Inhuren in Rotterdam — Ervaren Keukenpersoneel Via Uitzendbureau",
    seo_title: "Kok Inhuren Rotterdam | TopTalent Jobs",
    meta_description:
      "Kok nodig in Rotterdam? TopTalent Jobs levert ervaren koks voor restaurants, hotels en catering in Rotterdam. Binnen 24 uur inzetbaar.",
    canonical_url: "https://www.toptalentjobs.nl/geo/kok-inhuren-rotterdam/",
    excerpt:
      "Rotterdam is de culinaire underdog die uitgroeide tot horecahoofdstad van Zuid-Holland. De havenstad telt meer dan 2.800 horecazaken en de vraag naar koks overtreft het aanbod structureel.",
    body_markdown: `## Waarom een kok inhuren in Rotterdam?

Rotterdam heeft zich in het afgelopen decennium ontwikkeld tot een van de meest dynamische horecasteden van Nederland. De stad telt meer dan 2.800 horecazaken, verspreid over buurten als Katendrecht, het Centrum, Kop van Zuid, Delfshaven en Rotterdam-Noord. De culinaire scene is divers: van de Markthal en de Fenix Food Factory tot fine dining langs de Nieuwe Maas.

Volgens cijfers van het CBS groeit het aantal horecavestigingen in Rotterdam jaarlijks met circa 3%, terwijl het aanbod van gekwalificeerde koks achterblijft. De Rotterdamse horecamarkt kampt net als de rest van Nederland met een structureel personeelstekort — UWV rapporteerde in 2024 dat horeca tot de top 5 sectoren behoort met de meeste openstaande vacatures.

TopTalent Jobs levert als WAADI-geregistreerd horeca uitzendbureau ervaren koks aan restaurants, hotels en cateringbedrijven in heel Rotterdam en omgeving. Onze pool omvat meer dan 150 keukenprofessionals die op korte termijn inzetbaar zijn in de Rotterdamse regio.

## De Rotterdamse horecamarkt: unieke kenmerken

Rotterdam onderscheidt zich van andere steden door een aantal specifieke factoren:

- **Havenstad met internationale invloeden** — De Rotterdamse haven brengt niet alleen vracht, maar ook culinaire diversiteit. De stad kent een rijke traditie van Surinaamse, Turkse, Kaapverdiaanse en Aziatische keukens naast de klassieke Nederlandse en Franse cuisine.
- **Markthal en foodhallen** — De Markthal trekt jaarlijks meer dan 8 miljoen bezoekers en biedt ruimte aan tientallen food-stands die continu personeel zoeken. De Fenix Food Factory op Katendrecht en de Foodhallen Rotterdam versterken deze trend.
- **Evenementenstad** — Het North Sea Jazz Festival, Rotterdam Unlimited, de Wereldhavendagen en het International Film Festival Rotterdam genereren elk seizoen pieken in de vraag naar keukenpersoneel.
- **Katendrecht als culinair epicentrum** — Het voormalige havenkwartier is getransformeerd tot het meest besproken restaurantgebied van Rotterdam. Hotel New York, Fenix Food Factory en tientallen restaurants maken Katendrecht tot een hotspot die continu personeel vraagt.
- **Erasmus MC en kantoorgebied** — Het grootste ziekenhuis van Nederland en de kantoorclusters rondom de Coolsingel en Weena hebben eigen bedrijfsrestaurants en cateringfaciliteiten met structurele personeelsbehoefte.

## Welke koks levert TopTalent Jobs in Rotterdam?

Ons bestand voor de regio Rotterdam omvat:

- **Hulpkok / commis** — Ondersteuning bij mise en place, basisbereiding en keukenorganisatie
- **Zelfstandig kok** — Draait zelfstandig een post in de keuken, van voorgerecht tot dessert
- **Sous-chef / chef-kok** — Leiding aan de keukenbrigade, menuontwikkeling en kwaliteitsborging
- **Specialisten** — Wok-koks, sushi-bereid ers, grillmasters en patissiers
- **Cateringkoks** — Ervaring met bulk-bereiding, transport en off-site service

Alle koks in ons Rotterdamse bestand zijn gescreend op werkervaring, HACCP-kennis en referenties. Gemiddeld hebben onze uitzendkoks 4+ jaar professionele keukenervaring.

## Wat kost een kok inhuren in Rotterdam?

Het uurtarief voor een kok in Rotterdam ligt tussen **€17 en €30 per uur** (all-in). Rotterdam ligt qua tarieven iets onder Amsterdam, maar boven het landelijk gemiddelde vanwege de krappe markt en de groeiende vraag.

Het all-in tarief is inclusief werkgeverslasten, pensioenopbouw, verzekeringen en volledige administratie. U ontvangt wekelijks één overzichtelijke factuur. Gebruik onze [kosten-calculator](/kosten-calculator/) voor een indicatie op maat.

## Hoe werkt kok inhuren via TopTalent Jobs in Rotterdam?

1. **Aanvraag indienen** — Via [personeel aanvragen](/personeel-aanvragen/) of telefonisch op +31 6 17 17 79 39
2. **Matching** — Wij selecteren een kok die past bij uw keukentype, cuisine en teamcultuur
3. **Inzet binnen 24 uur** — De kok meldt zich op de afgesproken tijd op uw Rotterdamse locatie
4. **Evaluatie** — Na de eerste dienst bespreken we de match en sturen we bij indien nodig
5. **Flexibel opschalen** — Verleng, wissel of stop de inzet zonder opzegtermijn

## Rotterdamse wijken waar wij koks leveren

- **Centrum / Coolsingel** — Restaurants, grand cafes, hotelkeukens bij het Hilton en Mainport
- **Katendrecht** — Hotel New York, Fenix Food Factory, fine dining en casual concepts
- **Kop van Zuid / Wilhelminapier** — Luxe hotels, congrescentra, rooftoprestaurants
- **Delfshaven** — Multiculturele eetgelegenheden, buurtrestaurants
- **Rotterdam-Noord / Bergweg** — Opkomende food scene, eetcafes en lunchrooms
- **Kralingen / Hillegersberg** — Restaurants aan de Kralingse Plas, clubhuizen
- **Schiedam, Vlaardingen, Capelle** — Regiogemeenten met groeiende horeca

## Waarom TopTalent Jobs kiezen voor uw kok in Rotterdam?

Rotterdam is een stad die nuchterheid waardeert — en dat past bij onze aanpak. TopTalent Jobs levert geen loze beloftes, maar bewezen keukenprofessionals die direct meedraaien in uw brigade.

- **WAADI-geregistreerd** — Volledige naleving van de Wet Allocatie Arbeidskrachten door Intermediairs. U loopt geen juridisch risico bij de inzet van onze koks.
- **Horeca-exclusief** — Wij bemiddelen uitsluitend horecapersoneel. Onze recruiters begrijpen het verschil tussen een sausbrigade en een gardemanger, en matchen op basis van keukenstijl en werktempo.
- **Transparante tarieven** — Geen verborgen kosten, geen opstartfees. U betaalt per gewerkt uur met een duidelijk all-in tarief.
- **Vervangingsgarantie** — Past de kok niet bij uw keuken? Wij regelen kosteloos vervanging, doorgaans dezelfde werkdag.
- **Mogelijkheid tot overname** — Wilt u de uitzendkok in vaste dienst nemen? Wij faciliteren dat met een transparante overnameregeling.

Bekijk ook onze [landelijke kok inhuren](/functies/kok-inhuren/) pagina voor meer informatie over ons aanbod, of lees meer over onze [aanwezigheid in Rotterdam](/locaties/rotterdam/).

## Veelgemaakte fouten bij het inhuren van een kok in Rotterdam

De Rotterdamse horecamarkt kent specifieke valkuilen:

1. **Geen rekening houden met keukendiversiteit** — Rotterdam heeft een uitzonderlijk diverse food scene. Een kok met uitsluitend Franse keukenervaring past niet automatisch in een Surinaamse of Aziatische keuken. Geef bij uw aanvraag altijd de cuisine en het type gerechten door, zodat wij gericht kunnen matchen.
2. **Te laat plannen voor evenementen** — North Sea Jazz, de Wereldhavendagen en Rotterdam Unlimited vallen elk jaar op dezelfde data. Toch wachten veel ondernemers tot het laatste moment met het aanvragen van extra koks. Plan minimaal drie weken vooruit voor grote Rotterdamse events.
3. **Onderschatten van de Markthal-dynamiek** — De Markthal vraagt een ander type kok dan een regulier restaurant: hoog volume, snelle wisselingen, wisselend aanbod. Geef duidelijk aan als u een kok zoekt voor een food court of markthal-setting.
4. **Informeel personeel inzetten** — Via sociale media of netwerken personeel regelen lijkt goedkoper, maar de risicos op het gebied van aansprakelijkheid en voedselveiligheid zijn aanzienlijk. Werk altijd via een WAADI-geregistreerd bureau.`,
    primary_keywords: [
      "kok inhuren rotterdam",
      "kok uitzendbureau rotterdam",
      "keukenpersoneel rotterdam",
    ],
    secondary_keywords: [
      "chef-kok inhuren rotterdam",
      "uitzendkok rotterdam",
      "horeca uitzendbureau rotterdam",
    ],
    faq_items: [
      {
        question: "Wat kost een kok inhuren in Rotterdam per uur?",
        answer:
          "Het all-in uurtarief voor een kok in Rotterdam ligt tussen €17 en €30 per uur, afhankelijk van ervaringsniveau en werktijden. Dit is inclusief werkgeverslasten, pensioen en verzekeringen.",
      },
      {
        question: "Hoe snel kan ik een kok krijgen in Rotterdam?",
        answer:
          "TopTalent Jobs levert koks in Rotterdam standaard binnen 24 uur. Bij spoedaanvragen is inzet dezelfde dag mogelijk, afhankelijk van beschikbaarheid in ons Rotterdamse bestand.",
      },
      {
        question: "Leveren jullie ook koks voor de Markthal en Fenix Food Factory?",
        answer:
          "Ja, wij leveren regelmatig koks voor food courts, markthallen en foodhallen in Rotterdam, waaronder de Markthal en Fenix Food Factory op Katendrecht.",
      },
      {
        question: "Hebben jullie koks met ervaring in de Aziatische of Surinaamse keuken in Rotterdam?",
        answer:
          "Ja, ons Rotterdamse bestand omvat koks met specialisaties in diverse keukens, waaronder Surinaams, Aziatisch, Midden-Oosters en Kaapverdiaans. Rotterdam is een multiculturele food city en daar passen wij ons bestand op aan.",
      },
    ],
    bronnen: [
      {
        title: "CBS — Horecavestigingen per gemeente 2024",
        url: "https://www.cbs.nl",
        type: "officieel",
      },
      {
        title: "UWV — Arbeidsmarktinformatie Horeca 2024",
        url: "https://www.uwv.nl",
        type: "officieel",
      },
      {
        title: "Koninklijke Horeca Nederland — Branchecijfers",
        url: "https://www.khn.nl",
        type: "onderzoek",
      },
    ],
    statistieken: [
      {
        stat: "2.800+ horecazaken in Rotterdam",
        bron: "CBS / Gemeente Rotterdam",
        jaar: 2024,
      },
      {
        stat: "8 miljoen bezoekers per jaar in de Markthal",
        bron: "Markthal Rotterdam",
        jaar: 2024,
      },
      {
        stat: "Horeca in top 5 sectoren met meeste openstaande vacatures",
        bron: "UWV Arbeidsmarktinformatie",
        jaar: 2024,
      },
    ],
    structured_data: [],
  },

  // =========================================================================
  // 2. Bediening inhuren Rotterdam
  // =========================================================================
  {
    content_type: "city_page",
    stad: "rotterdam",
    slug: "bediening-inhuren-rotterdam",
    taal: "nl",
    title: "Bediening Inhuren in Rotterdam — Obers en Serveersters Beschikbaar",
    seo_title: "Bediening Inhuren Rotterdam | TopTalent Jobs",
    meta_description:
      "Bediening nodig in Rotterdam? TopTalent Jobs levert obers en serveersters voor restaurants, hotels en events in heel Rotterdam.",
    canonical_url:
      "https://www.toptalentjobs.nl/geo/bediening-inhuren-rotterdam/",
    excerpt:
      "Rotterdam combineert nuchterheid met gastvrijheid. De groeiende horecascene op Katendrecht, de Witte de Withstraat en Kop van Zuid vraagt structureel om professionele bediening.",
    body_markdown: `## Bediening inhuren in Rotterdam: groeiende vraag in een dynamische stad

Rotterdam is de afgelopen jaren uitgegroeid tot een van de meest veelzijdige horecasteden van Nederland. De Witte de Withstraat, Katendrecht, Kop van Zuid en het vernieuwde stationsgebied trekken zowel Rotterdammers als bezoekers van buiten. Volgens Koninklijke Horeca Nederland (KHN) groeide het aantal horecaondernemingen in Rotterdam met 15% tussen 2020 en 2025 — een groeitempo dat het landelijk gemiddelde overtreft.

Tegelijkertijd is het vinden van betrouwbare bediening een structureel knelpunt. Het UWV rapporteert dat de horeca in Zuid-Holland tot de sectoren behoort met de meeste moeilijk vervulbare vacatures. Het hoge personeelsverloop, de seizoensgebonden pieken en de concurrentie met andere werkgevers maken bediening inhuren tot een dagelijkse uitdaging voor Rotterdamse horecaondernemers.

TopTalent Jobs levert ervaren obers, serveersters en horecamedewerkers aan restaurants, hotels, cafes en evenementen in Rotterdam en omgeving.

## Wanneer bediening inhuren in Rotterdam?

De Rotterdamse horeca kent specifieke momenten waarop extra bediening essentieel is:

- **Zomerterrassen langs de Maas** — Van mei tot september draaien de terrassen op de Kop van Zuid, bij Hotel New York en langs de Boompjes op volle capaciteit. Extra bediening is onmisbaar om wachttijden te beperken en gasten tevreden te houden.
- **Evenementen en festivals** — North Sea Jazz (70.000+ bezoekers), Rotterdam Unlimited, Wereldhavendagen en het IFFR genereren pieken die weken van tevoren ingepland moeten worden.
- **Congressen en zakelijke events** — Het Ahoy, De Doelen, het WTC Rotterdam en SS Rotterdam zijn structurele opdrachtgevers voor banquetingbediening en congrescatering.
- **Weekendpiek in de binnenstad** — Vrijdag- en zaterdagavond is de Witte de Withstraat, Meent en Pannekoekstraat overvol. Zonder extra bediening loopt de service vast.
- **Personeelsuitval** — Bij ziekmeldingen of onverwacht vertrek is een uitzendkracht dezelfde dag inzetbaar via TopTalent Jobs.

## Onze bedieningsmedewerkers in Rotterdam

Wij selecteren bedieningsmedewerkers op criteria die specifiek relevant zijn voor de Rotterdamse horecamarkt:

- **Taalvaardigheid** — Nederlands en Engels minimaal; veel van onze medewerkers spreken ook Duits, Spaans of Turks, passend bij Rotterdams internationale karakter
- **Representativiteit** — Verzorgd uiterlijk en professionele houding, aangepast aan het concept: van casual grand cafe tot fine dining
- **Stressbestendigheid** — Rotterdam is een stad van grote volumes. Onze bediening kan omgaan met drukke terrassen, volle zalen en snelle wisselingen
- **Kasvaardigheden** — Ervaring met gangbare POS-systemen (Lightspeed, Untill, Micros)

Wij leveren:
- Obers en serveersters voor restaurants en eetcafes
- Runners en afruimers voor hoog-volume locaties
- Banquetingpersoneel voor hotels en congrescentra
- Gastheren en gastvrouwen voor front-of-house
- Terrasbediening voor het Maas-terrassenseizoen

## Tarieven bediening inhuren Rotterdam

| Niveau | Uurtarief (all-in) |
|--------|-------------------|
| Junior bediening (0-2 jaar ervaring) | €16 – €19 |
| Zelfstandig ober/serveerster (2-5 jaar) | €19 – €24 |
| Senior bediening / hoofdkelner | €24 – €29 |

Alle tarieven zijn inclusief werkgeverslasten, pensioenopbouw en verzekeringen. Avond- en weekendtoeslagen conform horeca-cao.

## Bediening in elke Rotterdamse wijk

- **Centrum / Coolsingel / Meent** — Restaurants, lunchrooms, grand cafes
- **Witte de Withstraat** — Trendy eetcafes, internationale restaurants
- **Katendrecht** — Fine dining, casual concepts, Hotel New York
- **Kop van Zuid / Wilhelminapier** — Luxehotels (Mainport, nhow), rooftop restaurants
- **Kralingen** — Terrasrestaurants aan de Plas, clubhuishoreca
- **Rotterdam Ahoy / Zuidplein** — Evenementencatering, congreshoreca
- **Schiedam, Vlaardingen** — Regiogemeenten met groeiende horeca

## Waarom TopTalent Jobs kiezen voor bediening in Rotterdam?

De Rotterdamse horecamarkt is praktisch ingesteld: het gaat om resultaat, niet om praatjes. TopTalent Jobs past bij die mentaliteit.

- **WAADI-geregistreerd** — Volledig wettelijk compliant. Werkgeverslasten, verzekeringen en administratie zijn afgedekt in ons all-in uurtarief.
- **Horeca-specialisatie** — Wij bemiddelen uitsluitend in de horeca. Onze recruiters hebben zelf in de bediening gestaan en weten waar goed servicepersoneel aan moet voldoen.
- **Opkomstgarantie >97%** — In de Rotterdamse horeca is een no-show fataal. Onze opkomstgarantie behoort tot de hoogste in de branche. Bij uitval regelen wij vervanging binnen twee uur.
- **Flexibel** — Inhuren per shift, per week of per seizoen. Geen langlopende contracten, geen opzegtermijn.
- **Vervangingsgarantie** — Past de medewerker niet? Wij regelen dezelfde dag nog een alternatief, zonder extra kosten.

Lees meer over onze bediening op de [landelijke bediening inhuren](/functies/bediening-inhuren/) pagina of bekijk onze [Rotterdam locatiepagina](/locaties/rotterdam/).

## Veelgemaakte fouten bij het inhuren van bediening in Rotterdam

De Rotterdamse horecasector kent specifieke valkuilen:

1. **Geen rekening houden met het Rotterdamse tempo** — Rotterdam is een werkstad. De gastverwachtingen liggen anders dan in Amsterdam: nuchter, efficiënt en zonder poespas. Bediening die gewend is aan een langzame fine dining setting kan moeite hebben met het tempo van een druk grand café op de Coolsingel. Wij matchen altijd op werktempo.
2. **Terrasbediening onderschatten** — De Maasterrassen en Kralingse Plas-locaties combineren grote aantallen gasten met wind, zon en regen. Bediening moet fysiek fit zijn, snel kunnen lopen en omgaan met wisselende weersomstandigheden.
3. **Congrespersoneel te laat boeken** — Ahoy, De Doelen en het WTC Rotterdam plannen maanden vooruit. Wie pas twee weken voor een congres bediening zoekt, krijgt niet de eerste keuze. Reserveer ruim van tevoren.
4. **Alleen op prijs selecteren** — Goedkope bediening die bestellingen fout opneemt, glazen breekt of ongeïnteresseerd overkomt kost u meer in verloren omzet en negatieve reviews dan een professionele kracht met een iets hoger uurtarief.

## Direct bediening regelen in Rotterdam

[Vraag bediening aan](/personeel-aanvragen/) of bel +31 6 17 17 79 39. TopTalent Jobs levert standaard binnen 24 uur in heel Rotterdam en omgeving.`,
    primary_keywords: [
      "bediening inhuren rotterdam",
      "ober inhuren rotterdam",
      "serveerster inhuren rotterdam",
    ],
    secondary_keywords: [
      "horeca bediening rotterdam",
      "bedieningspersoneel uitzendbureau rotterdam",
      "banqueting personeel rotterdam",
    ],
    faq_items: [
      {
        question: "Leveren jullie bediening voor evenementen in Ahoy Rotterdam?",
        answer:
          "Ja, wij leveren regelmatig bedienend personeel voor congressen, beurzen en evenementen in Rotterdam Ahoy, De Doelen en het WTC Rotterdam. Wij kunnen teams van 2 tot 25+ medewerkers samenstellen.",
      },
      {
        question: "Wat kost bediening inhuren in Rotterdam per uur?",
        answer:
          "Het all-in uurtarief voor bediening in Rotterdam ligt tussen €16 en €29, afhankelijk van ervaringsniveau en werktijden. Alle werkgeverslasten zijn inbegrepen.",
      },
      {
        question: "Hoe snel levert TopTalent Jobs bediening in Rotterdam?",
        answer:
          "Standaard levertijd is binnen 24 uur. Bij spoedaanvragen is inzet dezelfde dag mogelijk, mits beschikbaar in ons Rotterdamse bestand.",
      },
      {
        question: "Leveren jullie ook terrasbediening voor de Maasterrassen in Rotterdam?",
        answer:
          "Ja, wij leveren ervaren terrasbediening voor locaties aan de Maas, Kop van Zuid, Kralingse Plas en de Rotterdamse binnenstad. Onze medewerkers zijn gewend aan hoog-volume terraswerk.",
      },
    ],
    bronnen: [
      {
        title: "Koninklijke Horeca Nederland — Branchecijfers Zuid-Holland",
        url: "https://www.khn.nl",
        type: "onderzoek",
      },
      {
        title: "UWV — Vacaturemarkt Zuid-Holland 2024",
        url: "https://www.uwv.nl",
        type: "officieel",
      },
    ],
    statistieken: [
      {
        stat: "15% groei horecaondernemingen Rotterdam (2020-2025)",
        bron: "Koninklijke Horeca Nederland",
        jaar: 2025,
      },
      {
        stat: "70.000+ bezoekers North Sea Jazz Festival per editie",
        bron: "North Sea Jazz",
        jaar: 2024,
      },
    ],
    structured_data: [],
  },

  // =========================================================================
  // 3. Kok inhuren Den Haag
  // =========================================================================
  {
    content_type: "city_page",
    stad: "den-haag",
    slug: "kok-inhuren-den-haag",
    taal: "nl",
    title: "Kok Inhuren in Den Haag — Keukenpersoneel voor de Hofstad",
    seo_title: "Kok Inhuren Den Haag | TopTalent Jobs",
    meta_description:
      "Kok nodig in Den Haag? TopTalent Jobs levert ervaren koks voor restaurants, ambassades en hotels in Den Haag en Scheveningen. Binnen 24 uur.",
    canonical_url: "https://www.toptalentjobs.nl/geo/kok-inhuren-den-haag/",
    excerpt:
      "Den Haag combineert diplomatieke gastvrijheid met een bruisende lokale horecascene. Van ambassadediners tot strandpaviljoens in Scheveningen — overal is de vraag naar goede koks groot.",
    body_markdown: `## Kok inhuren in Den Haag: de Hofstad als culinaire bestemming

Den Haag neemt een unieke positie in op de Nederlandse culinaire kaart. Als regeringsstad en thuisbasis van meer dan 150 ambassades en internationale organisaties kent Den Haag een bovengemiddelde vraag naar horecapersoneel dat gewend is aan formeel niveau. Tegelijkertijd heeft de stad met Scheveningen een badplaats die in het zomerseizoen transformeert tot een van de drukste horecagebieden van Nederland.

De Haagse horecamarkt telt volgens het CBS circa 2.400 horecavestigingen. Het Binnenhof, de Noordeinde-omgeving en het Statenkwartier herbergen restaurants die ambassadeurs en politici bedienen, terwijl de strandpaviljoens op Scheveningen een heel ander type kok vragen: hoog volume, snelle wisselingen en seizoensgebonden pieken.

TopTalent Jobs levert ervaren koks voor beide segmenten van de Haagse horecamarkt. Van sous-chefs voor fine dining in het Lange Voorhout tot seizoenskoks voor de strandtenten van Kijkduin.

## De Haagse horecamarkt: diplomatiek en dynamisch

Den Haag verschilt wezenlijk van andere grote steden:

- **Diplomatieke horeca** — Ambassadediners, internationale conferenties en regeringsrecepties vragen om koks die gewend zijn aan formele keukens, protocollair serveren en allergenenmanagement op het hoogste niveau. Den Haag heeft 150+ internationale ambassades en organisaties zoals het Internationaal Gerechtshof en Europol.
- **Scheveningen en Kijkduin** — De kuststrook transformeert van maart tot oktober in een horecaboulevard met meer dan 60 strandpaviljoens. In het hoogseizoen zijn hier honderden extra koks nodig voor een periode van vijf tot zes maanden.
- **Internationaal publiek** — Den Haag is na Brussel de meest internationale stad van de Benelux. Gasten verwachten een internationale keukenstandaard met kennis van diverse cuisines.
- **Congrescentrum World Forum** — Het World Forum Den Haag is een van de grotere congreslocaties van Nederland en genereert structurele vraag naar cateringkoks voor conferenties en galadines.
- **Frederik Hendriklaan en Denneweg** — De lokale horeca-assen met een hoge dichtheid aan restaurants, van Italiaans tot Indonesisch, die concurreren om een beperkte pool van keukenpersoneel.

## Welke koks levert TopTalent Jobs in Den Haag?

Ons bestand voor de regio Den Haag omvat keukenprofessionals op elk niveau:

- **Hulpkok / commis** — Mise en place, basisbereiding en ondersteuning van de keukenbrigade
- **Zelfstandig kok** — Draait zelfstandig een post, van amuse tot hoofdgerecht
- **Sous-chef / chef-kok** — Aansturing keukenbrigade, menuontwikkeling, HACCP-borging
- **Seizoenskoks Scheveningen** — Ervaring met hoog volume, strandpaviljoen-dynamiek en snelle service
- **Diplomatieke keukenprofessionals** — Ervaring met formele diners, protocollaire service en allergenenmanagement

Alle koks worden gescreend op werkervaring, HACCP-kennis, referenties en betrouwbaarheid. Voor de diplomatieke horeca voeren wij aanvullende screenings uit op basis van klantvereisten.

## Wat kost een kok inhuren in Den Haag?

Het uurtarief voor een kok in Den Haag ligt tussen **€18 en €30 per uur** (all-in). Den Haag bevindt zich qua tarief op vergelijkbaar niveau als Rotterdam, met een premie voor koks die ervaring hebben in de diplomatieke of fine dining sector.

Het all-in tarief dekt werkgeverslasten, pensioenopbouw, verzekeringen en administratie. Seizoenstarieven voor Scheveningen liggen iets lager door de mogelijkheid van langdurige plaatsing.

Gebruik onze [kosten-calculator](/kosten-calculator/) voor een indicatie op maat of [vraag personeel aan](/personeel-aanvragen/).

## De Haagse wijken waar wij koks leveren

- **Centrum / Binnenhof** — Fine dining, brasseries, politieke horecazaken
- **Lange Voorhout / Noordeinde** — Ambassaderestaurants, high-end catering
- **Scheveningen** — Strandpaviljoens, boulevard restaurants, hotels
- **Kijkduin** — Seizoenspaviljoens, familierestaurants
- **Statenkwartier / Frederik Hendriklaan** — Buurtrestaurants, lunchrooms, wijnbars
- **Denneweg / Hofkwartier** — Trendy eetcafes, bistros, conceptrestaurants
- **Voorburg / Leidschendam** — Regiogemeenten met groeiende horeca
- **Wassenaar** — Landgoedrestaurants, golf clubs, exclusieve catering

## Waarom TopTalent Jobs kiezen voor uw kok in Den Haag?

De Haagse horecamarkt vraagt om een uitzendpartner die het verschil begrijpt tussen een strandpaviljoen in Scheveningen en een ambassadediner op het Lange Voorhout. TopTalent Jobs levert voor beide segmenten.

- **WAADI-geregistreerd** — Volledige wettelijke compliance. Werkgeverslasten, verzekeringen en administratie zijn inbegrepen. U loopt geen enkel juridisch risico.
- **Horeca-exclusief** — Wij zijn gespecialiseerd in horeca en begrijpen de nuances van de Haagse markt: van Schevenings strandwerk tot diplomatieke cuisine.
- **Vervangingsgarantie** — Past de kok niet? Wij regelen kosteloos een alternatief, doorgaans dezelfde werkdag.
- **Transparant en eerlijk** — Geen verborgen kosten, geen minimale afname, geen opzegtermijn. U betaalt per gewerkt uur.
- **Seizoensplanning Scheveningen** — Wij helpen strandpaviljoens met het vroegtijdig plannen van keukenpersoneel voor het zomerseizoen. Wie in januari plant, heeft in maart de beste koks.

Bekijk ook onze [landelijke kok inhuren](/functies/kok-inhuren/) pagina of lees meer over [onze diensten in Den Haag](/locaties/den-haag/).

## Veelgemaakte fouten bij het inhuren van een kok in Den Haag

De Haagse markt kent specifieke valkuilen:

1. **Strandpaviljoen-koks te laat werven** — Elk jaar begint het seizoen in maart-april, maar de beste seizoenskoks zijn al in januari vastgelegd. Paviljoeneigenaren die pas in maart beginnen met werven, vissen achter het net. TopTalent Jobs adviseert minimaal acht weken voor seizoensstart aan te vragen.
2. **Diplomatiekeisen onderschatten** — Een kok voor een ambassadediner moet meer dan alleen goed koken. Kennis van protocollen, allergenenmanagement op topniveau en discretie zijn essentieel. Communiceer deze eisen duidelijk bij uw aanvraag.
3. **Scheveningen en centrum als dezelfde markt beschouwen** — Het zijn twee compleet verschillende werkomgevingen. Een kok die uitblinkt in een rustig bistro op de Denneweg past niet automatisch in een strandpaviljoen met 300 couverts per dag. Wij matchen altijd op basis van locatietype.
4. **Geen HACCP-controle bij seizoenswerk** — In strandpaviljoens gelden dezelfde voedselveiligheidsnormen als in een regulier restaurant, maar de omstandigheden (zand, wind, temperatuur) maken HACCP-borging extra belangrijk. Alle koks via TopTalent Jobs zijn HACCP-gescreend.

## Direct een kok regelen in Den Haag

[Vraag een kok aan](/personeel-aanvragen/) via ons formulier of bel +31 6 17 17 79 39. TopTalent Jobs levert koks in Den Haag en Scheveningen standaard binnen 24 uur.`,
    primary_keywords: [
      "kok inhuren den haag",
      "kok uitzendbureau den haag",
      "keukenpersoneel den haag",
    ],
    secondary_keywords: [
      "kok inhuren scheveningen",
      "chef-kok den haag",
      "horeca uitzendbureau den haag",
    ],
    faq_items: [
      {
        question: "Leveren jullie koks voor strandpaviljoens in Scheveningen?",
        answer:
          "Ja, wij leveren seizoenskoks voor strandpaviljoens in Scheveningen en Kijkduin. Wij adviseren minimaal 8 weken voor seizoensstart aan te vragen voor de beste beschikbaarheid.",
      },
      {
        question: "Wat kost een kok inhuren in Den Haag per uur?",
        answer:
          "Het all-in uurtarief voor een kok in Den Haag ligt tussen €18 en €30, afhankelijk van ervaringsniveau, keukenstijl en werktijden. Inclusief alle werkgeverslasten.",
      },
      {
        question: "Hebben jullie koks met ervaring in de diplomatieke horeca?",
        answer:
          "Ja, ons bestand omvat keukenprofessionals met ervaring bij ambassades, internationale organisaties en formele diners. Wij voeren aanvullende screenings uit voor deze plaatsingen.",
      },
      {
        question: "Hoe snel kan ik een kok krijgen in Den Haag?",
        answer:
          "Standaard levertijd is binnen 24 uur. Bij spoedaanvragen is inzet dezelfde dag mogelijk. Voor seizoenswerk in Scheveningen adviseren wij vroegtijdig te plannen.",
      },
    ],
    bronnen: [
      {
        title: "CBS — Horecavestigingen per gemeente 2024",
        url: "https://www.cbs.nl",
        type: "officieel",
      },
      {
        title: "Gemeente Den Haag — Horecabeleid",
        url: "https://www.denhaag.nl",
        type: "officieel",
      },
    ],
    statistieken: [
      {
        stat: "2.400+ horecavestigingen in Den Haag",
        bron: "CBS",
        jaar: 2024,
      },
      {
        stat: "150+ ambassades en internationale organisaties in Den Haag",
        bron: "Gemeente Den Haag",
        jaar: 2025,
      },
      {
        stat: "60+ strandpaviljoens op Scheveningen en Kijkduin",
        bron: "Koninklijke Horeca Nederland",
        jaar: 2024,
      },
    ],
    structured_data: [],
  },

  // =========================================================================
  // 4. Bediening inhuren Den Haag
  // =========================================================================
  {
    content_type: "city_page",
    stad: "den-haag",
    slug: "bediening-inhuren-den-haag",
    taal: "nl",
    title: "Bediening Inhuren in Den Haag — Professionele Horecabediening",
    seo_title: "Bediening Inhuren Den Haag | TopTalent Jobs",
    meta_description:
      "Bediening nodig in Den Haag? TopTalent Jobs levert obers en serveersters voor restaurants, hotels en events in Den Haag en Scheveningen. Snel en flexibel.",
    canonical_url:
      "https://www.toptalentjobs.nl/geo/bediening-inhuren-den-haag/",
    excerpt:
      "Den Haag vraagt om bediening die kan schakelen tussen diplomatiek niveau en strandpaviljoendynamiek. TopTalent Jobs levert voor beide segmenten.",
    body_markdown: `## Bediening inhuren in Den Haag: van Binnenhof tot boulevard

Den Haag is een stad van contrasten als het gaat om horeca. Enerzijds zijn er de formele restaurants en hotels rondom het Binnenhof, het Lange Voorhout en Noordeinde — waar ambassadeurs, politici en internationale gasten een hoog serviceniveau verwachten. Anderzijds heeft Scheveningen een bruisende strandhoreca waar snelheid, volume en een informele sfeer de boventoon voeren.

Beide segmenten kampen met een structureel tekort aan bedieningspersoneel. Volgens KHN staan in Den Haag op elk moment honderden horecavacatures open, waarvan het merendeel in de bediening. Het internationale karakter van de stad maakt de eisen bovendien hoger: meertaligheid, representativiteit en kennis van protocollen zijn vaker een vereiste dan in andere steden.

TopTalent Jobs levert bedieningsmedewerkers die passen bij de Haagse horecamarkt. Of u nu een ober zoekt voor een diplomatiek diner op het Plein of een serveerster voor een druk strandpaviljoen op de boulevard — wij matchen op basis van ervaring, stijl en locatietype.

## Wanneer bediening inhuren in Den Haag?

De Haagse horecamarkt kent seizoensgebonden en structurele pieken:

- **Strandseizoen Scheveningen** (maart–oktober) — De 60+ strandpaviljoens schalen hun personeel in het voorjaar op van minimaal naar maximaal. Honderden extra bedieningsmedewerkers zijn nodig voor een periode van vijf tot zes maanden.
- **Prinsjesdag en parlementaire evenementen** — De opening van het parlementaire jaar en gerelateerde diners en recepties vragen om formele bediening met ervaring in protocollair serveren.
- **Internationale conferenties** — Het World Forum, het Vredespaleis en de vele ambassaderesidenties organiseren doorlopend evenementen met catering en formele bediening.
- **Congreshotel-pieken** — Hotels als het Hilton, Marriott en Hotel Des Indes hebben bij congressen en events extra banquetingbediening nodig.
- **Weekendpiek binnenstad** — De Denneweg, Frederikstraat en het Plein zijn in het weekend drukke horecagebieden waar extra bediening het verschil maakt tussen gastvrije en gehaaste service.

## Onze bedieningsmedewerkers in Den Haag

TopTalent Jobs selecteert bediening voor Den Haag op specifieke criteria:

- **Meertaligheid** — Minimaal Nederlands en Engels; voor de diplomatieke horeca is Duits, Frans of Spaans een sterk voordeel. Den Haag heeft het hoogste percentage internationale inwoners van Nederland (circa 13% expats).
- **Representativiteit** — Van formeel in pak tot casual beachclub-stijl: wij matchen de uitstraling van de medewerker bij uw concept.
- **Protocolkennis** — Voor formele diners en ambassade-evenementen leveren wij bediening met kennis van tafelschikking, wijnservice en diplomatiek protocol.
- **Stressbestendigheid** — Scheveningse strandpaviljoens met 200+ couverts per dienst vereisen bediening die snel, georganiseerd en fysiek fit is.

Wij leveren:
- Obers en serveersters voor restaurants en eetcafes
- Banquetingpersoneel voor hotels en congreslocaties
- Gastheren en gastvrouwen voor ontvangsten en recepties
- Terrasbediening voor strandpaviljoens en boulevard
- Sommelier-niveau bediening voor fine dining

## Tarieven bediening Den Haag

| Niveau | Uurtarief (all-in) |
|--------|-------------------|
| Junior bediening (0-2 jaar) | €16 – €19 |
| Zelfstandig ober/serveerster (2-5 jaar) | €19 – €25 |
| Senior / protocollair bediening | €25 – €32 |

Alle tarieven inclusief werkgeverslasten, pensioen en verzekeringen. Seizoenstarieven voor Scheveningen op aanvraag.

## Bediening in elke Haagse wijk

- **Centrum / Binnenhof / Plein** — Politieke horeca, formele restaurants
- **Lange Voorhout / Noordeinde** — Fine dining, ambassaderestaurants
- **Denneweg / Hofkwartier** — Trendy bistros, wijnbars, conceptzaken
- **Frederik Hendriklaan** — Buurtrestaurants, terrassen, lunchrooms
- **Scheveningen Boulevard** — Strandpaviljoens, restaurants, hotels (Kurhaus, Carlton Beach)
- **Kijkduin** — Seizoenspaviljoens, familiehoreca
- **Voorburg / Leidschendam / Wassenaar** — Regio-horeca, landgoedrestaurants

## Waarom TopTalent Jobs kiezen voor bediening in Den Haag?

Den Haag vraagt om een uitzendpartner die de twee gezichten van de Haagse horeca begrijpt: het formele en het informele. TopTalent Jobs levert voor beide.

- **WAADI-geregistreerd** — Volledig conform de Nederlandse uitzendwetgeving. Werkgeverslasten, verzekeringen en afdrachten zijn gedekt. U ontvangt een transparante weekfactuur.
- **Horeca-exclusief** — Onze recruiters kennen het verschil tussen banquetingservice en strandpaviljoenbediening. Wij matchen op locatietype, gastverwachting en serviceniveau.
- **Meertalige pool** — Den Haag is internationaal. Onze database bevat bedieningsmensen die naast Nederlands en Engels ook Frans, Duits, Spaans of Arabisch spreken — essentieel voor de diplomatieke horeca.
- **Seizoensplanning Scheveningen** — Wij helpen paviljoeneigenaren met vroegtijdige personeelsplanning. Wie in januari begint, heeft in maart een betrouwbaar team.
- **Vervangingsgarantie** — Bij een mismatch of uitval regelen wij dezelfde dag vervanging, zonder extra kosten.

Bekijk ook onze [landelijke bediening inhuren](/functies/bediening-inhuren/) pagina of lees meer over [onze aanwezigheid in Den Haag](/locaties/den-haag/).

## Veelgemaakte fouten bij het inhuren van bediening in Den Haag

De Haagse horecamarkt kent specifieke valkuilen:

1. **Strandpersoneel en restaurantpersoneel verwisselen** — Een ober die gewend is aan een rustig restaurant op de Frederikstraat past niet automatisch in een strandpaviljoen met 250 gasten en zand tussen de tafels. Andersom geldt hetzelfde: een strandmedewerker mist mogelijk de finesse voor fine dining. Wij matchen altijd op locatietype.
2. **Meertaligheid niet als eis meenemen** — In Den Haag spreken veel gasten geen Nederlands. Een bedieningsmedewerker die alleen Nederlands spreekt, mist een aanzienlijk deel van de communicatie. Geef bij uw aanvraag altijd aan welke talen relevant zijn.
3. **Prinsjesdag en conferenties te laat plannen** — De politieke agenda van Den Haag genereert voorspelbare pieken. Reserveer minimaal twee weken vooruit voor parlementaire evenementen en conferenties.
4. **Seizoenspersoneel niet inwerken** — Strandpaviljoens openen vaak met volledig nieuw personeel. Investeer in een inwerkdag voor het seizoen begint — dat voorkomt fouten en verhoogt de gasttevredenheid vanaf dag één.

## Direct bediening regelen in Den Haag

[Vraag bediening aan](/personeel-aanvragen/) of bel +31 6 17 17 79 39. TopTalent Jobs levert bedieningsmedewerkers in Den Haag en Scheveningen standaard binnen 24 uur.`,
    primary_keywords: [
      "bediening inhuren den haag",
      "ober inhuren den haag",
      "serveerster inhuren den haag",
    ],
    secondary_keywords: [
      "horeca bediening den haag",
      "bediening scheveningen",
      "bedieningspersoneel uitzendbureau den haag",
    ],
    faq_items: [
      {
        question: "Leveren jullie bediening voor ambassadediners in Den Haag?",
        answer:
          "Ja, wij leveren bedieningsmedewerkers met ervaring in de diplomatieke horeca. Onze medewerkers kennen protocollaire tafelschikking, wijnservice en meertalige gastheerschap.",
      },
      {
        question: "Wat kost bediening inhuren in Den Haag per uur?",
        answer:
          "Het all-in uurtarief voor bediening in Den Haag ligt tussen €16 en €32, afhankelijk van ervaringsniveau en locatietype. Protocollair bediening voor formele events zit in de bovenste range.",
      },
      {
        question: "Kunnen jullie een compleet team leveren voor een strandpaviljoen in Scheveningen?",
        answer:
          "Ja, wij leveren complete bedieningsteams voor strandpaviljoens. Van 2 tot 15+ medewerkers per seizoen. Wij adviseren minimaal 8 weken voor seizoensstart te plannen.",
      },
      {
        question: "Spreken jullie bedieningsmedewerkers in Den Haag Frans of Duits?",
        answer:
          "Ja, een significant deel van onze Haagse pool spreekt naast Nederlands en Engels ook Frans, Duits of Spaans. Dit is essentieel voor de internationale gasten en de diplomatieke horeca in Den Haag.",
      },
    ],
    bronnen: [
      {
        title: "KHN — Horecamonitor Den Haag",
        url: "https://www.khn.nl",
        type: "onderzoek",
      },
      {
        title: "Gemeente Den Haag — Internationaal profiel",
        url: "https://www.denhaag.nl",
        type: "officieel",
      },
    ],
    statistieken: [
      {
        stat: "13% expat-populatie in Den Haag (hoogste van Nederland)",
        bron: "Gemeente Den Haag",
        jaar: 2024,
      },
      {
        stat: "60+ strandpaviljoens op Scheveningen en Kijkduin",
        bron: "Koninklijke Horeca Nederland",
        jaar: 2024,
      },
    ],
    structured_data: [],
  },

  // =========================================================================
  // 5. Kok inhuren Eindhoven
  // =========================================================================
  {
    content_type: "city_page",
    stad: "eindhoven",
    slug: "kok-inhuren-eindhoven",
    taal: "nl",
    title: "Kok Inhuren in Eindhoven — Keukenpersoneel voor de Brainportregio",
    seo_title: "Kok Inhuren Eindhoven | TopTalent Jobs",
    meta_description:
      "Kok nodig in Eindhoven? TopTalent Jobs levert ervaren koks voor restaurants, hotels en catering in Eindhoven en de Brainportregio. Binnen 24 uur inzetbaar.",
    canonical_url: "https://www.toptalentjobs.nl/geo/kok-inhuren-eindhoven/",
    excerpt:
      "Eindhoven is de snelst groeiende technologieregio van Nederland. De Brainport-economie trekt duizenden expats aan en de horeca groeit mee — maar het vinden van goede koks is een uitdaging.",
    body_markdown: `## Kok inhuren in Eindhoven: de Brainportregio groeit, de horeca ook

Eindhoven heeft zich in het afgelopen decennium getransformeerd van industriestad tot innovatiehub. De Brainportregio, met bedrijven als ASML, Philips, VDL en NXP, trekt jaarlijks duizenden internationale kenniswerkers aan. Deze groei heeft een direct effect op de horeca: het aantal restaurants, eetcafes en cateringbedrijven in Eindhoven stijgt structureel.

Volgens cijfers van het CBS telt Eindhoven circa 1.600 horecavestigingen. De binnenstad rond het Stratumseind, de Dommelstraat en de Markt vormt het horecahart, terwijl Strijp-S — het voormalige Philips-terrein — is uitgegroeid tot een creatieve hotspot met restaurants, foodhallen en pop-up concepten. De High Tech Campus, thuisbasis van 300+ bedrijven en 15.000+ werknemers, genereert een constante vraag naar bedrijfscatering.

TopTalent Jobs levert ervaren koks aan de Eindhovense horecamarkt. Van hulpkoks voor drukke eetcafes op het Stratumseind tot sous-chefs voor fine dining op Strijp-S — wij matchen keukenprofessionals die passen bij uw concept en brigade.

## De Eindhovense horecamarkt: technologie en gastvrijheid

Eindhoven is anders dan de Randstad. De stad heeft specifieke kenmerken die de horecamarkt vormen:

- **Expat-community** — De Brainportregio telt meer dan 50.000 expats, vooral afkomstig uit India, China en Zuid-Europa. Dit creëert een vraag naar internationale cuisines en koks die gewend zijn aan diverse keukenstijlen. Restaurants op Strijp-S en rondom de High Tech Campus bedienen dagelijks een internationaal publiek.
- **Strijp-S als culinair centrum** — Het voormalige Philips-terrein is het gastronomische epicentrum van Eindhoven geworden. Met restaurants als Radio Royaal, de verspillingsfabriek en diverse pop-up concepten vraagt Strijp-S om koks die creatief en ondernemend zijn.
- **Stratumseind** — Met meer dan 50 horecazaken is het Stratumseind de langste kroegen- en restaurantstraat van Nederland. De combinatie van hoog volume, nachthoreca en wisselende drukte maakt het een unieke werkplek voor keukenpersoneel.
- **Evenementen en design** — Dutch Design Week (350.000 bezoekers), GLOW Eindhoven (750.000 bezoekers) en talloze tech-events genereren seizoensgebonden pieken die extra keukenpersoneel vereisen.
- **Bedrijfscatering High Tech Campus** — De "slimste vierkante kilometer van Europa" herbergt kantoorrestaurants en cateringfaciliteiten die dagelijks duizenden werknemers bedienen. De catering op de campus vraagt om koks die grote volumes aankunnen met een hoog kwaliteitsniveau.

## Welke koks levert TopTalent Jobs in Eindhoven?

Ons bestand voor de regio Eindhoven omvat:

- **Hulpkok / commis** — Ondersteuning bij mise en place en basisbereiding
- **Zelfstandig kok** — Draait zelfstandig een post, van soep tot dessert
- **Sous-chef / chef-kok** — Aansturing brigade, menuontwikkeling, kostprijsbeheersing
- **Bedrijfscateringkoks** — Ervaring met grote volumes, dagmenu's en buffetopstelling
- **Internationale keukenspecialisten** — Koks met ervaring in Aziatische, Indiase, Mediterrane en fusion cuisine

Alle koks zijn gescreend op werkervaring, HACCP-kennis en referenties. Voor de Eindhovense markt selecteren wij specifiek koks die gewend zijn aan een multiculturele werkomgeving.

## Wat kost een kok inhuren in Eindhoven?

Het uurtarief voor een kok in Eindhoven ligt tussen **€17 en €28 per uur** (all-in). Eindhoven ligt qua tarief onder de Randstadsteden, maar boven het landelijk gemiddelde. De groeiende vraag vanuit de tech-sector drijft de tarieven geleidelijk op.

Factoren die het tarief beïnvloeden:
- Ervaringsniveau (hulpkok vs. chef-kok)
- Type keuken (bedrijfscatering vs. fine dining)
- Werktijden (avond/weekend toeslagen conform horeca-cao)
- Duur van de inzet (langdurig = voordeliger uurtarief)

Alle tarieven zijn all-in: werkgeverslasten, pensioen, verzekeringen en administratie inbegrepen. Bekijk onze [kosten-calculator](/kosten-calculator/) voor een indicatie.

## Hoe werkt kok inhuren in Eindhoven?

1. **Aanvraag** — Via [personeel aanvragen](/personeel-aanvragen/) of bel +31 6 17 17 79 39
2. **Matching** — Wij selecteren een kok die past bij uw keukentype, cuisine en brigade
3. **Inzet binnen 24 uur** — De kok meldt zich op uw locatie in Eindhoven
4. **Evaluatie** — Na de eerste dienst bespreken we de match
5. **Flexibel doorgaan** — Verleng, wissel of stop zonder opzegtermijn

## Eindhovense wijken waar wij koks leveren

- **Centrum / Markt** — Restaurants, grand cafes, hotelkeukens
- **Strijp-S** — Creatieve restaurants, foodhallen, pop-up concepten
- **Stratumseind** — Hoog-volume horeca, nachthoreca
- **High Tech Campus** — Bedrijfscatering, kantoorrestaurants
- **Dommelkwartier / Dommelstraat** — Fine dining, wijnbars, bistros
- **Tongelre / Stratum** — Buurtrestaurants, multiculturele eetgelegenheden
- **Veldhoven, Best, Son en Breugel** — Regiogemeenten met groeiende horeca

## Waarom TopTalent Jobs kiezen voor uw kok in Eindhoven?

Eindhoven verdient een uitzendpartner die de lokale markt begrijpt. TopTalent Jobs kent de Brainportregio en de specifieke behoeften van de Eindhovense horeca.

- **WAADI-geregistreerd** — Volledige wettelijke compliance. Alle werkgeverslasten, verzekeringen en afdrachten zijn gedekt in ons all-in tarief.
- **Horeca-exclusief** — Wij bemiddelen uitsluitend horecapersoneel. Onze recruiters begrijpen het verschil tussen een bedrijfscateringkeuken op de High Tech Campus en een fine dining keuken op Strijp-S.
- **Multicultureel bestand** — De Eindhovense horeca bedient een internationaal publiek. Ons bestand omvat koks met diverse culturele achtergronden en keukenspecialisaties.
- **Vervangingsgarantie** — Past de kok niet? Wij regelen kosteloos een alternatief, doorgaans dezelfde werkdag.
- **Transparant** — Geen verborgen kosten, geen minimale afname. U betaalt per gewerkt uur en ontvangt wekelijks een factuur.

Bekijk ook onze [landelijke kok inhuren](/functies/kok-inhuren/) pagina of lees meer over onze [diensten in Eindhoven](/locaties/eindhoven/).

## Veelgemaakte fouten bij het inhuren van een kok in Eindhoven

De Eindhovense markt kent specifieke valkuilen:

1. **De expat-markt onderschatten** — Eindhoven heeft een groot internationaal publiek dat gewend is aan hoge kwaliteit en diverse cuisines. Een kok die alleen traditionele Nederlandse gerechten beheerst, mist mogelijk de aansluiting bij de gastverwachting op Strijp-S of rondom de High Tech Campus. Communiceer bij uw aanvraag welke cuisines relevant zijn.
2. **Evenementenpieken niet vooruit plannen** — Dutch Design Week en GLOW Eindhoven zijn jaarlijkse zekerheid. Toch wachten veel ondernemers te lang met het aanvragen van extra keukenpersoneel. Plan minimaal drie weken vooruit voor deze events.
3. **Bedrijfscatering als eenvoudig beschouwen** — Koken voor 500+ werknemers per dag op de High Tech Campus is geen simpele klus. Het vereist ervaring met bulkbereiding, menurotatie en dieetmanagement op grote schaal. Wij matchen specifiek koks met bedrijfscateringervaring.
4. **Geen rekening houden met bereikbaarheid** — De Eindhovense horeca is verspreid over een groter gebied dan in compacte binnensteden als Utrecht. Koks die in het centrum wonen, hebben mogelijk vervoer nodig naar de High Tech Campus of Veldhoven. Bespreek logistiek bij de aanvraag.

## Direct een kok regelen in Eindhoven

[Vraag een kok aan](/personeel-aanvragen/) of bel +31 6 17 17 79 39. TopTalent Jobs levert ervaren koks in Eindhoven en de Brainportregio standaard binnen 24 uur.`,
    primary_keywords: [
      "kok inhuren eindhoven",
      "kok uitzendbureau eindhoven",
      "keukenpersoneel eindhoven",
    ],
    secondary_keywords: [
      "chef-kok inhuren eindhoven",
      "bedrijfscatering kok eindhoven",
      "horeca uitzendbureau eindhoven",
    ],
    faq_items: [
      {
        question: "Leveren jullie koks voor bedrijfscatering op de High Tech Campus?",
        answer:
          "Ja, wij leveren koks met ervaring in bedrijfscatering voor de High Tech Campus en andere kantoorlocaties in de Brainportregio. Onze koks zijn gewend aan grote volumes en dagelijkse menurotatie.",
      },
      {
        question: "Wat kost een kok inhuren in Eindhoven per uur?",
        answer:
          "Het all-in uurtarief voor een kok in Eindhoven ligt tussen €17 en €28, afhankelijk van ervaringsniveau en type keuken. Inclusief alle werkgeverslasten en verzekeringen.",
      },
      {
        question: "Hebben jullie koks met internationale keukenervaring in Eindhoven?",
        answer:
          "Ja, ons Eindhovense bestand omvat koks met specialisaties in Aziatische, Indiase, Mediterrane en fusion cuisine. Dit past bij het internationale karakter van de Brainportregio en de diverse expat-community.",
      },
      {
        question: "Leveren jullie ook koks voor Dutch Design Week en GLOW Eindhoven?",
        answer:
          "Ja, wij leveren jaarlijks koks voor evenementen als Dutch Design Week (350.000 bezoekers) en GLOW Eindhoven. Vraag minimaal 3 weken van tevoren aan voor optimale beschikbaarheid.",
      },
    ],
    bronnen: [
      {
        title: "CBS — Horecavestigingen per gemeente 2024",
        url: "https://www.cbs.nl",
        type: "officieel",
      },
      {
        title: "Brainport Eindhoven — Economische cijfers",
        url: "https://brainporteindhoven.com",
        type: "onderzoek",
      },
      {
        title: "UWV — Arbeidsmarktinformatie Noord-Brabant 2024",
        url: "https://www.uwv.nl",
        type: "officieel",
      },
    ],
    statistieken: [
      {
        stat: "1.600+ horecavestigingen in Eindhoven",
        bron: "CBS",
        jaar: 2024,
      },
      {
        stat: "50.000+ expats in de Brainportregio",
        bron: "Brainport Eindhoven",
        jaar: 2025,
      },
      {
        stat: "350.000 bezoekers Dutch Design Week per editie",
        bron: "Dutch Design Week",
        jaar: 2024,
      },
    ],
    structured_data: [],
  },
];

// ---------------------------------------------------------------------------
// Insert into Supabase
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding ${pages.length} geo-content pages (Rotterdam, Den Haag, Eindhoven)...\n`);

  for (const page of pages) {
    // Check word count
    const wordCount = page.body_markdown
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    if (wordCount < 700) {
      console.error(
        `SKIP: ${page.slug} — slechts ${wordCount} woorden (minimum 700)`,
      );
      continue;
    }

    // Check if slug already exists
    const { data: existing } = await supabase
      .from("geo_content")
      .select("id, status")
      .eq("slug", page.slug)
      .single();

    if (existing) {
      console.log(
        `UPDATE: ${page.slug} (bestaat al, status: ${existing.status})`,
      );
      const { error } = await supabase
        .from("geo_content")
        .update({
          ...page,
          status: "gepubliceerd",
          gepubliceerd_op: now,
          updated_at: now,
          gegenereerd_door: "seed-script",
          versie: 1,
        })
        .eq("id", existing.id);

      if (error) {
        console.error(`  ERROR: ${error.message}`);
      } else {
        console.log(`  OK — ${wordCount} woorden, status: gepubliceerd`);
      }
    } else {
      const { error } = await supabase.from("geo_content").insert({
        ...page,
        status: "gepubliceerd",
        gepubliceerd_op: now,
        gegenereerd_door: "seed-script",
        versie: 1,
        review_notities: null,
        vorige_versie_id: null,
      });

      if (error) {
        console.error(`INSERT ERROR ${page.slug}: ${error.message}`);
      } else {
        console.log(`INSERT: ${page.slug} — ${wordCount} woorden, gepubliceerd`);
      }
    }
  }

  console.log("\nDone. Verifieer met:");
  console.log(
    "  SELECT slug, stad, status, length(body_markdown) FROM geo_content WHERE stad IN ('rotterdam','den-haag','eindhoven') ORDER BY slug;",
  );
}

seed().catch(console.error);
