"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function KlantWachtwoordVergetenPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/klant/wachtwoord-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Resetmail versturen mislukt");
        return;
      }
      setSuccess(data.message || "Als het account bestaat, ontvangt u zo een resetmail.");
    } catch {
      setError("Geen verbinding. Controleer uw internet en probeer het opnieuw.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#F27501] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Image src="/favicon-icon.png" alt="TopTalent" width={28} height={28} className="w-7 h-7" />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl shadow-neutral-900/5 p-8 border border-neutral-100">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-neutral-900">Wachtwoord vergeten</h1>
            <p className="text-neutral-500 mt-2">Vul het e-mailadres van uw Business-account in. U ontvangt een link om een nieuw wachtwoord in te stellen.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div role="alert" className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>}
            {success && <div role="status" className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">{success}</div>}

            <div>
              <label htmlFor="klant-reset-email" className="block text-sm font-medium text-neutral-700 mb-2">E-mailadres</label>
              <input
                id="klant-reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                placeholder="jouw@bedrijf.nl"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !!success}
              className="w-full bg-[#F27501] text-white py-3 rounded-xl font-semibold hover:bg-[#d96800] transition-colors disabled:opacity-50"
            >
              {isLoading ? "Versturen..." : "Resetlink versturen"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/klant/login" className="text-sm text-neutral-500 hover:text-[#F27501]">
              &larr; Terug naar inloggen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
