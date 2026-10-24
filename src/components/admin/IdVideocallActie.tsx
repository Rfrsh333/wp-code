"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Admin → medewerker → Documenten: "ID gecontroleerd via videocall". De admin heeft het ID in een
 * videocall gezien (zonder foto of schermafbeelding) en vult de vervaldatum in. Er komt een
 * goedgekeurd id_bewijs zonder bestand (methode videocall). Alleen zichtbaar met de ID-controle via
 * Didit aan.
 */
export default function IdVideocallActie({ medewerkerId, onKlaar }: { medewerkerId: string; onKlaar: () => void }) {
  const [open, setOpen] = useState(false);
  const [vervaldatum, setVervaldatum] = useState("");
  const [opmerking, setOpmerking] = useState("");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ tekst: string; fout: boolean } | null>(null);

  const opslaan = async () => {
    if (!vervaldatum) {
      setMelding({ tekst: "Vul de vervaldatum van het ID in", fout: true });
      return;
    }
    setBezig(true);
    setMelding(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/medewerkers", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "id_videocall",
          id: medewerkerId,
          data: { vervaldatum, opmerking: opmerking.trim() || undefined },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMelding({ tekst: data.error || "Opslaan mislukt", fout: true });
        return;
      }
      setMelding({ tekst: "ID goedgekeurd (videocall).", fout: false });
      setOpen(false);
      setVervaldatum("");
      setOpmerking("");
      onKlaar();
    } finally {
      setBezig(false);
    }
  };

  return (
    <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-neutral-600">ID in een videocall gezien? Leg het vast zonder kopie.</p>
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 rounded-lg bg-white border border-neutral-200 text-sm font-medium text-neutral-800 hover:border-[#F27501]"
          >
            ID gecontroleerd via videocall
          </button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto] sm:items-end">
          <label className="block">
            <span className="block text-xs font-semibold text-neutral-500 mb-1">Vervaldatum ID</span>
            <input
              type="date"
              value={vervaldatum}
              onChange={(e) => setVervaldatum(e.target.value)}
              disabled={bezig}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-neutral-500 mb-1">Opmerking (optioneel)</span>
            <input
              type="text"
              value={opmerking}
              onChange={(e) => setOpmerking(e.target.value)}
              maxLength={2000}
              disabled={bezig}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={opslaan}
              disabled={bezig}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              Goedkeuren
            </button>
            <button
              onClick={() => setOpen(false)}
              disabled={bezig}
              className="px-3 py-2 rounded-lg text-sm text-neutral-600 hover:text-neutral-900"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
      {melding && <p className={`mt-2 text-sm ${melding.fout ? "text-red-600" : "text-green-700"}`}>{melding.tekst}</p>}
    </div>
  );
}
