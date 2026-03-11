"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function MedewerkerActiverenClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [herhaalWachtwoord, setHerhaalWachtwoord] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError("Activatielink ontbreekt of is ongeldig.");
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/medewerker/activeren?token=${encodeURIComponent(token)}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Activatielink is ongeldig of verlopen.");
        setIsLoading(false);
        return;
      }

      setNaam(result.medewerker?.naam || "");
      setEmail(result.medewerker?.email || "");
      setIsLoading(false);
    };

    void validateToken();
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (wachtwoord.length < 8) {
      setError("Wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }

    if (wachtwoord !== herhaalWachtwoord) {
      setError("Wachtwoorden komen niet overeen.");
      return;
    }

    setIsSaving(true);

    const response = await fetch("/api/medewerker/activeren", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, wachtwoord }),
    });
    const result = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setError(result.error || "Wachtwoord instellen mislukt.");
      return;
    }

    router.push("/medewerker/login?activated=1");
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Activeer je account</h1>
          <p className="text-neutral-500 mt-2">TopTalent Jobs medewerkerportaal</p>
        </div>

        {isLoading ? (
          <div className="text-center text-neutral-500">Activatielink controleren...</div>
        ) : error && !naam ? (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>}
            <div className="bg-neutral-50 rounded-xl p-4">
              <p className="text-sm text-neutral-500">Account</p>
              <p className="font-semibold text-neutral-900">{naam}</p>
              <p className="text-sm text-neutral-600">{email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Nieuw wachtwoord</label>
              <input
                type="password"
                required
                minLength={8}
                value={wachtwoord}
                onChange={(event) => setWachtwoord(event.target.value)}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                placeholder="Minimaal 8 tekens"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Herhaal wachtwoord</label>
              <input
                type="password"
                required
                minLength={8}
                value={herhaalWachtwoord}
                onChange={(event) => setHerhaalWachtwoord(event.target.value)}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                placeholder="Herhaal je wachtwoord"
              />
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 bg-[#F27501] text-white rounded-xl font-semibold hover:bg-[#d96800] transition-colors disabled:opacity-50"
            >
              {isSaving ? "Opslaan..." : "Wachtwoord instellen"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
