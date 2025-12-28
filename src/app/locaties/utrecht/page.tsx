import Link from "next/link";

export default function UtrechtPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6">
          Horeca Personeel Utrecht
        </h1>

        <p className="text-xl text-neutral-600 mb-8">
          TopTalent Jobs is uw betrouwbare partner voor horeca personeel in Utrecht en omgeving.
          Met jarenlange ervaring in de Utrechtse horeca kennen wij de markt en leveren wij snel gekwalificeerd personeel.
        </p>

        <div className="bg-gradient-to-br from-neutral-50 to-white rounded-2xl p-8 mb-12 border border-neutral-200">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">Waarom kiezen voor TopTalent in Utrecht?</h2>
          <ul className="space-y-3 text-neutral-700">
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 text-[#F97316] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Lokale expertise: wij kennen de Utrechtse horeca</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 text-[#F97316] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Binnen 24 uur personeel beschikbaar</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 text-[#F97316] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Ervaren medewerkers die Utrecht kennen</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 text-[#F97316] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Flexibel inzetbaar voor evenementen, festivals en reguliere diensten</span>
            </li>
          </ul>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <h3 className="text-xl font-bold text-neutral-900 mb-3">Onze diensten in Utrecht</h3>
            <ul className="space-y-2 text-neutral-700">
              <li>
                •{" "}
                <Link href="/locaties/utrecht/uitzenden" className="hover:underline">
                  Uitzenden voor tijdelijke inzet
                </Link>
              </li>
              <li>
                •{" "}
                <Link href="/locaties/utrecht/detachering" className="hover:underline">
                  Detachering voor langere periode
                </Link>
              </li>
              <li>• Recruitment voor vaste medewerkers</li>
              <li>• Evenementenpersoneel</li>
            </ul>
            <Link href="/diensten" className="inline-block mt-4 text-[#F97316] font-semibold hover:underline">
              Bekijk alle diensten →
            </Link>
          </div>

          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <h3 className="text-xl font-bold text-neutral-900 mb-3">Beschikbare functies</h3>
            <ul className="space-y-2 text-neutral-700">
              <li>• Barista's & bartenders</li>
              <li>• Bediening & horecamedewerkers</li>
              <li>• Koks & keukenpersoneel</li>
              <li>• Gastheren & gastvrouwen</li>
            </ul>
            <Link href="/inschrijven" className="inline-block mt-4 text-[#F97316] font-semibold hover:underline">
              Schrijf je in als kandidaat →
            </Link>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Personeel nodig in Utrecht?</h2>
          <p className="mb-6 text-white/90">
            Neem contact op en ontvang binnen 24 uur gekwalificeerd personeel voor uw zaak.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/personeel-aanvragen"
              className="bg-white text-[#F97316] px-8 py-3 rounded-xl font-semibold hover:bg-neutral-100 transition-colors"
            >
              Personeel aanvragen
            </Link>
            <Link
              href="/contact"
              className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors"
            >
              Contact opnemen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
