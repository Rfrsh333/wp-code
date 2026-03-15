"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import { toast } from "sonner";
import Link from "next/link";

interface ProfielData {
  naam: string;
  email: string;
  telefoon?: string;
  stad?: string;
  adres?: string;
  postcode?: string;
  geboortedatum?: string;
  functie?: string | string[];
  opkomstPercentage?: number;
  optijdPercentage?: number;
  favorieteOpdrachtgevers?: string[];
  factuurAdres?: string;
  factuurPostcode?: string;
  factuurStad?: string;
  btwNummer?: string;
  korActief?: boolean;
}

export default function ProfielClient() {
  const router = useRouter();
  const [profiel, setProfiel] = useState<ProfielData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKorWarning, setShowKorWarning] = useState(false);

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

  const handleKorToggle = (enabled: boolean) => {
    if (enabled && !profiel?.korActief) {
      setShowKorWarning(true);
    } else {
      setProfiel({ ...profiel!, korActief: enabled });
    }
  };

  const confirmKorActivation = () => {
    setProfiel({ ...profiel!, korActief: true });
    setShowKorWarning(false);
  };

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
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
          adres: profiel.adres,
          postcode: profiel.postcode,
          geboortedatum: profiel.geboortedatum,
          telefoon: profiel.telefoon,
          factuurAdres: profiel.factuurAdres,
          factuurPostcode: profiel.factuurPostcode,
          factuurStad: profiel.factuurStad,
          btwNummer: profiel.btwNummer,
          korActief: profiel.korActief,
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
          {/* Persoonlijke informatie sectie */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)] space-y-4">
            <h2 className="text-lg font-bold text-[var(--mp-text-primary)] mb-3">
              Persoonlijke informatie
            </h2>

            {/* Naam (niet bewerkbaar) */}
            <div>
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
            <div>
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

            {/* Telefoon */}
            <div>
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

            {/* Geboortedatum & Leeftijd */}
            <div>
              <label className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-2">
                Geboortedatum
              </label>
              <input
                type="date"
                value={profiel?.geboortedatum || ""}
                onChange={(e) => setProfiel({ ...profiel!, geboortedatum: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--mp-bg)] border border-[var(--mp-separator)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-accent)]"
              />
              {profiel?.geboortedatum && (
                <p className="text-xs text-[var(--mp-text-secondary)] mt-1">
                  Leeftijd: {calculateAge(profiel.geboortedatum)} jaar
                </p>
              )}
            </div>

            {/* Adres */}
            <div>
              <label className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-2">
                Adres
              </label>
              <input
                type="text"
                value={profiel?.adres || ""}
                onChange={(e) => setProfiel({ ...profiel!, adres: e.target.value })}
                placeholder="Straatnaam 123"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--mp-bg)] border border-[var(--mp-separator)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-accent)]"
              />
            </div>

            {/* Postcode en Stad */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-2">
                  Postcode
                </label>
                <input
                  type="text"
                  value={profiel?.postcode || ""}
                  onChange={(e) => setProfiel({ ...profiel!, postcode: e.target.value })}
                  placeholder="1234 AB"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--mp-bg)] border border-[var(--mp-separator)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-accent)]"
                />
              </div>
              <div>
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
            </div>

            {/* Functie (niet bewerkbaar) */}
            <div>
              <label className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-2">
                Functie
              </label>
              <div className="text-[var(--mp-text-primary)] font-medium">
                {functies}
              </div>
            </div>
          </div>

          {/* Statistieken sectie */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)]">
            <h2 className="text-lg font-bold text-[var(--mp-text-primary)] mb-3">
              Jouw statistieken
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Opkomst percentage */}
              <div className="bg-[var(--mp-bg)] rounded-xl p-4">
                <div className="text-2xl font-bold text-[var(--mp-accent)]">
                  {profiel?.opkomstPercentage !== undefined ? `${profiel.opkomstPercentage}%` : "-"}
                </div>
                <div className="text-xs text-[var(--mp-text-tertiary)] mt-1">
                  Opkomst percentage
                </div>
              </div>

              {/* Op tijd percentage */}
              <div className="bg-[var(--mp-bg)] rounded-xl p-4">
                <div className="text-2xl font-bold text-[var(--mp-accent)]">
                  {profiel?.optijdPercentage !== undefined ? `${profiel.optijdPercentage}%` : "-"}
                </div>
                <div className="text-xs text-[var(--mp-text-tertiary)] mt-1">
                  Op tijd percentage
                </div>
              </div>
            </div>

            {/* Favoriete opdrachtgevers */}
            {profiel?.favorieteOpdrachtgevers && profiel.favorieteOpdrachtgevers.length > 0 && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-2">
                  Favoriete opdrachtgevers
                </label>
                <div className="flex flex-wrap gap-2">
                  {profiel.favorieteOpdrachtgevers.map((opdrachtgever, index) => (
                    <div
                      key={index}
                      className="px-3 py-1.5 bg-[var(--mp-accent-light)] text-[var(--mp-accent-dark)] rounded-full text-sm font-medium"
                    >
                      {opdrachtgever}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Factuurgegevens sectie */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)] space-y-4">
            <h2 className="text-lg font-bold text-[var(--mp-text-primary)] mb-3">
              Factuurgegevens
            </h2>

            {/* Factuuradres */}
            <div>
              <label className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-2">
                Factuuradres
              </label>
              <input
                type="text"
                value={profiel?.factuurAdres || ""}
                onChange={(e) => setProfiel({ ...profiel!, factuurAdres: e.target.value })}
                placeholder="Straatnaam 123"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--mp-bg)] border border-[var(--mp-separator)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-accent)]"
              />
            </div>

            {/* Factuur Postcode en Stad */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-2">
                  Postcode
                </label>
                <input
                  type="text"
                  value={profiel?.factuurPostcode || ""}
                  onChange={(e) => setProfiel({ ...profiel!, factuurPostcode: e.target.value })}
                  placeholder="1234 AB"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--mp-bg)] border border-[var(--mp-separator)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-2">
                  Plaats
                </label>
                <input
                  type="text"
                  value={profiel?.factuurStad || ""}
                  onChange={(e) => setProfiel({ ...profiel!, factuurStad: e.target.value })}
                  placeholder="Amsterdam"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--mp-bg)] border border-[var(--mp-separator)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-accent)]"
                />
              </div>
            </div>

            {/* BTW-identificatienummer */}
            <div>
              <label className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-2">
                BTW-identificatienummer
              </label>
              <input
                type="text"
                value={profiel?.btwNummer || ""}
                onChange={(e) => setProfiel({ ...profiel!, btwNummer: e.target.value })}
                placeholder="NL123456789B01"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--mp-bg)] border border-[var(--mp-separator)] text-[var(--mp-text-primary)] placeholder:text-[var(--mp-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-accent)]"
              />
            </div>

            {/* KOR (Kleineondernemersregeling) */}
            <div className="border-t border-[var(--mp-separator)] pt-4 mt-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-[var(--mp-text-primary)] mb-1">
                    Kleineondernemersregeling (KOR)
                  </label>
                  <p className="text-xs text-[var(--mp-text-secondary)]">
                    {profiel?.korActief ? "Actief" : "Niet actief"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleKorToggle(!profiel?.korActief)}
                  disabled={profiel?.korActief}
                  className={`relative w-[60px] h-8 rounded-full transition-all duration-300 ${
                    profiel?.korActief
                      ? "bg-[var(--mp-accent)] opacity-50 cursor-not-allowed"
                      : "bg-neutral-300 dark:bg-neutral-700"
                  }`}
                  style={{ minWidth: '60px', minHeight: '32px' }}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
                      profiel?.korActief ? "translate-x-[30px]" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200">
                  <strong className="font-semibold block mb-1">Let op:</strong>
                  Zet het alleen aan als je je hebt aangemeld voor de kleineondernemersregeling (KOR).
                  Als het eenmaal aan staat, kan je het niet uitzetten zonder contact op te nemen met onze supportafdeling.
                </div>
              </div>

              {/* Info link */}
              <Link
                href="/medewerker/kor-info"
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--mp-accent)] hover:text-[var(--mp-accent-dark)] transition-colors mt-3"
              >
                Lees meer over de KOR
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
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

        {/* KOR Activation Warning Modal */}
        {showKorWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-6 max-w-md w-full shadow-xl">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-[var(--mp-text-primary)] mb-2">
                    KOR activeren?
                  </h3>
                  <p className="text-sm text-[var(--mp-text-secondary)]">
                    Je staat op het punt om de Kleineondernemersregeling (KOR) te activeren.
                    Dit kan niet ongedaan worden gemaakt zonder contact op te nemen met support.
                  </p>
                  <p className="text-sm text-[var(--mp-text-secondary)] mt-2">
                    Zorg ervoor dat je je hebt aangemeld bij de Belastingdienst voor de KOR voordat je dit activeert.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowKorWarning(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--mp-separator)] text-[var(--mp-text-primary)] font-medium transition-colors hover:bg-[var(--mp-bg)]"
                >
                  Annuleren
                </button>
                <button
                  onClick={confirmKorActivation}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--mp-accent)] text-white font-semibold transition-all active:scale-[0.98]"
                >
                  Activeren
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Spacing */}
        <div className="h-8" />
      </div>
    </MedewerkerResponsiveLayout>
  );
}
