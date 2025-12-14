import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Algemene Voorwaarden | TopTalent Jobs",
  description: "Lees de algemene voorwaarden van TopTalent B.V. voor uitzenden, detachering en werving & selectie van horecapersoneel.",
};

export default function AlgemeneVoorwaardenPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 py-20 lg:py-28">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-5" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Algemene Voorwaarden
          </h1>
          <p className="text-lg text-neutral-300">
            TopTalent B.V. - Versie 1.0 | 3 februari 2023
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="prose prose-lg max-w-none prose-headings:text-[#1F1F1F] prose-p:text-neutral-600 prose-li:text-neutral-600">

            {/* DEEL I */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6">
              DEEL I - ALGEMENE BEPALINGEN
            </h2>

            {/* Artikel 1 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 1 - Begrippen</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>In deze algemene voorwaarden worden de hiernavolgende termen in de navolgende betekenis gebruikt, tenzij uitdrukkelijk anders is aangegeven.</li>
              <li><strong>Aanbod:</strong> ieder Aanbod aan Opdrachtgever tot het verrichten van Diensten door Toptalent.</li>
              <li><strong>Arbeidskracht:</strong> de natuurlijke persoon niet handelt in de uitoefening van beroep of bedrijf.</li>
              <li><strong>Diensten:</strong> de Diensten die Toptalent aanbiedt, betreffen: Werving en selectie c.q. arbeidsbemiddeling, detachering alsmede het uitzenden van Kandidaten.</li>
              <li><strong>Kandidaat:</strong> de Zzp&apos;er of Arbeidskracht die is ingeschreven bij Toptalent, en door Toptalent in het kader van een of meerdere Diensten aan Opdrachtgever wordt voorgesteld, ten behoeve van het ter beschikking stellen van de Kandidaat aan Opdrachtgever of het aangaan van een arbeidsovereenkomst of een overeenkomst van opdracht.</li>
              <li><strong>Opdrachtgever:</strong> de natuurlijke of rechtspersoon in de uitoefening van beroep of bedrijf die Toptalent heeft aangesteld en/of projecten aan Toptalent heeft verleend voor Diensten die door Toptalent worden uitgevoerd.</li>
              <li><strong>Overeenkomst:</strong> elke Overeenkomst en andere verplichtingen tussen Opdrachtgever en Toptalent, alsmede voorstellen van Toptalent voor Diensten die door Toptalent aan Opdrachtgever worden verstrekt en die door Opdrachtgever worden aanvaard en zijn geaccepteerd en uitgevoerd door Toptalent.</li>
              <li><strong>Terbeschikkingstelling:</strong> de Overeenkomst waarbij de Kandidaat door Toptalent, ter beschikking wordt gesteld aan Opdrachtgever om krachtens een door deze aan de Toptalent verstrekte opdracht arbeid te verrichten onder toezicht en leiding van Opdrachtgever.</li>
              <li><strong>Werkzaamheden:</strong> indien er in deze algemene voorwaarden wordt gesproken over Werkzaamheden, heeft dit betrekking op de alle Werkzaamheden die de Kandidaat onder leiding en toezicht en ten behoeve van Opdrachtgever verricht.</li>
              <li><strong>Werving en selectie:</strong> Diensten ten behoeve van Opdrachtgever inhoudende het behulpzaam zijn bij het zoeken van Kandidaten waarbij de totstandkoming van een arbeidsovereenkomst naar burgerlijk recht dan wel een aanstelling tot ambtenaar wordt beoogd tussen Opdrachtgever en de Kandidaat.</li>
              <li><strong>Toptalent:</strong> de dienstverlener die Diensten aan Opdrachtgever aanbiedt.</li>
              <li><strong>Zzp&apos;er:</strong> de natuurlijke persoon die handelt in de uitoefening van beroep of bedrijf.</li>
            </ol>

            {/* Artikel 2 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 2 - Toepasselijkheid</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Deze algemene voorwaarden zijn van toepassing op elk Aanbod van Toptalent, elke Overeenkomst tussen Toptalent en Opdrachtgever en op elke Dienst die door Toptalent wordt aangeboden.</li>
              <li>Voordat een overeenkomst wordt gesloten, krijgt Opdrachtgever de beschikking over deze algemene voorwaarden. Indien dit redelijkerwijs niet mogelijk is, zal Toptalent aan Opdrachtgever aangeven op welke wijze Opdrachtgever de algemene voorwaarden kan inzien.</li>
              <li>Afwijking van deze algemene voorwaarden is niet mogelijk. In uitzonderlijke situaties kan van de algemene voorwaarden afgeweken worden voor zover dit expliciet en schriftelijk met Toptalent is overeengekomen.</li>
              <li>Deze algemene voorwaarden zijn ook van toepassing op aanvullende, gewijzigde en vervolgopdrachten van Opdrachtgever.</li>
              <li>De algemene voorwaarden van Opdrachtgever zijn uitgesloten.</li>
              <li>Indien een of meerdere bepalingen van deze algemene voorwaarden gedeeltelijk of geheel nietig zijn of worden vernietigd, blijven de overige bepalingen van deze algemene voorwaarden in stand, en zal de nietige/vernietigde bepaling(en) vervangen worden door een bepaling met dezelfde strekking als de originele bepaling.</li>
              <li>Onduidelijkheden over de inhoud, uitleg of situaties die niet geregeld zijn in deze algemene voorwaarden, dienen beoordeeld en uitgelegd te worden naar de geest van deze algemene voorwaarden.</li>
              <li>De toepasselijkheid van de artikelen 7:404 BW en 7:407 lid 2 BW is expliciet uitgesloten.</li>
              <li>Indien in deze algemene voorwaarden wordt verwezen naar zij/haar, dient dit tevens te worden opgevat als een verwijzing naar hij/hem/zijn, indien en voor zover van toepassing.</li>
            </ol>

            {/* Artikel 3 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 3 - Het Aanbod</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Ieder Aanbod van Toptalent is vrijblijvend, tenzij uitdrukkelijk anders aangegeven.</li>
              <li>Ieder Aanbod is in beginsel geldig tot 31 december van het huidige jaar, onder voorbehoud van tussentijdse prijswijzigingen ten gevolge van loonwijzigingen op grond van de CAO die van toepassing is op de Arbeidskracht of overige wet- en regelgeving (zoals sociale en fiscale wetgeving). Indien het Aanbod beperkt of onder specifieke voorwaarden geldig is, wordt dit uitdrukkelijk in het Aanbod vermeld. Indien er sprake is van wijzigingen, zal dit vooraf schriftelijk kenbaar worden gemaakt.</li>
              <li>Toptalent is slechts aan een Aanbod gebonden indien deze door Opdrachtgever schriftelijk binnen 30 dagen wordt bevestigd. Niettemin heeft Toptalent het recht een Overeenkomst met een (potentiële) Opdrachtgever om een voor Toptalent gegronde reden te weigeren.</li>
              <li>Het Aanbod bevat een omschrijving van de aangeboden Diensten. De beschrijving is voldoende gespecificeerd, zodat Opdrachtgever in staat is om een goede beoordeling van het Aanbod te maken. Eventuele gegevens in het Aanbod zijn slechts een indicatie en kunnen geen grond zijn voor enige schadevergoeding of het ontbinden van de Overeenkomst.</li>
              <li>Aanbiedingen of offertes gelden niet automatisch voor vervolgopdrachten.</li>
              <li>Eventuele opgenomen termijnen in het Aanbod van Toptalent zijn in beginsel indicatief en geven Opdrachtgever bij overschrijding ervan geen recht op ontbinding of schadevergoeding, tenzij uitdrukkelijk anders is overeengekomen.</li>
              <li>Een samengestelde prijsopgave verplicht Toptalent niet tot oplevering van een deel van de in het Aanbod begrepen Diensten tegen een overeenkomstig deel van de opgegeven prijs.</li>
            </ol>

            {/* Artikel 4 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 4 - Totstandkoming van de overeenkomst</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>De Overeenkomst komt tot stand op het moment dat Opdrachtgever een Aanbod c.q. Overeenkomst van Toptalent heeft aanvaard door een ondertekend exemplaar (ingescand of origineel) aan Toptalent te retourneren, dan wel een expliciet en ondubbelzinnig akkoord geeft op het Aanbod per e-mail.</li>
              <li>Toptalent heeft het recht om de (ondertekende) Overeenkomst te herroepen binnen 5 werkdagen na ontvangst van de aanvaarding.</li>
              <li>Toptalent is niet gehouden aan een Aanbod indien Opdrachtgever redelijkerwijs had kunnen verwachten of heeft moeten begrijpen of behoorde te begrijpen dat het Aanbod een kennelijke vergissing of verschrijving bevat. Aan deze vergissing of verschrijving kan Opdrachtgever geen rechten ontlenen.</li>
              <li>Indien Opdrachtgever een reeds bevestigde opdracht annuleert, worden de reeds daadwerkelijk gemaakte kosten (inclusief de bestede tijd) in rekening gebracht bij Opdrachtgever.</li>
              <li>Elke overeenkomst die met Toptalent wordt aangegaan of een project dat door Opdrachtgever aan Toptalent wordt toegekend, berust bij het bedrijf en niet bij een individuele persoon die met Toptalent is verbonden.</li>
              <li>Het herroepingsrecht van Opdrachtgever is uitgesloten, tenzij anders overeengekomen.</li>
              <li>Indien de Overeenkomst door meerdere Opdrachtgevers wordt aangegaan, is elke Opdrachtgever afzonderlijk hoofdelijk aansprakelijk voor de nakoming van alle uit de Overeenkomst voortvloeiende verplichtingen.</li>
            </ol>

            {/* Artikel 5 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 5 - Duur van de overeenkomst</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>De Overeenkomst wordt aangegaan voor bepaalde tijd, tenzij de inhoud, aard of strekking van de opdracht met zich brengt dat zij voor een onbepaalde tijd is aangegaan. De duur van de Overeenkomst is mede afhankelijk van externe factoren waaronder begrepen, maar niet beperkt tot de kwaliteit en de tijdige aanlevering van de informatie die Toptalent van Opdrachtgever verkrijgt.</li>
              <li>Zowel Opdrachtgever als Toptalent kan de Overeenkomst ontbinden op grond van een toerekenbare tekortkoming in de nakoming van de Overeenkomst indien de andere partij schriftelijk in gebreke is gesteld en haar een redelijke termijn is gegeven tot nakoming van haar verplichtingen en zij verzuimt haar verplichtingen alsnog correct na te komen.</li>
              <li>De ontbinding van de Overeenkomst laat de betalingsverplichtingen van Opdrachtgever onverlet voor zover Toptalent ten tijde van de ontbinding reeds werkzaamheden heeft verricht of prestaties heeft geleverd.</li>
              <li>De Overeenkomst is tussentijds opzegbaar tegen het einde van de maand. De opzegtermijn bedraagt één maand tenzij anders overeengekomen.</li>
              <li>Ingeval van een voortijdige beëindiging van de Overeenkomst is Opdrachtgever de tot dan daadwerkelijk gemaakte kosten verschuldigd van Toptalent tegen het overeengekomen (uur)tarief.</li>
              <li>Zowel Opdrachtgever als Toptalent kan de Overeenkomst zonder nadere ingebrekestelling geheel of gedeeltelijk schriftelijk met onmiddellijke ingang opzeggen ingeval een der partijen in surseance van betaling verkeert, faillissement is aangevraagd of de betreffende onderneming eindigt door liquidatie.</li>
            </ol>

            {/* Artikel 6 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 6 - Uitvoering van de dienstverlening</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Toptalent zal zich inspannen om de overeengekomen Dienst met de grootst mogelijke zorgvuldigheid uit te voeren zoals van een goed dienstverlener verlangd mag worden. Toptalent staat in voor een professionele en onafhankelijke dienstverlening. Alle Diensten worden uitgevoerd op basis van een inspanningsverbintenis, tenzij expliciet en schriftelijk een resultaat is overeengekomen welke uitvoerig is beschreven.</li>
              <li>De Overeenkomst op basis waarvan Toptalent de Diensten uitvoert, is leidend voor de omvang en de reikwijdte van de dienstverlening. De Overeenkomst zal alleen worden uitgevoerd ten behoeve van Opdrachtgever. Derden kunnen geen rechten ontlenen aan de inhoud van de uitgevoerde Diensten in verband met de Overeenkomst.</li>
              <li>De door Opdrachtgever verstrekte informatie en gegevens zijn de basis waarop de door Toptalent aangeboden diensten en de prijzen zijn gebaseerd. Toptalent heeft het recht haar dienstverlening en haar prijzen aan te passen indien de verstrekte informatie onjuist en/of onvolledig blijkt te zijn.</li>
              <li>Bij de uitvoering van de Diensten is Toptalent niet verplicht of gehouden om de aanwijzingen van Opdrachtgever op te volgen indien daardoor de inhoud of omvang van de overeengekomen Diensten wordt gewijzigd.</li>
              <li>Toptalent is gerechtigd om voor de uitvoering van de Diensten naar eigen inzicht derden in te schakelen.</li>
              <li>Indien de aard en de duur van de opdracht dit vereisen, houdt Toptalent Opdrachtgever tussentijds via de overeengekomen wijze op de hoogte van de voortgang.</li>
              <li>De uitvoering van de Diensten is gebaseerd op de door Opdrachtgever verstrekte informatie. Indien de informatie gewijzigd dient te worden, kan dit gevolgen hebben voor een eventuele vastgestelde planning.</li>
            </ol>

            {/* Artikel 7 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 7 - Verplichtingen Opdrachtgever</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Opdrachtgever is verplicht alle door Toptalent verzochte informatie alsmede relevante bijlagen en aanverwante informatie en gegevens tijdig en/of voor aanvang van de dienstverlening en in de gewenste vorm te verstrekken ten behoeve van een juiste en doelmatige uitvoering van de Overeenkomst.</li>
              <li>Toptalent is niet verplicht om de juistheid en/of volledigheid van de aan haar verstrekte informatie te controleren of om Opdrachtgever te updaten met betrekking tot de informatie als deze in de loop van de tijd is veranderd.</li>
              <li>Toptalent kan, indien dit nodig is voor de uitvoering van de Overeenkomst, verzoeken om aanvullende informatie. Bij gebreke hiervan is Toptalent gerechtigd om haar werkzaamheden op te schorten totdat de informatie is ontvangen.</li>
              <li>Voorafgaand aan het sluiten van de Overeenkomst dient Opdrachtgever alle relevante informatie te verstrekken, waaronder begrepen maar niet beperkt tot de functiegroep, functie-eisen, werktijden, arbeidsduur, werkzaamheden, arbeidsplaats, arbeidsomstandigheden, en de beoogde looptijd van de opdracht.</li>
              <li>Toptalent verricht haar Diensten altijd in het kader van een inspanningsverbintenis en verplicht zich in te spannen om met de grootst mogelijke zorgvuldigheid ten behoeve van de door Opdrachtgever uitgevraagde Diensten adequate Kandidaten te werven en selecteren.</li>
              <li>Opdrachtgever is verplicht Toptalent vooraf doch in ieder geval terstond op de hoogte te stellen van wijzigingen in haar arbeidsvoorwaarden.</li>
            </ol>

            {/* Artikel 8 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 8 - Aanvullende werkzaamheden en wijzigingen</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Indien tijdens de uitvoering van de Overeenkomst blijkt dat de Overeenkomst aangepast dient te worden, of op verzoek van Opdrachtgever nadere werkzaamheden nodig zijn om tot de gewenste Dienst van Opdrachtgever te komen, is Opdrachtgever verplicht om deze aanvullende werkzaamheden te vergoeden volgens het overeengekomen tarief.</li>
              <li>Indien de aanvullende werkzaamheden het gevolg zijn van nalatigheid van Toptalent, Toptalent een verkeerde inschatting heeft gemaakt of de betreffende werkzaamheden in redelijkheid had kunnen voorzien, worden deze kosten niet doorberekend aan Opdrachtgever.</li>
            </ol>

            {/* Artikel 9 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 9 - Prijzen en betaling</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Opdrachtgever is aan Toptalent de overeengekomen vergoeding verschuldigd bij plaatsing van een Kandidaat, ofwel de Kandidaat een rechtstreekse arbeidsovereenkomst aangaat met Opdrachtgever.</li>
              <li>Alle prijzen zijn in beginsel exclusief omzetbelasting (btw), tenzij anders overeengekomen.</li>
              <li>Toptalent voert haar dienstverlening uit conform het overeengekomen uurtarief. De kosten van de werkzaamheden worden achteraf berekend aan de hand van de door Toptalent opgestelde urenregistratie (nacalculatie), tenzij anders overeengekomen.</li>
              <li>Reistijd ten behoeve van Opdrachtgever, en met reizen gerelateerde kosten zoals kosten voor parkeren/parkeerplekken worden aan Opdrachtgever doorberekend.</li>
              <li>Opdrachtgever is verplicht de kosten van derden, die na goedkeuring van Opdrachtgever door Toptalent ingezet worden, volledig te vergoeden tenzij uitdrukkelijk anders overeengekomen.</li>
              <li>Partijen kunnen overeenkomen dat Opdrachtgever een voorschot dient te betalen.</li>
              <li>De pauze komt voor rekening en risico van de klant ook als deze uitloopt, evenals de situatie dat de Kandidaten welke op de door Opdrachtgever aangewezen tijd en locatie geen werk voorhanden hebben.</li>
              <li>Toptalent is gerechtigd om de geldende prijzen en tarieven jaarlijks te verhogen conform de geldende inflatietarieven.</li>
              <li>Indien sprake is van eventuele wijzigingen in wet- en regelgeving, worden deze kosten doorberekend aan Opdrachtgever.</li>
              <li>Opdrachtgever dient deze kosten ineens, zonder verrekening of opschorting, binnen de opgegeven betaaltermijn van uiterlijk 5 dagen zoals vermeld op de factuur te voldoen.</li>
              <li>Partijen kunnen overeenkomen dat Opdrachtgever het verschuldigde bedrag op de g-rekening van Toptalent betaalt.</li>
              <li>Reclamaties tegen de hoogte van de factuur dienen binnen 7 kalenderdagen na factuurdatum schriftelijk door Toptalent ontvangen te zijn.</li>
              <li>In geval van (onvrijwillige) liquidatie, insolventie, faillissement of verzoek tot betaling jegens Opdrachtgever wordt de betaling en alle andere verplichtingen onmiddellijk opeisbaar.</li>
            </ol>

            {/* Artikel 10 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 10 - Incassobeleid</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Wanneer Opdrachtgever niet aan haar betalingsverplichting voldoet, en niet binnen de daarvoor gestelde betalingstermijn heeft voldaan aan haar verplichting, is Opdrachtgever van rechtswege in verzuim.</li>
              <li>Vanaf de datum dat Opdrachtgever in verzuim is, zal Toptalent zonder nadere ingebrekestelling recht hebben op de wettelijke handelsrente vanaf de eerste verzuimdag tot algehele voldoening, en vergoeding van de buitengerechtelijke kosten conform artikel 6:96 BW.</li>
              <li>Indien Toptalent meer of hogere kosten heeft gemaakt welke redelijkerwijze noodzakelijk zijn, komen deze kosten in aanmerking voor vergoeding.</li>
            </ol>

            {/* Artikel 11 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 11 - Privacy, gegevensverwerking en beveiliging</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Toptalent gaat zorgvuldig om met de (persoons)gegevens van Opdrachtgever en zal deze slechts conform de geldende normen gebruiken.</li>
              <li>Opdrachtgever is zelf verantwoordelijk voor de verwerking van gegevens die met gebruikmaking van een Dienst van Toptalent verwerkt worden.</li>
              <li>Indien Toptalent op grond van de Overeenkomst dient te voorzien in beveiliging van informatie, zal deze beveiliging voldoen aan de overeengekomen specificaties en een beveiligingsniveau dat niet onredelijk is.</li>
            </ol>

            {/* Artikel 12 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 12 - Opschorting en ontbinding</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Toptalent heeft het recht om de ontvangen of door haar gerealiseerde gegevens, databestanden en meer onder zich te houden indien Opdrachtgever nog niet (volledig) aan haar betalingsverplichtingen heeft voldaan.</li>
              <li>Toptalent is bevoegd de nakoming van de op haar rustende verbintenissen op te schorten zodra Opdrachtgever in verzuim is met de nakoming van enige uit de Overeenkomst voortvloeiende verbintenis.</li>
              <li>Toptalent is in dat geval niet aansprakelijk voor schade, uit welke hoofde dan ook, als gevolg van het opschorten van haar werkzaamheden.</li>
              <li>De opschorting (en/of ontbinding) heeft geen invloed op de betalingsverplichtingen van Opdrachtgever voor reeds uitgevoerde werkzaamheden.</li>
            </ol>

            {/* Artikel 13 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 13 - Overmacht</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Toptalent is niet aansprakelijk wanneer zij ten gevolge van een overmachtssituatie haar verplichtingen op grond van de overeenkomst niet kan nakomen.</li>
              <li>Onder overmacht aan de zijde van Toptalent wordt in elk geval verstaan, maar is niet beperkt tot: overmacht van toeleveranciers, het niet naar behoren nakomen van verplichtingen van toeleveranciers, gebrekkigheid van programmatuur, overheidsmaatregelen, storing van elektriciteit, internet, datanetwerk- en/of telecommunicatiefaciliteiten, ziekte van werknemers en overige situaties die buiten haar invloedssfeer vallen.</li>
              <li>In geval van overmacht hebben beide Partijen het recht om de Overeenkomst geheel of gedeeltelijk te ontbinden.</li>
            </ol>

            {/* Artikel 14 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 14 - Beperking van aansprakelijkheid</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>In geen geval is Toptalent aansprakelijk indien de door haar geselecteerde en/of ter beschikking gestelde Kandidaten niet voldoen aan de verwachting van Opdrachtgever, tenzij Opdrachtgever deze verwachtingen voorafgaande aan de Overeenkomst aan Toptalent kenbaar heeft gemaakt en Toptalent expliciet het door Opdrachtgever beoogde resultaat heeft toegezegd.</li>
              <li>Indien sprake is van toerekenbare tekortkoming van Toptalent, is Toptalent uitsluitend gehouden tot betaling van enige schadevergoeding indien Opdrachtgever Toptalent binnen 14 dagen na ontdekking van de tekortkoming in gebreke heeft gesteld.</li>
              <li>Indien het verrichten van Diensten door Toptalent leidt tot aansprakelijkheid van Toptalent, is die aansprakelijkheid beperkt tot het totale bedrag dat in het kader van de Overeenkomst wordt gefactureerd.</li>
              <li>In elk geval is de aansprakelijkheid van Toptalent beperkt tot het bedrag dat door haar verzekeringsmaatschappij maximaal per gebeurtenis per jaar wordt uitgekeerd.</li>
              <li>Toptalent sluit uitdrukkelijk alle aansprakelijkheid uit voor gevolgschade, indirecte schade, bedrijfsschade, winstderving en/of geleden verlies, gemiste besparingen, schade door bedrijfsstagnatie, vermogensverliezen, vertragingsschade, renteschade en immateriële schade.</li>
              <li>Toptalent is niet aansprakelijk voor schade die wordt veroorzaakt door de door haar geselecteerde en/of ter beschikking gestelde Kandidaten bij Opdrachtgever of aan derden.</li>
              <li>Alle aanspraken van Opdrachtgever wegens tekortschieten aan de zijde van Toptalent vervallen indien deze niet schriftelijk en gemotiveerd zijn gemeld bij Toptalent binnen een jaar nadat Opdrachtgever bekend was of redelijkerwijs bekend kon zijn met de feiten waarop zij haar aanspraken baseert.</li>
            </ol>

            {/* Artikel 15 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 15 - Geheimhouding</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Toptalent en Opdrachtgever verplichten zich tot geheimhouding van alle vertrouwelijke informatie die is verkregen in het kader van een opdracht/Overeenkomst.</li>
              <li>In het bijzonder ziet de geheimhouding op door Toptalent opgestelde adviezen, rapportages, ontwerpen, werkwijze(n) en/of verslaglegging aangaande de opdracht van Opdrachtgever.</li>
              <li>Indien Toptalent op grond van een wettelijke bepaling of een gerechtelijke uitspraak gehouden is de vertrouwelijke informatie aan een derde te verstrekken, is Toptalent niet gehouden tot enige schadevergoeding.</li>
              <li>Voor de overdracht of verspreiding van informatie aan derden en/of publicatie van verklaringen, adviezen of producties is de schriftelijke toestemming van Toptalent vereist.</li>
              <li>De geheimhoudingsverplichting leggen Toptalent en Opdrachtgever ook de door hen in te schakelen derden op.</li>
              <li>Bij overtreding van deze bepaling, wordt Opdrachtgever bestraft met een onmiddellijk opeisbare boete van € 10.000,- euro en een onmiddellijk opeisbare boete van € 1.000,- per dag dat deze overtreding voortduurt.</li>
            </ol>

            {/* Artikel 16 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 16 - Vrijwaring en juistheid van informatie</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Opdrachtgever is zelf verantwoordelijk voor de juistheid, betrouwbaarheid en volledigheid van alle gegevens, informatie, documenten en/of bescheiden die zij aan Toptalent verstrekt.</li>
              <li>Opdrachtgever vrijwaart Toptalent van elke aansprakelijkheid ingevolge het niet of niet tijdig nakomen van de verplichtingen met betrekking tot het tijdig verstrekken van alle juiste, betrouwbare en volledige gegevens.</li>
              <li>Opdrachtgever vrijwaart Toptalent voor alle aanspraken van Opdrachtgever en door hem ingeschakelde of onder hem werkzame derden, alsmede van klanten van Opdrachtgever.</li>
              <li>Opdrachtgever vrijwaart Toptalent voor alle aanspraken van derden welke voortvloeien uit de werkzaamheden verricht ten behoeve van Opdrachtgever.</li>
              <li>Indien Opdrachtgever elektronische bestanden, software of informatiedragers aan Toptalent verstrekt, garandeert Opdrachtgever dat deze vrij zijn van virussen en defecten.</li>
              <li>Opdrachtgever vrijwaart Toptalent tegen alle aanspraken die voortkomen uit fouten van de ter beschikking gestelde Kandidaten.</li>
            </ol>

            {/* Artikel 17 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 17 - Verbod overname Kandidaten</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Het is Opdrachtgever verboden om zonder voorafgaande schriftelijke toestemming van Toptalent en een daartoe redelijke geldelijke vergoeding Kandidaten van Toptalent in dienst te nemen of het op andere wijze inschakelen van deze Kandidaten vanaf het moment dat Toptalent ten behoeve van Opdrachtgever Kandidaten heeft geworven en geselecteerd, gedurende en tot maximaal een jaar na afloop van de Overeenkomst.</li>
              <li>Ook in geval van het doorlenen van Kandidaten door Opdrachtgever aan derden, dient Opdrachtgever zich te houden aan de reeds gemaakte overnameafspraken met Toptalent.</li>
              <li>Bij overtreding hiervan is Opdrachtgever een direct opeisbare boete verschuldigd van € 5.000,- euro met een boete van € 500,- voor elke dag dat de overtreding voortduurt.</li>
              <li>Het overnameverbod is niet van toepassing indien dit expliciet is uitgesloten in de Overeenkomst. Indien een Kandidaat voor een aansluitende periode meer dan 1040 uren voor Opdrachtgever heeft gewerkt, kan Opdrachtgever aanspraak maken op overname, tegen nader overeen te komen kosten.</li>
            </ol>

            {/* Artikel 18 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 18 - Klachten</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Indien Opdrachtgever niet tevreden is over de Diensten van Toptalent of anderszins klachten heeft over de uitvoering van zijn opdracht, is Opdrachtgever verplicht om deze klachten zo spoedig mogelijk, maar uiterlijk binnen 7 kalenderdagen na de betreffende aanleiding te melden.</li>
              <li>De klacht moet door Opdrachtgever voldoende onderbouwd en/of toegelicht zijn, wil Toptalent de klacht in behandeling kunnen nemen.</li>
              <li>Toptalent zal zo spoedig mogelijk, doch uiterlijk binnen 7 kalenderdagen na ontvangst van de klacht inhoudelijk reageren op de klacht.</li>
              <li>Partijen zullen proberen om gezamenlijk tot een oplossing te komen.</li>
            </ol>

            {/* Artikel 19 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 19 - Toepasselijk recht</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Op de rechtsverhouding tussen Toptalent en Opdrachtgever is Nederlands recht van toepassing.</li>
              <li>Toptalent heeft het recht deze algemene voorwaarden te wijzigen en zal Opdrachtgever hiervan op de hoogte stellen.</li>
              <li>Ingeval van vertalingen van deze algemene voorwaarden, is de Nederlandse versie leidend.</li>
              <li>Alle geschillen, ontstaan door of naar aanleiding van de overeenkomst tussen Toptalent en Opdrachtgever, worden beslecht door de bevoegde rechter van rechtbank Midden-Nederland, locatie Utrecht tenzij bepalingen van dwingend recht een andere bevoegde rechter aanwijzen.</li>
            </ol>

            {/* DEEL II */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-16">
              DEEL II - AANVULLENDE VOORWAARDEN WERVING EN SELECTIE
            </h2>

            {/* Artikel 20 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 20 - Totstandkoming Overeenkomst</h3>
            <p>In aanvulling tot de algemene bepalingen omtrent de totstandkoming van de Overeenkomst, komt een Overeenkomst tot het uitvoeren van Werving en selectie tevens tot stand op basis van een mondeling akkoord ten gevolge waarvan Toptalent reeds is overgegaan tot de feitelijke uitvoering van de zoekopdracht in het kader van Werving en selectie.</p>

            {/* Artikel 21 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 21 - Uitvoering Werving en selectie</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Toptalent verplicht zich iedere opdracht met de grootst mogelijke zorg uit te voeren en naar beste vermogen Kandidaten te selecteren conform de visie van Toptalent. Toptalent heeft volledige vrijheid bij de selectie van Kandidaten en betrekt hierbij de selectiecriteria van Opdrachtgever, de werkervaring, diploma&apos;s en vaardigheden van de betreffende Kandidaat.</li>
              <li>Toptalent verplicht zich tot het werven en selecteren van adequate Kandidaten met de grootst mogelijke zorgvuldigheid ten behoeve van de door Opdrachtgever geplaatste opdracht c.q. Aanvraag.</li>
            </ol>

            {/* Artikel 22 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 22 - Succesvolle Werving en selectie</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Van een succesvolle vervulling van de Werving- en selectieopdracht is eerst sprake zodra een door Toptalent voorgestelde Kandidaat een door Opdrachtgever voorgestelde Arbeidsovereenkomst accepteert dan wel zodra Kandidaat anderszins te werk wordt gesteld door Opdrachtgever.</li>
              <li>Onder een succesvolle vervulling van de werving en selectie Opdracht wordt eveneens verstaan de situatie waarin een door Toptalent aan Opdrachtgever voorgestelde Kandidaat binnen 12 maanden na de introductie in dienst treedt of anderszins en/of, al dan niet via derden, op enige wijze werkzaam is bij Opdrachtgever of bij een daaraan gelieerde onderneming.</li>
            </ol>

            {/* Artikel 23 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 23 - Verplichtingen Opdrachtgever</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>In aanvulling op de algemene verplichtingen van Opdrachtgever, heeft Opdrachtgever in het kader van de Werving en selectie de verplichting om een duidelijk profiel te verstrekken van de door Opdrachtgever gewenste Kandidaat met vermelding van benodigde diploma&apos;s en ervaring.</li>
              <li>Het is Opdrachtgever verboden om gegevens van door Toptalent voorgestelde Kandidaten zonder voorafgaande schriftelijke toestemming van Toptalent aan derden bekend te maken.</li>
            </ol>

            {/* Artikel 24 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 24 - Prijzen en betaling</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Toptalent voert haar Dienstverlening uit conform het overeengekomen tarief. Het tarief is gebaseerd op een nader vast te stellen percentage van het all-in bruto jaarsalaris op basis van een fulltime dienstverband van de betreffende Kandidaat.</li>
              <li>Zodra tussen Opdrachtgever en de door Toptalent voorgestelde Kandidaat een arbeidsovereenkomst tot stand komt of zodra Kandidaat anderszins werkzaamheden/diensten verricht in opdracht van Opdrachtgever, is Opdrachtgever gebonden aan de door Toptalent berekende kosten conform de offerte.</li>
              <li>Indien en voor zover een Kandidaat de arbeidsovereenkomst eerder beëindigt dan de overeengekomen einddatum, heeft Opdrachtgever geen recht op restitutie van reeds betaalde gelden.</li>
              <li>Opdrachtgever heeft evenmin recht op restitutie van reeds betaalde gelden indien de arbeidsrelatie tussentijds wordt beëindigd door oorzaken die te maken hebben met een verandering van de functie-inhoud, reorganisaties, fusies en/of overnames.</li>
            </ol>

            {/* Artikel 25 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 25 - Beperking van aansprakelijkheid</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Zodra een Kandidaat door Opdrachtgever wordt aangesteld, geschiedt de uitvoering van diens werkzaamheden onder toezicht en leiding van Opdrachtgever en komen alle gevolgen hiervan voor rekening en risico van Opdrachtgever en/of de betreffende Kandidaat.</li>
              <li>Opdrachtgever is verantwoordelijk voor de beslissing om met een door Toptalent geselecteerde Kandidaat een Arbeidsovereenkomst aan te gaan, dan wel anderszins te werk te stellen.</li>
              <li>In geen geval is Toptalent aansprakelijk indien de door haar geselecteerde en/of ter beschikking gestelde Kandidaten niet voldoen aan de verwachtingen van Opdrachtgever.</li>
            </ol>

            {/* DEEL III */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-16">
              DEEL III - AANVULLENDE VOORWAARDEN TERBESCHIKKINGSTELLING
            </h2>

            {/* Artikel 26 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 26 - Uitvoering terbeschikkingstelling</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Toptalent zal zich naar beste vermogen inspannen om ervoor te zorgen dat de Kandidaat beschikbaar is voor de duur van de met Toptalent gesloten overeenkomst. Toptalent garandeert echter niet dat de Kandidaat gedurende de volledige duur van de Overeenkomst beschikbaar zal zijn.</li>
              <li>De te verrichte Werkzaamheden geschieden onder aanwijzing, toezicht en leiding van Opdrachtgever.</li>
              <li>Opdrachtgever zal zich ten aanzien van Kandidaat bij de uitoefening van het toezicht of de leiding alsmede met betrekking tot de uitvoering van de Werkzaamheden gedragen op dezelfde zorgvuldige wijze als waartoe zij ten opzichte van haar eigen arbeidskrachten/werknemers gehouden is.</li>
              <li>Opdrachtgever is gehouden de Kandidaat actieve voorlichting te geven met betrekking tot de binnen haar onderneming gehanteerde Risico Inventarisatie en Evaluatie (RIE) en algemene veiligheidsnormen.</li>
              <li>Opdrachtgever is jegens Kandidaat en Toptalent verantwoordelijk voor de nakoming van de uit artikel 7:658 Burgerlijk Wetboek, de Arbeidsomstandighedenwet en de daarmee samenhangende regelgeving voortvloeiende verplichtingen op het gebied van de veiligheid op de werkplek en goede arbeidsomstandigheden in het algemeen.</li>
              <li>Indien dit voor de uitvoering van de Werkzaamheden wordt vereist, is Opdrachtgever verplicht Kandidaat te voorzien van beschermende kleding en materialen.</li>
              <li>Opdrachtgever beschikt te allen tijde over de juiste en relevante bedrijfscertificeringen.</li>
              <li>Opdrachtgever dient over een G-rekening te voorzien, tenzij anders overeengekomen.</li>
              <li>Alle door Toptalent ter beschikking gestelde Kandidaten beschikken over de relevante werkervaring, de noodzakelijke diploma&apos;s en certificaten.</li>
              <li>Toptalent zal de Kandidaten niet voorzien van persoonlijke beschermingsmiddelen en is hiervoor niet verantwoordelijk, tenzij dit uitdrukkelijk overeengekomen is.</li>
            </ol>

            {/* Artikel 27 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 27 - Prijzen en betaling</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>De prijzen die Toptalent hanteert, zijn te allen tijde conform de van toepassing zijnde CAO (Opdrachtgeversbeloning).</li>
              <li>Voor Werkzaamheden verricht door Kandidaten buiten de gebruikelijke werktijden en Werkzaamheden op feestdagen en in het weekend, wordt een toeslag gerekend, zoals nader gespecificeerd in de offerte.</li>
              <li>Indien Toptalent of Kandidaat op locatie van Opdrachtgever kosten maakt, zoals onder meer doch niet beperkt tot parkeerkosten, is Opdrachtgever te allen tijde gehouden deze te vergoeden.</li>
              <li>Facturatie vindt plaats aan de hand van door Toptalent of door Opdrachtgever aangeleverde gehanteerde urenregistratie (tijdverantwoordingsformulieren). Opdrachtgever dient deze formulieren tijdig te accorderen waarna maandelijkse facturatie plaatsvindt, tenzij anders overeengekomen.</li>
            </ol>

            {/* Artikel 28 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 28 - Beperking van aansprakelijkheid</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Opdrachtgever is zelf verantwoordelijk voor de leiding over en het toezicht op de door Toptalent ter beschikking gestelde Kandidaten en voor het ter beschikking stellen van de benodigde zaken. Opdrachtgever is krachtens artikel 6:170 BW aansprakelijk voor deze schade.</li>
              <li>Het loon wordt door Toptalent aan Kandidaten uitgekeerd conform de toepasselijke CAO, waarbij Toptalent het daarin bepaalde omtrent de opdrachtgeversbeloning dient toe te passen.</li>
              <li>Opdrachtgever draagt een zelfstandige zorgplicht bij de uitvoering van de opdracht op locatie van Opdrachtgever.</li>
              <li>Indien een ongeval zich voordoet, waarbij één van de door Toptalent ter beschikking gestelde Kandidaten gedurende de uitvoering van de Werkzaamheden bij betrokken is, is Opdrachtgever verplicht om zowel de betreffende Inspectie als Toptalent per direct te informeren.</li>
              <li>Partijen kunnen overeenkomen dat Opdrachtgever voor de door Toptalent ter beschikking gestelde Kandidaten een adequate verzekering afsluit.</li>
              <li>Indien een Kandidaat ten gevolge van de niet-nakoming van de verplichtingen door Opdrachtgever zodanig letsel heeft opgelopen dat daarvan de dood het gevolg is, is Opdrachtgever jegens de nabestaanden verplicht tot schadevergoeding.</li>
              <li>Opdrachtgever is verplicht voor de door Toptalent ter beschikking gestelde Kandidaten een adequate verzekering af te sluiten.</li>
            </ol>

            {/* Artikel 29 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 29 - Vrijwaring</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Opdrachtgever vrijwaart Toptalent tegen alle aanspraken die voortkomen uit fouten van de ter beschikking gestelde Kandidaten.</li>
              <li>Toptalent is niet aansprakelijk voor schade die Opdrachtgever lijdt als gevolg van fouten van door haar ter beschikking gestelde Kandidaten.</li>
              <li>Opdrachtgever vrijwaart Toptalent van alle aanspraken van Kandidaat of derden, directe schade, indirecte schade en gevolgschade daaronder begrepen, die het gevolg zijn van het niet nakomen van de op Opdrachtgever rustende verplichtingen.</li>
              <li>Opdrachtgever garandeert dat alle locaties, werktuigen en/of gereedschappen waarin of waarmee de Kandidaat werkzaamheden verricht, dusdanig zijn ingericht en onderhouden.</li>
            </ol>

            {/* Artikel 30 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 30 - Opschorting door Opdrachtgever</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Opdrachtgever is in beginsel slechts gerechtigd de tewerkstelling van de Kandidaten op te schorten indien Opdrachtgever schriftelijk aantoont dat (tijdelijk) geen werk voorhanden is of de Kandidaat anderszins niet door Opdrachtgever te werk kan worden gesteld.</li>
              <li>Indien Opdrachtgever niet gerechtigd is de tewerkstelling tijdelijk op te schorten, maar Opdrachtgever tijdelijk geen werk heeft voor de Kandidaat of de Kandidaat niet te werk kan stellen, is Opdrachtgever voor de duur van de Opdracht aan Toptalent het overeengekomen tarief verschuldigd.</li>
            </ol>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-neutral-200">
              <p className="text-neutral-500 text-sm">
                <strong>Utrecht, 3 februari 2023</strong>
              </p>
              <p className="text-neutral-500 text-sm mt-2">
                TopTalent B.V. - Versie 1.0
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#FFF7F1]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-[#1F1F1F] mb-4">
            Vragen over onze voorwaarden?
          </h2>
          <p className="text-neutral-600 mb-8">
            Neem gerust contact met ons op als je vragen hebt over onze algemene voorwaarden.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center bg-[#FF7A00] text-white px-8 py-4 rounded-xl font-semibold
            shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
            hover:bg-[#E66E00] hover:-translate-y-0.5 active:scale-[0.98]
            transition-all duration-300"
          >
            Neem contact op
          </a>
        </div>
      </section>
    </>
  );
}
