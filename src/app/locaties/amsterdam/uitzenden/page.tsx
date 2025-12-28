"use client";

import Link from "next/link";
import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";
import PremiumImage from "@/components/PremiumImage";

export default function UitzendenAmsterdamPage() {
  return (
    <>
      {/* HERO */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <FadeIn direction="left">
              <div>
                <span className="inline-block text-[#F97316] font-medium text-sm tracking-wider uppercase mb-4">
                  Amsterdam
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 leading-[1.1]">
                  Horeca uitzenden Amsterdam
                </h1>
                <p className="text-xl text-neutral-600 mb-8 leading-relaxed max-w-xl">
                  Snel personeel nodig in het centrum, bij hotels of voor evenementen?
                  Wij leveren binnen 24 uur inzetbare horecakrachten in Amsterdam
                  met duidelijke afspraken en lokale beschikbaarheid.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/personeel-aanvragen"
                    className="inline-flex items-center justify-center bg-[#F97316] text-white px-8 py-4 rounded-xl font-semibold
                    shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                    hover:bg-[#EA580C] transition-all duration-300"
                  >
                    Personeel aanvragen
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center border-2 border-neutral-200 text-neutral-700 px-8 py-4 rounded-xl font-semibold
                    hover:border-[#F97316] hover:text-[#F97316] transition-all duration-300"
                  >
                    Contact
                  </Link>
                </div>
              </div>
            </FadeIn>

            <FadeIn direction="right" delay={0.2}>
              <div className="hidden lg:flex justify-center lg:justify-end">
                <PremiumImage
                  src="/images/dienst-uitzenden.png"
                  alt="Tijdelijk horecapersoneel in Amsterdam tijdens een drukke dienst"
                  width={480}
                  height={480}
                />
              </div>
            </FadeIn>
          </div>
        </Section.Container>
      </Section>

      {/* TIJDELIJK HORECAPERSONEEL */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                Tijdelijk horecapersoneel in Amsterdam
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Voor piekdrukte, evenementen of uitval leveren wij tijdelijk horecapersoneel
                in Amsterdam. De inzet is flexibel en afgestemd op uw planning.
              </p>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>

      {/* WAAROM HORECA UITZENDEN */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                Waarom horeca uitzenden
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                U houdt grip op de personele bezetting zonder werkgeversrisico&apos;s.
                Wij verzorgen selectie, inzet en administratie met één vast contactpunt.
              </p>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>

      {/* BESCHIKBARE FUNCTIES */}
      <Section variant="tinted" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                Beschikbare functies
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Van bediening en bar tot keuken en events. Wij leveren horecapersoneel
                dat past bij drukke horeca-omgevingen en internationale gasten.
              </p>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>

      {/* WAAROM TOPTALENT AMSTERDAM */}
      <Section variant="white" spacing="default">
        <Section.Container>
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                Waarom TopTalent in Amsterdam
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Wij kennen de stad, leveren snel inzetbare medewerkers en zijn gewend
                aan grote evenementen en hoge piekdrukte. Bekijk{" "}
                <Link href="/diensten/uitzenden">onze uitzenddienst</Link>.
              </p>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>

      {/* CTA */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <FadeIn>
            <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-60 h-60 border border-white/20 rounded-full translate-x-1/3 translate-y-1/3"></div>
              </div>

              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Direct personeel nodig in Amsterdam?
                </h2>
                <p className="text-white/90 text-lg leading-relaxed mb-10">
                  Geef uw planning door en wij regelen de inzet in Amsterdam.
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
