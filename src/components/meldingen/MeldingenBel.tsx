"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useMeldingenAantal } from "./useMeldingen";

/**
 * Bel met badge in de kop van de werknemersschermen (Ontdekken, Mijn diensten, Uren). Zonder
 * meldingencentrum (migratie niet gedraaid) blijft hij weg, zodat alles werkt zoals voorheen.
 */
export default function MeldingenBel() {
  const { data } = useMeldingenAantal("medewerker");
  if (!data?.beschikbaar) return null;
  const totaal = data.totaal;

  return (
    <Link
      href="/medewerker/meldingen/"
      className="relative w-10 h-10 shrink-0 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] flex items-center justify-center transition-transform active:scale-95"
      aria-label={totaal > 0 ? `Meldingen, ${totaal} ongelezen` : "Meldingen"}
    >
      <Bell className="w-5 h-5" aria-hidden />
      {totaal > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[var(--mp-danger)] text-white text-[10px] font-bold flex items-center justify-center">
          {totaal > 99 ? "99+" : totaal}
        </span>
      )}
    </Link>
  );
}
