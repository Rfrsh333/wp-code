"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/ui/Toast";

export default function KlantLogin() {
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

    const res = await fetch("/api/klant/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, wachtwoord }),
    });

    const data = await res.json();
    setIsLoading(false);

    if (data.success) {
      toast.success("Welkom terug!");
      router.push("/klant/dashboard");
    } else {
      setError(data.error || "Er ging iets mis");
    }
  };

  const handleForgotPassword = () => {
    toast.info("Neem contact op met uw accountmanager of mail naar info@toptalentjobs.nl voor een wachtwoord reset.");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-900 relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-80 h-80 border border-[#F27501]/30 rounded-full" />
          <div className="absolute bottom-10 left-10 w-64 h-64 border border-[#F27501]/20 rounded-full" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 bg-[#F27501] rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Image src="/favicon-icon.png" alt="TopTalent" width={36} height={36} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Klant Portal</h1>
          <p className="text-neutral-400 text-lg leading-relaxed">
            Beheer uw diensten, beoordeel gewerkte uren en bekijk facturen. Altijd inzicht in uw personeel.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6 text-neutral-500">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm text-neutral-400">Uren beheer</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm text-neutral-400">Facturen</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <p className="text-sm text-neutral-400">Beoordelingen</p>
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
              <h2 className="text-2xl font-bold text-neutral-900">Klant Portal</h2>
              <p className="text-neutral-500 mt-2">Beheer uw personeel en diensten</p>
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
                  placeholder="jouw@bedrijf.nl"
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
              <p className="text-sm text-neutral-500">
                Nog geen account?{" "}
                <Link href="/klant/registreren" className="text-[#F27501] hover:text-[#d96800] font-medium transition-colors">
                  Registreer hier
                </Link>
              </p>
              <Link href="/" className="text-sm text-neutral-400 hover:text-[#F27501] transition-colors block">
                &larr; Terug naar website
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
