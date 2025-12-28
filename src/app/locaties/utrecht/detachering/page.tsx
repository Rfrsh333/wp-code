"use client";

import Link from "next/link";
import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";
import PremiumImage from "@/components/PremiumImage";

export default function DetacheringUtrechtPage() {
  return (
    <>
      {/* HERO */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <FadeIn direction="left">
              <div>
                <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
                  Utrecht
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 leading-[1.1]">
                  Detachering horeca personeel Utrecht
                </h1>
                <p className="text-xl text-neutral-600 mb-8 leading-relaxed max-w-xl">
                  Stabiliteit in uw planning met vaste krachten voor langere tijd.
                  Wij leveren in Utrecht medewerkers die passen bij uw team en tempo,
                  met duidelijke afspraken en begeleiding.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                    shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                    hover:bg-[#EA580C] transition-all duration-300"
                  >
                    Meer informatie aanvragen
                  </Link>
                  <Link
                    href="tel:+31649200412"
                    className="inline-flex items-center justify-center border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
                    hover:border-[#F97316] hover:text-[#F97316] transition-all duration-300"
                  >
                    Bel voor advies
                  </Link>
                </div>
              </div>
            </FadeIn>

            <FadeIn direction="right" delay={0.2}>
              <div className="hidden lg:flex justify-center lg:justify-end">
                <PremiumImage
                  src="/images/dienst-detachering.png"
                  alt="Gedetacheerde horecakracht in Utrecht tijdens een dienst"
                  width={480}
                  height={480}
                />
              </div>
            </FadeIn>
          </div>
        </Section.Container>
      </Section>

      {/* INTRO DETACHERING */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center mb-12">
              <div className="bg-white rounded-2xl p-8 md:p-10 border border-neutral-100 shadow-sm">
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                  Detachering in Utrecht
                </h2>
                <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                  Detachering geeft u structurele personele bezetting zonder werkgeversrisico&apos;s.
                  De medewerker werkt bij u op locatie en blijft bij ons in dienst.
                </p>
              </div>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>

      {/* WAAROM DETACHERING */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center mb-10 md:mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                Waarom detachering
              </h2>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              "U houdt continuiteit in het rooster en kunt bouwen op vaste medewerkers.",
              "Wij regelen administratie, verloning en begeleiding tijdens de inzet.",
            ].map((item, i) => (
              <FadeIn key={item} delay={0.1 * i}>
                <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm text-neutral-600 leading-relaxed">
                  {item}
                </div>
              </FadeIn>
            ))}
          </div>
        </Section.Container>
      </Section>

      {/* BESCHIKBARE FUNCTIES */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center mb-12">
              <div className="bg-white rounded-2xl p-8 md:p-10 border border-neutral-100 shadow-sm">
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                  Beschikbare functies
                </h2>
              </div>
            </div>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              "Keuken",
              "Bediening",
              "Bar",
              "Events",
              "Afgestemd op uw locatie",
              "Servicelevel",
            ].map((item, i) => (
              <FadeIn key={item} delay={0.1 * i}>
                <div className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm text-center text-neutral-700 font-medium">
                  {item}
                </div>
              </FadeIn>
            ))}
          </div>
        </Section.Container>
      </Section>

      {/* WAAROM TOPTALENT UTRECHT */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                Waarom TopTalent in Utrecht
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Wij kennen de lokale horeca en leveren medewerkers die passen bij uw planning.
                Meer weten? Bekijk{" "}
                <Link href="/diensten/detachering">onze detacheringsdienst</Link>.
              </p>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>

      {/* CTA */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <FadeIn>
            <div className="mt-6 bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden shadow-xl shadow-orange-500/20">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-60 h-60 border border-white/20 rounded-full translate-x-1/3 translate-y-1/3"></div>
              </div>

              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Direct personeel nodig in Utrecht?
                </h2>
                <p className="text-white/90 text-lg leading-relaxed mb-10">
                  Geef uw planning door en wij regelen de inzet in Utrecht.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/personeel-aanvragen"
                    className="bg-white text-[#F97316] px-8 py-4 rounded-xl text-base font-semibold
                    hover:bg-neutral-100 transition-all duration-300"
                  >
                    Personeel aanvragen
                  </Link>
                  <Link
                    href="/contact"
                    className="border-2 border-white/30 text-white px-8 py-4 rounded-xl text-base font-semibold
                    hover:bg-white/10 transition-all duration-300"
                  >
                    Contact
                  </Link>
                </div>
              </div>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>
    </>
  );
}
