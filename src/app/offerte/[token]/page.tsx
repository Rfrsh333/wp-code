"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Tarief {
  functie: string;
  uurtarief: number;
  weekend_tarief: number;
  feestdag_tarief: number;
  aantal: number;
}

interface OfferteData {
  offerte_nummer: string;
  bedrijfsnaam: string;
  contactpersoon: string;
  locatie: string;
  geldig_tot: string;
  is_verlopen: boolean;
  status: string;
  ai_introductie: string;
  tarieven: Tarief[];
  korting_percentage: number;
  totaal_bedrag: number;
  accepted_at: string | null;
  accepted_naam: string | null;
  created_at: string;
}

export default function OffertePublicPage() {
  const { token } = useParams<{ token: string }>();
  const [offerte, setOfferte] = useState<OfferteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acceptNaam, setAcceptNaam] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/offerte/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setOfferte(data);
      })
      .catch(() => setError("Kon offerte niet laden"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!acceptNaam.trim() || acceptNaam.trim().length < 2) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/offerte/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam: acceptNaam }),
      });
      const data = await res.json();
      if (data.success) {
        setAccepted(true);
      } else {
        setError(data.error || "Fout bij accepteren");
      }
    } catch {
      setError("Fout bij accepteren");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !offerte) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Offerte niet gevonden</h1>
          <p className="text-neutral-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!offerte) return null;

  const isAccepted = accepted || !!offerte.accepted_at;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1B2E4A] to-[#2A4365] text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">TopTalent Jobs</h1>
              <p className="text-white/70 text-sm">Offerte {offerte.offerte_nummer}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-white/50">Bedrijf</p>
              <p className="font-medium">{offerte.bedrijfsnaam}</p>
            </div>
            <div>
              <p className="text-white/50">Contactpersoon</p>
              <p className="font-medium">{offerte.contactpersoon}</p>
            </div>
            <div>
              <p className="text-white/50">Locatie</p>
              <p className="font-medium">{offerte.locatie || "—"}</p>
            </div>
            <div>
              <p className="text-white/50">Geldig tot</p>
              <p className="font-medium">
                {offerte.geldig_tot ? new Date(offerte.geldig_tot).toLocaleDateString("nl-NL") : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Status banner */}
        {offerte.is_verlopen && !isAccepted && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-amber-800 font-medium">Deze offerte is verlopen. Neem contact met ons op voor een nieuwe offerte.</p>
          </div>
        )}

        {isAccepted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-800 font-medium">
              Deze offerte is geaccepteerd{offerte.accepted_naam ? ` door ${offerte.accepted_naam}` : ""}.
              Wij nemen spoedig contact met u op.
            </p>
          </div>
        )}

        {/* Introductie */}
        {offerte.ai_introductie && (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
            <p className="text-neutral-700 whitespace-pre-line leading-relaxed">{offerte.ai_introductie}</p>
          </div>
        )}

        {/* Tarieven tabel */}
        {offerte.tarieven && offerte.tarieven.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100">
              <h2 className="text-lg font-bold text-neutral-900">Tarieven</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-neutral-50 text-left text-sm text-neutral-500">
                    <th className="px-6 py-3 font-medium">Functie</th>
                    <th className="px-6 py-3 font-medium text-right">Uurtarief</th>
                    <th className="px-6 py-3 font-medium text-right">Weekend</th>
                    <th className="px-6 py-3 font-medium text-right">Feestdag</th>
                    <th className="px-6 py-3 font-medium text-right">Aantal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {offerte.tarieven.map((t: Tarief, i: number) => (
                    <tr key={i} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 font-medium text-neutral-900 capitalize">{t.functie}</td>
                      <td className="px-6 py-4 text-right text-neutral-700">&euro;{t.uurtarief.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-neutral-700">&euro;{t.weekend_tarief.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-neutral-700">&euro;{t.feestdag_tarief.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-neutral-700">{t.aantal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totaal */}
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200">
              <div className="flex justify-between items-center">
                <div>
                  {offerte.korting_percentage > 0 && (
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {offerte.korting_percentage}% volume korting
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-neutral-500">Geschat totaal per week</p>
                  <p className="text-2xl font-bold text-neutral-900">
                    &euro;{offerte.totaal_bedrag?.toFixed(2) || "0.00"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Voorwaarden */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Wat is inbegrepen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "Alle werkgeverslasten",
              "Werving & selectie",
              "Vervanging bij uitval",
              "Urenregistratie & facturatie",
              "Persoonlijk aanspreekpunt",
              "Binnen 24 uur geregeld",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-neutral-700">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Digitale ondertekening */}
        {!isAccepted && !offerte.is_verlopen && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-[#F27501]/20 p-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-2">Offerte accepteren</h2>
            <p className="text-sm text-neutral-500 mb-4">
              Vul uw naam in om deze offerte digitaal te ondertekenen. U gaat hiermee akkoord met de voorwaarden.
            </p>
            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Uw volledige naam"
                value={acceptNaam}
                onChange={e => setAcceptNaam(e.target.value)}
                className="flex-1 px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/30 focus:border-[#F27501]"
              />
              <button
                onClick={handleAccept}
                disabled={accepting || acceptNaam.trim().length < 2}
                className="px-6 py-3 bg-[#F27501] text-white font-semibold rounded-xl hover:bg-[#D96800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {accepting ? "Bezig..." : "Accepteer offerte"}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-neutral-400 pb-8">
          <p>TopTalent Jobs &mdash; Uw partner in horeca personeel</p>
          <p>Vragen? Bel 030-xxx xxxx of mail naar info@toptalentjobs.nl</p>
        </div>
      </div>
    </div>
  );
}
