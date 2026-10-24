/**
 * Privacyverklaring 10f: controle van de identiteit van zzp'ers (Didit of videocall), versie 2.6.
 * Bewust een eigen bestand (één regel in page.tsx), net als UitbetalingSectie, omdat andere PR's
 * tegelijk in de privacyverklaring werken. De regels erachter staan in lib/id-check (controlerecord,
 * bewaartermijn, regels); houd deze tekst daarmee in de pas.
 */
export default function IdControleSectie() {
  return (
    <>
      <h2 id="id-controle" className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
        10f. Controle van uw identiteit (ID-check)
      </h2>

      <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Waarom controleren wij uw identiteit?</h3>
      <p>
        Voordat u als zzp&apos;er op diensten kunt reageren, controleren wij uw identiteitsbewijs. Verloopt uw document,
        dan vragen wij u de controle opnieuw te doen. Wij doen dit om:
      </p>
      <ul className="list-disc pl-6 space-y-2">
        <li>te voorkomen dat iemand zich voordoet als een ander;</li>
        <li>te voorkomen dat iemand anders onder uw account werkt;</li>
        <li>snel te kunnen laten zien wie er op een dienst werkte, als de Nederlandse Arbeidsinspectie daarom vraagt.</li>
      </ul>
      <p>
        Wij doen dit op grond van ons gerechtvaardigd belang (artikel 6 lid 1 sub f AVG). Wij hebben afgewogen of dit
        nodig is en of het niet te veel van u vraagt. Die afweging kunt u bij ons opvragen. Bij uw inschrijving als
        kandidaat vragen wij niet om uw identiteitsbewijs.
      </p>

      <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Hoe werkt het?</h3>
      <p>U kiest zelf hoe:</p>
      <ol className="list-decimal pl-6 space-y-2">
        <li>
          <strong>Via Didit.</strong> In het werknemersportaal opent u de beveiligde pagina van Didit. U maakt daar met de
          camera van uw telefoon foto&apos;s van uw paspoort of identiteitskaart (op een computer toont Didit een QR-code
          waarmee u verdergaat op uw telefoon). Er wordt geen selfie of video van uw gezicht gemaakt, uw gezicht wordt
          niet vergeleken met de foto op uw document, er wordt geen geluid opgenomen en er worden geen biometrische
          gegevens gebruikt. Didit leest het document uit en controleert of het echt is. De foto&apos;s blijven bij
          Didit; wij slaan ze niet op. Is er twijfel, dan bekijkt een medewerker van TopTalent de controle in de
          beveiligde omgeving van Didit.
        </li>
        <li>
          <strong>Via een videocall.</strong> U laat uw identiteitsbewijs zien in een videocall met TopTalent. Wij nemen
          de videocall niet op en maken geen foto of schermafbeelding. U mag uw burgerservicenummer (BSN) afdekken. Wij
          noteren alleen de gegevens die hieronder staan.
        </li>
      </ol>

      <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Didit</h3>
      <p>
        Didit (Didit Identity Spain S.L., Barcelona, Spanje) verwerkt de gegevens van de controle op servers van Amazon Web
        Services in Ierland. Didit werkt daarbij in onze opdracht (verwerker). Wij hebben bij Didit uitgezet dat uw
        gegevens worden gebruikt om zijn systemen te trainen. Didit verwijdert de foto&apos;s en gegevens van de controle
        zodra wij hebben beslist, en anders uiterlijk na 1 maand.
      </p>
      <p>
        Voor één beperkt doel is Didit zelf verantwoordelijk (verwerkingsverantwoordelijke): Didit gebruikt
        gepseudonimiseerde gegevens uit de controle om fraude en misbruik te bestrijden en om zijn eigen platform te
        beveiligen. Dat staat los van het verwijderen hierboven. Meer daarover leest u in de{" "}
        <a
          href="https://didit.me/terms/verification-privacy-notice/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#B85600] hover:underline"
        >
          Verification Privacy Notice van Didit
        </a>{" "}
        (Engelstalig).
      </p>

      <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Welke gegevens bewaren wij?</h3>
      <p>Na de controle bewaren wij bij TopTalent alleen een controlerecord:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>uw naam en geboortedatum zoals op het document, en uw nationaliteit;</li>
        <li>het soort document, het documentnummer, het land van uitgifte en de vervaldatum;</li>
        <li>of u uit de EER of Zwitserland komt en of de naam op het document overeenkomt met de naam in uw account;</li>
        <li>de uitslag (goedgekeurd of afgewezen), bij een afwijzing de reden, wie besliste en wanneer, en het kenmerk van de controle bij Didit.</li>
      </ul>
      <p>
        Wij bewaren <strong>geen</strong> kopie of foto van uw identiteitsbewijs, geen burgerservicenummer (BSN) en geen
        beelden. Het controlerecord staat in onze database in Frankfurt (Duitsland). Wij geven het niet aan horecazaken;
        alleen als de Nederlandse Arbeidsinspectie daarom vraagt, laten wij zien wie er op een dienst werkte.
      </p>

      <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Hoe lang bewaren wij het?</h3>
      <p>
        Wij bewaren het controlerecord tot 31 december van het vijfde jaar na het jaar waarin u uw laatste dienst via
        TopTalent deed. Werkte u voor het laatst in 2026, dan bewaren wij het dus tot en met 31 december 2031. Heeft u nog
        geen dienst gedaan, dan rekenen wij vanaf het jaar van de controle. Wij bewaren het zo lang omdat de Nederlandse
        Arbeidsinspectie ook achteraf kan vragen wie er op een dienst werkte (artikel 15a Wet arbeid vreemdelingen).
        Daarom blijft het controlerecord ook bewaard als u uw account laat verwijderen. Na die datum verwijderen wij het.
      </p>

      <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Wie beslist?</h3>
      <p>
        Keurt Didit uw document goed en klopt alles (een geldig paspoort of een geldige identiteitskaart, uw naam komt
        overeen met uw account en u komt uit de EER of Zwitserland), dan keurt ons systeem de controle automatisch goed.
        Klopt er iets niet of is er twijfel, dan beoordeelt een medewerker van TopTalent de controle. Wij wijzen nooit
        automatisch af: een afwijzing doet altijd een medewerker. Wijzen wij af, dan ziet u de reden en kunt u het opnieuw
        proberen of kiezen voor een videocall.
      </p>

      <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Komt u van buiten de EER of Zwitserland?</h3>
      <p>
        De EER is de Europese Unie plus IJsland, Liechtenstein en Noorwegen. Komt u van daarbuiten en ook niet uit
        Zwitserland, dan beoordeelt altijd een medewerker van TopTalent uw controle. De Wet arbeid vreemdelingen (artikel
        15) vraagt dan om een kopie van uw identiteitsbewijs; een controle via Didit of een videocall alleen is dan niet
        genoeg. U uploadt die kopie in het werknemersportaal bij Documenten. Wij bewaren de kopie beveiligd, tot 31
        december van het vijfde jaar na het jaar waarin uw werk via TopTalent eindigde. De grondslag hiervoor is onze
        wettelijke verplichting (artikel 6 lid 1 sub c AVG).
      </p>

      <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Eerder geüploade kopieën</h3>
      <p>
        Heeft u eerder een kopie van uw identiteitsbewijs bij ons geüpload, bijvoorbeeld bij uw inschrijving? Die kopie
        verwijderen wij. Werkt u via TopTalent, dan leggen wij daarbij het controlerecord hierboven vast. U hoeft daar
        niets voor te doen. Komt u van buiten de EER of Zwitserland, dan bewaren wij de kopie zoals hierboven staat.
      </p>

      <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Uw rechten</h3>
      <p>
        U kunt uw gegevens inzien en laten verbeteren, en u kunt bezwaar maken tegen de controle (zie paragraaf 12). Bij
        bezwaar kijken wij naar uw persoonlijke situatie. Zonder controle kunt u niet via TopTalent werken, maar u kunt
        altijd kiezen voor een videocall in plaats van Didit. Vragen? Mail naar{" "}
        <a href="mailto:info@toptalentjobs.nl" className="text-[#B85600] hover:underline">
          info@toptalentjobs.nl
        </a>
        .
      </p>
    </>
  );
}
