"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import { toast } from "sonner";

interface ProfielData {
  naam: string;
  email: string;
  telefoon?: string;
  stad?: string;
  geboortedatum?: string;
  functie?: string | string[];
}

export default function ProfielClient() {
  const router = useRouter();
  const [profiel, setProfiel] = useState<ProfielData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfiel();
  }, []);

  const fetchProfiel = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/medewerker/profile");
      if (res.ok) {
        const data = await res.json();
        setProfiel(data.profiel);
      } else {
        toast.error("Kon profiel niet laden");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Er ging iets mis");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profiel) return;

    try {
      setSaving(true);
      const res = await fetch("/api/medewerker/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stad: profiel.stad,
          geboortedatum: profiel.geboortedatum,
          telefoon: profiel.telefoon,
        }),
      });

      if (res.ok) {
        toast.success("Profiel bijgewerkt");
        router.push("/medewerker/account");
      } else {
        toast.error("Kon niet opslaan");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Er ging iets mis");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--mp-bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const functies = profiel?.functie
    ? Array.isArray(profiel.functie)
      ? profiel.functie.join(", ")
      : profiel.functie
    : "Niet ingesteld";

  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        {/* Header */}
        <div className="bg-gradient-to-br from-[var(--mp-accent)] to-[var(--mp-accent-dark)] pt-4 pb-6 px-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white mb-4 transition-opacity active:opacity-70"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Terug</span>
            </button>
            <h1 className="text-2xl font-bold text-white">Persoonlijke gegevens</h1>
            <p className="text-white/80 text-sm mt-1">Beheer je profielinformatie</p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto px-4 -mt-2 space-y-4">
          {/* Naam (niet bewerkbaar) */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)]">
            <label className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-2">
              Naam
            </label>
            <div className="text-[var(--mp-text-primary)] font-medium">
              {profiel?.naam || "-"}
            </div>
            <p className="text-xs text-[var(--mp-text-tertiary)] mt-1">
              Neem contact op om je naam te wijzigen
            </p>
          </div>

          {/* Email (niet bewerkbaar) */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)]">
            <label className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-2">
              Email
            </label>
            <div className="text-[var(--mp-text-primary)] font-medium">
              {profiel?.email || "-"}
            </div>
            <p className="text-xs text-[var(--mp-text-tertiary)] mt-1">
              Neem contact op om je email te wijzigen
            </p>
          </div>

          {/* Functie (niet bewerkbaar) */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)]">
            <label className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-2">
              Functie
            </label>
            <div className="text-[var(--mp-text-primary)] font-medium">
              {functies}
            </div>
          </div>

          {/* Telefoon */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)]">
            <label className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-2">
              Telefoonnummer
            </label>
            <input
              type="tel"
              value={profiel?.telefoon || ""}
              onChange={(e) => setProfiel({ ...profiel!, telefoon: e.target.value })}
              placeholder="06 12345678"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--mp-bg)] border border-[var(--mp-separator)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-accent)]"
            />
          </div>

          {/* Stad */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)]">
            <label className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-2">
              Woonplaats
            </label>
            <input
              type="text"
              value={profiel?.stad || ""}
              onChange={(e) => setProfiel({ ...profiel!, stad: e.target.value })}
              placeholder="Amsterdam"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--mp-bg)] border border-[var(--mp-separator)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-accent)]"
            />
          </div>

          {/* Geboortedatum */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)]">
            <label className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-2">
              Geboortedatum
            </label>
            <input
              type="date"
              value={profiel?.geboortedatum || ""}
              onChange={(e) => setProfiel({ ...profiel!, geboortedatum: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--mp-bg)] border border-[var(--mp-separator)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-accent)]"
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-[var(--mp-accent)] to-[var(--mp-accent-dark)] text-white font-semibold py-4 rounded-[var(--mp-radius)] shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Opslaan...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Wijzigingen opslaan
              </>
            )}
          </button>
        </div>

        {/* Spacing */}
        <div className="h-8" />
      </div>
    </MedewerkerResponsiveLayout>
  );
}
