"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ongeldige inloggegevens");
        setIsLoading(false);
        return;
      }

      if (data.session) {
        await supabase.auth.setSession(data.session);
      }

      toast.success("Welkom terug!");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);
      setError("Er is een fout opgetreden. Probeer het opnieuw.");
      setIsLoading(false);
    }
  };

  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      toast.info("Vul eerst uw e-mailadres in.");
      return;
    }
    setResetLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://www.toptalentjobs.nl/admin/wachtwoord-reset/",
    });
    setResetLoading(false);
    if (resetError) {
      toast.error("Kon geen reset e-mail versturen. Probeer het later opnieuw.");
      return;
    }
    setResetSent(true);
    toast.success("Reset e-mail verstuurd! Controleer uw inbox.");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-900 relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 border border-[#F27501]/30 rounded-full" />
          <div className="absolute bottom-20 right-10 w-96 h-96 border border-[#F27501]/20 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-[#F27501]/10 rounded-full" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 bg-[#F27501] rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Image src="/favicon-icon.png" alt="TopTalent" width={36} height={36} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Admin Dashboard</h1>
          <p className="text-neutral-400 text-lg leading-relaxed">
            Beheer kandidaten, diensten en klanten vanuit een centraal overzicht. Volledige controle over het TopTalent platform.
          </p>
          <div className="mt-10 flex items-center justify-center gap-8 text-neutral-500">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">100+</p>
              <p className="text-sm">Kandidaten</p>
            </div>
            <div className="w-px h-10 bg-neutral-700" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">25+</p>
              <p className="text-sm">Klanten</p>
            </div>
            <div className="w-px h-10 bg-neutral-700" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">24u</p>
              <p className="text-sm">Gemiddeld</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-neutral-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-[#F27501] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Image src="/favicon-icon.png" alt="TopTalent" width={28} height={28} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-neutral-900/5 p-8 border border-neutral-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-neutral-900">Welkom terug</h2>
              <p className="text-neutral-500 mt-2">Log in op het admin dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {resetSent && (
                <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">
                  Er is een reset e-mail verstuurd naar <strong>{email}</strong>. Controleer uw inbox (en spam).
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  E-mailadres
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="admin@toptalentjobs.nl"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-neutral-700">
                    Wachtwoord
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleForgotPassword()}
                    disabled={resetLoading}
                    className="text-sm text-[#F27501] hover:text-[#d96800] font-medium transition-colors disabled:opacity-50"
                  >
                    {resetLoading ? "Versturen..." : "Wachtwoord vergeten?"}
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#F27501] text-white py-3 rounded-xl font-semibold hover:bg-[#d96800] transition-colors disabled:opacity-50"
              >
                {isLoading ? "Inloggen..." : "Inloggen"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-neutral-500 hover:text-[#F27501] transition-colors">
                &larr; Terug naar website
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
