/**
 * Privacyverklaring, stap 6 "Geld": uitbetaling aan zzp'ers en zelffacturering. Bewust een eigen
 * bestand (één regel in page.tsx), omdat andere PR's tegelijk in de privacyverklaring werken.
 */
export default function UitbetalingSectie() {
  return (
    <>
      <h3 id="uitbetaling-zelffacturering" className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">
        3.5a Uitbetaling en facturen namens zzp&apos;ers
      </h3>
      <p>
        Werkt u als zelfstandige (zzp&apos;er) via TopTalent, dan verwerken wij voor uw uitbetaling en, als u daarvoor akkoord
        heeft gegeven, voor het opmaken van facturen namens u (zelffacturering):
      </p>
      <ul className="list-disc pl-6 space-y-2">
        <li>uw naam, adres, KvK-nummer, btw-id en uw keuze voor de kleineondernemersregeling (KOR);</li>
        <li>uw IBAN en het rekeningnummer waarop wij u hebben betaald;</li>
        <li>de diensten, uren, tarieven, toeslagen en reiskosten op uw facturen, de factuurnummers en de status van de uitbetaling;</li>
        <li>wanneer u akkoord gaf op zelffacturering, op welke versie van de tekst, en of u het akkoord heeft ingetrokken.</li>
      </ul>
      <p>
        Wij doen dit om u te kunnen betalen en om de facturen op te maken die de wet vraagt. De grondslag is de uitvoering
        van de overeenkomst met u (artikel 6 lid 1 sub b AVG) en onze fiscale verplichtingen (artikel 6 lid 1 sub c AVG).
      </p>
      <p>
        Voor de uitbetaling maken wij een betaalbestand dat wij zelf bij onze bank aanbieden. Daarbij gaan uw naam, uw IBAN,
        het bedrag en het factuurnummer naar onze bank. Facturen en de gegevens die daarbij horen bewaren wij 7 jaar
        (fiscale bewaarplicht), ook als u uw account laat verwijderen.
      </p>
      <p>
        Is uw uitbetaling verwerkt, dan krijgt u daarvan een melding in uw meldingenoverzicht (en een pushmelding als u
        die heeft aangezet), met het factuurnummer, het bedrag en de laatste vier cijfers van uw rekeningnummer. Die
        melding bewaren wij 90 dagen, zoals alle meldingen (zie paragraaf 6).
      </p>
    </>
  );
}
