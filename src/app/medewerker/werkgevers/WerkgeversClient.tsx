"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, EyeOff, Heart } from "lucide-react";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

/**
 * Account → Werkgevers (stap 3): de werkgevers die je hebt bewaard en die je hebt verborgen.
 * Verborgen werkgevers zie je niet in Ontdekken en je krijgt er geen meldingen over.
 */

type Regel = { klant_id: string; bedrijfsnaam: string; bedrijf_foto_url: string | null; sinds: string | null };
type Lijsten = { beschikbaar: boolean; favoriet: Regel[]; verborgen: Regel[] };

function Lijst({
  titel,
  uitleg,
  leeg,
  regels,
  knop,
  icoon: Icoon,
  bezig,
  onKnop,
}: {
  titel: string;
  uitleg: string;
  leeg: string;
  regels: Regel[];
  knop: string;
  icoon: typeof Heart;
  bezig: string | null;
  onKnop: (r: Regel) => void;
}) {
  return (
    <section className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] overflow-hidden shadow-[var(--mp-shadow)]">
      <div className="px-4 py-3 border-b border-[var(--mp-separator)]">
        <h2 className="text-sm font-semibold text-[var(--mp-text-primary)] flex items-center gap-2">
          <Icoon className="w-4 h-4 text-[var(--mp-text-secondary)]" /> {titel}
        </h2>
        <p className="text-xs text-[var(--mp-text-tertiary)] mt-0.5">{uitleg}</p>
      </div>
      {regels.length === 0 ? (
        <p className="px-4 py-4 text-sm text-[var(--mp-text-secondary)]">{leeg}</p>
      ) : (
        <ul className="divide-y divide-[var(--mp-separator)]">
          {regels.map((r) => (
            <li key={r.klant_id} className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--mp-bg)] flex items-center justify-center shrink-0 text-sm font-bold text-[var(--mp-accent)]">
                {r.bedrijfsnaam.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 min-w-0 truncate font-medium text-[var(--mp-text-primary)]">{r.bedrijfsnaam}</span>
              <button
                onClick={() => onKnop(r)}
                disabled={bezig === r.klant_id}
                className="shrink-0 text-sm font-semibold text-[var(--mp-accent)] disabled:opacity-50"
              >
                {bezig === r.klant_id ? "Bezig…" : knop}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function WerkgeversClient() {
  const router = useRouter();
  const [lijsten, setLijsten] = useState<Lijsten | null>(null);
  const [bezig, setBezig] = useState<string | null>(null);

  const laad = useCallback(async () => {
    try {
      const res = await fetch("/api/medewerker/werkgevers");
      if (!res.ok) {
        toast.error("Werkgevers ophalen mislukt");
        return;
      }
      setLijsten((await res.json()) as Lijsten);
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Er ging iets mis");
    }
  }, []);

  useEffect(() => {
    void laad();
  }, [laad]);

  const hefOp = async (r: Regel, soort: "favoriet" | "verborgen") => {
    setBezig(r.klant_id);
    try {
      const res = await fetch(`/api/medewerker/werkgevers?klant_id=${encodeURIComponent(r.klant_id)}&soort=${soort}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Opheffen mislukt");
        return;
      }
      toast.success(soort === "verborgen" ? `${r.bedrijfsnaam} is weer zichtbaar` : `${r.bedrijfsnaam} is niet meer bewaard`);
      setLijsten((l) => (l ? { ...l, [soort]: l[soort].filter((x) => x.klant_id !== r.klant_id) } : l));
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Er ging iets mis");
    } finally {
      setBezig(null);
    }
  };

  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        <div className="bg-gradient-to-br from-[var(--mp-accent)] to-[var(--mp-accent-dark)] pt-4 pb-6 px-4">
          <div className="max-w-2xl mx-auto">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-white mb-4 transition-opacity active:opacity-70">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Terug</span>
            </button>
            <h1 className="text-2xl font-bold text-white">Werkgevers</h1>
            <p className="text-white/80 text-sm mt-1">Bewaard en verborgen</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 -mt-2 space-y-4 pb-8">
          {!lijsten ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !lijsten.beschikbaar ? (
            <p className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 text-sm text-[var(--mp-text-secondary)]">
              Werkgevers bewaren of verbergen kan binnenkort.
            </p>
          ) : (
            <>
              <Lijst
                titel="Favoriete werkgevers"
                uitleg="Bewaar een werkgever in het dienstdetail in Ontdekken. Je kunt daarna alleen hun diensten tonen."
                leeg="Je hebt nog geen werkgevers bewaard."
                regels={lijsten.favoriet}
                knop="Verwijderen"
                icoon={Heart}
                bezig={bezig}
                onKnop={(r) => hefOp(r, "favoriet")}
              />
              <Lijst
                titel="Verborgen werkgevers"
                uitleg="Van deze werkgevers zie je geen diensten in Ontdekken en krijg je geen meldingen."
                leeg="Je hebt geen werkgevers verborgen."
                regels={lijsten.verborgen}
                knop="Weer tonen"
                icoon={EyeOff}
                bezig={bezig}
                onKnop={(r) => hefOp(r, "verborgen")}
              />
            </>
          )}
        </div>
      </div>
    </MedewerkerResponsiveLayout>
  );
}
