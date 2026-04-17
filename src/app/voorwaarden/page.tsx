import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Algemene Voorwaarden | TopTalent Jobs",
  description: "Lees de algemene voorwaarden van Toptalent voor bemiddeling van zelfstandige horecaprofessionals.",
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
            TopTalent — Versie 3.0 | april 2025
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="prose prose-lg max-w-none prose-headings:text-[#1F1F1F] prose-p:text-neutral-600 prose-li:text-neutral-600">

            {/* Contact Info */}
            <div className="bg-neutral-50 rounded-xl p-6 mb-8">
              <p className="text-sm text-neutral-600 mb-1">
                <strong>Toptalent</strong><br />
                Utrecht<br />
                KvK: 73401161 | BTW: NL002387654B82<br />
                E-mail: info@toptalentjobs.nl | Telefoon: +31 6 17 17 79 39
              </p>
            </div>

            {/* DEEL I */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6">
              DEEL I – ALGEMENE BEPALINGEN
            </h2>

            {/* Artikel 1 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 1 – Begrippen</h3>
            <p>In deze Algemene Voorwaarden hebben de volgende begrippen de hierna genoemde betekenis, tenzij uitdrukkelijk anders is aangegeven:</p>
            <ol className="list-decimal pl-6 space-y-3">
              <li><strong>Toptalent:</strong> Toptalent, gevestigd te Utrecht, ingeschreven bij de Kamer van Koophandel onder nummer 73401161.</li>
              <li><strong>Opdrachtgever:</strong> de natuurlijke of rechtspersoon handelend in de uitoefening van beroep of bedrijf die Toptalent opdracht geeft tot het verrichten van Diensten.</li>
              <li><strong>Zzp&apos;er:</strong> de natuurlijke persoon die handelt in de uitoefening van beroep of bedrijf, ingeschreven staat bij de Kamer van Koophandel, beschikt over een BTW-nummer, en die door Toptalent wordt voorgesteld en/of ingezet bij Opdrachtgever op basis van een Overeenkomst van Opdracht.</li>
              <li><strong>Kandidaat:</strong> de Zzp&apos;er die is ingeschreven bij Toptalent en door Toptalent aan Opdrachtgever wordt voorgesteld of ingezet.</li>
              <li><strong>Diensten:</strong> de diensten van Toptalent bestaande uit het werven, selecteren, bemiddelen en faciliteren van de inzet van Zzp&apos;ers bij Opdrachtgever, inclusief planning en administratieve afhandeling.</li>
              <li><strong>Aanbod:</strong> ieder aanbod van Toptalent aan Opdrachtgever.</li>
              <li><strong>Overeenkomst:</strong> iedere overeenkomst tussen Toptalent en Opdrachtgever, waaronder mede begrepen een raamovereenkomst en iedere opdrachtbevestiging.</li>
              <li><strong>Opdrachtbevestiging:</strong> een schriftelijke (waaronder digitale) bevestiging van een concrete dienst/klus met daarin de specifieke afspraken (zoals datum, tijden, locatie, werkzaamheden, tarief en bijzondere voorwaarden).</li>
              <li><strong>Werkzaamheden:</strong> de werkzaamheden die de Zzp&apos;er verricht bij Opdrachtgever zoals vastgelegd in de Opdrachtbevestiging.</li>
              <li><strong>Opdracht:</strong> de concrete werkzaamheden die de Zzp&apos;er verricht bij Opdrachtgever, zoals omschreven in de Opdrachtbevestiging.</li>
              <li><strong>Overeenkomst van Opdracht:</strong> de overeenkomst tussen Toptalent en de Zzp&apos;er op basis waarvan de Zzp&apos;er werkzaamheden verricht, niet zijnde een arbeidsovereenkomst in de zin van artikel 7:610 BW.</li>
            </ol>

            {/* Artikel 2 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 2 – Toepasselijkheid</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Deze Algemene Voorwaarden zijn van toepassing op elk Aanbod van Toptalent, op elke Overeenkomst en op alle Diensten.</li>
              <li>Voordat een Overeenkomst wordt gesloten, krijgt Opdrachtgever de beschikking over deze Algemene Voorwaarden. Indien dit redelijkerwijs niet mogelijk is, zal Toptalent aangeven op welke wijze de Algemene Voorwaarden kunnen worden ingezien.</li>
              <li>Afwijkingen van deze Algemene Voorwaarden zijn uitsluitend geldig indien schriftelijk overeengekomen.</li>
              <li>Algemene voorwaarden van Opdrachtgever worden uitdrukkelijk uitgesloten.</li>
              <li>Indien één of meer bepalingen nietig zijn of vernietigd worden, blijven de overige bepalingen volledig van kracht. Partijen zullen de nietige/vernietigde bepaling vervangen door een bepaling met zoveel mogelijk dezelfde strekking.</li>
              <li>Onduidelijkheden of niet geregelde situaties worden uitgelegd naar de geest van deze Algemene Voorwaarden.</li>
              <li>De toepasselijkheid van de artikelen 7:404 BW en 7:407 lid 2 BW is uitgesloten.</li>
            </ol>

            {/* Artikel 3 */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 3 – De aard van de dienstverlening</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Toptalent bemiddelt en faciliteert uitsluitend de inzet van Zzp&apos;ers. Toptalent verricht haar Diensten op basis van een inspanningsverplichting.</li>
              <li>Toptalent is geen werkgever van de Zzp&apos;er. Er komt geen arbeidsovereenkomst tot stand tussen Toptalent en de Zzp&apos;er, noch tussen Opdrachtgever en de Zzp&apos;er. De relatie tussen Toptalent en de Zzp&apos;er is een Overeenkomst van Opdracht.</li>
              <li>Toptalent oefent geen werkgeversgezag uit over de Zzp&apos;er. Toptalent geeft geen instructies over de wijze waarop de Werkzaamheden worden uitgevoerd. Eventuele aanwijzingen van Opdrachtgever zien uitsluitend op de specificaties van de Opdracht (het &quot;wat&quot;), veiligheids- en hygiënevoorschriften, en niet op de wijze van uitvoering (het &quot;hoe&quot;). De Zzp&apos;er bepaalt zelf de wijze waarop hij de Werkzaamheden uitvoert, met inachtneming van geldende wet- en regelgeving.</li>
              <li>De Zzp&apos;er is te allen tijde vrij om een aangeboden Opdracht te weigeren zonder opgaaf van reden en zonder dat dit gevolgen heeft voor toekomstige Opdrachten. Er bestaat geen verplichting tot beschikbaarheid of minimale afname van Opdrachten.</li>
              <li>De Zzp&apos;er heeft het recht zich bij de uitvoering van de Werkzaamheden te laten vervangen door een derde, mits deze derde beschikt over vergelijkbare kwalificaties en — indien van toepassing — relevante certificeringen (zoals een Verklaring sociale hygiëne). De Zzp&apos;er blijft verantwoordelijk voor de kwaliteit van de door de vervanger verrichte Werkzaamheden. Toptalent noch Opdrachtgever kan vervanging onredelijk weigeren.</li>
              <li>De Zzp&apos;er is vrij om voor meerdere opdrachtgevers werkzaam te zijn, al dan niet via Toptalent. Toptalent legt geen exclusiviteitsverplichting op.</li>
              <li>Toptalent garandeert niet dat op iedere aanvraag een passende Zzp&apos;er beschikbaar is of dat een Opdracht tot een bepaald resultaat leidt.</li>
              <li>Indien wijzigingen in wet- of regelgeving of jurisprudentie daartoe aanleiding geven, treden Partijen in overleg om de Overeenkomst en/of de feitelijke uitvoering daarvan aan te passen.</li>
            </ol>

            {/* Artikel 3A */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 3A – Vereisten aan de Zzp&apos;er</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>De Zzp&apos;er verklaart en garandeert dat hij:
                <ol className="list-[lower-alpha] pl-6 mt-2 space-y-1">
                  <li>staat ingeschreven bij de Kamer van Koophandel als zelfstandig ondernemer;</li>
                  <li>beschikt over een geldig BTW-nummer;</li>
                  <li>beschikt over een adequate beroeps- en/of bedrijfsaansprakelijkheidsverzekering;</li>
                  <li>zelf verantwoordelijk is voor de afdracht van inkomsten- en omzetbelasting en eventuele premies volksverzekeringen;</li>
                  <li>geen aanspraak maakt op enig arbeidsrechtelijk recht jegens Toptalent of Opdrachtgever, waaronder loondoorbetaling bij ziekte, vakantiegeld, ontslagbescherming of pensioenopbouw.</li>
                </ol>
              </li>
              <li>De Zzp&apos;er overlegt bij inschrijving, en desgevraagd opnieuw, kopieën van zijn KvK-uittreksel, BTW-registratie en verzekeringspolis.</li>
              <li>De Zzp&apos;er draagt eigen ondernemersrisico, waaronder het risico van non-betaling, ziekte, arbeidsongeschiktheid en het niet verkrijgen van Opdrachten.</li>
              <li>De Zzp&apos;er draagt zorg voor eigen beroepskleding en eigen gereedschappen, tenzij de aard van de Werkzaamheden of hygiëne-/veiligheidsvoorschriften van Opdrachtgever het gebruik van door Opdrachtgever verstrekt materiaal vereisen. In dat geval geschiedt dit op basis van een gebruiksovereenkomst en niet als verstrekking in het kader van een arbeidsovereenkomst.</li>
            </ol>

            {/* Artikel 5 (voorheen 4) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 5 – Het Aanbod</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Ieder Aanbod van Toptalent is vrijblijvend, tenzij uitdrukkelijk anders aangegeven.</li>
              <li>Een Aanbod is geldig tot de daarin genoemde datum of, bij gebreke daarvan, tot 31 december van het lopende jaar.</li>
              <li>Een Aanbod bindt Toptalent pas na schriftelijke bevestiging door Opdrachtgever.</li>
              <li>Kennelijke vergissingen of verschrijvingen binden Toptalent niet.</li>
              <li>Aanbiedingen gelden niet automatisch voor vervolgopdrachten.</li>
            </ol>

            {/* Artikel 6 (voorheen 5) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 6 – Totstandkoming van de Overeenkomst</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>De Overeenkomst komt tot stand wanneer Opdrachtgever het Aanbod of de Overeenkomst schriftelijk accepteert, dan wel een ondubbelzinnig akkoord per e-mail/bericht geeft.</li>
              <li>Iedere concrete inzet van een Zzp&apos;er wordt vastgelegd in een Opdrachtbevestiging.</li>
              <li>Toptalent heeft het recht een Overeenkomst met een (potentiële) Opdrachtgever te weigeren op een voor Toptalent gegronde reden.</li>
            </ol>

            {/* Artikel 7 (voorheen 6) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 7 – Duur en opzegging</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Overeenkomsten worden aangegaan voor bepaalde tijd, tenzij de aard of inhoud meebrengt dat zij voor onbepaalde tijd zijn aangegaan.</li>
              <li>Een raamovereenkomst is tussentijds opzegbaar tegen het einde van de maand met een opzegtermijn van één maand, tenzij anders overeengekomen.</li>
              <li>Partijen kunnen de Overeenkomst met onmiddellijke ingang beëindigen indien de andere Partij in surseance verkeert, faillissement is aangevraagd, de onderneming wordt beëindigd of sprake is van ernstige wanprestatie.</li>
              <li>Beëindiging laat betalingsverplichtingen voor reeds verrichte Diensten onverlet.</li>
            </ol>

            {/* Artikel 8 (voorheen 7) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 8 – Uitvoering van de Diensten</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Toptalent zal de Diensten met zorg uitvoeren en naar beste vermogen handelen als professioneel dienstverlener.</li>
              <li>Toptalent mag derden inschakelen voor de uitvoering van de Diensten.</li>
              <li>Toptalent heeft het recht de uitvoering op te schorten indien Opdrachtgever noodzakelijke informatie niet tijdig aanlevert.</li>
            </ol>

            {/* Artikel 9 (voorheen 8) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 9 – Verplichtingen Opdrachtgever</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Opdrachtgever verstrekt tijdig alle informatie die nodig is voor uitvoering van de Overeenkomst, waaronder (indien relevant): locatie, werktijden, werkzaamheden, vereisten, dresscode, veiligheids-/hygiënevoorschriften en bijzonderheden.</li>
              <li>Opdrachtgever zorgt voor een veilige werkomgeving en adequate instructies op locatie. Opdrachtgever oefent geen werkgeversgezag uit over de Zzp&apos;er. Aanwijzingen op locatie beperken zich tot de specificaties van de Opdracht en de naleving van veiligheids- en hygiënevoorschriften.</li>
              <li>Opdrachtgever behandelt de ingezette Zzp&apos;er zorgvuldig en meldt incidenten, klachten of no-shows direct aan Toptalent.</li>
            </ol>

            {/* Artikel 9A */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 9A – Voedselveiligheid en hygiëne</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>De Zzp&apos;er die werkzaam is in een functie die omgang met levensmiddelen omvat, beschikt over de wettelijk vereiste certificeringen, waaronder — voor zover van toepassing — een Verklaring sociale hygiëne en/of een geldige HACCP-instructie.</li>
              <li>De Zzp&apos;er houdt zich aan de geldende wet- en regelgeving op het gebied van voedselveiligheid en hygiëne.</li>
              <li>Opdrachtgever is verantwoordelijk voor de naleving van hygiënevoorschriften op zijn locatie en stelt de Zzp&apos;er hiervan voorafgaand aan de Werkzaamheden op de hoogte.</li>
            </ol>

            {/* Artikel 10 (voorheen 9) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 10 – Tarieven, facturatie en betaling</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Tarieven verschillen per functie/opdracht en worden vastgelegd in de Opdrachtbevestiging. Alle genoemde tarieven betreffen een vergoeding voor de Opdracht en zijn geen loon in de zin van artikel 7:610 BW.</li>
              <li>Facturatie aan Opdrachtgever vindt tweewekelijks plaats.</li>
              <li>Betalingstermijn bedraagt 14 dagen na factuurdatum.</li>
              <li>Alle bedragen zijn exclusief btw, tenzij uitdrukkelijk anders vermeld.</li>
              <li>Opdrachtgever is niet gerechtigd tot verrekening of opschorting, behoudens voor zover dwingend recht anders bepaalt.</li>
              <li>De Zzp&apos;er factureert Toptalent voor de verrichte Werkzaamheden op basis van een door de Zzp&apos;er zelf opgestelde factuur, inclusief BTW (tenzij de kleineondernemersregeling van toepassing is).</li>
              <li>De factuur van de Zzp&apos;er vermeldt ten minste: naam en adresgegevens, KvK-nummer, BTW-nummer, omschrijving werkzaamheden, aantal gewerkte uren, uurtarief, totaalbedrag exclusief en inclusief BTW, en factuurnummer.</li>
              <li>Toptalent betaalt de factuur van de Zzp&apos;er binnen 14 dagen na ontvangst en akkoord.</li>
            </ol>

            {/* Artikel 11 (voorheen 10) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 11 – Urenregistratie en akkoord</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>De Zzp&apos;er houdt zelf een registratie bij van de gewerkte uren en legt deze ter accordering voor aan Opdrachtgever.</li>
              <li>Opdrachtgever dient binnen 48 uur na ontvangst schriftelijk te accorderen of gemotiveerd af te keuren.</li>
              <li>De door Opdrachtgever geaccordeerde uren vormen de basis voor de factuur van de Zzp&apos;er aan Toptalent.</li>
              <li>Bij structureel uitblijven van akkoord is Toptalent gerechtigd haar dienstverlening op te schorten.</li>
            </ol>

            {/* Artikel 12 (voorheen 11) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 12 – Annulering</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Opdrachtgever kan een bevestigde dienst kosteloos annuleren tot 48 uur vóór aanvang.</li>
              <li>Bij annulering binnen 48 uur is Opdrachtgever 50% van de geraamde kosten verschuldigd.</li>
              <li>Annulering dient schriftelijk te geschieden (e-mail/bericht).</li>
            </ol>

            {/* Artikel 13 (voorheen 12) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 13 – No-show / uitval</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Indien een Zzp&apos;er niet verschijnt, spant Toptalent zich in om vervanging te regelen, zonder garantie.</li>
              <li>Toptalent is niet aansprakelijk indien vervanging niet mogelijk blijkt.</li>
              <li>Indien de Zzp&apos;er niet verschijnt zonder tijdige melding (minimaal 24 uur voor aanvang, tenzij sprake is van overmacht), kan Toptalent de eventuele schade die hieruit voortvloeit verhalen op de Zzp&apos;er.</li>
              <li>Herhaalde no-shows (drie of meer binnen 12 maanden) vormen een grond voor beëindiging van de Overeenkomst van Opdracht met de betreffende Zzp&apos;er.</li>
            </ol>

            {/* Artikel 14 (voorheen 13) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 14 – Incasso en wanbetaling</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Indien Opdrachtgever niet tijdig betaalt, is Opdrachtgever van rechtswege in verzuim.</li>
              <li>Opdrachtgever is vanaf de vervaldatum de wettelijke handelsrente verschuldigd tot volledige betaling.</li>
              <li>Alle redelijke (buiten)gerechtelijke incassokosten komen voor rekening van Opdrachtgever conform artikel 6:96 BW.</li>
              <li>Toptalent mag (verdere) dienstverlening opschorten totdat volledige betaling heeft plaatsgevonden.</li>
            </ol>

            {/* Artikel 15 (voorheen 14) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 15 – Overmacht</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Toptalent is niet aansprakelijk indien zij door overmacht haar verplichtingen niet kan nakomen.</li>
              <li>Onder overmacht wordt mede verstaan: onbeschikbaarheid van Zzp&apos;ers door omstandigheden buiten de redelijke invloedssfeer van Toptalent (niet zijnde reguliere ziekte of persoonlijke omstandigheden van de Zzp&apos;er), overheidsmaatregelen, storingen van internet/telecom, en andere omstandigheden buiten de redelijke invloedssfeer van Toptalent.</li>
              <li>In geval van overmacht hebben Partijen het recht de Overeenkomst geheel of gedeeltelijk te ontbinden.</li>
            </ol>

            {/* Artikel 16 (voorheen 15) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 16 – Aansprakelijkheid</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Toptalent is niet aansprakelijk voor indirecte schade, waaronder gevolgschade, winstderving en bedrijfsschade.</li>
              <li>Indien Toptalent aansprakelijk is, is aansprakelijkheid beperkt tot het factuurbedrag van de betreffende opdracht, met een maximum van het bedrag dat de verzekeraar uitkeert.</li>
              <li>Toptalent is niet aansprakelijk voor schade die door de ingezette Zzp&apos;er bij Opdrachtgever of derden wordt veroorzaakt.</li>
              <li>Opdrachtgever vrijwaart Toptalent voor aanspraken van derden die voortvloeien uit omstandigheden op de locatie van Opdrachtgever, waaronder veiligheid, hygiëne en instructies.</li>
              <li>De Zzp&apos;er is verplicht een adequate beroeps- en/of bedrijfsaansprakelijkheidsverzekering in stand te houden voor de duur van de samenwerking met Toptalent. Schade veroorzaakt door de Zzp&apos;er wordt verhaald op de Zzp&apos;er en/of diens verzekering.</li>
            </ol>

            {/* Artikel 17 (voorheen 16) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 17 – Geheimhouding</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Partijen verplichten zich tot geheimhouding van vertrouwelijke informatie die zij in het kader van de Overeenkomst verkrijgen.</li>
              <li>De geheimhouding geldt ook voor door Partijen ingeschakelde derden.</li>
              <li>Overtreding van geheimhouding geeft recht op vergoeding van de daadwerkelijk geleden schade en (indien overeengekomen) aanvullende maatregelen.</li>
            </ol>

            {/* Artikel 18 (voorheen 17) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 18 – Privacy en gegevensverwerking (AVG)</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Toptalent verwerkt persoonsgegevens van de Zzp&apos;er en contactpersonen van Opdrachtgever. De verwerking geschiedt op grond van de uitvoering van de Overeenkomst (artikel 6 lid 1 sub b AVG) en, voor zover nodig, het gerechtvaardigd belang van Toptalent (artikel 6 lid 1 sub f AVG).</li>
              <li>Toptalent is verwerkingsverantwoordelijke voor de persoonsgegevens die zij verwerkt in het kader van haar bemiddelingsactiviteiten.</li>
              <li>Indien Toptalent persoonsgegevens deelt met Opdrachtgever (zoals naam, contactgegevens en kwalificaties van de Zzp&apos;er), geschiedt dit ten behoeve van de uitvoering van de Overeenkomst. Voor verwerkingen op de locatie van Opdrachtgever is Opdrachtgever zelfstandig verwerkingsverantwoordelijke.</li>
              <li>Partijen sluiten, indien de aard van de gegevensverwerking dit vereist, een verwerkersovereenkomst conform artikel 28 AVG.</li>
              <li>Toptalent heeft een privacyverklaring beschikbaar op haar website waarin de rechten van betrokkenen, bewaartermijnen en de contactgegevens van de verantwoordelijke zijn opgenomen.</li>
              <li>Partijen nemen passende technische en organisatorische maatregelen ter beveiliging van persoonsgegevens. Datalekken worden onverwijld gemeld conform artikel 33 en 34 AVG.</li>
            </ol>

            {/* Artikel 19 (voorheen 18) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 19 – Overname / relatiebeding</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Opdrachtgever mag een door Toptalent geïntroduceerde Zzp&apos;er kosteloos rechtstreeks inschakelen of in dienst nemen indien:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>de Zzp&apos;er meer dan 1040 uur voor Opdrachtgever heeft gewerkt, of</li>
                  <li>12 maanden zijn verstreken sinds de introductie (wat het eerst plaatsvindt).</li>
                </ul>
              </li>
              <li>Voor eerdere overname kunnen Partijen aanvullende afspraken maken in de Opdrachtbevestiging.</li>
              <li>Bij overname van de Zzp&apos;er door Opdrachtgever vóór het verstrijken van de in lid 1 genoemde termijnen, is Opdrachtgever aan Toptalent een vergoeding verschuldigd ter hoogte van 20% van het op jaarbasis berekende tarief (op basis van gemiddeld 40 uur per week), tenzij in de Opdrachtbevestiging een ander bedrag is overeengekomen.</li>
            </ol>

            {/* Artikel 20 (voorheen 19) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 20 – Klachten</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Klachten dienen binnen 7 kalenderdagen na het ontstaan van de klacht schriftelijk bij Toptalent te worden gemeld.</li>
              <li>Partijen zullen zich inspannen om in redelijkheid tot een oplossing te komen.</li>
            </ol>

            {/* Artikel 21 (voorheen 20) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 21 – Wijziging voorwaarden</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Toptalent is gerechtigd deze Algemene Voorwaarden te wijzigen.</li>
              <li>Toptalent stelt Opdrachtgever ten minste 30 dagen vóór inwerkingtreding schriftelijk op de hoogte van wijzigingen.</li>
              <li>Indien Opdrachtgever niet instemt met een wezenlijke wijziging, heeft Opdrachtgever het recht de Overeenkomst op te zeggen tegen de datum van inwerkingtreding van de gewijzigde voorwaarden.</li>
              <li>De meest recente versie is van toepassing op nieuwe Overeenkomsten en Opdrachtbevestigingen vanaf het moment van publicatie of toezending.</li>
            </ol>

            {/* Artikel 22 (voorheen 21) */}
            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Artikel 22 – Toepasselijk recht en geschillen</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Op de rechtsverhouding tussen Partijen is Nederlands recht van toepassing.</li>
              <li>Geschillen worden voorgelegd aan de bevoegde rechter van de rechtbank Midden-Nederland, locatie Utrecht, tenzij dwingend recht anders bepaalt.</li>
            </ol>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-neutral-200">
              <p className="text-neutral-500 text-sm">
                <strong>Utrecht, april 2025</strong>
              </p>
              <p className="text-neutral-500 text-sm mt-2">
                Toptalent — Versie 3.0
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#FFF7F1]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-[#1F1F1F] mb-4">
            Vragen over deze voorwaarden?
          </h2>
          <p className="text-neutral-600 mb-8">
            Neem contact op via info@toptalentjobs.nl of +31 6 17 17 79 39.
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
