"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";

/**
 * B1: de overeenkomst van opdracht lezen en er akkoord op geven (stap van de checklist vóór
 * reageren). Tekst en versie komen van GET /api/medewerker/overeenkomst.
 */

type Overeenkomst = {
  versie: string;
  titel: string;
  secties: { titel: string; tekst: string }[];
  akkoord_op: string | null;
  akkoord_versie: string | null;
  akkoord_nodig: boolean;
};

export default function OvereenkomstClient() {
  const router = useRouter();
  const [overeenkomst, setOvereenkomst] = useState<Overeenkomst | null>(null);
  const [laden, setLaden] = useState(true);
  const [gelezen, setGelezen] = useState(false);
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    const haal = async () => {
      try {
        const res = await fetch("/api/medewerker/overeenkomst");
        const data = await res.json().catch(() => null);
        if (res.ok && data) setOvereenkomst(data as Overeenkomst);
        else if (res.status !== 401 && res.status !== 403) toast.error("De overeenkomst kon niet worden geladen.");
      } catch {
        toast.error("Geen verbinding. Probeer het opnieuw.");
      } finally {
        setLaden(false);
      }
    };
    void haal();
  }, []);

  const geefAkkoord = async () => {
    if (!overeenkomst || !gelezen) return;
    setBezig(true);
    try {
      const res = await fetch("/api/medewerker/overeenkomst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versie: overeenkomst.versie }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Akkoord geven lukte niet. Probeer het opnieuw.");
        return;
      }
      toast.success("Bedankt, je akkoord is opgeslagen.");
      router.push("/medewerker/dashboard");
    } catch {
      toast.error("Geen verbinding. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  };

  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/medewerker/dashboard" className="inline-flex items-center gap-2 text-sm text-[var(--mp-text-secondary)] mb-4">
            <ArrowLeft className="w-4 h-4" />
            Terug
          </Link>

          {laden ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !overeenkomst ? (
            <p className="text-[var(--mp-text-secondary)]">De overeenkomst is nu niet beschikbaar.</p>
          ) : (
            <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] shadow-[var(--mp-shadow)] p-5 space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-[var(--mp-text-primary)]">{overeenkomst.titel}</h1>
                <p className="text-sm text-[var(--mp-text-secondary)] mt-1">
                  Je werkt via TopTalent als zelfstandige. Lees de overeenkomst en geef akkoord; daarna kun je reageren
                  op diensten. Gegevens die per opdracht verschillen staan als &quot;[per opdracht]&quot; en worden in de
                  opdrachtbevestiging vastgelegd.
                </p>
              </div>

              {!overeenkomst.akkoord_nodig && overeenkomst.akkoord_op && (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  Je gaf akkoord op {new Date(overeenkomst.akkoord_op).toLocaleString("nl-NL")}.
                </div>
              )}

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {overeenkomst.secties.map((sectie) => (
                  <section key={sectie.titel}>
                    <h2 className="font-semibold text-[var(--mp-text-primary)] mb-1">{sectie.titel}</h2>
                    <p className="text-sm text-[var(--mp-text-secondary)] whitespace-pre-line">{sectie.tekst}</p>
                  </section>
                ))}
              </div>

              {overeenkomst.akkoord_nodig && (
                <div className="border-t border-[var(--mp-separator)] pt-4 space-y-3">
                  <label className="flex items-start gap-3 text-sm text-[var(--mp-text-primary)]">
                    <input
                      type="checkbox"
                      checked={gelezen}
                      onChange={(e) => setGelezen(e.target.checked)}
                      className="mt-0.5 accent-[var(--mp-accent)]"
                    />
                    Ik heb de overeenkomst van opdracht gelezen en ga ermee akkoord.
                  </label>
                  <button
                    onClick={geefAkkoord}
                    disabled={!gelezen || bezig}
                    className="w-full py-3 rounded-xl bg-[var(--mp-accent)] text-white font-semibold disabled:opacity-50 transition-opacity"
                  >
                    {bezig ? "Opslaan..." : "Akkoord geven"}
                  </button>
                  <p className="text-xs text-[var(--mp-text-tertiary)]">Versie {overeenkomst.versie}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MedewerkerResponsiveLayout>
  );
}
