"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabaseUrl = "https://nntxpyoyrpquzghsnwxj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5udHhweW95cnBxdXpnaHNud3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MTcxMjIsImV4cCI6MjA4MTE5MzEyMn0.a9WrCUxfInyBgUYXmkhJv6NM7p8Ll7wTUfXgu5bRGEE";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setConfigError(`Config missing - URL: ${supabaseUrl ? "OK" : "MISSING"}, Key: ${supabaseAnonKey ? "OK" : "MISSING"}`);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!supabaseUrl || !supabaseAnonKey) {
      setError("Supabase configuratie ontbreekt");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        setError(error.message || "Ongeldige inloggegevens");
        setIsLoading(false);
      } else {
        router.push("/admin");
        router.refresh();
      }
    } catch (err) {
      console.error("Catch error:", err);
      setError(`Fout: ${err instanceof Error ? err.message : "Onbekende fout"}`);
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
          {configError && (
            <div className="bg-yellow-50 text-yellow-700 px-4 py-3 rounded-xl text-sm">
              {configError}
            </div>
          )}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
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
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
              placeholder="admin@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Wachtwoord
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
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
          <a href="/" className="text-sm text-neutral-500 hover:text-[#F27501]">
            ← Terug naar website
          </a>
        </div>
      </div>
    </div>
  );
}
