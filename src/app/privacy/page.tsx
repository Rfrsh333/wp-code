import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | TopTalent Jobs",
  description: "Lees hoe TopTalent B.V. omgaat met uw persoonsgegevens conform de AVG (GDPR). Informatie over gegevensverwerking, bewaartermijnen en uw rechten.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 py-20 lg:py-28">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-5" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Privacy Policy
          </h1>
          <p className="text-lg text-neutral-300">
            TopTalent B.V. - Laatst bijgewerkt: december 2024
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="prose prose-lg max-w-none prose-headings:text-[#1F1F1F] prose-p:text-neutral-600 prose-li:text-neutral-600">

            {/* Inleiding */}
            <div className="bg-[#FFF7F1] rounded-2xl p-6 mb-10">
              <p className="text-neutral-700 mb-0">
                TopTalent B.V. hecht groot belang aan de bescherming van uw persoonsgegevens. In deze privacy policy informeren wij u over hoe wij omgaan met uw persoonsgegevens in overeenstemming met de Algemene Verordening Gegevensbescherming (AVG/GDPR) en overige toepasselijke Nederlandse privacywetgeving. Deze policy is van toepassing op alle diensten die wij aanbieden als uitzendbureau gespecialiseerd in horecapersoneel.
              </p>
            </div>

            {/* 1. Identiteit verwerkingsverantwoordelijke */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6">
              1. Identiteit van de verwerkingsverantwoordelijke
            </h2>
            <p>De verwerkingsverantwoordelijke voor de verwerking van uw persoonsgegevens is:</p>
            <div className="bg-neutral-50 rounded-xl p-6 my-6">
              <p className="mb-2"><strong>TopTalent B.V.</strong></p>
              <p className="mb-2">Gevestigd te Utrecht, Nederland</p>
              <p className="mb-2">E-mail: <a href="mailto:info@toptalentjobs.nl" className="text-[#FF7A00] hover:underline">info@toptalentjobs.nl</a></p>
              <p className="mb-2">Telefoon: <a href="tel:+31649200412" className="text-[#FF7A00] hover:underline">+31 6 49 20 04 12</a></p>
              <p className="mb-0">Website: <a href="https://toptalentjobs.nl" className="text-[#FF7A00] hover:underline">www.toptalentjobs.nl</a></p>
            </div>
            <p>Voor vragen over deze privacy policy of over de verwerking van uw persoonsgegevens kunt u contact opnemen via bovenstaande contactgegevens.</p>

            {/* 2. Toepasselijkheid en reikwijdte */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              2. Toepasselijkheid en reikwijdte
            </h2>
            <p>Deze privacy policy is van toepassing op de verwerking van persoonsgegevens van:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Sollicitanten:</strong> personen die solliciteren naar een functie via TopTalent of zich inschrijven in onze kandidatenpool</li>
              <li><strong>(Flex)medewerkers en uitzendkrachten:</strong> personen die via TopTalent werkzaam zijn bij opdrachtgevers</li>
              <li><strong>ZZP&apos;ers:</strong> zelfstandige professionals die via TopTalent worden bemiddeld naar opdrachtgevers</li>
              <li><strong>Opdrachtgevers:</strong> horecabedrijven, evenementenlocaties, cateringbedrijven en andere zakelijke klanten</li>
              <li><strong>Websitebezoekers:</strong> personen die onze website bezoeken</li>
              <li><strong>Contactpersonen:</strong> personen die contact met ons opnemen via telefoon, e-mail of andere communicatiekanalen</li>
            </ul>

            {/* 3. Welke persoonsgegevens verwerken wij */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              3. Welke persoonsgegevens verwerken wij
            </h2>
            <p>Afhankelijk van uw relatie met TopTalent verwerken wij verschillende categorieën persoonsgegevens:</p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">3.1 Identiteits- en contactgegevens</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Voor- en achternaam, voorletters, titulatuur</li>
              <li>Geslacht en geboortedatum</li>
              <li>Geboorteplaats en geboorteland</li>
              <li>Adresgegevens (straat, huisnummer, postcode, woonplaats, land)</li>
              <li>Telefoonnummer(s) en e-mailadres(sen)</li>
              <li>Nationaliteit</li>
              <li>Kopie identiteitsbewijs (voor wettelijke identificatieplicht)</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">3.2 CV- en sollicitatiegegevens</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Curriculum vitae (CV) en motivatiebrieven</li>
              <li>Opleidingsgegevens en diploma&apos;s</li>
              <li>Certificaten en vakbekwaamheidsbewijzen (zoals HACCP, BHV, Sociale Hygiëne)</li>
              <li>Referenties en referentiegegevens</li>
              <li>Sollicitatienotities en beoordelingen</li>
              <li>Profielfoto (indien door u verstrekt)</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">3.3 Werkervaring, beschikbaarheid en vaardigheden</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Werkervaring en arbeidsverleden in de horeca</li>
              <li>Functievoorkeuren en gewenst salaris</li>
              <li>Beschikbaarheid en werkbare uren</li>
              <li>Specifieke horecavaardigheden (barista, barkeeper, bediening, keuken, etc.)</li>
              <li>Talenkennis en communicatieve vaardigheden</li>
              <li>Eigen vervoer en reisbereidheid</li>
              <li>Fysieke mogelijkheden relevant voor de functie</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">3.4 Burgerservicenummer (BSN)</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Burgerservicenummer (uitsluitend indien wettelijk verplicht voor loonadministratie en belastingaangifte)</li>
              <li>Het BSN wordt alleen verwerkt op grond van artikel 46 van de Uitvoeringswet AVG en relevante fiscale wetgeving</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">3.5 Bank- en betaalgegevens</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>IBAN-rekeningnummer en tenaamstelling</li>
              <li>Loonheffingskorting en loonbelastingverklaring</li>
              <li>Eventuele loonbeslagen (indien van toepassing)</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">3.6 Contract- en plaatsingsgegevens</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Arbeidsovereenkomst of overeenkomst van opdracht</li>
              <li>Urenregistraties en werkroosters</li>
              <li>Plaatsingsgegevens bij opdrachtgevers</li>
              <li>Verlof- en verzuimregistratie</li>
              <li>Functioneringsgesprekken en beoordelingen</li>
              <li>Eventuele incidenten of klachten</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">3.7 Communicatiegegevens</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>E-mailcorrespondentie</li>
              <li>Telefoonnotities en WhatsApp-berichten (zakelijk)</li>
              <li>Feedback en evaluaties</li>
              <li>Klachten en geschillen</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">3.8 Website- en cookiegegevens</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>IP-adres en browsertype</li>
              <li>Apparaatgegevens en besturingssysteem</li>
              <li>Bezochte pagina&apos;s en klikgedrag</li>
              <li>Datum en tijdstip van websitebezoek</li>
              <li>Verwijzende website (referrer)</li>
              <li>Cookie-voorkeuren</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">3.9 Gegevens van opdrachtgevers</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Bedrijfsnaam en rechtsvorm</li>
              <li>KvK-nummer en BTW-nummer</li>
              <li>Vestigingsadres en factuuradres</li>
              <li>Contactpersonen en hun contactgegevens</li>
              <li>Bankgegevens voor facturatie</li>
              <li>Contractgegevens en tariefafspraken</li>
            </ul>

            {/* 4. Doeleinden van de gegevensverwerking */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              4. Doeleinden van de gegevensverwerking
            </h2>
            <p>Wij verwerken uw persoonsgegevens voor de volgende doeleinden:</p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">4.1 Werving en selectie</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Beoordelen van sollicitaties en geschiktheid voor functies</li>
              <li>Matchen van kandidaten met vacatures en opdrachten</li>
              <li>Opbouwen en onderhouden van een kandidatenpool</li>
              <li>Uitvoeren van referentiechecks</li>
              <li>Communicatie over beschikbare functies en opdrachten</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">4.2 Uitvoering arbeidsovereenkomst/bemiddeling</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Aangaan en uitvoeren van arbeidsovereenkomsten of overeenkomsten van opdracht</li>
              <li>Planning en inzet van personeel bij opdrachtgevers</li>
              <li>Spoedplaatsingen en last-minute personeelsinzet</li>
              <li>Communicatie over werkzaamheden, roosters en wijzigingen</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">4.3 Verloning en salarisadministratie</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Berekenen en uitbetalen van loon, toeslagen en onkostenvergoedingen</li>
              <li>Inhouden en afdragen van loonheffingen en sociale premies</li>
              <li>Verstrekken van loonstroken en jaaropgaven</li>
              <li>Samenwerking met payroll- en backofficepartijen</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">4.4 Planning en urenregistratie</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Opstellen en beheren van werkroosters</li>
              <li>Registreren van gewerkte uren</li>
              <li>Accorderen van urenstaten</li>
              <li>Verlof- en verzuimadministratie</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">4.5 Facturatie en debiteurenbeheer</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Opstellen en verzenden van facturen aan opdrachtgevers</li>
              <li>Incasso van openstaande vorderingen</li>
              <li>Financiële administratie en rapportage</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">4.6 Wettelijke verplichtingen</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Voldoen aan fiscale verplichtingen (Belastingdienst)</li>
              <li>Identificatieplicht en verificatie van identiteit</li>
              <li>Wet arbeid vreemdelingen (WAV) en controle werkvergunningen</li>
              <li>Wet allocatie arbeidskrachten door intermediairs (WAADI)</li>
              <li>Arbo-wetgeving en veiligheidsverplichtingen</li>
              <li>Pensioenverplichtingen (StiPP)</li>
              <li>NEN 4400-1 / SNA-certificering en normering</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">4.7 Relatiebeheer en communicatie</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Onderhouden van contact met kandidaten en opdrachtgevers</li>
              <li>Versturen van nieuwsbrieven en relevante informatie (met toestemming)</li>
              <li>Klanttevredenheidsonderzoeken</li>
              <li>Behandelen van vragen, klachten en geschillen</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">4.8 Websitebeheer en verbetering dienstverlening</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Waarborgen van de technische functionaliteit van de website</li>
              <li>Analyseren van websitegebruik en verbeteren van de gebruikerservaring</li>
              <li>Beveiligen van de website tegen misbruik</li>
            </ul>

            {/* 5. Rechtsgrondslagen */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              5. Rechtsgrondslagen conform artikel 6 AVG
            </h2>
            <p>Wij verwerken uw persoonsgegevens op basis van de volgende rechtsgrondslagen:</p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">5.1 Uitvoering van een overeenkomst (artikel 6 lid 1 sub b AVG)</h3>
            <p>Verwerking die noodzakelijk is voor:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Het aangaan en uitvoeren van een arbeidsovereenkomst of uitzendovereenkomst</li>
              <li>Het uitvoeren van bemiddelingsactiviteiten</li>
              <li>Het uitvoeren van overeenkomsten met opdrachtgevers</li>
              <li>Precontractuele maatregelen (sollicitatieprocedure)</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">5.2 Wettelijke verplichting (artikel 6 lid 1 sub c AVG)</h3>
            <p>Verwerking die noodzakelijk is voor:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fiscale verplichtingen (bewaren administratie, aangifte loonheffingen)</li>
              <li>Identificatieplicht werkgever (Wet op de identificatieplicht)</li>
              <li>Wet arbeid vreemdelingen (WAV)</li>
              <li>WAADI-registratie en ketenaansprakelijkheid</li>
              <li>Pensioenwetgeving</li>
              <li>Arbeidsomstandighedenwet</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">5.3 Gerechtvaardigd belang (artikel 6 lid 1 sub f AVG)</h3>
            <p>Verwerking op basis van ons gerechtvaardigd belang voor:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Marketing en acquisitie (met inachtneming van opt-out mogelijkheden)</li>
              <li>Beveiliging van systemen en gegevens</li>
              <li>Verbetering van onze dienstverlening</li>
              <li>Interne bedrijfsvoering en managementrapportages</li>
              <li>Juridische claims en geschillen</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">5.4 Toestemming (artikel 6 lid 1 sub a AVG)</h3>
            <p>Verwerking op basis van uw uitdrukkelijke toestemming voor:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Opname in onze kandidatenpool voor toekomstige vacatures</li>
              <li>Versturen van nieuwsbrieven en marketingcommunicatie</li>
              <li>Plaatsing van niet-noodzakelijke cookies</li>
              <li>Delen van gegevens met derden buiten de directe dienstverlening</li>
            </ul>
            <p>U kunt een gegeven toestemming te allen tijde intrekken. Zie hiervoor paragraaf 12.</p>

            {/* 6. Bewaartermijnen */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              6. Bewaartermijnen
            </h2>
            <p>Wij bewaren uw persoonsgegevens niet langer dan noodzakelijk voor de doeleinden waarvoor ze zijn verzameld, of zolang wettelijk vereist. Hieronder vindt u een overzicht van de bewaartermijnen per categorie:</p>

            <div className="overflow-x-auto my-6">
              <table className="min-w-full border border-neutral-200 rounded-lg">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-[#1F1F1F] border-b">Categorie gegevens</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1F1F1F] border-b">Bewaartermijn</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-4 py-3">Sollicitatiegegevens (niet aangenomen)</td>
                    <td className="px-4 py-3">4 weken na afwijzing, of tot 1 jaar met toestemming</td>
                  </tr>
                  <tr className="border-b bg-neutral-50">
                    <td className="px-4 py-3">Kandidatenpool (met toestemming)</td>
                    <td className="px-4 py-3">Maximaal 2 jaar na laatste contact, tenzij vernieuwd</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3">Arbeidsovereenkomst en personeelsdossier</td>
                    <td className="px-4 py-3">2 jaar na einde dienstverband</td>
                  </tr>
                  <tr className="border-b bg-neutral-50">
                    <td className="px-4 py-3">Loonadministratie en fiscale gegevens</td>
                    <td className="px-4 py-3">7 jaar (fiscale bewaarplicht)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3">Kopie identiteitsbewijs</td>
                    <td className="px-4 py-3">5 jaar na einde dienstverband</td>
                  </tr>
                  <tr className="border-b bg-neutral-50">
                    <td className="px-4 py-3">Loonbelastingverklaringen</td>
                    <td className="px-4 py-3">5 jaar na einde dienstverband</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3">Urenregistraties</td>
                    <td className="px-4 py-3">7 jaar (fiscale bewaarplicht)</td>
                  </tr>
                  <tr className="border-b bg-neutral-50">
                    <td className="px-4 py-3">Facturen en financiële administratie</td>
                    <td className="px-4 py-3">7 jaar (fiscale bewaarplicht)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3">Opdrachtgeversgegevens</td>
                    <td className="px-4 py-3">7 jaar na beëindiging samenwerking</td>
                  </tr>
                  <tr className="border-b bg-neutral-50">
                    <td className="px-4 py-3">E-mailcorrespondentie (zakelijk)</td>
                    <td className="px-4 py-3">2 jaar na laatste relevante contact</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3">Website analytics</td>
                    <td className="px-4 py-3">26 maanden (geanonimiseerd)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Klachten en geschillen</td>
                    <td className="px-4 py-3">5 jaar na afhandeling</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>Na afloop van de bewaartermijn worden uw gegevens verwijderd of geanonimiseerd, tenzij een wettelijke verplichting of een gerechtvaardigd belang een langere bewaartermijn rechtvaardigt.</p>

            {/* 7. Verstrekking aan derden */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              7. Verstrekking van persoonsgegevens aan derden
            </h2>
            <p>Wij kunnen uw persoonsgegevens delen met de volgende categorieën ontvangers:</p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">7.1 Opdrachtgevers</h3>
            <p>Om onze dienstverlening uit te voeren, delen wij relevante gegevens met opdrachtgevers (horecabedrijven, evenementenlocaties, cateringbedrijven), waaronder:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Naam en contactgegevens</li>
              <li>Relevante werkervaring en vaardigheden</li>
              <li>Beschikbaarheid</li>
              <li>Certificaten relevant voor de functie</li>
            </ul>
            <p>Gevoelige gegevens zoals BSN en bankgegevens worden nimmer met opdrachtgevers gedeeld.</p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">7.2 Dienstverleners en verwerkers</h3>
            <p>Wij maken gebruik van de volgende categorieën dienstverleners die als verwerker optreden:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Salarisverwerkers en payroll-partners:</strong> voor de uitvoering van de loonadministratie</li>
              <li><strong>Boekhoudsoftware en administratiekantoren:</strong> voor financiële administratie</li>
              <li><strong>ATS-systemen (Applicant Tracking System):</strong> voor werving en selectie</li>
              <li><strong>Planningssoftware:</strong> voor roostering en urenregistratie</li>
              <li><strong>Hostingproviders:</strong> voor het hosten van onze website en systemen</li>
              <li><strong>E-mailproviders:</strong> voor zakelijke communicatie</li>
              <li><strong>CRM-systemen:</strong> voor relatiebeheer</li>
            </ul>
            <p>Met alle verwerkers hebben wij verwerkersovereenkomsten gesloten die voldoen aan de eisen van artikel 28 AVG.</p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">7.3 Overheidsinstanties</h3>
            <p>Wij zijn wettelijk verplicht bepaalde gegevens te verstrekken aan:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Belastingdienst (loonheffingen, btw-aangifte)</li>
              <li>UWV (sociale verzekeringen, ziekmeldingen)</li>
              <li>Pensioenfonds StiPP</li>
              <li>Inspectie SZW (bij controles)</li>
              <li>Justitiële autoriteiten (bij gerechtelijk bevel)</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">7.4 Certificerende instanties</h3>
            <p>In het kader van onze SNA-certificering (NEN 4400-1) kunnen gegevens worden ingezien door auditoren van de Stichting Normering Arbeid.</p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">7.5 Overige derden</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Juridische adviseurs en advocaten (bij geschillen)</li>
              <li>Verzekeraars (bij claims of aansprakelijkheidskwesties)</li>
              <li>Incassobureaus (bij openstaande vorderingen)</li>
            </ul>

            {/* 8. Doorgifte buiten de EU */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              8. Doorgifte buiten de Europese Unie
            </h2>
            <p>In beginsel worden uw persoonsgegevens verwerkt binnen de Europese Economische Ruimte (EER). Indien wij gebruikmaken van dienstverleners die gegevens verwerken buiten de EER, zorgen wij ervoor dat er passende waarborgen zijn getroffen:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Een adequaatheidsbesluit van de Europese Commissie voor het betreffende land</li>
              <li>Standaardcontractbepalingen (SCC&apos;s) van de Europese Commissie</li>
              <li>Binding Corporate Rules (BCR&apos;s)</li>
              <li>Andere wettelijk toegestane mechanismen</li>
            </ul>
            <p>Dit kan van toepassing zijn bij het gebruik van diensten zoals Google (Analytics), Microsoft, of cloudproviders met servers buiten de EU. U kunt bij ons navragen welke waarborgen in specifieke gevallen zijn getroffen.</p>

            {/* 9. Cookies en tracking */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              9. Cookies en tracking
            </h2>
            <p>Onze website maakt gebruik van cookies en vergelijkbare technologieën. Hieronder vindt u informatie over de verschillende soorten cookies die wij gebruiken:</p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">9.1 Noodzakelijke/functionele cookies</h3>
            <p>Deze cookies zijn essentieel voor het functioneren van de website en kunnen niet worden uitgeschakeld. Ze worden gebruikt voor:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Onthouden van uw cookievoorkeuren</li>
              <li>Sessiemanagement en beveiliging</li>
              <li>Werking van formulieren</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">9.2 Analytische cookies</h3>
            <p>Met uw toestemming gebruiken wij analytische cookies om te begrijpen hoe bezoekers onze website gebruiken:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Google Analytics:</strong> voor websitestatistieken (IP-anonimisering ingeschakeld)</li>
              <li>Bezoekersaantallen en paginaweergaven</li>
              <li>Herkomst van bezoekers</li>
              <li>Gebruikte apparaten en browsers</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">9.3 Marketing cookies</h3>
            <p>Met uw toestemming kunnen wij marketing cookies plaatsen voor:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Gerichte advertenties op sociale media (Meta/Facebook, LinkedIn)</li>
              <li>Remarketing en retargeting</li>
              <li>Conversietracking</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">9.4 Cookievoorkeuren beheren</h3>
            <p>Bij uw eerste bezoek aan onze website wordt u gevraagd om uw cookievoorkeuren aan te geven. U kunt uw voorkeuren te allen tijde wijzigen via de cookie-instellingen op onze website of via uw browserinstellingen.</p>

            {/* 10. Externe systemen */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              10. Gebruik van externe systemen
            </h2>
            <p>Voor onze bedrijfsvoering maken wij gebruik van diverse externe systemen en software:</p>

            <div className="overflow-x-auto my-6">
              <table className="min-w-full border border-neutral-200 rounded-lg">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-[#1F1F1F] border-b">Systeem/Dienst</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1F1F1F] border-b">Doel</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-4 py-3">Applicant Tracking System (ATS)</td>
                    <td className="px-4 py-3">Beheer van sollicitaties en kandidatenpool</td>
                  </tr>
                  <tr className="border-b bg-neutral-50">
                    <td className="px-4 py-3">Planningssoftware</td>
                    <td className="px-4 py-3">Roostering en inzet van personeel</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3">Salarissoftware/Payroll</td>
                    <td className="px-4 py-3">Loonadministratie en verloning</td>
                  </tr>
                  <tr className="border-b bg-neutral-50">
                    <td className="px-4 py-3">Boekhoudpakket</td>
                    <td className="px-4 py-3">Financiële administratie en facturatie</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3">Google Analytics</td>
                    <td className="px-4 py-3">Websitestatistieken en analyse</td>
                  </tr>
                  <tr className="border-b bg-neutral-50">
                    <td className="px-4 py-3">Google reCAPTCHA</td>
                    <td className="px-4 py-3">Spam- en botpreventie op formulieren</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3">E-mailmarketingplatform</td>
                    <td className="px-4 py-3">Nieuwsbrieven en communicatie</td>
                  </tr>
                  <tr className="border-b bg-neutral-50">
                    <td className="px-4 py-3">CRM-systeem</td>
                    <td className="px-4 py-3">Relatiebeheer en contacthistorie</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Cloudopslag</td>
                    <td className="px-4 py-3">Beveiligde opslag van documenten</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>Met alle leveranciers die persoonsgegevens verwerken zijn verwerkersovereenkomsten gesloten.</p>

            {/* 11. Beveiliging */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              11. Beveiliging van persoonsgegevens
            </h2>
            <p>Wij nemen de bescherming van uw persoonsgegevens serieus en hebben passende technische en organisatorische maatregelen getroffen om uw gegevens te beveiligen tegen verlies, misbruik, ongeautoriseerde toegang, wijziging of openbaarmaking:</p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Technische maatregelen</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>SSL/TLS-versleuteling voor alle dataverkeer op onze website</li>
              <li>Versleuteling van gevoelige gegevens in opslag</li>
              <li>Firewalls en intrusion detection systemen</li>
              <li>Regelmatige beveiligingsupdates en patches</li>
              <li>Sterke wachtwoordpolicies en tweefactorauthenticatie</li>
              <li>Automatische back-ups van gegevens</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Organisatorische maatregelen</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Beperkte toegang tot persoonsgegevens (need-to-know basis)</li>
              <li>Geheimhoudingsverklaringen voor medewerkers</li>
              <li>Bewustwordingstraining voor medewerkers</li>
              <li>Procedures voor het melden van datalekken</li>
              <li>Periodieke evaluatie van beveiligingsmaatregelen</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Datalekken</h3>
            <p>Ondanks onze beveiligingsmaatregelen kan geen enkele methode van gegevensoverdracht of opslag 100% veilig zijn. Mocht er onverhoopt een datalek plaatsvinden waarbij uw persoonsgegevens betrokken zijn, dan zullen wij:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Het datalek binnen 72 uur melden bij de Autoriteit Persoonsgegevens (indien vereist)</li>
              <li>U informeren indien het datalek waarschijnlijk een hoog risico voor uw rechten en vrijheden inhoudt</li>
              <li>Alle nodige maatregelen treffen om de gevolgen te beperken</li>
            </ul>

            {/* 12. Rechten van betrokkenen */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              12. Uw rechten als betrokkene
            </h2>
            <p>Op grond van de AVG heeft u de volgende rechten met betrekking tot uw persoonsgegevens:</p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">12.1 Recht op inzage (artikel 15 AVG)</h3>
            <p>U heeft het recht om te weten welke persoonsgegevens wij van u verwerken en een kopie van deze gegevens te ontvangen.</p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">12.2 Recht op rectificatie (artikel 16 AVG)</h3>
            <p>U heeft het recht om onjuiste of onvolledige persoonsgegevens te laten corrigeren of aanvullen.</p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">12.3 Recht op verwijdering (&apos;recht op vergetelheid&apos;) (artikel 17 AVG)</h3>
            <p>U heeft in bepaalde gevallen het recht om uw persoonsgegevens te laten verwijderen, bijvoorbeeld wanneer:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>De gegevens niet langer nodig zijn voor het doel waarvoor ze zijn verzameld</li>
              <li>U uw toestemming intrekt en er geen andere rechtsgrond is</li>
              <li>U bezwaar maakt en er geen dwingende gerechtvaardigde gronden zijn</li>
            </ul>
            <p>Dit recht is niet absoluut; wij kunnen verwijdering weigeren indien wij wettelijk verplicht zijn gegevens te bewaren.</p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">12.4 Recht op beperking van de verwerking (artikel 18 AVG)</h3>
            <p>U heeft het recht om de verwerking van uw persoonsgegevens tijdelijk te laten beperken, bijvoorbeeld wanneer u de juistheid van de gegevens betwist.</p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">12.5 Recht op dataportabiliteit (artikel 20 AVG)</h3>
            <p>U heeft het recht om de persoonsgegevens die u aan ons heeft verstrekt in een gestructureerd, gangbaar en machineleesbaar formaat te ontvangen, en deze over te dragen aan een andere verwerkingsverantwoordelijke.</p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">12.6 Recht van bezwaar (artikel 21 AVG)</h3>
            <p>U heeft het recht om bezwaar te maken tegen de verwerking van uw persoonsgegevens:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Wanneer de verwerking gebaseerd is op ons gerechtvaardigd belang</li>
              <li>Tegen direct marketing (dit bezwaar wordt altijd gehonoreerd)</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">12.7 Recht om niet onderworpen te worden aan geautomatiseerde besluitvorming (artikel 22 AVG)</h3>
            <p>U heeft het recht om niet onderworpen te worden aan een uitsluitend op geautomatiseerde verwerking gebaseerd besluit dat voor u rechtsgevolgen heeft of u anderszins in aanmerkelijke mate treft. Wij maken geen gebruik van volledig geautomatiseerde besluitvorming.</p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">12.8 Uitoefening van uw rechten</h3>
            <p>Om uw rechten uit te oefenen kunt u contact met ons opnemen via:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>E-mail: <a href="mailto:info@toptalentjobs.nl" className="text-[#FF7A00] hover:underline">info@toptalentjobs.nl</a></li>
              <li>Post: TopTalent B.V., t.a.v. Privacy, Utrecht</li>
            </ul>
            <p>Wij zullen uw verzoek binnen één maand behandelen. In complexe gevallen kan deze termijn met twee maanden worden verlengd, waarvan wij u tijdig op de hoogte stellen. Om uw identiteit te verifiëren kunnen wij u vragen om aanvullende informatie te verstrekken.</p>

            {/* 13. Intrekken van toestemming */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              13. Intrekken van toestemming
            </h2>
            <p>Wanneer de verwerking van uw persoonsgegevens gebaseerd is op uw toestemming, heeft u te allen tijde het recht om deze toestemming in te trekken. Het intrekken van uw toestemming heeft geen invloed op de rechtmatigheid van de verwerking vóór de intrekking.</p>
            <p>U kunt uw toestemming intrekken door:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Contact met ons op te nemen via <a href="mailto:info@toptalentjobs.nl" className="text-[#FF7A00] hover:underline">info@toptalentjobs.nl</a></li>
              <li>De afmeldlink in onze e-mails te gebruiken (voor nieuwsbrieven)</li>
              <li>Uw cookievoorkeuren aan te passen via de cookie-instellingen op onze website</li>
            </ul>

            {/* 14. Klachtenprocedure */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              14. Klachtenprocedure en Autoriteit Persoonsgegevens
            </h2>
            <p>Indien u ontevreden bent over de wijze waarop wij omgaan met uw persoonsgegevens, horen wij dat graag. Neem in eerste instantie contact met ons op, zodat wij samen naar een oplossing kunnen zoeken.</p>
            <p>Daarnaast heeft u het recht om een klacht in te dienen bij de toezichthoudende autoriteit:</p>
            <div className="bg-neutral-50 rounded-xl p-6 my-6">
              <p className="mb-2"><strong>Autoriteit Persoonsgegevens</strong></p>
              <p className="mb-2">Postbus 93374</p>
              <p className="mb-2">2509 AJ Den Haag</p>
              <p className="mb-2">Telefoon: 088 - 1805 250</p>
              <p className="mb-0">Website: <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer" className="text-[#FF7A00] hover:underline">www.autoriteitpersoonsgegevens.nl</a></p>
            </div>

            {/* 15. Wijzigingen */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              15. Wijzigingen in deze privacy policy
            </h2>
            <p>Wij behouden ons het recht voor om deze privacy policy te wijzigen. Wijzigingen worden gepubliceerd op onze website. Wij raden u aan om deze privacy policy regelmatig te raadplegen, zodat u op de hoogte blijft van eventuele wijzigingen.</p>
            <p>Bij substantiële wijzigingen die van invloed zijn op de verwerking van uw persoonsgegevens, zullen wij u hierover actief informeren, bijvoorbeeld via e-mail of een melding op onze website.</p>
            <p>De datum van de laatste wijziging vindt u bovenaan deze privacy policy.</p>

            {/* 16. Contact */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              16. Contactgegevens voor privacygerelateerde vragen
            </h2>
            <p>Voor vragen, opmerkingen of verzoeken met betrekking tot deze privacy policy of de verwerking van uw persoonsgegevens kunt u contact met ons opnemen:</p>
            <div className="bg-[#FFF7F1] rounded-xl p-6 my-6">
              <p className="mb-2"><strong>TopTalent B.V.</strong></p>
              <p className="mb-2">T.a.v. Privacyzaken</p>
              <p className="mb-2">Utrecht, Nederland</p>
              <p className="mb-2">E-mail: <a href="mailto:info@toptalentjobs.nl" className="text-[#FF7A00] hover:underline">info@toptalentjobs.nl</a></p>
              <p className="mb-0">Telefoon: <a href="tel:+31649200412" className="text-[#FF7A00] hover:underline">+31 6 49 20 04 12</a></p>
            </div>
            <p>Wij streven ernaar om uw vragen en verzoeken zo spoedig mogelijk, maar in ieder geval binnen de wettelijke termijnen, te beantwoorden.</p>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-neutral-200">
              <p className="text-neutral-500 text-sm">
                <strong>Utrecht, december 2024</strong>
              </p>
              <p className="text-neutral-500 text-sm mt-2">
                TopTalent B.V. - Privacy Policy versie 1.0
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#FFF7F1]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-[#1F1F1F] mb-4">
            Vragen over uw privacy?
          </h2>
          <p className="text-neutral-600 mb-8">
            Heeft u vragen over hoe wij omgaan met uw persoonsgegevens? Neem gerust contact met ons op.
          </p>
          <a
            href="mailto:info@toptalentjobs.nl"
            className="inline-flex items-center justify-center bg-[#FF7A00] text-white px-8 py-4 rounded-xl font-semibold
            shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
            hover:bg-[#E66E00] hover:-translate-y-0.5 active:scale-[0.98]
            transition-all duration-300"
          >
            Mail ons over privacy
          </a>
        </div>
      </section>
    </>
  );
}
