"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";

/**
 * Stap 6 "Geld": uitbetalen aan zzp'ers met zelffacturering (alleen owner/finance).
 * 1. Uitbetaalbaar per medewerker (uren goedgekeurd + klantfactuur betaald) → selecteren.
 * 2. Ronde aanmaken → zelffacturen (PDF) + SEPA-bestand (pain.001.001.03).
 * 3. SEPA-bestand downloaden en ZELF in de bank uploaden. Er gaat hier nooit geld weg.
 * 4. "Verwerkt in bank" markeren → zelffacturen op uitbetaald + push naar de medewerkers.
 * Bedragen komen in hele centen van de server; de server rekent bij het aanmaken alles opnieuw.
 */

type Regel = {
  uren_registratie_id: string;
  datum: string | null;
  werkgever: string;
  uren: number;
  uurtarief_centen: number;
  toeslag_centen: number;
  reiskosten_centen: number;
  bedrag_centen: number;
  klant_factuur_nummer: string | null;
  betaald_op: string | null;
  uiterlijk_uitbetalen: string | null;
};

type Medewerker = {
  medewerker_id: string;
  naam: string;
  iban_gemaskeerd: string | null;
  kor: boolean;
  blokkades: { code: string; label: string }[];
  aantal: number;
  excl_centen: number;
  btw_centen: number;
  incl_centen: number;
  regels: Regel[];
};

type Zelffactuur = {
  id: string;
  factuur_nummer: string;
  factuur_datum: string;
  medewerker_naam: string;
  excl_centen: number;
  btw_centen: number;
  incl_centen: number;
  kor: boolean;
  status: "in_uitbetaalronde" | "uitbetaald";
  iban_laatste4: string | null;
  heeft_pdf: boolean;
};

type Ronde = {
  id: string;
  bericht_id: string;
  status: "aangemaakt" | "verwerkt";
  uitvoer_datum: string;
  aantal_betalingen: number;
  totaal_centen: number;
  aangemaakt_door: string | null;
  aangemaakt_op: string;
  sepa_gedownload_op: string | null;
  sepa_gedownload_door: string | null;
  verwerkt_door: string | null;
  verwerkt_op: string | null;
  facturen: Zelffactuur[];
};

type Overzicht = {
  actief: boolean;
  migratie_ontbreekt: boolean;
  tekst: { versie: string; concept: boolean };
  config: {
    bank_ok: boolean;
    bank_fouten: string[];
    bank_naam: string | null;
    bank_iban_gemaskeerd: string | null;
    termijn_werkdagen: number | null;
    versleuteling_ok: boolean;
  };
  standaard_uitvoerdatum: string;
  uitbetaalbaar: Medewerker[];
  wacht_op_betaling: { aantal: number; excl_centen: number };
  zonder_goedkeuring: {
    uren_registratie_id: string;
    medewerker_naam: string;
    datum: string | null;
    werkgever: string;
    uren: number;
    klant_factuur_nummer: string | null;
    klant_factuur_status: string | null;
  }[];
  conflicten: { uren_registratie_id: string; medewerker_naam: string; datum: string | null; werkgever: string }[];
  rondes: Ronde[];
};

const euro = (centen: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Math.round(centen) / 100);
const datum = (d: string | null) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("nl-NL") : "-");

export default function UitbetalingenTab() {
  const toast = useToast();
  const [data, setData] = useState<Overzicht | null>(null);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [geselecteerd, setGeselecteerd] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [uitvoerDatum, setUitvoerDatum] = useState("");
  const [bezig, setBezig] = useState<string | null>(null);

  const authHeader = async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const haal = useCallback(async () => {
    setLaden(true);
    setFout(null);
    try {
      const res = await fetch("/api/admin/uitbetalingen", { headers: await authHeader() });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setFout(json?.error || "Overzicht laden mislukt");
        return;
      }
      const o = json as Overzicht;
      setData(o);
      setUitvoerDatum((d) => d || o.standaard_uitvoerdatum);
      setGeselecteerd(new Set());
    } catch {
      setFout("Geen verbinding");
    } finally {
      setLaden(false);
    }
  }, []);

  useEffect(() => {
    void haal();
  }, [haal]);

  const selecteerbaar = useMemo(
    () => (data?.uitbetaalbaar ?? []).filter((m) => m.blokkades.length === 0),
    [data],
  );

  const selectie = useMemo(() => {
    let centen = 0;
    let medewerkers = 0;
    for (const m of selecteerbaar) {
      const gekozen = m.regels.filter((r) => geselecteerd.has(r.uren_registratie_id));
      if (gekozen.length === 0) continue;
      medewerkers += 1;
      const excl = gekozen.reduce((t, r) => t + r.bedrag_centen, 0);
      centen += m.kor ? excl : excl + Math.round((excl * 21) / 100);
    }
    return { centen, medewerkers, regels: geselecteerd.size };
  }, [selecteerbaar, geselecteerd]);

  const wissel = (ids: string[], aan: boolean) =>
    setGeselecteerd((huidig) => {
      const nieuw = new Set(huidig);
      for (const id of ids) {
        if (aan) nieuw.add(id);
        else nieuw.delete(id);
      }
      return nieuw;
    });

  const maakRonde = async () => {
    if (!data || geselecteerd.size === 0) return;
    const ok = window.confirm(
      `Uitbetaalronde aanmaken voor ${selectie.medewerkers} medewerker(s), totaal ${euro(selectie.centen)} (indicatie)?\n\n` +
        `Er worden zelffacturen gemaakt met een definitief factuurnummer. Er gaat GEEN geld weg: je downloadt daarna het SEPA-bestand en uploadt het zelf in de bank.`,
    );
    if (!ok) return;
    setBezig("ronde");
    try {
      const res = await fetch("/api/admin/uitbetalingen/rondes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ uren_ids: [...geselecteerd], uitvoer_datum: uitvoerDatum }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const details = json?.details?.medewerkers as { naam: string | null; blokkades: string[] }[] | undefined;
        toast.error(
          details?.length
            ? `${json.error} ${details.map((d) => `${d.naam ?? "?"}: ${d.blokkades.join(", ")}`).join("; ")}`
            : json.error || "Ronde aanmaken mislukt",
        );
        if (res.status === 409) void haal();
        return;
      }
      toast.success(`Ronde aangemaakt: ${json.ronde.aantal_betalingen} betaling(en), ${euro(json.ronde.totaal_centen)}. Download nu het SEPA-bestand.`);
      void haal();
    } catch {
      toast.error("Geen verbinding");
    } finally {
      setBezig(null);
    }
  };

  const downloadSepa = async (ronde: Ronde) => {
    if (
      ronde.sepa_gedownload_op &&
      !window.confirm(
        `Dit SEPA-bestand is al gedownload op ${datum(ronde.sepa_gedownload_op)} door ${ronde.sepa_gedownload_door ?? "?"}.\n\n` +
          `Upload het NIET nog een keer in de bank als het al is verwerkt: dan wordt er dubbel betaald. Toch opnieuw downloaden?`,
      )
    ) {
      return;
    }
    setBezig(`sepa-${ronde.id}`);
    try {
      const res = await fetch(`/api/admin/uitbetalingen/rondes/${ronde.id}/sepa`, { headers: await authHeader() });
      if (!res.ok) {
        toast.error("Downloaden mislukt");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ronde.bericht_id}.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      void haal();
    } catch {
      toast.error("Geen verbinding");
    } finally {
      setBezig(null);
    }
  };

  const markeerVerwerkt = async (ronde: Ronde) => {
    const ok = window.confirm(
      `Heb je het SEPA-bestand van ronde ${ronde.bericht_id} (${euro(ronde.totaal_centen)}) in de bank geüpload en is het verwerkt?\n\nDe zelffacturen gaan op "uitbetaald" en de medewerkers krijgen een pushmelding.`,
    );
    if (!ok) return;
    setBezig(`verwerkt-${ronde.id}`);
    try {
      const res = await fetch(`/api/admin/uitbetalingen/rondes/${ronde.id}/verwerkt`, {
        method: "POST",
        headers: await authHeader(),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Bijwerken mislukt");
        return;
      }
      toast.success(`Ronde verwerkt: ${json.aantal} zelffactuur/zelffacturen op uitbetaald.`);
      void haal();
    } catch {
      toast.error("Geen verbinding");
    } finally {
      setBezig(null);
    }
  };

  const openPdf = async (id: string) => {
    // Venster meteen openen (anders blokkeert de browser de pop-up na het wachten).
    const venster = window.open("", "_blank");
    try {
      const res = await fetch(`/api/admin/uitbetalingen/facturen/${id}/pdf`, { headers: await authHeader() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error();
      if (venster) venster.location.href = json.url;
      else window.location.href = json.url;
    } catch {
      venster?.close();
      toast.error("PDF kon niet worden geladen");
    }
  };

  const keurGoed = async (ids: string[]) => {
    if (!window.confirm(`${ids.length} gefactureerde dienst(en) goedkeuren voor uitbetaling?`)) return;
    setBezig("goedkeuren");
    try {
      const res = await fetch("/api/admin/uitbetalingen/goedkeuren", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ uren_ids: ids }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) toast.error(json.error || "Goedkeuren mislukt");
      else toast.success(`${json.aantal} dienst(en) goedgekeurd`);
      void haal();
    } catch {
      toast.error("Geen verbinding");
    } finally {
      setBezig(null);
    }
  };

  if (laden && !data) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
      </div>
    );
  }
  if (fout || !data) {
    return <div className="bg-white rounded-2xl shadow-sm p-6 text-neutral-600">{fout || "Overzicht niet beschikbaar"}</div>;
  }

  const kanAanmaken =
    data.actief &&
    !data.migratie_ontbreekt &&
    !data.tekst.concept &&
    data.config.bank_ok &&
    data.config.versleuteling_ok &&
    geselecteerd.size > 0 &&
    !!uitvoerDatum;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-neutral-900">Uitbetalingen</h2>
        <button onClick={() => void haal()} className="px-3 py-1.5 bg-neutral-100 rounded-lg text-sm hover:bg-neutral-200">
          Vernieuwen
        </button>
      </div>

      {!data.actief && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Binnenkort</p>
          <p>
            Uitbetalen via zelffacturering staat nog uit (ZELFFACTURERING_ACTIEF). Je kunt het overzicht bekijken, maar nog
            geen ronde aanmaken.
          </p>
        </div>
      )}
      {data.migratie_ontbreekt && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          Migratie <code>20261024_uitbetalen_zelffacturering.sql</code> is nog niet gedraaid: rondes en akkoorden zijn niet beschikbaar.
        </div>
      )}
      {data.actief && data.tekst.concept && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          De akkoordtekst zelffacturering is nog een CONCEPT (versie {data.tekst.versie}). Zolang dat zo is, kan niemand akkoord
          geven en kun je geen ronde aanmaken.
        </div>
      )}
      {!data.config.versleuteling_ok && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          FIELD_ENCRYPTION_KEY is niet ingesteld: rondes aanmaken kan pas als IBAN&apos;s versleuteld kunnen worden opgeslagen.
        </div>
      )}
      {data.conflicten.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Uren op meer dan één klantfactuur (worden niet uitbetaald tot dit is opgelost)</p>
          <ul className="list-disc pl-5">
            {data.conflicten.map((c) => (
              <li key={c.uren_registratie_id}>
                {datum(c.datum)} · {c.medewerker_naam} · {c.werkgever}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!data.config.bank_ok && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">TopTalent-rekening niet ingesteld</p>
          <ul className="list-disc pl-5">
            {data.config.bank_fouten.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-sm text-neutral-500">Uitbetaalbaar</p>
          <p className="text-2xl font-bold text-neutral-900">
            {euro(data.uitbetaalbaar.reduce((t, m) => t + m.incl_centen, 0))}
          </p>
          <p className="text-xs text-neutral-500">{data.uitbetaalbaar.length} medewerker(s), incl. btw</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-sm text-neutral-500">Wacht op betaling werkgever</p>
          <p className="text-2xl font-bold text-neutral-900">{euro(data.wacht_op_betaling.excl_centen)}</p>
          <p className="text-xs text-neutral-500">{data.wacht_op_betaling.aantal} dienst(en), excl. btw</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-sm text-neutral-500">Van rekening</p>
          <p className="text-base font-semibold text-neutral-900">{data.config.bank_naam ?? "—"}</p>
          <p className="text-xs text-neutral-500">
            {data.config.bank_iban_gemaskeerd ?? ""}
            {data.config.termijn_werkdagen ? ` · termijn ${data.config.termijn_werkdagen} werkdagen` : " · termijn niet ingesteld"}
          </p>
        </div>
      </div>

      {/* Uitbetaalbaar per medewerker */}
      <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b">
          <h3 className="font-semibold text-neutral-900">Uitbetaalbaar (werkgever heeft betaald)</h3>
          {selecteerbaar.length > 0 && data.actief && (
            <button
              onClick={() => {
                const alle = selecteerbaar.flatMap((m) => m.regels.map((r) => r.uren_registratie_id));
                if (geselecteerd.size > 0) setGeselecteerd(new Set());
                else wissel(alle, true);
              }}
              className="text-sm text-[#F27501] font-medium"
            >
              {geselecteerd.size > 0 ? "Selectie wissen" : "Alles selecteren"}
            </button>
          )}
        </div>
        {data.uitbetaalbaar.length === 0 ? (
          <p className="px-6 py-8 text-center text-neutral-500">Niets uitbetaalbaar.</p>
        ) : (
          <ul className="divide-y">
            {data.uitbetaalbaar.map((m) => {
              const ids = m.regels.map((r) => r.uren_registratie_id);
              const aantalGekozen = ids.filter((id) => geselecteerd.has(id)).length;
              const geblokkeerd = m.blokkades.length > 0;
              const isOpen = open.has(m.medewerker_id);
              return (
                <li key={m.medewerker_id} className="px-6 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="checkbox"
                      aria-label={`Selecteer ${m.naam}`}
                      disabled={geblokkeerd || !data.actief}
                      checked={aantalGekozen === ids.length && ids.length > 0}
                      ref={(el) => {
                        if (el) el.indeterminate = aantalGekozen > 0 && aantalGekozen < ids.length;
                      }}
                      onChange={(e) => wissel(ids, e.target.checked)}
                      className="w-4 h-4 accent-[#F27501]"
                    />
                    <button
                      onClick={() =>
                        setOpen((o) => {
                          const n = new Set(o);
                          if (n.has(m.medewerker_id)) n.delete(m.medewerker_id);
                          else n.add(m.medewerker_id);
                          return n;
                        })
                      }
                      className="flex-1 min-w-[12rem] text-left"
                    >
                      <span className="font-medium text-neutral-900">{m.naam}</span>
                      <span className="text-sm text-neutral-500">
                        {" "}
                        · {m.aantal} dienst(en) · {m.iban_gemaskeerd ?? "geen IBAN"}
                        {m.kor ? " · KOR" : ""}
                      </span>
                    </button>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-neutral-900">{euro(m.incl_centen)}</p>
                      <p className="text-neutral-500">
                        excl. {euro(m.excl_centen)} · btw {euro(m.btw_centen)}
                      </p>
                    </div>
                  </div>
                  {geblokkeerd && (
                    <p className="mt-2 text-sm text-red-700">Kan niet in een ronde: {m.blokkades.map((b) => b.label).join(", ")}.</p>
                  )}
                  {isOpen && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead className="bg-neutral-50">
                          <tr>
                            <th className="px-3 py-2" />
                            <th className="text-left px-3 py-2 font-medium text-neutral-600">Datum</th>
                            <th className="text-left px-3 py-2 font-medium text-neutral-600">Werkgever</th>
                            <th className="text-right px-3 py-2 font-medium text-neutral-600">Uren</th>
                            <th className="text-right px-3 py-2 font-medium text-neutral-600">Tarief</th>
                            <th className="text-right px-3 py-2 font-medium text-neutral-600">Toeslag + reisk.</th>
                            <th className="text-right px-3 py-2 font-medium text-neutral-600">Bedrag excl.</th>
                            <th className="text-left px-3 py-2 font-medium text-neutral-600">Klantfactuur</th>
                            <th className="text-left px-3 py-2 font-medium text-neutral-600">Uiterlijk</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {m.regels.map((r) => (
                            <tr key={r.uren_registratie_id}>
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  aria-label={`Selecteer dienst ${datum(r.datum)}`}
                                  disabled={geblokkeerd || !data.actief}
                                  checked={geselecteerd.has(r.uren_registratie_id)}
                                  onChange={(e) => wissel([r.uren_registratie_id], e.target.checked)}
                                  className="w-4 h-4 accent-[#F27501]"
                                />
                              </td>
                              <td className="px-3 py-2">{datum(r.datum)}</td>
                              <td className="px-3 py-2">{r.werkgever}</td>
                              <td className="px-3 py-2 text-right">{r.uren.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right">{euro(r.uurtarief_centen)}</td>
                              <td className="px-3 py-2 text-right">{euro(r.toeslag_centen + r.reiskosten_centen)}</td>
                              <td className="px-3 py-2 text-right font-medium">{euro(r.bedrag_centen)}</td>
                              <td className="px-3 py-2 text-neutral-500">
                                {r.klant_factuur_nummer ?? "-"}
                                {r.betaald_op ? ` (betaald ${datum(r.betaald_op)})` : ""}
                              </td>
                              <td className="px-3 py-2 text-neutral-500">{datum(r.uiterlijk_uitbetalen)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-t bg-neutral-50">
          <label className="text-sm text-neutral-600 flex items-center gap-2">
            Uitvoerdatum
            <input
              type="date"
              value={uitvoerDatum}
              onChange={(e) => setUitvoerDatum(e.target.value)}
              className="rounded-lg border px-2 py-1"
            />
          </label>
          <span className="text-sm text-neutral-600">
            {selectie.regels} dienst(en), {selectie.medewerkers} medewerker(s) · {euro(selectie.centen)} incl. btw (indicatie)
          </span>
          <button
            onClick={() => void maakRonde()}
            disabled={!kanAanmaken || bezig === "ronde"}
            className="ml-auto px-4 py-2 bg-[#F27501] text-white rounded-xl font-medium hover:bg-[#d96800] disabled:opacity-50"
          >
            {bezig === "ronde" ? "Ronde wordt aangemaakt..." : data.actief ? "Ronde aanmaken" : "Ronde aanmaken (binnenkort)"}
          </button>
        </div>
      </section>

      {/* Gefactureerd zonder goedkeuring door TopTalent */}
      {data.zonder_goedkeuring.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b">
            <div>
              <h3 className="font-semibold text-neutral-900">Gefactureerd, nog niet goedgekeurd door TopTalent</h3>
              <p className="text-sm text-neutral-500">
                De werkgever heeft deze uren zelf gefactureerd. Uitbetalen kan pas na goedkeuring door TopTalent.
              </p>
            </div>
            <button
              onClick={() => void keurGoed(data.zonder_goedkeuring.map((z) => z.uren_registratie_id))}
              disabled={bezig === "goedkeuren"}
              className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm font-medium hover:bg-green-200 disabled:opacity-50"
            >
              Alles goedkeuren voor uitbetaling
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <tbody className="divide-y">
                {data.zonder_goedkeuring.map((z) => (
                  <tr key={z.uren_registratie_id}>
                    <td className="px-6 py-2">{datum(z.datum)}</td>
                    <td className="px-3 py-2">{z.medewerker_naam}</td>
                    <td className="px-3 py-2">{z.werkgever}</td>
                    <td className="px-3 py-2 text-right">{z.uren.toFixed(2)} uur</td>
                    <td className="px-3 py-2 text-neutral-500">
                      {z.klant_factuur_nummer ?? "-"} {z.klant_factuur_status ? `(${z.klant_factuur_status})` : ""}
                    </td>
                    <td className="px-6 py-2 text-right">
                      <button
                        onClick={() => void keurGoed([z.uren_registratie_id])}
                        disabled={bezig === "goedkeuren"}
                        className="text-[#F27501] font-medium disabled:opacity-50"
                      >
                        Goedkeuren
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Rondes */}
      <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <h3 className="px-6 py-4 border-b font-semibold text-neutral-900">Uitbetaalrondes</h3>
        {data.rondes.length === 0 ? (
          <p className="px-6 py-8 text-center text-neutral-500">Nog geen rondes.</p>
        ) : (
          <ul className="divide-y">
            {data.rondes.map((r) => (
              <li key={r.id} className="px-6 py-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[14rem]">
                    <p className="font-medium text-neutral-900">{r.bericht_id}</p>
                    <p className="text-sm text-neutral-500">
                      {r.aantal_betalingen} betaling(en) · {euro(r.totaal_centen)} · uitvoerdatum {datum(r.uitvoer_datum)} · aangemaakt{" "}
                      {datum(r.aangemaakt_op)} door {r.aangemaakt_door ?? "?"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {r.sepa_gedownload_op ? `SEPA gedownload ${datum(r.sepa_gedownload_op)} door ${r.sepa_gedownload_door ?? "?"}` : "SEPA nog niet gedownload"}
                      {r.verwerkt_op ? ` · verwerkt ${datum(r.verwerkt_op)} door ${r.verwerkt_door ?? "?"}` : ""}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      r.status === "verwerkt" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {r.status === "verwerkt" ? "Verwerkt in bank" : "Klaar voor bank"}
                  </span>
                  <button
                    onClick={() => void downloadSepa(r)}
                    disabled={bezig === `sepa-${r.id}`}
                    className="px-3 py-1.5 bg-neutral-100 rounded-lg text-sm hover:bg-neutral-200 disabled:opacity-50"
                  >
                    SEPA-bestand downloaden
                  </button>
                  {(r.status === "aangemaakt" || r.facturen.some((f) => f.status === "in_uitbetaalronde")) && (
                    <button
                      onClick={() => void markeerVerwerkt(r)}
                      disabled={!r.sepa_gedownload_op || bezig === `verwerkt-${r.id}`}
                      title={r.sepa_gedownload_op ? undefined : "Download eerst het SEPA-bestand"}
                      className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm font-medium hover:bg-green-200 disabled:opacity-50"
                    >
                      Markeer verwerkt in bank
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-neutral-600">Zelffactuur</th>
                        <th className="text-left px-3 py-2 font-medium text-neutral-600">Medewerker</th>
                        <th className="text-right px-3 py-2 font-medium text-neutral-600">Excl.</th>
                        <th className="text-right px-3 py-2 font-medium text-neutral-600">Btw</th>
                        <th className="text-right px-3 py-2 font-medium text-neutral-600">Incl.</th>
                        <th className="text-left px-3 py-2 font-medium text-neutral-600">Rekening</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {r.facturen.map((f) => (
                        <tr key={f.id}>
                          <td className="px-3 py-2 font-medium">{f.factuur_nummer}</td>
                          <td className="px-3 py-2">{f.medewerker_naam}</td>
                          <td className="px-3 py-2 text-right">{euro(f.excl_centen)}</td>
                          <td className="px-3 py-2 text-right">{f.kor ? "KOR" : euro(f.btw_centen)}</td>
                          <td className="px-3 py-2 text-right font-medium">{euro(f.incl_centen)}</td>
                          <td className="px-3 py-2 text-neutral-500">{f.iban_laatste4 ? `••${f.iban_laatste4}` : "-"}</td>
                          <td className="px-3 py-2 text-right">
                            {f.heeft_pdf && (
                              <button onClick={() => void openPdf(f.id)} className="text-[#F27501] font-medium">
                                PDF
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
