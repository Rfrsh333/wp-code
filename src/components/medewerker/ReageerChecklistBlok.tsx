"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ChevronRight, ListChecks } from "lucide-react";

/**
 * B1: "Nog X dingen te doen" voordat de medewerker kan reageren op diensten. Leest
 * GET /api/medewerker/checklist; verdwijnt zodra alles in orde is. `verversSleutel` laat de
 * ouder het blok opnieuw laden (bv. na een geweigerde aanmelding).
 */

type Punt = {
  code: string;
  label: string;
  ok: boolean;
  uitleg: string;
  actie: { scherm: string; web_pad: string; label: string };
};

type Checklist = { compleet: boolean; aantal_open: number; punten: Punt[]; actief: boolean };

export default function ReageerChecklistBlok({ verversSleutel = 0 }: { verversSleutel?: number }) {
  const [checklist, setChecklist] = useState<Checklist | null>(null);

  useEffect(() => {
    let actueel = true;
    fetch("/api/medewerker/checklist")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Checklist | null) => {
        if (actueel && data) setChecklist(data);
      })
      .catch(() => {
        // Geen blok tonen bij een netwerkfout; de aanmeldroute controleert het toch.
      });
    return () => {
      actueel = false;
    };
  }, [verversSleutel]);

  if (!checklist || !checklist.actief || checklist.compleet) return null;

  const open = checklist.aantal_open;
  return (
    <section
      aria-labelledby="checklist-titel"
      className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] shadow-[var(--mp-shadow)] border-2 border-[var(--mp-accent)]/40 p-4"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--mp-accent)]/10 flex items-center justify-center flex-shrink-0">
          <ListChecks className="w-5 h-5 text-[var(--mp-accent)]" />
        </div>
        <div>
          <h2 id="checklist-titel" className="font-bold text-[var(--mp-text-primary)]">
            Nog {open} {open === 1 ? "ding" : "dingen"} te doen
          </h2>
          <p className="text-sm text-[var(--mp-text-secondary)]">
            Regel dit eerst; daarna kun je reageren op diensten en aanbiedingen accepteren.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-[var(--mp-separator)]">
        {checklist.punten.map((punt) => (
          <li key={punt.code} className="py-3 flex items-start gap-3">
            {punt.ok ? (
              <CheckCircle2 className="w-5 h-5 text-[var(--mp-success)] flex-shrink-0 mt-0.5" aria-label="In orde" />
            ) : (
              <Circle className="w-5 h-5 text-[var(--mp-text-tertiary)] flex-shrink-0 mt-0.5" aria-label="Nog te doen" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${punt.ok ? "text-[var(--mp-text-secondary)]" : "text-[var(--mp-text-primary)]"}`}>
                {punt.label}
              </p>
              {!punt.ok && punt.uitleg && <p className="text-xs text-[var(--mp-text-secondary)] mt-0.5">{punt.uitleg}</p>}
            </div>
            {!punt.ok && (
              <Link
                href={punt.actie.web_pad}
                className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[var(--mp-accent)] py-1"
              >
                {punt.actie.label}
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
