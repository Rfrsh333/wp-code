"use client";

import { useState } from "react";
import IdControleFormulier from "./IdControleFormulier";

/**
 * Admin → medewerker → Documenten: "ID gecontroleerd via videocall". De admin heeft het ID in een
 * videocall gezien (zonder foto of schermafbeelding) en legt het controlerecord vast (IdControleFormulier).
 * Bij goedkeuren komt er een goedgekeurd id_bewijs zonder bestand (methode videocall). Alleen
 * zichtbaar met de ID-controle via Didit aan.
 */
export default function IdVideocallActie({
  medewerkerId,
  naam,
  geboortedatum,
  onKlaar,
}: {
  medewerkerId: string;
  naam: string | null;
  geboortedatum: string | null;
  onKlaar: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  return (
    <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-neutral-600">ID in een videocall gezien? Leg het vast zonder kopie.</p>
          <button
            onClick={() => {
              setMelding(null);
              setOpen(true);
            }}
            className="px-4 py-2 rounded-lg bg-white border border-neutral-200 text-sm font-medium text-neutral-800 hover:border-[#F27501]"
          >
            ID gecontroleerd via videocall
          </button>
        </div>
      ) : (
        <IdControleFormulier
          medewerkerId={medewerkerId}
          profielNaam={naam}
          profielGeboortedatum={geboortedatum}
          onAnnuleren={() => setOpen(false)}
          onKlaar={(tekst) => {
            setMelding(tekst);
            setOpen(false);
            onKlaar();
          }}
        />
      )}
      {melding && <p className="mt-2 text-sm text-green-700">{melding}</p>}
    </div>
  );
}
