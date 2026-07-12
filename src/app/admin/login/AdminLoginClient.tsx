"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import * as Sentry from "@sentry/nextjs";

export default function AdminLoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetDone = searchParams.get("reset") === "1";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          requires2FA
            ? { email, password, twoFactorCode: twoFactorCode.trim(), isBackupCode: useBackupCode }
            : { email, password },
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ongeldige inloggegevens");
        setIsLoading(false);
        return;
      }

      // Backend vraagt om een tweede factor: toon het 2FA-scherm en post opnieuw mét code.
      // (De backend geeft hier bewust een 200 met requires2FA:true en géén sessie terug.)
      if (data.requires2FA && !data.session) {
        setRequires2FA(true);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        const { error: sessionError } = await supabase.auth.setSession(data.session);
        if (sessionError) {
          console.error("setSession error:", sessionError);
          setError(`Sessie opslaan mislukt: ${sessionError.message}`);
          setIsLoading(false);
          return;
        }

        const { data: sessionData, error: getSessionError } = await supabase.auth.getSession();
        if (getSessionError || !sessionData.session) {
          console.error("getSession after login failed:", getSessionError);
          setError("Login gelukt, maar browser-sessie kon niet worden hersteld.");
          setIsLoading(false);
          return;
        }
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      Sentry.captureException(err);
      setError("Er is een fout opgetreden. Probeer het opnieuw.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#F27501] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Admin Login</h1>
          <p className="text-neutral-500 mt-2">TopTalent Dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {resetDone && (
            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">
              Uw wachtwoord is opnieuw ingesteld. U kunt nu inloggen.
            </div>
          )}
          {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>}

          {!requires2FA ? (
            <>
              <div>
                <label htmlFor="admin-email" className="block text-sm font-medium text-neutral-700 mb-2">E-mailadres</label>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-neutral-700 mb-2">Wachtwoord</label>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  placeholder="••••••••"
                  required
                />
                <div className="mt-2 text-right">
                  <Link href="/admin/wachtwoord-vergeten/" className="text-sm text-[#F27501] hover:text-[#d96800]">
                    Wachtwoord vergeten?
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="admin-2fa" className="block text-sm font-medium text-neutral-700 mb-2">
                {useBackupCode ? "Back-upcode" : "Verificatiecode (2FA)"}
              </label>
              <input
                id="admin-2fa"
                type="text"
                inputMode={useBackupCode ? "text" : "numeric"}
                autoComplete="one-time-code"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] tracking-widest"
                placeholder={useBackupCode ? "back-upcode" : "123456"}
                autoFocus
                required
              />
              <p className="mt-2 text-sm text-neutral-500">
                Voer de code uit je authenticator-app in.
              </p>
              <button
                type="button"
                onClick={() => { setUseBackupCode((v) => !v); setTwoFactorCode(""); setError(""); }}
                className="mt-2 text-sm text-[#F27501] hover:text-[#d96800]"
              >
                {useBackupCode ? "Gebruik authenticator-code" : "Gebruik een back-upcode"}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#F27501] text-white py-3 rounded-xl font-semibold hover:bg-[#d96800] transition-colors disabled:opacity-50"
          >
            {isLoading ? "Bezig..." : requires2FA ? "Verifiëren" : "Inloggen"}
          </button>

          {requires2FA && (
            <button
              type="button"
              onClick={() => { setRequires2FA(false); setTwoFactorCode(""); setUseBackupCode(false); setError(""); }}
              className="w-full text-sm text-neutral-500 hover:text-neutral-700"
            >
              ← Terug naar inloggen
            </button>
          )}
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-neutral-500 hover:text-[#F27501]">
            ← Terug naar website
          </Link>
        </div>
      </div>
    </div>
  );
}
