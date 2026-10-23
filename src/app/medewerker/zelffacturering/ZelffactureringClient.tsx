"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";

/**
 * Stap 6 "Geld": akkoord zelffacturering lezen, geven en intrekken (checklistpunt vóór reageren).
 * Tekst en versie komen van GET /api/medewerker/zelffacturering. Met de vlag uit: "binnenkort".
 */

type Akkoord = {
  actief: boolean;
  beschikbaar: boolean;
  versie: string;
  concept: boolean;
  titel: string;
  secties: { titel: string; tekst: string }[];
  akkoordzin: string;
  akkoord_op: string | null;
  akkoord_versie: string | null;
  akkoord_nodig: boolean;
  ingetrokken_op: string | null;
};

export default function ZelffactureringClient() {
  const router = useRouter();
  const [akkoord, setAkkoord] = useState<Akkoord | null>(null);
  const [laden, setLaden] = useState(true);
  const [gelezen, setGelezen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [intrekkenVragen, setIntrekkenVragen] = useState(false);

  const haal = useCallback(async () => {
    try {
      const res = await fetch("/api/medewerker/zelffacturering");
      const data = await res.json().catch(() => null);
      if (res.ok && data) setAkkoord(data as Akkoord);
      else if (res.status !== 401 && res.status !== 403) toast.error("De tekst kon niet worden geladen.");
    } catch {
      toast.error("Geen verbinding. Probeer het opnieuw.");
    } finally {
      setLaden(false);
    }
  }, []);

  useEffect(() => {
    void haal();
  }, [haal]);

  const geefAkkoord = async () => {
    if (!akkoord || !gelezen) return;
    setBezig(true);
    try {
      const res = await fetch("/api/medewerker/zelffacturering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versie: akkoord.versie }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Akkoord geven lukte niet. Probeer het opnieuw.");
        if (res.status === 409) void haal();
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

  const trekIn = async () => {
    setBezig(true);
    try {
      const res = await fetch("/api/medewerker/zelffacturering", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Intrekken lukte niet. Probeer het opnieuw.");
        return;
      }
      toast.success("Je akkoord is ingetrokken.");
      setIntrekkenVragen(false);
      setGelezen(false);
      void haal();
    } catch {
      toast.error("Geen verbinding. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  };

  const heeftAkkoord = !!akkoord && !akkoord.akkoord_nodig && !!akkoord.akkoord_op;

  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/medewerker/financieel/facturen" className="inline-flex items-center gap-2 text-sm text-[var(--mp-text-secondary)] mb-4">
            <ArrowLeft className="w-4 h-4" />
            Naar je facturen
          </Link>

          {laden ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !akkoord ? (
            <p className="text-[var(--mp-text-secondary)]">Deze pagina is nu niet beschikbaar.</p>
          ) : !akkoord.actief && !heeftAkkoord ? (
            <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] shadow-[var(--mp-shadow)] p-6 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--mp-accent)]/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-[var(--mp-accent)]" />
              </div>
              <h1 className="text-xl font-bold text-[var(--mp-text-primary)]">Binnenkort: zelffacturering</h1>
              <p className="text-sm text-[var(--mp-text-secondary)]">
                Straks maakt TopTalent je facturen namens jou op, met je akkoord. Je hoeft nu nog niets te doen.
              </p>
            </div>
          ) : (
            <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] shadow-[var(--mp-shadow)] p-5 space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-[var(--mp-text-primary)]">{akkoord.titel}</h1>
                <p className="text-sm text-[var(--mp-text-secondary)] mt-1">
                  Met dit akkoord maakt TopTalent de facturen voor je diensten namens jou op. Je vindt ze per kwartaal onder
                  Financieel &gt; Facturen.
                </p>
              </div>

              {akkoord.concept && (
                <div role="note" className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>CONCEPT: deze tekst wordt nog gecontroleerd en kan nog veranderen.</span>
                </div>
              )}

              {heeftAkkoord && akkoord.akkoord_op && (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  Je gaf akkoord op {new Date(akkoord.akkoord_op).toLocaleString("nl-NL")}.
                </div>
              )}

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {akkoord.secties.map((sectie) => (
                  <section key={sectie.titel}>
                    <h2 className="font-semibold text-[var(--mp-text-primary)] mb-1">{sectie.titel}</h2>
                    <p className="text-sm text-[var(--mp-text-secondary)] whitespace-pre-line">{sectie.tekst}</p>
                  </section>
                ))}
              </div>

              {akkoord.akkoord_nodig && (
                <div className="border-t border-[var(--mp-separator)] pt-4 space-y-3">
                  {!akkoord.beschikbaar ? (
                    <p className="text-sm text-[var(--mp-text-secondary)]">Akkoord geven kan binnenkort.</p>
                  ) : (
                    <>
                      {akkoord.akkoord_versie && (
                        <p className="text-sm text-[var(--mp-text-secondary)]">De tekst is gewijzigd sinds je vorige akkoord. Lees hem opnieuw.</p>
                      )}
                      <label className="flex items-start gap-3 text-sm text-[var(--mp-text-primary)]">
                        <input
                          type="checkbox"
                          checked={gelezen}
                          onChange={(e) => setGelezen(e.target.checked)}
                          className="mt-0.5 accent-[var(--mp-accent)]"
                        />
                        {akkoord.akkoordzin}
                      </label>
                      <button
                        onClick={geefAkkoord}
                        disabled={!gelezen || bezig}
                        className="w-full py-3 rounded-xl bg-[var(--mp-accent)] text-white font-semibold disabled:opacity-50 transition-opacity"
                      >
                        {bezig ? "Opslaan..." : "Akkoord geven"}
                      </button>
                    </>
                  )}
                  <p className="text-xs text-[var(--mp-text-tertiary)]">Versie {akkoord.versie}</p>
                </div>
              )}

              {heeftAkkoord && (
                <div className="border-t border-[var(--mp-separator)] pt-4 space-y-3">
                  {!intrekkenVragen ? (
                    <button
                      onClick={() => setIntrekkenVragen(true)}
                      className="text-sm font-semibold text-red-600 hover:underline"
                    >
                      Akkoord intrekken
                    </button>
                  ) : (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-3">
                      <p className="text-sm text-red-900">
                        Weet je het zeker? Na intrekken maakt TopTalent geen facturen meer namens jou en kun je niet reageren op
                        nieuwe diensten. Facturen die al gemaakt zijn, blijven geldig.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={trekIn}
                          disabled={bezig}
                          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
                        >
                          {bezig ? "Bezig..." : "Ja, intrekken"}
                        </button>
                        <button
                          onClick={() => setIntrekkenVragen(false)}
                          className="px-4 py-2 rounded-lg bg-[var(--mp-card)] border border-[var(--mp-separator)] text-sm"
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-[var(--mp-text-tertiary)]">Versie {akkoord.akkoord_versie}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MedewerkerResponsiveLayout>
  );
}
