"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminPasswordResetPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Supabase detects the recovery tokens from the URL hash automatically
    // and fires the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsValidSession(true);
        }
      }
    );

    // Also check if there's already a session (in case the event already fired)
    const checkSession = async () => {
      // Give Supabase a moment to process the hash tokens
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
      } else if (isValidSession === null) {
        setIsValidSession(false);
      }
    };

    void checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Wachtwoord moet minimaal 8 tekens bevatten.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen.");
      return;
    }

    setIsLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message || "Wachtwoord bijwerken mislukt. Probeer het opnieuw.");
      setIsLoading(false);
      return;
    }

    // Sign out so the user logs in fresh with the new password
    await supabase.auth.signOut();
    setIsSuccess(true);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#F27501] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">TT</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-neutral-900/5 p-8 border border-neutral-100">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-neutral-900">Nieuw admin wachtwoord</h2>
            <p className="text-neutral-500 mt-2">
              Stel direct een nieuw wachtwoord in voor uw adminaccount
            </p>
          </div>

          {isSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Wachtwoord gewijzigd!</h3>
              <p className="text-neutral-500 mb-6">
                Uw wachtwoord is succesvol bijgewerkt. U kunt nu inloggen met uw nieuwe wachtwoord.
              </p>
              <button
                onClick={() => router.push("/admin/login")}
                className="w-full bg-[#F27501] text-white py-3 rounded-xl font-semibold hover:bg-[#d96800] transition-colors"
              >
                Naar inlogpagina
              </button>
            </div>
          ) : isValidSession === false ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Ongeldige of verlopen link</h3>
              <p className="text-neutral-500 mb-6">
                Deze resetlink is ongeldig of verlopen. Vraag een nieuwe resetlink aan via de inlogpagina.
              </p>
              <button
                onClick={() => router.push("/admin/login")}
                className="w-full bg-[#F27501] text-white py-3 rounded-xl font-semibold hover:bg-[#d96800] transition-colors"
              >
                Naar inlogpagina
              </button>
            </div>
          ) : isValidSession === null ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Nieuw wachtwoord
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="Minimaal 8 tekens"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Bevestig wachtwoord
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
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
                {isLoading ? "Wachtwoord wijzigen..." : "Wachtwoord wijzigen"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/admin/login" className="text-sm text-neutral-500 hover:text-[#F27501] transition-colors">
              &larr; Terug naar inlogpagina
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
