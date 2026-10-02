import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Section from "@/components/Section";
import PersoneelAanvragenWizard from "@/components/forms/PersoneelAanvragenWizard";

const HowWeWorkCarousel = dynamic(() => import("@/components/HowWeWorkCarousel"));

/**
 * /meer-aanvragen — voor horeca-opdrachtgevers die (meer) personeel nodig hebben.
 *
 * Inzendingen lopen via de PersoneelAanvragenWizard → /api/personeel-aanvragen,
 * dus met reCAPTCHA, mail, Telegram-melding en auto-reply, net als
 * /personeel-aanvragen. lead_source = "meer-aanvragen" (tenzij ?source= in de URL),
 * zodat aanvragen van deze pagina in de admin terug te vinden zijn.
 *
 * Teksten en beloftes komen van /personeel-aanvragen; voeg hier geen nieuwe
 * claims, cijfers of reviews toe die niet elders op de site staan.
 */
export default function MeerAanvragenPage() {
  return (
    <>
      {/* Hero + formulier */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
              Voor horecaondernemers
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-6">
              Meer handen nodig in uw{" "}
              <span className="text-[#F97316]">zaak</span>?
            </h1>
            <p className="text-neutral-600 text-lg">
              Druk seizoen, een evenement of structureel te weinig mensen? Vertel ons welk
              horecapersoneel u zoekt. Wij nemen zo snel mogelijk contact met u op, vaak binnen
              24 uur. Geen verplichtingen, gewoon een persoonlijk gesprek over uw behoefte.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center max-w-3xl mx-auto">
                <div className="animate-pulse">
                  <div className="h-8 bg-neutral-200 rounded w-3/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-neutral-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            }
          >
            <PersoneelAanvragenWizard standaardBron="meer-aanvragen" />
          </Suspense>

          {/* Zelfde toezeggingen als /personeel-aanvragen */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#F97316]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="font-semibold text-neutral-900 mb-1">Reactie binnen 24 uur</h2>
              <p className="text-sm text-neutral-500">Wij nemen snel contact met u op</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[#F97316]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="font-semibold text-neutral-900 mb-1">Geen verplichtingen</h2>
              <p className="text-sm text-neutral-500">Vrijblijvend advies gesprek</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[#F97316]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="font-semibold text-neutral-900 mb-1">Vertrouwd door horecaondernemers</h2>
              <p className="text-sm text-neutral-500">In heel de Randstad actief</p>
            </div>
          </div>
        </Section.Container>
      </Section>

      {/* Werkwijze (zelfde component als de homepage) */}
      <HowWeWorkCarousel />

      {/* Doorverwijzingen naar bestaande pagina's */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
              Eerst een indruk van de kosten?
            </h2>
            <p className="text-neutral-600 mb-8">
              Bereken met de kostencalculator wat horecapersoneel ongeveer kost, of plan direct
              een vrijblijvend gesprek in.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/kosten-calculator/"
                className="inline-flex items-center justify-center rounded-xl bg-[#F97316] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#EA580C]"
              >
                Naar de kostencalculator
              </Link>
              <Link
                href="/afspraak-plannen/"
                className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-6 py-3 font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
              >
                Plan een gesprek
              </Link>
            </div>
          </div>
        </Section.Container>
      </Section>
    </>
  );
}
