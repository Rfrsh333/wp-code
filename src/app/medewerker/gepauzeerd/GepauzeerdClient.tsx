"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { GEPAUZEERD_MELDING } from "@/lib/medewerker/account-status";

/**
 * B5: wat een gepauzeerde medewerker in het webportaal ziet. Alleen status, een openstaande
 * boete en betalen; de andere portaalpagina's geven 403 en sturen hierheen terug.
 * Bewust zonder de portaalnavigatie: die linkt naar schermen die voor hem niet werken.
 */

type StatusAntwoord = {
  gepauzeerd: boolean;
  status: string;
  openstaande_boete: { id: string; bedrag: number; reden: string | null } | null;
};

export default function GepauzeerdClient() {
  const [laden, setLaden] = useState(true);
  const [status, setStatus] = useState<StatusAntwoord | null>(null);
  const [fout, setFout] = useState("");
  const [betalen, setBetalen] = useState(false);

  useEffect(() => {
    const haalStatus = async () => {
      try {
        const res = await fetch("/api/medewerker/status");
        const data = await res.json().catch(() => null);
        if (res.ok && data) setStatus(data as StatusAntwoord);
        else if (res.status !== 401) setFout("Je status kon niet worden geladen. Probeer het later opnieuw.");
      } catch {
        setFout("Geen verbinding. Controleer je internet en laad de pagina opnieuw.");
      } finally {
        setLaden(false);
      }
    };
    void haalStatus();
  }, []);

  const betaalBoete = async () => {
    setBetalen(true);
    setFout("");
    try {
      const res = await fetch("/api/medewerker/betaal-boete", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        setFout(data.error || "Betaling starten mislukt. Neem contact op met TopTalent.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setFout("Betaling starten mislukt. Neem contact op met TopTalent.");
    } finally {
      setBetalen(false);
    }
  };

  const uitloggen = async () => {
    try {
      await fetch("/api/medewerker/logout", { method: "POST" });
    } finally {
      window.location.replace("/medewerker/login");
    }
  };

  const weerActief = status && !status.gepauzeerd && status.status === "actief";
  const boete = status?.openstaande_boete ?? null;

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8">
        {laden ? (
          <p className="text-center text-neutral-500">Status laden...</p>
        ) : weerActief ? (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-neutral-900">Je account is weer actief</h1>
            <p className="text-neutral-600">Je kunt weer diensten bekijken en je aanmelden.</p>
            <Link
              href="/medewerker/dashboard"
              className="inline-block w-full py-3 bg-[#F27501] text-white rounded-xl font-semibold hover:bg-[#d96800] transition-colors"
            >
              Naar je dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Account gepauzeerd</h1>
                <p className="text-neutral-600 mt-2">{GEPAUZEERD_MELDING}</p>
              </div>
            </div>

            {boete ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700">Openstaande boete</p>
                <p className="text-2xl font-bold text-red-700">€{boete.bedrag.toFixed(2)}</p>
                {boete.reden && <p className="text-sm text-red-700 mt-1">{boete.reden}</p>}
                <button
                  onClick={betaalBoete}
                  disabled={betalen}
                  className="mt-4 w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {betalen ? "Bezig..." : "Boete betalen"}
                </button>
                <p className="text-xs text-red-700/80 mt-2">
                  Na de betaling wordt de pauze automatisch opgeheven. Dat kan een paar minuten duren.
                </p>
              </div>
            ) : (
              <div className="bg-neutral-50 rounded-xl p-4 text-sm text-neutral-600">
                Er staat geen boete open die je hier kunt betalen. Neem contact op met TopTalent om je
                account weer actief te maken.
              </div>
            )}

            {fout && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{fout}</div>}

            <div className="text-sm text-neutral-600">
              Vragen? Mail{" "}
              <a href="mailto:info@toptalentjobs.nl" className="text-[#F27501] font-medium">
                info@toptalentjobs.nl
              </a>{" "}
              of bel{" "}
              <a href="tel:+31617889189" className="text-[#F27501] font-medium">
                +31 6 17889189
              </a>
              .
            </div>

            <button
              onClick={uitloggen}
              className="w-full py-3 border border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition-colors"
            >
              Uitloggen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
