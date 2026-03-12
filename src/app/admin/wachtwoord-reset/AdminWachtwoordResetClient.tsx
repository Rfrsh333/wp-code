"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminWachtwoordResetClient() {
  const router = useRouter();
  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestigWachtwoord, setBevestigWachtwoord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      // 1. Read hash BEFORE anything else can clear it
      const rawHash = window.location.hash;
      const hash = rawHash.replace(/^#/, "");

      if (!hash) {
        setError("Geen recovery tokens gevonden in de URL.");
        return;
      }

      // 2. Parse hash params
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const tokenType = params.get("type");

      if (!accessToken || !refreshToken || tokenType !== "recovery") {
        setError("Deze resetlink is ongeldig of verlopen.");
        return;
      }

      // 3. Clean hash from URL to prevent double-processing
      window.history.replaceState({}, document.title, window.location.pathname);

      // 4. Set session with the parsed tokens
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        console.error("[RESET] setSession error:", sessionError);
        setError(`Kon sessie niet instellen: ${sessionError.message}`);
        return;
      }

      if (!data.session) {
        setError("Sessie kon niet worden aangemaakt.");
        return;
      }

      setIsReady(true);
    };

    void init();
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

    setIsLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: wachtwoord });
    setIsLoading(false);

    if (updateError) {
      setError(updateError.message || "Wachtwoord wijzigen mislukt.");
      return;
    }

    await supabase.auth.signOut();
    router.push("/admin/login?reset=1");
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#F27501] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">TT</span>
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
            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">
              Link geverifieerd! Stel hieronder uw nieuwe wachtwoord in.
            </div>
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
