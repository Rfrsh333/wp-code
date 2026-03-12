"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminWachtwoordResetClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestigWachtwoord, setBevestigWachtwoord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const initializeRecovery = async () => {
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashType = hashParams.get("type");

      if (accessToken && refreshToken && hashType === "recovery") {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          setError("Deze resetlink is ongeldig of verlopen.");
          return;
        }

        if (typeof window !== "undefined" && window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else 
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError("Deze resetlink is ongeldig of verlopen.");
          return;
        }
      } else if (tokenHash && type === "recovery") {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });

        if (verifyError) {
          setError("Deze resetlink is ongeldig of verlopen.");
          return;
        }
      }

      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setIsReady(true);
        return;
      }

      setTimeout(async () => {
        const { data: delayed } = await supabase.auth.getSession();
        if (delayed.session) {
          setIsReady(true);
        } else {
          setError("Deze resetlink is ongeldig of verlopen.");
        }
      }, 400);
    };

    void initializeRecovery();
  }, [searchParams]);

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
          <h1 className="text-2xl font-bold text-neutral-900">Nieuw admin wachtwoord</h1>
          <p className="text-neutral-500 mt-2">Stel direct een nieuw wachtwoord in voor uw adminaccount</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-5">{error}</div>}

        {!isReady && !error ? (
          <div className="text-center text-neutral-500">Resetlink controleren...</div>
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
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Bevestig wachtwoord</label>
              <input
                type="password"
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
      </div>
    </div>
  );
}
