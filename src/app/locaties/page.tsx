import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Locaties - Horeca Uitzendbureau | TopTalent Jobs",
  description: "Bekijk in welke regio's TopTalent Jobs actief is. Lokale horecapersoneel oplossingen in Utrecht en Amsterdam.",
  alternates: {
    canonical: "https://toptalentjobs.nl/locaties",
  },
};

export default function LocatiesPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6">
          Locaties
        </h1>

        <p className="text-xl text-neutral-600 mb-10">
          TopTalent Jobs levert horecapersoneel in meerdere regio's. Kies uw
          locatie voor lokale informatie en directe aanvraagmogelijkheden.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/locaties/utrecht"
            className="group rounded-2xl border border-neutral-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-[#F97316]/40 hover:shadow-lg"
          >
            <h2 className="text-2xl font-bold text-neutral-900 mb-2 group-hover:text-[#F97316] transition-colors">
              Utrecht
            </h2>
            <p className="text-neutral-600">
              Horeca personeel voor restaurants, hotels en evenementen in
              Utrecht en omgeving.
            </p>
          </Link>

          <Link
            href="/locaties/amsterdam"
            className="group rounded-2xl border border-neutral-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-[#F97316]/40 hover:shadow-lg"
          >
            <h2 className="text-2xl font-bold text-neutral-900 mb-2 group-hover:text-[#F97316] transition-colors">
              Amsterdam
            </h2>
            <p className="text-neutral-600">
              Betrouwbaar horecapersoneel voor Amsterdamse zaken en evenementen.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
