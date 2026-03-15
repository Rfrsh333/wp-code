"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/ui/Toast";

export default function MedewerkerLogin() {
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const res = await fetch("/api/medewerker/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, wachtwoord }),
    });

    const data = await res.json();
    setIsLoading(false);

    if (data.success) {
      toast.success("Welkom terug!");
      router.push("/medewerker/dashboard");
    } else {
      setError(data.error || "Er ging iets mis");
    }
  };

  const handleForgotPassword = () => {
    router.push("/medewerker/wachtwoord-vergeten");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-900 relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-32 left-20 w-60 h-60 border border-[#F27501]/30 rounded-full" />
          <div className="absolute bottom-32 right-20 w-80 h-80 border border-[#F27501]/20 rounded-full" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 bg-[#F27501] rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Image src="/favicon-icon.png" alt="TopTalent" width={36} height={36} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Medewerker Portal</h1>
          <p className="text-neutral-400 text-lg leading-relaxed">
            Bekijk beschikbare diensten, registreer je uren en beheer je beschikbaarheid. Alles op een plek.
          </p>
          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-4 bg-white/5 rounded-xl px-5 py-3 text-left">
              <div className="w-10 h-10 bg-[#F27501]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium text-sm">Diensten bekijken</p>
                <p className="text-neutral-500 text-xs">Reageer op beschikbare diensten</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 rounded-xl px-5 py-3 text-left">
              <div className="w-10 h-10 bg-[#F27501]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium text-sm">Uren registreren</p>
                <p className="text-neutral-500 text-xs">Direct na je dienst invullen</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 rounded-xl px-5 py-3 text-left">
              <div className="w-10 h-10 bg-[#F27501]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium text-sm">Profiel beheren</p>
                <p className="text-neutral-500 text-xs">Beschikbaarheid en gegevens</p>
              </div>
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
              <h2 className="text-2xl font-bold text-neutral-900">Medewerker Login</h2>
              <p className="text-neutral-500 mt-2">Bekijk diensten en registreer uren</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="jouw@email.nl"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-neutral-700">Wachtwoord</label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-[#F27501] hover:text-[#d96800] font-medium transition-colors"
                  >
                    Wachtwoord vergeten?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={wachtwoord}
                  onChange={(e) => setWachtwoord(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#F27501] text-white rounded-xl font-semibold hover:bg-[#d96800] transition-colors disabled:opacity-50"
              >
                {isLoading ? "Inloggen..." : "Inloggen"}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <p className="text-neutral-600 text-sm">
                Nog geen account?{" "}
                <Link href="/inschrijven" className="text-[#F27501] font-semibold hover:text-[#d96800] transition-colors">
                  Registreer hier!
                </Link>
              </p>
              <Link href="/" className="text-sm text-neutral-500 hover:text-[#F27501] transition-colors block">
                &larr; Terug naar website
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
