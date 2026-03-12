"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Direct Supabase client for recovery — NOT through the Proxy (which can
// interfere with the auto-detection of hash-fragment tokens).
function getRecoveryClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { detectSessionInUrl: true, flowType: "implicit" } }
  );
}

export default function AdminWachtwoordResetClient() {
  const router = useRouter();
  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestigWachtwoord, setBevestigWachtwoord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef = useRef<any>(null);

  useEffect(() => {
    // Create a fresh Supabase client that will auto-detect the hash tokens
    const sb = getRecoveryClient();
    clientRef.current = sb;

    const { data: { subscription } } = sb.auth.onAuthStateChange(
      (event, session) => {
        console.log("[WACHTWOORD RESET] Auth event:", event, "Session:", !!session);
        if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
          setIsReady(true);
          setError("");
        }
      }
    );

    // Fallback: manually parse hash and set session after a delay
    const fallbackTimer = setTimeout(async () => {
      if (isReady) return;

      // Check if session was already established
      const { data } = await sb.auth.getSession();
      console.log("[WACHTWOORD RESET] Fallback session check:", !!data.session);
      if (data.session) {
        setIsReady(true);
        return;
      }

      // Manual fallback: parse hash ourselves
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) {
        console.log("[WACHTWOORD RESET] No hash fragment found");
        setError("Geen resetlink gevonden. Ga naar de inlogpagina en vraag een nieuwe aan.");
        return;
      }

      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashType = hashParams.get("type");

      console.log("[WACHTWOORD RESET] Manual parse - type:", hashType, "hasAccess:", !!accessToken, "hasRefresh:", !!refreshToken);

      if (accessToken && refreshToken && hashType === "recovery") {
        const { error: sessionError } = await sb.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error("[WACHTWOORD RESET] Manual setSession failed:", sessionError.message);
          setError(`Resetlink kon niet worden geverifieerd: ${sessionError.message}`);
          return;
        }

        setIsReady(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setError("Deze resetlink is ongeldig of verlopen.");
      }
    }, 2000);

    // Final safety net
    const finalTimer = setTimeout(() => {
      if (!isReady && !error) {
        setError("Er ging iets mis bij het laden van de resetpagina. Vraag een nieuwe link aan.");
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
      clearTimeout(finalTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    const sb = clientRef.current;
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

        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-5">{error}</div>}

        {!isReady && !error ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div>
            <p className="text-neutral-500 text-sm">Resetlink controleren...</p>
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
