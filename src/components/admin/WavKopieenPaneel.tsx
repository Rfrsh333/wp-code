"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { zoekWavKopieen, type WavKopieItem } from "@/lib/id-check/wav-kopieen-overzicht";

/**
 * Admin → Medewerkers: Wav-kopieën van het ID (werknemers van buiten de EER/Zwitserland, Wav art. 15),
 * van bestaande én verwijderde accounts. Zo vindt de beheerder een kopie terug als de
 * Arbeidsinspectie vraagt wie er werkte. Alleen owner en operations (de API geeft anderen 403; dan
 * toont dit paneel niets). Openen geeft een link van 5 minuten en komt in de audit-log. Geen
 * verwijderknop: opruimen gaat via de retentie-cron na de bewaartermijn.
 */

type Antwoord = { migratie: boolean; items: WavKopieItem[] };

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
}

function datumNl(waarde: string | null): string {
  if (!waarde) return "-";
  const d = new Date(DATUM.test(waarde) ? `${waarde}T12:00:00` : waarde);
  return Number.isNaN(d.getTime()) ? waarde : d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function KopieRegel({ item }: { item: WavKopieItem }) {
  const [link, setLink] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  // Kortlevende link (5 minuten); als gewone link, zodat geen pop-upblokkering in de weg zit.
  const open = async () => {
    setFout(null);
    setLink(null);
    setBezig(true);
    try {
      const res = await fetch("/api/admin/wav-kopieen", {
        method: "POST",
        headers: { ...(await authHeader()), "Content-Type": "application/json" },
        body: JSON.stringify({ actie: "open", bron: item.bron, id: item.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setFout(data.error || "De kopie kon niet worden geopend");
        return;
      }
      setLink(data.url);
    } catch {
      setFout("De kopie kon niet worden geopend");
    } finally {
      setBezig(false);
    }
  };

  return (
    <tr className="align-top">
      <td className="py-3 pr-4">
        <span className="font-medium text-neutral-900">{item.naam ?? "Onbekend"}</span>
        {!item.goedgekeurd && <span className="ml-2 text-xs text-amber-700">nog niet beoordeeld</span>}
        {link && (
          <p className="mt-1 text-sm">
            <a href={link} target="_blank" rel="noopener noreferrer" className="font-medium text-[#F27501] hover:text-[#d96800]">
              Kopie openen
            </a>{" "}
            <span className="text-neutral-500">(link 5 minuten geldig; download of bewaar hem niet)</span>
          </p>
        )}
        {fout && <p className="mt-1 text-sm text-red-600">{fout}</p>}
      </td>
      <td className="py-3 pr-4 whitespace-nowrap">
        {item.account_bestaat ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Bestaat</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">Verwijderd</span>
        )}
      </td>
      <td className="py-3 pr-4 whitespace-nowrap">{datumNl(item.vervaldatum)}</td>
      <td className="py-3 pr-4 whitespace-nowrap">{datumNl(item.geupload_op)}</td>
      <td className="py-3 pr-4 whitespace-nowrap" title={item.bewaar_tot_voorlopig ? "Schuift mee zolang de werknemer werkt" : undefined}>
        {datumNl(item.bewaar_tot)}
        {item.bewaar_tot_voorlopig && item.bewaar_tot ? <span className="text-neutral-500"> (voorlopig)</span> : null}
      </td>
      <td className="py-3 text-right">
        <button
          onClick={() => void open()}
          disabled={bezig}
          className="px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-sm text-neutral-800 hover:border-[#F27501] disabled:opacity-50"
        >
          Openen
        </button>
      </td>
    </tr>
  );
}

export default function WavKopieenPaneel() {
  const [antwoord, setAntwoord] = useState<Antwoord | null>(null);
  const [open, setOpen] = useState(false);
  const [zoek, setZoek] = useState("");

  const laad = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/wav-kopieen", { headers: await authHeader(), cache: "no-store" });
      if (res.ok) setAntwoord((await res.json()) as Antwoord);
    } catch {
      // Paneel is optioneel; bij een fout (of geen rechten) gewoon niet tonen.
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await laad();
    })();
  }, [laad]);

  const gevonden = useMemo(() => zoekWavKopieen(antwoord?.items ?? [], zoek), [antwoord, zoek]);

  if (!antwoord) return null;
  const verwijderd = antwoord.items.filter((i) => !i.account_bestaat).length;

  return (
    <section className="mb-6 bg-white rounded-2xl shadow-sm overflow-hidden" aria-labelledby="wav-kopieen-titel">
      <button onClick={() => setOpen((o) => !o)} className="w-full px-6 py-4 flex items-center justify-between text-left">
        <span>
          <span id="wav-kopieen-titel" className="block text-lg font-semibold text-neutral-900">
            Wav-kopieën ({antwoord.items.length}
            {verwijderd ? `, ${verwijderd} van verwijderde accounts` : ""})
          </span>
          <span className="block text-sm text-neutral-500">
            Kopieën van het ID van werknemers van buiten de EER/Zwitserland, voor als de Arbeidsinspectie vraagt wie er werkte.
          </span>
        </span>
        <span className="text-sm text-neutral-500">{open ? "Sluiten" : "Openen"}</span>
      </button>

      {open && (
        <>
          <div className="px-6 pb-4 space-y-3 border-b border-neutral-100">
            {!antwoord.migratie && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Migratie 20261024_id_wav_kopieen.sql is nog niet gedraaid: alleen kopieën van bestaande accounts.
              </p>
            )}
            <p className="text-sm text-neutral-600">
              Openen geeft een link van 5 minuten en komt in de audit-log. Na de bewaartermijn ruimt de retentie-cron de kopie op.
            </p>
            <label className="block max-w-sm">
              <span className="sr-only">Zoek op naam</span>
              <input
                type="search"
                value={zoek}
                onChange={(e) => setZoek(e.target.value)}
                placeholder="Zoek op naam"
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white"
              />
            </label>
          </div>
          <div className="px-6 py-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs text-neutral-500">
                <tr>
                  <th className="py-2 pr-4">Naam</th>
                  <th className="py-2 pr-4">Account</th>
                  <th className="py-2 pr-4">Vervaldatum ID</th>
                  <th className="py-2 pr-4">Geüpload op</th>
                  <th className="py-2 pr-4">Bewaren tot</th>
                  <th className="py-2">
                    <span className="sr-only">Actie</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {gevonden.map((item) => (
                  <KopieRegel key={item.sleutel} item={item} />
                ))}
                {gevonden.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-3 text-neutral-500">
                      {antwoord.items.length === 0 ? "Geen Wav-kopieën." : "Geen kopie gevonden met deze naam."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
