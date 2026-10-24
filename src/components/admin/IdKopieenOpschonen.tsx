"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isEerNationaliteit, normaliseerLandcode } from "@/lib/id-check/regels";
import { beslisOpschoning, DOCUMENTSOORTEN, LANDEN, landNaam, OPSCHOON_REDENEN } from "@/lib/id-check/controlerecord";

/**
 * Admin → Medewerkers: oude ID-kopieën opschonen (juridisch advies punt 4, 24-10-2026). Alleen voor
 * owner en operations (de API geeft anderen 403; dan toont dit paneel niets).
 *
 * Per kopie bekijkt de admin het document een laatste keer en vult documentsoort, nationaliteit en
 * vervaldatum in (bij een record ook naam, geboortedatum en documentnummer). Daarna beslist de server
 * (beslisOpschoning): EER/Zwitserland → kopie weg, record blijft; buiten de EER → kopie bewaard (Wav);
 * kandidaat die nooit werknemer werd → kopie weg, geen record. Elke actie komt in de opschoonlog.
 */

type Item = {
  sleutel: string;
  bron: "medewerker" | "kandidaat";
  document_id: string;
  medewerker_id: string | null;
  naam: string | null;
  email: string | null;
  geboortedatum: string | null;
  document_status: string | null;
  goedgekeurd: boolean;
  vervaldatum: string | null;
  geupload_op: string | null;
  onboarding_status: string | null;
  werknemer: boolean;
  status: "te_doen" | "bewaard";
  bewaar_tot: string | null;
  record: { methode: string; beslist_op: string | null; volledig: boolean } | null;
  record_nodig: boolean;
  werknemer_heeft_eigen_kopie: boolean;
};

type LogRegel = {
  id: string;
  created_at: string;
  actor_email: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
};

type Antwoord = { migratie: boolean; items: Item[]; log: LogRegel[] };

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

function bronLabel(item: Item): string {
  if (item.bron === "medewerker") return "Werknemer";
  return item.werknemer ? "Kandidaat → werknemer" : "Kandidaat (nooit werknemer)";
}

function recordLabel(item: Item): string {
  if (!item.werknemer) return "geen record nodig";
  if (!item.record) return "nog geen record";
  return `record via ${item.record.methode}${item.record.volledig ? "" : " (onvolledig)"}`;
}

function OpschoonRegel({ item, onKlaar }: { item: Item; onKlaar: (melding: string) => void }) {
  const [open, setOpen] = useState(false);
  const [documentsoort, setDocumentsoort] = useState("");
  const [nationaliteit, setNationaliteit] = useState("");
  const [vervaldatum, setVervaldatum] = useState(item.vervaldatum ?? "");
  const [naam, setNaam] = useState(item.naam ?? "");
  const [geboortedatum, setGeboortedatum] = useState(item.geboortedatum && DATUM.test(item.geboortedatum) ? item.geboortedatum : "");
  const [documentnummer, setDocumentnummer] = useState("");
  const [bsnZichtbaar, setBsnZichtbaar] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const landcode = normaliseerLandcode(nationaliteit);
  const eer = isEerNationaliteit(nationaliteit);
  const voorspelling =
    !item.werknemer || eer !== null
      ? beslisOpschoning({
          bron: item.bron,
          werknemer: item.werknemer,
          eer: item.werknemer ? eer : null,
          goedgekeurd: item.goedgekeurd,
          heeftVolledigRecord: !!item.record?.volledig,
          werknemerHeeftEigenKopie: item.werknemer_heeft_eigen_kopie,
        })
      : null;

  // Kortlevende link (5 minuten); als gewone link, zodat geen pop-upblokkering in de weg zit.
  const [link, setLink] = useState<string | null>(null);
  const bekijk = async () => {
    setFout(null);
    setLink(null);
    try {
      const res = await fetch("/api/admin/id-kopieen", {
        method: "POST",
        headers: { ...(await authHeader()), "Content-Type": "application/json" },
        body: JSON.stringify({ actie: "bekijk", bron: item.bron, document_id: item.document_id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setFout(data.error || "De kopie kon niet worden geopend");
        return;
      }
      setLink(data.url);
    } catch {
      setFout("De kopie kon niet worden geopend");
    }
  };

  const opschonen = async () => {
    setFout(null);
    if (item.werknemer && (!documentsoort || !landcode || !vervaldatum)) {
      setFout("Vul documentsoort, nationaliteit en vervaldatum in zoals op de kopie");
      return;
    }
    if (item.record_nodig && (naam.trim().length < 2 || !geboortedatum || !documentnummer.trim())) {
      setFout("Vul naam, geboortedatum en documentnummer in voor het controlerecord");
      return;
    }
    const tekst =
      voorspelling?.kopie === "bewaren"
        ? "De kopie blijft bewaard volgens de Wav. Doorgaan?"
        : "De kopie wordt definitief uit de opslag verwijderd. Doorgaan?";
    if (!confirm(tekst)) return;

    setBezig(true);
    try {
      const res = await fetch("/api/admin/id-kopieen", {
        method: "POST",
        headers: { ...(await authHeader()), "Content-Type": "application/json" },
        body: JSON.stringify({
          actie: "opschonen",
          bron: item.bron,
          document_id: item.document_id,
          documentsoort: documentsoort || undefined,
          nationaliteit: landcode || undefined,
          vervaldatum: vervaldatum || undefined,
          naam: naam.trim() || undefined,
          geboortedatum: geboortedatum || undefined,
          documentnummer: documentnummer.trim() || undefined,
          bsn_zichtbaar: bsnZichtbaar,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(data.error || "Opschonen mislukt");
        return;
      }
      onKlaar(`${item.naam ?? "Kopie"}: ${data.uitleg ?? "opgeschoond"}`);
    } finally {
      setBezig(false);
    }
  };

  const veld = "w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white";
  const label = "block text-xs font-semibold text-neutral-500 mb-1";

  return (
    <li className="px-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-neutral-900">{item.naam ?? "Onbekend"}</p>
          <p className="text-xs text-neutral-500">
            {bronLabel(item)} · {item.email ?? "geen e-mail"} · geüpload {datumNl(item.geupload_op)} · status{" "}
            {item.document_status ?? "onbekend"}
            {item.onboarding_status ? ` · onboarding: ${item.onboarding_status}` : ""} · {recordLabel(item)}
          </p>
        </div>
        {item.status === "bewaard" ? (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            Bewaard (Wav) tot {datumNl(item.bewaar_tot)}
          </span>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => void bekijk()}
              className="px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-sm text-neutral-800 hover:border-[#F27501]"
            >
              Bekijk kopie
            </button>
            <button
              onClick={() => setOpen((o) => !o)}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700"
            >
              Kopie opschonen
            </button>
          </div>
        )}
      </div>

      {link && (
        <p className="mt-2 text-sm">
          <a href={link} target="_blank" rel="noopener noreferrer" className="font-medium text-[#F27501] hover:text-[#d96800]">
            Kopie openen
          </a>{" "}
          <span className="text-neutral-500">(link 5 minuten geldig; download of bewaar hem niet)</span>
        </p>
      )}

      {open && item.status === "te_doen" && (
        <div className="mt-3 space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          {item.werknemer ? (
            <div className="grid gap-2 sm:grid-cols-3">
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
                <span className={label}>Nationaliteit (landcode)</span>
                <input
                  type="text"
                  value={nationaliteit}
                  onChange={(e) => setNationaliteit(e.target.value.toUpperCase())}
                  maxLength={3}
                  list={`landen-${item.sleutel}`}
                  disabled={bezig}
                  className={veld}
                  placeholder="NLD"
                />
                <datalist id={`landen-${item.sleutel}`}>
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
                <span className={label}>Vervaldatum</span>
                <input type="date" value={vervaldatum} onChange={(e) => setVervaldatum(e.target.value)} disabled={bezig} className={veld} />
              </label>
              {item.record_nodig && (
                <>
                  <label className="block">
                    <span className={label}>Naam zoals op het document</span>
                    <input type="text" value={naam} onChange={(e) => setNaam(e.target.value)} maxLength={200} disabled={bezig} className={veld} />
                  </label>
                  <label className="block">
                    <span className={label}>Geboortedatum</span>
                    <input
                      type="date"
                      value={geboortedatum}
                      onChange={(e) => setGeboortedatum(e.target.value)}
                      disabled={bezig}
                      className={veld}
                    />
                  </label>
                  <label className="block">
                    <span className={label}>Documentnummer (nooit het BSN)</span>
                    <input
                      type="text"
                      value={documentnummer}
                      onChange={(e) => setDocumentnummer(e.target.value.toUpperCase())}
                      maxLength={20}
                      disabled={bezig}
                      className={veld}
                      autoComplete="off"
                    />
                  </label>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-neutral-600">
              Deze kandidaat is nooit werknemer geworden: de kopie wordt verwijderd zonder controlerecord.
              {item.onboarding_status ? " Let op: zit de kandidaat nog in de onboarding, dan kan die opnieuw om een ID vragen." : ""}
            </p>
          )}

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" checked={bsnZichtbaar} onChange={(e) => setBsnZichtbaar(e.target.checked)} disabled={bezig} />
            Er staat een BSN zichtbaar op de kopie (voor de opschoonlog)
          </label>

          {voorspelling && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${voorspelling.kopie === "bewaren" ? "bg-blue-50 text-blue-800" : "bg-amber-50 text-amber-800"}`}
            >
              {OPSCHOON_REDENEN[voorspelling.reden]}
              {voorspelling.record ? " Er wordt een controlerecord vastgelegd." : ""}
            </p>
          )}
          {fout && <p className="text-sm text-red-600">{fout}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => void opschonen()}
              disabled={bezig || (item.werknemer && !voorspelling)}
              className="px-4 py-2 rounded-lg bg-[#F27501] text-white text-sm font-medium hover:bg-[#d96800] disabled:opacity-50"
            >
              {voorspelling?.kopie === "bewaren" ? "Bewaren volgens de Wav" : "Kopie verwijderen"}
            </button>
            <button onClick={() => setOpen(false)} disabled={bezig} className="px-3 py-2 rounded-lg text-sm text-neutral-600 hover:text-neutral-900">
              Annuleren
            </button>
          </div>
        </div>
      )}
      {fout && !open && <p className="mt-2 text-sm text-red-600">{fout}</p>}
    </li>
  );
}

export default function IdKopieenOpschonen() {
  const [antwoord, setAntwoord] = useState<Antwoord | null>(null);
  const [open, setOpen] = useState(false);
  const [toonLog, setToonLog] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  const laad = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/id-kopieen", { headers: await authHeader(), cache: "no-store" });
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

  if (!antwoord) return null;
  if (!antwoord.migratie) {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        ID-kopieën opschonen: migratie 20261024_id_controlerecord_wav.sql is nog niet gedraaid.
      </div>
    );
  }

  const teDoen = antwoord.items.filter((i) => i.status === "te_doen");
  const bewaard = antwoord.items.filter((i) => i.status === "bewaard");

  return (
    <section className="mb-6 bg-white rounded-2xl shadow-sm overflow-hidden" aria-labelledby="id-kopieen-titel">
      <button onClick={() => setOpen((o) => !o)} className="w-full px-6 py-4 flex items-center justify-between text-left">
        <span>
          <span id="id-kopieen-titel" className="block text-lg font-semibold text-neutral-900">
            Oude ID-kopieën opschonen ({teDoen.length} te doen{bewaard.length ? `, ${bewaard.length} bewaard (Wav)` : ""})
          </span>
          <span className="block text-sm text-neutral-500">
            {teDoen.length === 0 ? "Geen oude kopieën meer om op te schonen." : "Kopieën van ID-bewijzen die nog in de opslag staan."}
          </span>
        </span>
        <span className="text-sm text-neutral-500">{open ? "Sluiten" : "Openen"}</span>
      </button>

      {open && (
        <>
          <div className="px-6 pb-4 text-sm text-neutral-600 space-y-1 border-b border-neutral-100">
            <p>
              <strong>Begin met kopieën waarop een BSN zichtbaar is</strong> (bij Nederlandse paspoorten en ID-kaarten vaak het
              geval): die moeten binnen enkele weken weg. De rest uiterlijk 3 maanden na de livegang van de ID-controle via Didit.
            </p>
            <p>
              Bekijk de kopie een laatste keer en vul in wat erop staat. EER/Zwitserland: de kopie wordt verwijderd, de goedkeuring
              en vervaldatum blijven en er komt een controlerecord. Buiten de EER: de kopie blijft bewaard volgens de Wav. Kandidaten
              die nooit werknemer werden: de kopie wordt verwijderd, zonder record.
            </p>
          </div>
          {melding && <p className="px-6 py-3 text-sm text-green-700 bg-green-50">{melding}</p>}
          <ul className="divide-y divide-neutral-100">
            {[...teDoen, ...bewaard].map((item) => (
              <OpschoonRegel
                key={item.sleutel}
                item={item}
                onKlaar={(tekst) => {
                  setMelding(tekst);
                  void laad();
                }}
              />
            ))}
          </ul>
          <div className="px-6 py-4 border-t border-neutral-100">
            <button onClick={() => setToonLog((t) => !t)} className="text-sm font-medium text-[#F27501] hover:text-[#d96800]">
              {toonLog ? "Opschoonlog verbergen" : `Opschoonlog tonen (${antwoord.log.length})`}
            </button>
            {toonLog && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-left text-xs text-neutral-500">
                    <tr>
                      <th className="py-2 pr-4">Wanneer</th>
                      <th className="py-2 pr-4">Wie</th>
                      <th className="py-2 pr-4">Regel</th>
                      <th className="py-2 pr-4">Resultaat</th>
                      <th className="py-2">Waarom</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {antwoord.log.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.created_at).toLocaleString("nl-NL")}</td>
                        <td className="py-2 pr-4">{r.actor_email ?? "-"}</td>
                        <td className="py-2 pr-4">
                          {String(r.metadata?.bron ?? "")} {String(r.metadata?.document_id ?? "").slice(0, 8)}
                        </td>
                        <td className="py-2 pr-4">
                          {r.summary}
                          {r.metadata?.bsn_zichtbaar ? " (BSN zichtbaar)" : ""}
                        </td>
                        <td className="py-2 text-neutral-600">{String(r.metadata?.uitleg ?? "")}</td>
                      </tr>
                    ))}
                    {antwoord.log.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-3 text-neutral-500">
                          Nog niets opgeschoond.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
