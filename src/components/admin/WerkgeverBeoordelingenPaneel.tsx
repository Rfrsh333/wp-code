"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DEELSCORE_KOLOM, DEELSCORE_LABEL, DEELSCORES, kiestBinnenTekst, scoreTekst, type WerkgeverProfielKern } from "@/lib/werkgever-profiel-regels";

/**
 * Klantdetail (admin) → "Beoordelingen door medewerkers" (stap 4 "Vertrouwen zoals YoungOnes").
 * Alleen TopTalent ziet hier namen en opmerkingen. Verbergen (moderatie) haalt een beoordeling uit
 * alle gemiddelden; weer tonen zet hem terug. GET/PATCH /api/admin/klanten/<id>/werkgever-beoordelingen.
 */

type Beoordeling = {
  id: string;
  score: number;
  score_instructies: number | null;
  score_sfeer: number | null;
  score_zoals_beschreven: number | null;
  opmerking: string | null;
  created_at: string;
  verborgen_op: string | null;
  verborgen_door: string | null;
  medewerker: { id: string; naam: string | null } | null;
  dienst: { id: string; datum: string | null; functie: string | null } | null;
};

type Antwoord = { beschikbaar: boolean; beoordelingen: Beoordeling[]; profiel: (WerkgeverProfielKern & { bedrijfsnaam: string }) | null };

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

const datum = (d: string | null | undefined) => (d ? new Date(d.length === 10 ? `${d}T12:00:00Z` : d).toLocaleDateString("nl-NL") : "–");
const sterren = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default function WerkgeverBeoordelingenPaneel({ klantId }: { klantId: string }) {
  const [data, setData] = useState<Antwoord | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState<string | null>(null);

  const laad = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/klanten/${klantId}/werkgever-beoordelingen`, { headers: await authHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(json.error || "Ophalen mislukt");
        return;
      }
      setFout(null);
      setData(json as Antwoord);
    } catch {
      setFout("Ophalen mislukt");
    }
  }, [klantId]);

  useEffect(() => {
    laad();
  }, [laad]);

  const wissel = async (b: Beoordeling) => {
    const verbergen = !b.verborgen_op;
    if (verbergen && !confirm("Deze beoordeling verbergen? Hij telt dan niet meer mee in de gemiddelden.")) return;
    setBezig(b.id);
    try {
      const res = await fetch(`/api/admin/klanten/${klantId}/werkgever-beoordelingen`, {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ beoordeling_id: b.id, verborgen: verbergen }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(json.error || "Bijwerken mislukt");
        return;
      }
      await laad();
    } finally {
      setBezig(null);
    }
  };

  const p = data?.profiel ?? null;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
      <h3 className="font-bold text-neutral-900">Beoordelingen door medewerkers</h3>
      <p className="text-xs text-neutral-500 mb-3">
        Namen en opmerkingen ziet alleen TopTalent. De werkgever en medewerkers zien alleen gemiddelden (vanaf{" "}
        {p?.minimum_waarnemingen ?? 3} waarnemingen).
      </p>

      {fout && <p className="text-sm text-red-700 mb-3">{fout}</p>}
      {data && !data.beschikbaar && (
        <p className="text-sm text-neutral-500">Nog niet beschikbaar: migratie 20261023_werkgever_beoordelingen.sql is nog niet gedraaid.</p>
      )}

      {p && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl bg-neutral-50 p-3">
            <p className="text-xs text-neutral-500">Gemiddelde</p>
            <p className="text-lg font-bold text-neutral-900">{p.gemiddelde != null ? scoreTekst(p.gemiddelde) : "–"}</p>
            <p className="text-xs text-neutral-500">{p.aantal} zichtbaar</p>
          </div>
          {DEELSCORES.map((d) => (
            <div key={d} className="rounded-xl bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">{DEELSCORE_LABEL[d]}</p>
              <p className="text-lg font-bold text-neutral-900">{p.deelscores[d] != null ? scoreTekst(p.deelscores[d] as number) : "–"}</p>
              <p className="text-xs text-neutral-500">{p.waarnemingen.deelscores[d]} ingevuld</p>
            </div>
          ))}
          <div className="rounded-xl bg-neutral-50 p-3">
            <p className="text-xs text-neutral-500">Kiest meestal</p>
            <p className="text-sm font-bold text-neutral-900">{kiestBinnenTekst(p.kiest_binnen_uren) ?? "–"}</p>
            <p className="text-xs text-neutral-500">{p.waarnemingen.beslissingen} beslissingen (90 d)</p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3">
            <p className="text-xs text-neutral-500">Kiest iemand</p>
            <p className="text-sm font-bold text-neutral-900">{p.kies_percentage != null ? `${p.kies_percentage}%` : "–"}</p>
            <p className="text-xs text-neutral-500">{p.waarnemingen.diensten_met_reactie} diensten met reacties</p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3">
            <p className="text-xs text-neutral-500">Betaalt binnen</p>
            <p className="text-sm font-bold text-neutral-900">–</p>
            <p className="text-xs text-neutral-500">Geen betaaldatum vastgelegd</p>
          </div>
        </div>
      )}

      {data?.beschikbaar && data.beoordelingen.length === 0 && <p className="text-sm text-neutral-400">Nog geen beoordelingen.</p>}

      {data && data.beoordelingen.length > 0 && (
        <ul className="divide-y divide-neutral-100">
          {data.beoordelingen.map((b) => (
            <li key={b.id} className={`py-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between ${b.verborgen_op ? "opacity-60" : ""}`}>
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-neutral-900">
                  <span className="text-[#B85300] tracking-wider" aria-label={`${b.score} van 5 sterren`}>
                    {sterren(b.score)}
                  </span>{" "}
                  <span className="font-medium">{b.medewerker?.naam || "Onbekende medewerker"}</span>
                  <span className="text-neutral-500">
                    {" "}
                    · dienst {datum(b.dienst?.datum)}
                    {b.dienst?.functie ? ` (${b.dienst.functie})` : ""} · gegeven {datum(b.created_at)}
                  </span>
                </p>
                <p className="text-xs text-neutral-500">
                  {DEELSCORES.map((d) => `${DEELSCORE_LABEL[d]}: ${b[DEELSCORE_KOLOM[d]] ?? "–"}`).join(" · ")}
                </p>
                {b.opmerking && <p className="text-sm text-neutral-700 whitespace-pre-line rounded-lg bg-neutral-50 p-2">{b.opmerking}</p>}
                {b.verborgen_op && (
                  <p className="text-xs text-amber-700">
                    Verborgen op {datum(b.verborgen_op)}
                    {b.verborgen_door ? ` door ${b.verborgen_door}` : ""}; telt niet mee.
                  </p>
                )}
              </div>
              <button
                onClick={() => wissel(b)}
                disabled={bezig === b.id}
                className="shrink-0 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                {bezig === b.id ? "Bezig…" : b.verborgen_op ? "Weer tonen" : "Verbergen"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
