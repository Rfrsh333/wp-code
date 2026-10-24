"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { isEerNationaliteit, normaliseerLandcode } from "@/lib/id-check/regels";
import { DOCUMENTSOORTEN, KOPIE_NODIG_TEKST, LANDEN, landNaam } from "@/lib/id-check/controlerecord";

/**
 * Admin: "ID gecontroleerd via videocall" (juridisch advies punt 2). De admin legt het controlerecord
 * vast: uitslag, naam en geboortedatum (voorgevuld uit het profiel, aan te passen naar het document),
 * nationaliteit, documentsoort, documentnummer en vervaldatum. Datum en beoordelaar vult de server in.
 * Bij een nationaliteit buiten de EER/Zwitserland kan een videocall niet goedkeuren: dan legt de admin
 * vast dat er een kopie nodig is (Wav art. 15) en mag de werknemer zijn ID uploaden.
 * Gebruikt in IdVideocallActie (medewerker → Documenten) en IdChecksPaneel (videocall-verzoeken).
 */

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

type Uitslag = "goedgekeurd" | "afgewezen";

export default function IdControleFormulier({
  medewerkerId,
  profielNaam,
  profielGeboortedatum,
  onKlaar,
  onAnnuleren,
}: {
  medewerkerId: string;
  profielNaam: string | null;
  profielGeboortedatum: string | null;
  onKlaar: (melding: string) => void;
  onAnnuleren?: () => void;
}) {
  const [uitslag, setUitslag] = useState<Uitslag>("goedgekeurd");
  const [naam, setNaam] = useState(profielNaam ?? "");
  const [geboortedatum, setGeboortedatum] = useState(profielGeboortedatum && DATUM.test(profielGeboortedatum) ? profielGeboortedatum : "");
  const [nationaliteit, setNationaliteit] = useState("");
  const [documentsoort, setDocumentsoort] = useState("");
  const [documentnummer, setDocumentnummer] = useState("");
  const [vervaldatum, setVervaldatum] = useState("");
  const [reden, setReden] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const landcode = normaliseerLandcode(nationaliteit);
  const eer = isEerNationaliteit(nationaliteit);
  const kopieNodig = uitslag === "goedgekeurd" && eer === false;

  const verstuur = async (gekozen: Uitslag | "kopie_nodig") => {
    setFout(null);
    if (!documentsoort || !landcode || !vervaldatum || naam.trim().length < 2 || !geboortedatum) {
      setFout("Vul naam, geboortedatum, nationaliteit, documentsoort en vervaldatum in");
      return;
    }
    if (gekozen === "goedgekeurd" && !documentnummer.trim()) {
      setFout("Vul het documentnummer in (nooit het BSN)");
      return;
    }
    if (gekozen === "afgewezen" && reden.trim().length < 3) {
      setFout("Geef een reden voor het afwijzen (de werknemer ziet deze tekst)");
      return;
    }
    if (gekozen === "afgewezen" && !confirm(`ID van ${naam.trim()} afwijzen?`)) return;

    setBezig(true);
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
          data: {
            uitslag: gekozen,
            naam: naam.trim(),
            geboortedatum,
            nationaliteit: landcode,
            documentsoort,
            documentnummer: documentnummer.trim() || undefined,
            vervaldatum,
            reden: reden.trim() || undefined,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(data.error || "Opslaan mislukt");
        return;
      }
      onKlaar(
        gekozen === "goedgekeurd"
          ? `ID van ${naam.trim()} goedgekeurd (videocall).`
          : gekozen === "afgewezen"
            ? `ID van ${naam.trim()} afgewezen.`
            : `Vastgelegd: ${naam.trim()} moet een kopie van het ID uploaden (Wav).`,
      );
    } finally {
      setBezig(false);
    }
  };

  const veld = "w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white";
  const label = "block text-xs font-semibold text-neutral-500 mb-1";

  return (
    <div className="space-y-3">
      <fieldset className="flex flex-wrap gap-4 text-sm" disabled={bezig}>
        <legend className="sr-only">Uitslag</legend>
        {(["goedgekeurd", "afgewezen"] as const).map((u) => (
          <label key={u} className="inline-flex items-center gap-2">
            <input type="radio" name={`uitslag-${medewerkerId}`} checked={uitslag === u} onChange={() => setUitslag(u)} />
            {u === "goedgekeurd" ? "Goedgekeurd" : "Afgewezen"}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Naam zoals op het document</span>
          <input type="text" value={naam} onChange={(e) => setNaam(e.target.value)} maxLength={200} disabled={bezig} className={veld} />
        </label>
        <label className="block">
          <span className={label}>Geboortedatum</span>
          <input type="date" value={geboortedatum} onChange={(e) => setGeboortedatum(e.target.value)} disabled={bezig} className={veld} />
        </label>
        <label className="block">
          <span className={label}>Nationaliteit (landcode, zoals NLD)</span>
          <input
            type="text"
            value={nationaliteit}
            onChange={(e) => setNationaliteit(e.target.value.toUpperCase())}
            maxLength={3}
            list={`landen-${medewerkerId}`}
            disabled={bezig}
            className={veld}
            placeholder="NLD"
          />
          <datalist id={`landen-${medewerkerId}`}>
            {LANDEN.map((l) => (
              <option key={l.code} value={l.code}>
                {l.naam}
              </option>
            ))}
          </datalist>
          {landcode && (
            <span className={`mt-1 block text-xs ${eer ? "text-green-700" : "text-amber-700"}`}>
              {landNaam(landcode)} · {eer ? "EER/Zwitserland" : "buiten de EER/Zwitserland"}
            </span>
          )}
        </label>
        <label className="block">
          <span className={label}>Documentsoort</span>
          <select value={documentsoort} onChange={(e) => setDocumentsoort(e.target.value)} disabled={bezig} className={veld}>
            <option value="">Kies…</option>
            {DOCUMENTSOORTEN.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Documentnummer {uitslag === "goedgekeurd" ? "" : "(optioneel)"}</span>
          <input
            type="text"
            value={documentnummer}
            onChange={(e) => setDocumentnummer(e.target.value.toUpperCase())}
            maxLength={20}
            disabled={bezig}
            className={veld}
            placeholder="Nooit het BSN"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className={label}>Vervaldatum</span>
          <input type="date" value={vervaldatum} onChange={(e) => setVervaldatum(e.target.value)} disabled={bezig} className={veld} />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>{uitslag === "afgewezen" ? "Reden (de werknemer ziet deze tekst)" : "Opmerking (optioneel)"}</span>
          <input type="text" value={reden} onChange={(e) => setReden(e.target.value)} maxLength={2000} disabled={bezig} className={veld} />
        </label>
      </div>

      {kopieNodig && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{KOPIE_NODIG_TEKST}</p>}
      <p className="text-xs text-neutral-500">
        Datum en beoordelaar (jij) worden automatisch vastgelegd. Maak geen foto of schermafbeelding van het ID. Neem het
        documentnummer over, nooit het BSN.
      </p>
      {fout && <p className="text-sm text-red-600">{fout}</p>}

      <div className="flex flex-wrap gap-2">
        {uitslag === "afgewezen" ? (
          <button
            onClick={() => void verstuur("afgewezen")}
            disabled={bezig}
            className="px-4 py-2 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
          >
            Afwijzen
          </button>
        ) : kopieNodig ? (
          <button
            onClick={() => void verstuur("kopie_nodig")}
            disabled={bezig}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            Vastleggen: kopie nodig
          </button>
        ) : (
          <button
            onClick={() => void verstuur("goedgekeurd")}
            disabled={bezig}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            ID gecontroleerd via videocall
          </button>
        )}
        {onAnnuleren && (
          <button onClick={onAnnuleren} disabled={bezig} className="px-3 py-2 rounded-lg text-sm text-neutral-600 hover:text-neutral-900">
            Annuleren
          </button>
        )}
      </div>
    </div>
  );
}
