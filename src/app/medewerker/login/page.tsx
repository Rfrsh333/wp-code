"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MedewerkerLogin() {
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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
      router.push("/medewerker/diensten");
    } else {
      setError(data.error || "Er ging iets mis");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Medewerker Login</h1>
          <p className="text-neutral-500 mt-2">TopTalent Jobs</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
              placeholder="jouw@email.nl" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Wachtwoord</label>
            <input type="password" required value={wachtwoord} onChange={(e) => setWachtwoord(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full py-3 bg-[#F27501] text-white rounded-xl font-semibold hover:bg-[#d96800] transition-colors disabled:opacity-50">
            {isLoading ? "Inloggen..." : "Inloggen"}
          </button>
        </form>
      </div>
    </div>
  );
}
