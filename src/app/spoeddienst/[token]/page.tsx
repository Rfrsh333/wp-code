"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface SpoeddienstData {
  klant_naam: string;
  locatie: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  functie: string;
  aantal_nodig: number;
  uurtarief: number | null;
  responses_count: number;
}

export default function SpoeddienstPage() {
  const params = useParams();
  const token = params.token as string;

  const [dienst, setDienst] = useState<SpoeddienstData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "submitted" | "closed" | "error">("loading");
  const [naam, setNaam] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function fetchDienst() {
      try {
        const res = await fetch(`/api/spoeddienst/${token}`);
        if (res.status === 410) {
          setStatus("closed");
          return;
        }
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const { data } = await res.json();
        setDienst(data);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }
    if (token) fetchDienst();
  }, [token]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let prefix = "";
    if (date.getTime() === today.getTime()) prefix = "Vandaag";
    else if (date.getTime() === tomorrow.getTime()) prefix = "Morgen";

    const formatted = date.toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    return prefix ? `${prefix} (${formatted})` : formatted;
  };

  const formatTime = (time: string) => time.substring(0, 5);

  const functieLabels: Record<string, string> = {
    bediening: "Bediening",
    bar: "Bar",
    keuken: "Keuken",
    afwas: "Afwas",
    gastheer: "Gastheer/vrouw",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/spoeddienst/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam: naam.trim(), telefoon: telefoon.trim() }),
      });

      if (res.status === 409) {
        setErrorMsg("Je hebt je al aangemeld voor deze spoeddienst.");
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        const { error } = await res.json();
        setErrorMsg(error || "Er ging iets mis, probeer het opnieuw.");
        setIsSubmitting(false);
        return;
      }

      setStatus("submitted");
    } catch {
      setErrorMsg("Geen internetverbinding. Probeer het opnieuw.");
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Dienst gesloten
  if (status === "closed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Dienst niet meer beschikbaar</h1>
          <p className="text-neutral-500">Deze spoeddienst is al ingevuld. Bedankt voor je interesse!</p>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error" || !dienst) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Link niet geldig</h1>
          <p className="text-neutral-500">Deze link is verlopen of niet geldig. Neem contact op met TopTalent.</p>
        </div>
      </div>
    );
  }

  // Bevestiging
  if (status === "submitted") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Top!</h1>
          <p className="text-lg text-neutral-600 mb-4">
            We hebben je reactie ontvangen en nemen zo snel mogelijk contact met je op.
          </p>
          <div className="bg-orange-50 rounded-xl p-4 text-sm text-neutral-600">
            <p className="font-medium text-[#F27501] mb-1">Dienst details</p>
            <p>{functieLabels[dienst.functie] || dienst.functie} bij {dienst.klant_naam}</p>
            <p>{formatDate(dienst.datum)} · {formatTime(dienst.start_tijd)} - {formatTime(dienst.eind_tijd)}</p>
          </div>
        </div>
      </div>
    );
  }

  // Hoofdformulier
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-bold mb-4 animate-pulse">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            SPOEDDIENST
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            TopTalent Jobs
          </h1>
        </div>

        {/* Dienst details card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-[#F27501] to-[#d96800] p-5 text-white">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-white/20 rounded-lg text-sm font-bold">
                {functieLabels[dienst.functie] || dienst.functie}
              </span>
              <span className="text-sm opacity-90">
                {dienst.aantal_nodig}x nodig
              </span>
            </div>
            <h2 className="text-xl font-bold">{dienst.klant_naam}</h2>
          </div>

          <div className="p-5 space-y-3">
            <div className="flex items-center gap-3 text-neutral-700">
              <svg className="w-5 h-5 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{dienst.locatie}</span>
            </div>

            <div className="flex items-center gap-3 text-neutral-700">
              <svg className="w-5 h-5 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">{formatDate(dienst.datum)}</span>
            </div>

            <div className="flex items-center gap-3 text-neutral-700">
              <svg className="w-5 h-5 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatTime(dienst.start_tijd)} - {formatTime(dienst.eind_tijd)}</span>
            </div>

            {dienst.uurtarief && (
              <div className="flex items-center gap-3 text-neutral-700">
                <svg className="w-5 h-5 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-bold text-[#F27501]">&euro;{dienst.uurtarief.toFixed(2)}/uur</span>
              </div>
            )}
          </div>
        </div>

        {/* Aanmeld formulier */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-neutral-900 mb-1">
            Ben je beschikbaar?
          </h3>
          <p className="text-sm text-neutral-500 mb-5">
            Vul je gegevens in en we nemen zo snel mogelijk contact op.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Je naam *
              </label>
              <input
                type="text"
                required
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                placeholder="Volledige naam"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Telefoonnummer *
              </label>
              <input
                type="tel"
                required
                value={telefoon}
                onChange={(e) => setTelefoon(e.target.value)}
                placeholder="06-12345678"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
              />
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-green-500 text-white font-bold text-lg rounded-xl hover:bg-green-600 active:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  Bezig...
                </span>
              ) : (
                "Ik ben beschikbaar!"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-neutral-400 mt-6">
          TopTalent Jobs &mdash; Horeca Uitzendbureau Utrecht
        </p>
      </div>
    </div>
  );
}
