"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

export default function KlantRegistreren() {
  const [form, setForm] = useState({
    bedrijfsnaam: "",
    contactpersoon: "",
    email: "",
    telefoon: "",
    wachtwoord: "",
    wachtwoordBevestig: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.wachtwoord !== form.wachtwoordBevestig) {
      setError("Wachtwoorden komen niet overeen");
      return;
    }

    if (form.wachtwoord.length < 8) {
      setError("Wachtwoord moet minimaal 8 tekens bevatten");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/klant/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedrijfsnaam: form.bedrijfsnaam,
          contactpersoon: form.contactpersoon,
          email: form.email,
          telefoon: form.telefoon,
          wachtwoord: form.wachtwoord,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Account aangemaakt! Welkom bij TopTalent.");
        router.push("/klant/dashboard");
      } else {
        setError(data.error || "Er ging iets mis");
      }
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-900 relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-80 h-80 border border-[#F27501]/30 rounded-full" />
          <div className="absolute bottom-10 left-10 w-64 h-64 border border-[#F27501]/20 rounded-full" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 bg-[#F27501] rounded-2xl flex items-center justify-center mx-auto mb-8">
            <span className="text-white font-bold text-2xl">TT</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Word klant</h1>
          <p className="text-neutral-400 text-lg leading-relaxed">
            Registreer uw bedrijf en krijg direct toegang tot ons klantportaal. Personeel aanvragen, uren beheren en facturen inzien.
          </p>
          <div className="mt-10 space-y-4 text-left">
            {[
              "Direct personeel aanvragen",
              "Uren inzien en goedkeuren",
              "Facturen en kosten overzicht",
              "Medewerkers beoordelen",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-[#F27501]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-neutral-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right registration form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-neutral-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-[#F27501] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">TT</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-neutral-900/5 p-8 border border-neutral-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-neutral-900">Account aanmaken</h2>
              <p className="text-neutral-500 mt-2">Registreer uw bedrijf bij TopTalent</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Bedrijfsnaam *</label>
                <input
                  type="text"
                  required
                  value={form.bedrijfsnaam}
                  onChange={(e) => setForm({ ...form, bedrijfsnaam: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="Uw bedrijfsnaam"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Contactpersoon *</label>
                <input
                  type="text"
                  required
                  value={form.contactpersoon}
                  onChange={(e) => setForm({ ...form, contactpersoon: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="Uw volledige naam"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="jouw@bedrijf.nl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Telefoonnummer</label>
                <input
                  type="tel"
                  value={form.telefoon}
                  onChange={(e) => setForm({ ...form, telefoon: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="06 12345678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Wachtwoord *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.wachtwoord}
                  onChange={(e) => setForm({ ...form, wachtwoord: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="Minimaal 8 tekens"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Wachtwoord bevestigen *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.wachtwoordBevestig}
                  onChange={(e) => setForm({ ...form, wachtwoordBevestig: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="Herhaal wachtwoord"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#F27501] text-white rounded-xl font-semibold hover:bg-[#d96800] transition-colors disabled:opacity-50 mt-2"
              >
                {isLoading ? "Account aanmaken..." : "Account aanmaken"}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-neutral-500">
                Heeft u al een account?{" "}
                <Link href="/klant/login" className="text-[#F27501] hover:text-[#d96800] font-medium transition-colors">
                  Inloggen
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
