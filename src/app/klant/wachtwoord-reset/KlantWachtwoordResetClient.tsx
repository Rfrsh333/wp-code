"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function KlantWachtwoordResetClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [bedrijfsnaam, setBedrijfsnaam] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestigWachtwoord, setBevestigWachtwoord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError("Resetlink ontbreekt of is ongeldig.");
        return;
      }
      try {
        const response = await fetch(`/api/klant/wachtwoord-reset?token=${encodeURIComponent(token)}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(data.error || "Resetlink is ongeldig of verlopen.");
          return;
        }
        setBedrijfsnaam(data.klant?.bedrijfsnaam || "");
        setIsReady(true);
      } catch {
        setError("Geen verbinding. Probeer het opnieuw.");
      }
    };

    void validateToken();
  }, [token]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (wachtwoord.length < 8) {
      setError("Wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }
    if (wachtwoord !== bevestigWachtwoord) {
      setError("Wachtwoorden komen niet overeen.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/klant/wachtwoord-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, wachtwoord }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Wachtwoord resetten mislukt.");
        return;
      }
      router.push("/klant/login?reset=1");
    } catch {
      setError("Geen verbinding. Probeer het opnieuw.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl shadow-neutral-900/5 p-8 w-full max-w-md border border-neutral-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Nieuw wachtwoord</h1>
          <p className="text-neutral-500 mt-2">
            {bedrijfsnaam ? `Voor ${bedrijfsnaam}` : "Stel direct een nieuw wachtwoord in"}
          </p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-5">{error}</div>}

        {!isReady && !error ? <div className="text-center text-neutral-500">Resetlink controleren...</div> : null}

        {isReady ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="klant-nieuw-wachtwoord" className="block text-sm font-medium text-neutral-700 mb-2">Nieuw wachtwoord</label>
              <input
                id="klant-nieuw-wachtwoord"
                type="password"
                autoComplete="new-password"
                value={wachtwoord}
                onChange={(e) => setWachtwoord(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                required
              />
            </div>
            <div>
              <label htmlFor="klant-bevestig-wachtwoord" className="block text-sm font-medium text-neutral-700 mb-2">Bevestig wachtwoord</label>
              <input
                id="klant-bevestig-wachtwoord"
                type="password"
                autoComplete="new-password"
                value={bevestigWachtwoord}
                onChange={(e) => setBevestigWachtwoord(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#F27501] text-white py-3 rounded-xl font-semibold hover:bg-[#d96800] transition-colors disabled:opacity-50"
            >
              {isLoading ? "Opslaan..." : "Nieuw wachtwoord opslaan"}
            </button>
          </form>
        ) : null}

        <div className="mt-6 text-center">
          <Link href={error ? "/klant/wachtwoord-vergeten" : "/klant/login"} className="text-sm text-neutral-500 hover:text-[#F27501]">
            {error ? "Nieuwe resetlink aanvragen" : "← Terug naar inloggen"}
          </Link>
        </div>
      </div>
    </div>
  );
}
