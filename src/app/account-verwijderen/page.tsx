import Link from "next/link";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Account verwijderen | TopTalent Jobs",
  description:
    "Zo verwijdert u uw account van de TopTalent-app of het werknemers- of werkgeversportaal, ook zonder de app. Lees welke gegevens worden verwijderd en welke wij wettelijk moeten bewaren.",
  path: "/account-verwijderen/",
});

const SUPPORT_EMAIL = "info@toptalentjobs.nl";

// Vooringevulde e-mail voor wie de app niet (meer) heeft. Het verzoek komt binnen op het
// gewone supportadres; er is bewust geen apart formulier of nieuwe tabel.
const MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Verzoek: account verwijderen")}&body=${encodeURIComponent(
  [
    "Ik wil mijn TopTalent-account laten verwijderen.",
    "",
    "Ik ben: werknemer / werkgever (doorhalen wat niet van toepassing is)",
    "Naam:",
    "E-mailadres van mijn account:",
    "Bedrijfsnaam (alleen werkgevers):",
    "Reden (optioneel):",
  ].join("\n"),
)}`;

const linkClass = "text-[#FF7A00] hover:underline";

export default function AccountVerwijderenPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 py-20 lg:py-28">
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Account verwijderen</h1>
          <p className="text-lg text-neutral-300">TopTalent-app en online portalen - Laatst bijgewerkt: oktober 2026</p>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="prose prose-lg max-w-none prose-headings:text-[#1F1F1F] prose-p:text-neutral-600 prose-li:text-neutral-600">
            <div className="bg-[#FFF7F1] rounded-2xl p-6 mb-10">
              <p className="text-neutral-700 mb-0">
                Op deze pagina leest u hoe u uw account bij TopTalent B.V. laat verwijderen. Dat geldt voor
                <strong> werknemers</strong> en <strong>werkgevers</strong> die de TopTalent-app (iOS en Android) of het
                werknemers- of werkgeversportaal op deze website gebruiken. Het is één account: verwijdert u het via de app,
                dan is het ook in het portaal weg, en andersom. U kunt het in de app regelen of, als u de app niet (meer)
                heeft, per e-mail aanvragen.
              </p>
            </div>

            {/* 1. In de app */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6">
              1. Verwijderen in de app
            </h2>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Werknemer</h3>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Open de app en ga naar het tabblad <strong>Account</strong>.</li>
              <li>Kies <strong>Account verwijderen</strong>.</li>
              <li>Vul eventueel een reden in, bevestig met uw wachtwoord en verstuur het verzoek.</li>
            </ol>
            <p>
              Als werknemer stuurt u een <strong>verzoek</strong>. Dat komt bij TopTalent binnen en wij handelen het af,
              omdat een deel van uw gegevens (zoals loon- en urenadministratie) wettelijk bewaard moet blijven. Wij
              verwerken uw verzoek uiterlijk binnen één maand en nemen contact met u op als wij iets van u nodig hebben.
            </p>
            <p>
              In het werknemersportaal op deze website vindt u dezelfde knop onder <strong>Instellingen</strong>.
            </p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Werkgever</h3>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Open de app en ga naar het tabblad <strong>Meer</strong>.</li>
              <li>Kies <strong>Wachtwoord en account</strong>.</li>
              <li>
                Vul onder <strong>Account verwijderen</strong> uw wachtwoord in, typ <strong>VERWIJDEREN</strong> ter
                bevestiging en druk op <strong>Account verwijderen</strong>.
              </li>
            </ol>
            <p>
              Uw account wordt dan <strong>direct</strong> verwijderd en u wordt uitgelogd. Dit kunt u niet ongedaan maken.
              Staan er voor komende diensten nog medewerkers ingepland? Annuleer die diensten dan eerst onder
              <strong> Aanvragen</strong>, of neem contact met ons op. Zolang dat zo is, kan het account niet worden
              verwijderd.
            </p>
            <p>
              In het werkgeversportaal op deze website vindt u dezelfde mogelijkheid onder <strong>Instellingen</strong>.
            </p>

            {/* 2. Zonder app */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              2. Verwijderen zonder de app
            </h2>
            <p>
              Heeft u de app niet (meer) of kunt u niet inloggen? Stuur dan een e-mail naar{" "}
              <a href={MAILTO} className={linkClass}>
                {SUPPORT_EMAIL}
              </a>{" "}
              met het onderwerp &quot;Verzoek: account verwijderen&quot;. Vermeld daarin:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>of u werknemer of werkgever bent;</li>
              <li>uw naam (en bij een werkgever de bedrijfsnaam);</li>
              <li>het e-mailadres waarmee u inlogt.</li>
            </ul>
            <p>
              Stuur de e-mail bij voorkeur vanaf het e-mailadres van uw account. Kunnen wij niet vaststellen dat het
              account van u is, dan vragen wij u om aanvullende informatie. Zo voorkomen wij dat iemand anders uw account
              laat verwijderen. Wij verwerken uw verzoek uiterlijk binnen één maand.
            </p>
            <div className="not-prose my-8">
              <a
                href={MAILTO}
                className="inline-flex items-center justify-center bg-[#FF7A00] text-white px-8 py-4 rounded-xl font-semibold
                shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                hover:bg-[#E66E00] hover:-translate-y-0.5 active:scale-[0.98]
                transition-all duration-300"
              >
                Verwijderverzoek mailen
              </a>
            </div>

            {/* 3. Wat er gebeurt */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              3. Welke gegevens worden verwijderd en welke blijven bewaard
            </h2>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Werkgever</h3>
            <p>Bij het verwijderen van een werkgeversaccount:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                worden de naam van de contactpersoon, het e-mailadres, het telefoonnummer en het wachtwoord gewist en kunt u
                niet meer inloggen;
              </li>
              <li>worden uw favoriete medewerkers, dienst-templates en pushmeldingen verwijderd;</li>
              <li>worden open, toekomstige diensten waarvoor nog niemand is ingepland geannuleerd;</li>
              <li>
                worden ook de bedrijfsgegevens (bedrijfsnaam, adres, KvK- en btw-nummer) gewist als er nooit een factuur
                aan uw bedrijf is gestuurd.
              </li>
            </ul>
            <p>Bewaard blijven:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>facturen</strong>, met de bedrijfsgegevens die op de factuur staan, en de bedrijfsgegevens van het
                account als er facturen zijn. Facturen vallen onder de fiscale bewaarplicht van 7 jaar;
              </li>
              <li>
                eerdere diensten en de daarbij geregistreerde uren. Die horen bij de uren-, loon- en factuuradministratie.
                Ze zijn na het verwijderen niet meer aan uw contactgegevens gekoppeld.
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Werknemer</h3>
            <p>
              Na uw verzoek verwijdert TopTalent uw account en de gegevens die wij niet meer nodig hebben. U kunt daarna niet
              meer inloggen. Gegevens die wij wettelijk moeten bewaren, blijven bewaard zolang dat verplicht is, zoals:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>loonadministratie, fiscale gegevens en urenregistraties: 7 jaar (fiscale bewaarplicht);</li>
              <li>kopie identiteitsbewijs en loonbelastingverklaring: 5 jaar na einde dienstverband.</li>
            </ul>
            <p>
              Deze termijnen staan ook in onze{" "}
              <Link href="/privacy/" className={linkClass}>
                privacy policy
              </Link>{" "}
              (paragraaf 6, Bewaartermijnen). Na afloop van de termijn worden deze gegevens verwijderd of geanonimiseerd.
            </p>

            <h3 className="text-xl font-semibold text-[#1F1F1F] mt-8 mb-4">Op uw telefoon</h3>
            <p>
              Uitloggen wist de inloggegevens en het offline QR-pasje van uw toestel. Uitloggen of de app van uw telefoon
              verwijderen is iets anders dan uw account verwijderen: uw account bij TopTalent blijft dan gewoon bestaan.
            </p>

            {/* 4. Vragen */}
            <h2 className="text-2xl font-bold text-[#1F1F1F] border-b-2 border-[#FF7A00] pb-2 mb-6 mt-12">
              4. Vragen
            </h2>
            <p>
              Meer over hoe wij met uw gegevens omgaan en over uw andere rechten (zoals inzage en correctie) leest u in onze{" "}
              <Link href="/privacy/" className={linkClass}>
                privacy policy
              </Link>
              . Vragen kunt u stellen via{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
                {SUPPORT_EMAIL}
              </a>{" "}
              of{" "}
              <a href="tel:+31617889189" className={linkClass}>
                +31617889189
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
