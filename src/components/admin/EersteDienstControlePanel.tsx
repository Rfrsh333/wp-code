"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Eerste diensten van nieuwe, zelf geregistreerde klanten die op controle wachten
 * (status in_controle). Goedkeuren zet ze open en stuurt de push naar medewerkers; volgende
 * diensten van die klant gaan daarna direct live. Zie api/admin/diensten/controle.
 */

type ControleItem = {
  klant_id: string;
  klant: { bedrijfsnaam: string | null; contactpersoon: string | null; email: string | null; telefoon: string | null; kvk_nummer?: string | null };
  diensten: { id: string; functie: string | null; aantal_nodig: number | null; datum: string; start_tijd: string; eind_tijd: string; locatie: string | null; uurtarief: number | null }[];
};

export default function EersteDienstControlePanel({ onGewijzigd }: { onGewijzigd: () => void }) {
  const [items, setItems] = useState<ControleItem[]>([]);
  const [bezig, setBezig] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);

  const headers = async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
  };

  const laden = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/diensten/controle", { headers: await headers() });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setItems(data.klanten || []);
    } catch {
      /* lijst blijft leeg */
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { laden(); }, [laden]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const beslis = async (item: ControleItem, actie: "goedkeuren" | "afwijzen") => {
    const naam = item.klant.bedrijfsnaam || "deze klant";
    const vraag =
      actie === "goedkeuren"
        ? `${naam} goedkeuren? De ${item.diensten.length === 1 ? "dienst gaat" : `${item.diensten.length} diensten gaan`} live en medewerkers krijgen een melding. Volgende diensten van ${naam} gaan direct live.`
        : `De ${item.diensten.length === 1 ? "dienst" : "diensten"} van ${naam} annuleren? Medewerkers krijgen niets te zien.`;
    if (!confirm(vraag)) return;
    setBezig(item.klant_id);
    setMelding(null);
    try {
      const res = await fetch("/api/admin/diensten/controle", {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({ klant_id: item.klant_id, actie }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMelding(actie === "goedkeuren" ? `${naam} goedgekeurd: ${data.aantal} dienst(en) staan nu open.` : `${data.aantal} dienst(en) van ${naam} geannuleerd.`);
        await laden();
        onGewijzigd();
      } else {
        setMelding(data.error || "Opslaan mislukt");
      }
    } catch {
      setMelding("Geen verbinding. Probeer het opnieuw.");
    }
    setBezig(null);
  };

  if (items.length === 0 && !melding) return null;

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h3 className="text-base font-bold text-amber-900">Eerste diensten in controle ({items.length})</h3>
      <p className="text-sm text-amber-800 mt-1">
        Nieuwe, zelf geregistreerde klanten. Medewerkers zien deze diensten pas na goedkeuring.
      </p>
      {melding && <p role="status" className="text-sm text-amber-900 mt-3 font-medium">{melding}</p>}
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.klant_id} className="rounded-xl bg-white p-4 border border-amber-100">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-neutral-900">{item.klant.bedrijfsnaam || "Onbekende klant"}</p>
                <p className="text-xs text-neutral-500">
                  {[item.klant.contactpersoon, item.klant.email, item.klant.telefoon, item.klant.kvk_nummer ? `KvK ${item.klant.kvk_nummer}` : "KvK onbekend"]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {item.klant.kvk_nummer && (
                  <a
                    href={`https://www.kvk.nl/zoeken/?source=all&q=${encodeURIComponent(item.klant.kvk_nummer)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#F27501] hover:underline"
                  >
                    Opzoeken bij KvK
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => beslis(item, "afwijzen")}
                  disabled={bezig === item.klant_id}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Afwijzen
                </button>
                <button
                  onClick={() => beslis(item, "goedkeuren")}
                  disabled={bezig === item.klant_id}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#F27501] text-white hover:bg-[#d96800] disabled:opacity-50"
                >
                  {bezig === item.klant_id ? "..." : "Goedkeuren"}
                </button>
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-neutral-700">
              {item.diensten.map((d) => (
                <li key={d.id}>
                  {d.functie} ({d.aantal_nodig || 1}x) · {new Date(`${d.datum}T12:00:00`).toLocaleDateString("nl-NL")} · {d.start_tijd.slice(0, 5)}-{d.eind_tijd.slice(0, 5)}
                  {d.locatie ? ` · ${d.locatie}` : ""}
                  {typeof d.uurtarief === "number" ? ` · € ${d.uurtarief.toFixed(2).replace(".", ",")}/uur` : ""}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
