"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export default function AdminWachtwoordResetClient() {
  const router = useRouter();
  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestigWachtwoord, setBevestigWachtwoord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      // 1. Read hash BEFORE anything else can clear it
      const rawHash = window.location.hash;
      const hash = rawHash.replace(/^#/, "");

      console.log("[RESET] Raw hash length:", rawHash.length);
      console.log("[RESET] Hash starts with:", rawHash.substring(0, 50));

      if (!hash) {
        setError("Geen recovery tokens gevonden in de URL.");
        setDebugInfo("Hash was leeg. Mogelijk is de link al eerder gebruikt.");
        return;
      }

      // 2. Parse hash params
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const tokenType = params.get("type");

      console.log("[RESET] Parsed - type:", tokenType, "access:", !!accessToken, "refresh:", !!refreshToken);

      if (!accessToken || !refreshToken) {
        setError("Recovery tokens ontbreken in de URL.");
        setDebugInfo(`type=${tokenType}, access=${!!accessToken}, refresh=${!!refreshToken}`);
        return;
      }

      if (tokenType !== "recovery") {
        setError("Dit is geen recovery link.");
        setDebugInfo(`type=${tokenType} (verwacht: recovery)`);
        return;
      }

      // 3. Clean hash from URL immediately to prevent double-processing
      window.history.replaceState({}, document.title, window.location.pathname);

      // 4. Create Supabase client with NO auto-detection
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            detectSessionInUrl: false,
            persistSession: true,
            flowType: "implicit",
          },
        }
      );
      clientRef.current = sb;

      // 5. Set session manually with the parsed tokens
      console.log("[RESET] Calling setSession...");
      const { data, error: sessionError } = await sb.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        console.error("[RESET] setSession error:", sessionError);
        setError(`Kon sessie niet instellen: ${sessionError.message}`);
        setDebugInfo(`Error code: ${sessionError.status || "unknown"}`);
        return;
      }

      if (!data.session) {
        setError("Sessie kon niet worden aangemaakt.");
        setDebugInfo("setSession gaf geen error maar ook geen sessie terug.");
        return;
      }

      console.log("[RESET] Session set successfully, user:", data.session.user.email);
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

    const sb = clientRef.current as SupabaseClient;
    if (!sb) return;

    setIsLoading(true);
    const { error: updateError } = await sb.auth.updateUser({ password: wachtwoord });
    setIsLoading(false);

    if (updateError) {
      setError(updateError.message || "Wachtwoord wijzigen mislukt.");
      return;
    }

    await sb.auth.signOut();
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
          <div className="mb-5">
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
            {debugInfo && (
              <p className="text-xs text-neutral-400 mt-2 text-center font-mono">{debugInfo}</p>
            )}
          </div>
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
