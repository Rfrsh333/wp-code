"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";

export default function KorInfoClient() {
  const router = useRouter();

  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        {/* Header */}
        <div className="bg-gradient-to-br from-[var(--mp-accent)] to-[var(--mp-accent-dark)] pt-4 pb-6 px-4">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white mb-4 transition-opacity active:opacity-70"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Terug</span>
            </button>
            <h1 className="text-2xl font-bold text-white">Kleineondernemersregeling (KOR)</h1>
            <p className="text-white/80 text-sm mt-1">Alles wat je moet weten over de KOR bij TopTalent</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 -mt-2 pb-8 space-y-4">
          {/* Intro card */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-6 shadow-[var(--mp-shadow)]">
            <div className="flex gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-[var(--mp-accent)] flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-[var(--mp-text-primary)] mb-2">
                  Wat is de Kleineondernemersregeling?
                </h2>
                <p className="text-[var(--mp-text-secondary)] text-sm leading-relaxed">
                  De Kleineondernemersregeling (KOR) is een regeling van de Belastingdienst voor kleine ondernemers.
                  Als je gebruikmaakt van de KOR, hoef je geen btw aan te geven en af te dragen.
                  Dit kan administratief een stuk eenvoudiger zijn voor je bedrijf.
                </p>
              </div>
            </div>
          </div>

          {/* Belangrijke voorwaarden */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-6 shadow-[var(--mp-shadow)]">
            <h2 className="text-lg font-bold text-[var(--mp-text-primary)] mb-4">
              Belangrijke voorwaarden
            </h2>

            <div className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-[var(--mp-text-primary)] text-sm mb-1">
                    Je moet aangemeld zijn bij de Belastingdienst
                  </h3>
                  <p className="text-[var(--mp-text-secondary)] text-sm">
                    Je kunt de KOR alleen gebruiken als je je hiervoor hebt aangemeld bij de Belastingdienst.
                    Deze aanmelding doe je zelf, niet via TopTalent.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-[var(--mp-text-primary)] text-sm mb-1">
                    Jaaromzet onder €25.000
                  </h3>
                  <p className="text-[var(--mp-text-secondary)] text-sm">
                    De KOR geldt alleen als je verwachte omzet (inclusief btw) niet hoger is dan €25.000 per jaar.
                    Let op: dit geldt voor je totale bedrijfsomzet, dus ook inkomsten buiten TopTalent tellen mee.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-[var(--mp-text-primary)] text-sm mb-1">
                    Geen btw in rekening brengen
                  </h3>
                  <p className="text-[var(--mp-text-secondary)] text-sm">
                    Als je gebruikmaakt van de KOR, mag je geen btw in rekening brengen aan je opdrachtgevers.
                    TopTalent rekent daarom ook geen btw af met jou.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Wat betekent dit voor TopTalent? */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-6 shadow-[var(--mp-shadow)]">
            <h2 className="text-lg font-bold text-[var(--mp-text-primary)] mb-4">
              Wat betekent dit voor TopTalent?
            </h2>

            <div className="space-y-3">
              <p className="text-[var(--mp-text-secondary)] text-sm leading-relaxed">
                Als je de KOR activeert in je profiel, gaan we ervan uit dat je aangemeld bent bij de Belastingdienst
                en dat je aan alle voorwaarden voldoet. TopTalent controleert dit niet.
              </p>

              <p className="text-[var(--mp-text-secondary)] text-sm leading-relaxed">
                We berekenen dan geen btw meer op je facturen. Je ontvangt het brutobedrag zonder btw-toeslag.
                Jij bent zelf verantwoordelijk voor je belastingaangifte en naleving van de KOR-voorwaarden.
              </p>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mt-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-900 dark:text-amber-200 font-semibold mb-1">
                      Let op: niet omkeerbaar
                    </p>
                    <p className="text-sm text-amber-900 dark:text-amber-200">
                      Als je de KOR eenmaal hebt geactiveerd, kun je dit niet zomaar uitzetten.
                      Dit kan alleen door contact op te nemen met onze supportafdeling, die dit handmatig voor je afhandelt.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Voordelen en nadelen */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Voordelen */}
            <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-6 shadow-[var(--mp-shadow)]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500" />
                </div>
                <h3 className="font-bold text-[var(--mp-text-primary)]">Voordelen</h3>
              </div>
              <ul className="space-y-2 text-sm text-[var(--mp-text-secondary)]">
                <li className="flex gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>Geen btw-aangifte nodig</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>Minder administratie</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>Geen btw afdragen aan de Belastingdienst</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>Eenvoudiger voor kleine ondernemers</span>
                </li>
              </ul>
            </div>

            {/* Nadelen */}
            <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-6 shadow-[var(--mp-shadow)]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-500" />
                </div>
                <h3 className="font-bold text-[var(--mp-text-primary)]">Nadelen</h3>
              </div>
              <ul className="space-y-2 text-sm text-[var(--mp-text-secondary)]">
                <li className="flex gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Je mag geen btw terugvragen op zakelijke aankopen</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Alleen mogelijk bij omzet onder €25.000</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Kan nadelig zijn bij hoge investeringen</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Niet omkeerbaar zonder contact met support</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Hoe activeer je de KOR? */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-6 shadow-[var(--mp-shadow)]">
            <h2 className="text-lg font-bold text-[var(--mp-text-primary)] mb-4">
              Hoe activeer je de KOR bij TopTalent?
            </h2>

            <ol className="space-y-3">
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--mp-accent)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="text-[var(--mp-text-primary)] font-medium text-sm">
                    Meld je aan bij de Belastingdienst
                  </p>
                  <p className="text-[var(--mp-text-secondary)] text-sm mt-1">
                    Dit doe je via de website van de Belastingdienst. Zorg ervoor dat je aanmelding is goedgekeurd.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--mp-accent)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="text-[var(--mp-text-primary)] font-medium text-sm">
                    Ga naar je Persoonlijke gegevens
                  </p>
                  <p className="text-[var(--mp-text-secondary)] text-sm mt-1">
                    In de TopTalent app vind je onderaan de pagina Persoonlijke gegevens de KOR-schakelaar.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--mp-accent)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="text-[var(--mp-text-primary)] font-medium text-sm">
                    Activeer de KOR
                  </p>
                  <p className="text-[var(--mp-text-secondary)] text-sm mt-1">
                    Zet de schakelaar aan en bevestig dat je aangemeld bent bij de Belastingdienst.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--mp-accent)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <p className="text-[var(--mp-text-primary)] font-medium text-sm">
                    Klaar!
                  </p>
                  <p className="text-[var(--mp-text-secondary)] text-sm mt-1">
                    Vanaf nu berekenen we geen btw meer op je facturen. Je bent zelf verantwoordelijk voor naleving.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Veelgestelde vragen */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-6 shadow-[var(--mp-shadow)]">
            <h2 className="text-lg font-bold text-[var(--mp-text-primary)] mb-4">
              Veelgestelde vragen
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-[var(--mp-text-primary)] text-sm mb-1">
                  Moet ik de KOR gebruiken als ik minder dan €25.000 verdien?
                </h3>
                <p className="text-[var(--mp-text-secondary)] text-sm">
                  Nee, het is niet verplicht. Ook als je onder de grens zit, mag je gewoon btw in rekening brengen en afdragen.
                  De KOR is een optie die je helpt om administratie te verminderen, maar het is geen verplichting.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[var(--mp-text-primary)] text-sm mb-1">
                  Wat gebeurt er als mijn omzet boven €25.000 komt?
                </h3>
                <p className="text-[var(--mp-text-secondary)] text-sm">
                  Dan voldoe je niet meer aan de voorwaarden van de KOR. Je moet dit dan zelf melden bij de Belastingdienst
                  en ook bij TopTalent, zodat wij weer btw kunnen gaan berekenen. Neem contact op met support om dit te regelen.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[var(--mp-text-primary)] text-sm mb-1">
                  Kan TopTalent de KOR voor mij aanmelden?
                </h3>
                <p className="text-[var(--mp-text-secondary)] text-sm">
                  Nee, aanmelding voor de KOR doe je zelf bij de Belastingdienst. TopTalent kan dit niet voor je regelen.
                  Wij bieden alleen de mogelijkheid om in ons systeem aan te geven dat je de KOR gebruikt, zodat we geen btw berekenen.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[var(--mp-text-primary)] text-sm mb-1">
                  Waarom kan ik de KOR niet zelf uitzetten?
                </h3>
                <p className="text-[var(--mp-text-secondary)] text-sm">
                  Om misbruik en administratieve fouten te voorkomen, hebben we besloten dat het uitzetten van de KOR
                  alleen via support kan. Dit voorkomt dat mensen per ongeluk de verkeerde btw-status hebben op hun facturen.
                  Neem contact op met support als je de KOR wilt uitschakelen.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[var(--mp-text-primary)] text-sm mb-1">
                  Waar kan ik meer informatie vinden?
                </h3>
                <p className="text-[var(--mp-text-secondary)] text-sm">
                  Bezoek de website van de{" "}
                  <a
                    href="https://www.belastingdienst.nl/wps/wcm/connect/nl/ondernemers/content/ik-ben-ondernemer-welke-regeling-gebruik-ik-voor-de-btw"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--mp-accent)] hover:text-[var(--mp-accent-dark)] font-medium underline"
                  >
                    Belastingdienst
                  </a>{" "}
                  voor officiële informatie over de Kleineondernemersregeling.
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-gradient-to-br from-[var(--mp-accent-light)] to-[var(--mp-accent-light)] dark:from-[var(--mp-accent-dark)]/20 dark:to-[var(--mp-accent)]/20 rounded-[var(--mp-radius)] p-6 border border-[var(--mp-accent)]/20">
            <h3 className="font-bold text-[var(--mp-text-primary)] mb-2">
              Heb je nog vragen?
            </h3>
            <p className="text-[var(--mp-text-secondary)] text-sm mb-4">
              Neem contact op met ons support team. We helpen je graag verder met vragen over de KOR of je factuurinstellingen.
            </p>
            <a
              href="mailto:support@toptalent.nl"
              className="inline-flex items-center justify-center px-6 py-3 bg-[var(--mp-accent)] text-white font-semibold rounded-xl transition-all active:scale-[0.98] shadow-md"
            >
              Contact opnemen
            </a>
          </div>
        </div>
      </div>
    </MedewerkerResponsiveLayout>
  );
}
