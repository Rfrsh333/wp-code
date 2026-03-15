"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function AdminWachtwoordResetClient() {
  const router = useRouter();
  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestigWachtwoord, setBevestigWachtwoord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");
  const tokensRef = useRef<{ access_token: string; refresh_token: string } | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    // Prevent double execution in development strict mode
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    // Use setTimeout to avoid setState in render cycle
    setTimeout(() => {
      // Read hash fragment immediately
      const hash = window.location.hash.replace(/^#/, "");

      if (!hash) {
        setError("Geen recovery tokens gevonden in de URL.");
        return;
      }

      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const tokenType = params.get("type");

      if (!accessToken || !refreshToken || tokenType !== "recovery") {
        setError("Deze resetlink is ongeldig.");
        return;
      }

      // Store tokens for later use and clean URL
      tokensRef.current = { access_token: accessToken, refresh_token: refreshToken };
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsReady(true);
    }, 0);
  }, []);

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

    if (!tokensRef.current) {
      setError("Recovery tokens niet meer beschikbaar. Vraag een nieuwe link aan.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/wachtwoord-reset/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: tokensRef.current.access_token,
          refresh_token: tokensRef.current.refresh_token,
          password: wachtwoord,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Wachtwoord wijzigen mislukt.");
        setIsLoading(false);
        return;
      }

      router.push("/admin/login?reset=1");
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#F27501] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Image src="/favicon-icon.png" alt="TopTalent" width={28} height={28} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Nieuw admin wachtwoord</h1>
          <p className="text-neutral-500 mt-2">Stel direct een nieuw wachtwoord in voor uw adminaccount</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-5">{error}</div>
        )}

        {!isReady && !error ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div>
            <p className="text-neutral-500 text-sm">Resetlink verwerken...</p>
          </div>
        ) : null}

        {isReady ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Nieuw wachtwoord</label>
              <input
                type="password"
                value={wachtwoord}
                onChange={(e) => setWachtwoord(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                placeholder="Minimaal 8 tekens"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Bevestig wachtwoord</label>
              <input
                type="password"
                value={bevestigWachtwoord}
                onChange={(e) => setBevestigWachtwoord(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                placeholder="Herhaal uw wachtwoord"
                required
                minLength={8}
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
          <button
            onClick={() => router.push("/admin/login")}
            className="text-sm text-neutral-500 hover:text-[#F27501] transition-colors"
          >
            &larr; Terug naar inlogpagina
          </button>
        </div>
      </div>
    </div>
  );
}
