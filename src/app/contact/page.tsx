import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact - TopTalent Jobs",
  description: "Neem contact op met TopTalent Jobs. Wij helpen u graag met al uw vragen over personeel voor horeca en evenementen.",
};

export default function ContactPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 to-orange-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Neem <span className="text-[#F27501]">Contact</span> Op
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Heeft u vragen of wilt u meer weten over onze diensten? Wij staan voor u klaar.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Stuur ons een bericht</h2>
              <form className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="naam" className="block text-sm font-medium text-gray-700 mb-2">
                      Naam *
                    </label>
                    <input
                      type="text"
                      id="naam"
                      name="naam"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F27501] focus:border-transparent outline-none transition-all"
                      placeholder="Uw naam"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F27501] focus:border-transparent outline-none transition-all"
                      placeholder="uw@email.nl"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="telefoon" className="block text-sm font-medium text-gray-700 mb-2">
                    Telefoonnummer
                  </label>
                  <input
                    type="tel"
                    id="telefoon"
                    name="telefoon"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F27501] focus:border-transparent outline-none transition-all"
                    placeholder="+31 6 12345678"
                  />
                </div>

                <div>
                  <label htmlFor="onderwerp" className="block text-sm font-medium text-gray-700 mb-2">
                    Onderwerp *
                  </label>
                  <select
                    id="onderwerp"
                    name="onderwerp"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F27501] focus:border-transparent outline-none transition-all"
                  >
                    <option value="">Selecteer een onderwerp</option>
                    <option value="werkgever">Ik zoek personeel (werkgever)</option>
                    <option value="werknemer">Ik zoek werk (werknemer)</option>
                    <option value="uitzenden">Vraag over uitzenden</option>
                    <option value="detachering">Vraag over detachering</option>
                    <option value="recruitment">Vraag over recruitment</option>
                    <option value="anders">Anders</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="bericht" className="block text-sm font-medium text-gray-700 mb-2">
                    Bericht *
                  </label>
                  <textarea
                    id="bericht"
                    name="bericht"
                    rows={5}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F27501] focus:border-transparent outline-none transition-all resize-none"
                    placeholder="Uw bericht..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#F27501] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#d96800] transition-colors"
                >
                  Verstuur Bericht
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <div className="bg-gray-50 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Contactgegevens</h2>

                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-[#F27501] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Adres</h3>
                      <p className="text-gray-600">Utrecht, Nederland</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-[#F27501] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Telefoon</h3>
                      <a href="tel:+31649200412" className="text-[#F27501] hover:underline">
                        +31 6 49 20 04 12
                      </a>
                      <p className="text-gray-500 text-sm">24/7 bereikbaar</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-[#F27501] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">E-mail</h3>
                      <a href="mailto:info@toptalentjobs.nl" className="text-[#F27501] hover:underline">
                        info@toptalentjobs.nl
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">WhatsApp</h3>
                      <a
                        href="https://wa.me/31649200412"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#25D366] hover:underline"
                      >
                        Stuur een WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Quick Links */}
              <div className="bg-[#F27501] rounded-2xl p-8 text-white">
                <h2 className="text-2xl font-bold mb-4">Veelgestelde vragen</h2>
                <ul className="space-y-3">
                  <li>
                    <span className="font-medium">Hoe snel kan ik personeel krijgen?</span>
                    <p className="text-orange-100 text-sm">Vaak binnen 24-48 uur geregeld.</p>
                  </li>
                  <li>
                    <span className="font-medium">Wat zijn de kosten?</span>
                    <p className="text-orange-100 text-sm">Neem contact op voor een offerte op maat.</p>
                  </li>
                  <li>
                    <span className="font-medium">Voor welke sectoren werken jullie?</span>
                    <p className="text-orange-100 text-sm">Horeca, evenementen en catering.</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
