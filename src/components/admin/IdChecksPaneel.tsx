"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Admin → Medewerkers: ID-checks die een mens moet beoordelen (Didit-uitslag die niet automatisch
 * goed kon, of een videocall-verzoek). Goedkeuren/afwijzen door een mens, met reden; alles komt in
 * de audit-log. Leest GET /api/admin/medewerkers/id-checks; staat de functie uit en is er niets open,
 * dan toont het paneel niets.
 */

type Item = {
  id: string;
  medewerker_id: string;
  naam: string | null;
  email: string | null;
  methode: "didit" | "videocall";
  status: "handmatig" | "videocall_gevraagd";
  didit_status: string | null;
  didit_sessienummer: number | null;
  redenen: { code: string; label: string }[];
  vervaldatum: string | null;
  eer: boolean | null;
  naam_komt_overeen: boolean | null;
  documentsoort: string | null;
  uitgifteland: string | null;
  aangemaakt_op: string;
};

type Antwoord = { actief: boolean; migratie: boolean; items: Item[] };

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
}

function janee(waarde: boolean | null): string {
  return waarde === null ? "onbekend" : waarde ? "ja" : "nee";
}

function IdCheckRegel({ item, onKlaar }: { item: Item; onKlaar: (melding: string) => void }) {
  const [vervaldatum, setVervaldatum] = useState(item.vervaldatum ?? "");
  const [reden, setReden] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const isVideocall = item.status === "videocall_gevraagd";

  const verstuur = async (body: Record<string, unknown>, melding: string) => {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/admin/medewerkers", {
        method: "POST",
        headers: { ...(await authHeader()), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(data.error || "Opslaan mislukt");
        return;
      }
      onKlaar(melding);
    } finally {
      setBezig(false);
    }
  };

  const goedkeuren = () => {
    if (!vervaldatum) {
      setFout("Vul de vervaldatum van het ID in");
      return;
    }
    if (isVideocall) {
      void verstuur(
        { action: "id_videocall", id: item.medewerker_id, data: { vervaldatum, opmerking: reden || undefined } },
        `ID van ${item.naam ?? "medewerker"} goedgekeurd (videocall).`,
      );
    } else {
      void verstuur(
        { action: "beoordeel_id_check", data: { verificatie_id: item.id, besluit: "goedgekeurd", vervaldatum, reden: reden || undefined } },
        `ID van ${item.naam ?? "medewerker"} goedgekeurd.`,
      );
    }
  };

  const afwijzen = () => {
    if (reden.trim().length < 3) {
      setFout("Geef een reden voor het afwijzen (de medewerker ziet deze tekst)");
      return;
    }
    if (!confirm(`ID-check van ${item.naam ?? "deze medewerker"} afwijzen?`)) return;
    void verstuur(
      { action: "beoordeel_id_check", data: { verificatie_id: item.id, besluit: "afgewezen", reden: reden.trim() } },
      `ID-check van ${item.naam ?? "medewerker"} afgewezen.`,
    );
  };

  return (
    <li className="px-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-neutral-900">{item.naam ?? "Onbekende medewerker"}</p>
          <p className="text-sm text-neutral-500">{item.email}</p>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${isVideocall ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}
        >
          {isVideocall ? "Videocall gevraagd" : `Handmatig${item.didit_status ? ` · Didit: ${item.didit_status}` : ""}`}
        </span>
      </div>

      {!isVideocall && (
        <>
          {item.redenen.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {item.redenen.map((r) => (
                <span key={r.code} className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded text-xs">
                  {r.label}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-neutral-500">
            {item.documentsoort ?? "Documentsoort onbekend"} · uitgegeven door {item.uitgifteland ?? "?"} · EER/Zwitserland:{" "}
            {janee(item.eer)} · naam klopt: {janee(item.naam_komt_overeen)}
            {item.didit_sessienummer ? ` · Didit-sessie #${item.didit_sessienummer}` : ""}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Bekijk de details in de Didit-console. Na je besluit wordt de sessie (met beelden) bij Didit verwijderd.
            Bij een nationaliteit buiten de EER: controleer ook of de medewerker als zzp&apos;er mag werken.
          </p>
        </>
      )}
      {isVideocall && (
        <p className="mt-2 text-xs text-neutral-500">
          Spreek een videocall af (zie Berichten). Bekijk het ID in beeld, maak geen foto of schermafbeelding, en vul daarna de
          vervaldatum in.
        </p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr]">
        <label className="block">
          <span className="block text-xs font-semibold text-neutral-500 mb-1">Vervaldatum ID</span>
          <input
            type="date"
            value={vervaldatum}
            onChange={(e) => setVervaldatum(e.target.value)}
            disabled={bezig}
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-neutral-500 mb-1">Reden / opmerking (verplicht bij afwijzen)</span>
          <input
            type="text"
            value={reden}
            onChange={(e) => setReden(e.target.value)}
            maxLength={2000}
            disabled={bezig}
            placeholder={isVideocall ? "Bijv. ID gezien in videocall op 24-10" : "Bijv. naam komt overeen, roepnaam"}
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
          />
        </label>
      </div>
      {fout && <p className="mt-2 text-sm text-red-600">{fout}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={goedkeuren}
          disabled={bezig}
          className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {isVideocall ? "ID gecontroleerd via videocall" : "Goedkeuren"}
        </button>
        <button
          onClick={afwijzen}
          disabled={bezig}
          className="px-4 py-2 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
        >
          Afwijzen
        </button>
      </div>
    </li>
  );
}

export default function IdChecksPaneel() {
  const [antwoord, setAntwoord] = useState<Antwoord | null>(null);
  const [melding, setMelding] = useState<string | null>(null);

  const laad = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/medewerkers/id-checks", { headers: await authHeader(), cache: "no-store" });
      if (res.ok) setAntwoord((await res.json()) as Antwoord);
    } catch {
      // Paneel is optioneel; bij een fout gewoon niet tonen.
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await laad();
    })();
  }, [laad]);

  if (!antwoord) return null;
  if (antwoord.actief && !antwoord.migratie) {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        ID-controle via Didit staat aan, maar migratie 20261024_id_verificaties_didit.sql is nog niet gedraaid.
      </div>
    );
  }
  if (antwoord.items.length === 0 && !melding) return null;

  return (
    <section className="mb-6 bg-white rounded-2xl shadow-sm overflow-hidden" aria-labelledby="id-checks-titel">
      <div className="px-6 py-4 border-b border-neutral-100">
        <h3 id="id-checks-titel" className="text-lg font-semibold text-neutral-900">
          ID-checks om te beoordelen ({antwoord.items.length})
        </h3>
        <p className="text-sm text-neutral-500">
          Didit keurt nooit automatisch af: twijfel, een andere naam, een nationaliteit buiten de EER of een verlopen document komt
          hier. Jij beslist.
        </p>
      </div>
      {melding && <p className="px-6 py-3 text-sm text-green-700 bg-green-50">{melding}</p>}
      <ul className="divide-y divide-neutral-100">
        {antwoord.items.map((item) => (
          <IdCheckRegel
            key={item.id}
            item={item}
            onKlaar={(tekst) => {
              setMelding(tekst);
              void laad();
            }}
          />
        ))}
      </ul>
    </section>
  );
}
