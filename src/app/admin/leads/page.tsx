"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LeadsImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/admin/login");
        return;
      }

      // Verifieer admin status
      try {
        const response = await fetch("/api/admin/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session }),
        });

        if (!response.ok) {
          await supabase.auth.signOut();
          router.push("/admin/login");
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Admin verificatie error:", error);
        await supabase.auth.signOut();
        router.push("/admin/login");
      }
    };

    checkAuth();
  }, [router]);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("data", file);

    try {
      const response = await fetch("https://n8n-production-ceb61.up.railway.app/webhook/lead-import", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setResult({ success: true, message: `✅ ${file.name} succesvol geüpload!` });
        setFile(null);
      } else {
        setResult({ success: false, message: "❌ Upload mislukt" });
      }
    } catch (error) {
      setResult({ success: false, message: "❌ Fout bij uploaden" });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-900 mb-6">Lead Import</h1>

        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">CSV Uploaden</h2>

          <div className="mb-6">
            <p className="text-sm text-neutral-600 mb-4">
              CSV moet deze kolommen hebben: bedrijfsnaam, email, voornaam, achternaam, functie, locatie, branche
            </p>

            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-neutral-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#F27501] file:text-white hover:file:bg-[#d96800] cursor-pointer"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full px-6 py-3 bg-[#F27501] text-white rounded-xl font-semibold hover:bg-[#d96800] disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Uploaden..." : "Upload Leads"}
          </button>

          {result && (
            <div className={`mt-4 p-4 rounded-xl ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {result.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
