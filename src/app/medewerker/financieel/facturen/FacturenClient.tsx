"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";

/**
 * Stap 6 "Geld": facturen per kwartaal (zoals YoungOnes' Facturenoverzicht): jaarkiezer, kwartaal 1–4,
 * per factuur nummer/datum/bedragen/status/PDF, totalen per kwartaal (btw-aangifte) en CSV-download.
 * Data: GET /api/medewerker/zelffacturen (zelfde endpoint als de app).
 */

type Factuur = {
  id: string;
  factuur_nummer: string;
  factuur_datum: string;
  kwartaal: number;
  bedrag_excl: number;
  btw_percentage: number;
  btw_bedrag: number;
  bedrag_incl: number;
  kor: boolean;
  status: "in_uitbetaalronde" | "uitbetaald";
  status_label: string;
  uitbetaald_op: string | null;
};

type Onderweg = {
  uren_registratie_id: string;
  datum: string | null;
  werkgever: string;
  uren: number;
  bedrag_excl: number;
  status: string;
  status_label: string;
};

type Antwoord = {
  actief: boolean;
  migratie_ontbreekt: boolean;
  jaar: number;
  jaren: number[];
  kwartalen: { kwartaal: number; aantal: number; bedrag_excl: number; btw_bedrag: number; bedrag_incl: number }[];
  facturen: Factuur[];
  onderweg: Onderweg[];
  onderweg_totaal_excl: number;
  uitbetaal_termijn_werkdagen: number | null;
};

const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

const datum = (d: string | null) => {
  if (!d) return "";
  const [j, m, dag] = d.slice(0, 10).split("-");
  return `${dag}-${m}-${j}`;
};

const huidigKwartaal = () => Math.ceil((new Date().getMonth() + 1) / 3);

export default function FacturenClient() {
  const [jaar, setJaar] = useState(() => new Date().getFullYear());
  const [kwartaal, setKwartaal] = useState(huidigKwartaal);
  const [data, setData] = useState<Antwoord | null>(null);
  const [laden, setLaden] = useState(true);

  const haal = useCallback(async (j: number) => {
    setLaden(true);
    try {
      const res = await fetch(`/api/medewerker/zelffacturen?jaar=${j}`);
      const json = await res.json().catch(() => null);
      if (res.ok && json) setData(json as Antwoord);
      else if (res.status !== 401 && res.status !== 403) toast.error("Je facturen konden niet worden geladen.");
    } catch {
      toast.error("Geen verbinding. Probeer het opnieuw.");
    } finally {
      setLaden(false);
    }
  }, []);

  useEffect(() => {
    void haal(jaar);
  }, [haal, jaar]);

  const facturen = useMemo(() => (data?.facturen ?? []).filter((f) => f.kwartaal === kwartaal), [data, kwartaal]);
  const totaal = data?.kwartalen.find((k) => k.kwartaal === kwartaal);
  const jaren = data?.jaren?.length ? data.jaren : [jaar];

  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          <Link href="/medewerker/financieel" className="inline-flex items-center gap-2 text-sm text-[var(--mp-text-secondary)]">
            <ArrowLeft className="w-4 h-4" />
            Financieel overzicht
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-[var(--mp-text-primary)]">Facturen</h1>
            <label className="flex items-center gap-2 text-sm text-[var(--mp-text-secondary)]">
              Jaar
              <select
                value={jaar}
                onChange={(e) => setJaar(Number(e.target.value))}
                className="rounded-lg border border-[var(--mp-separator)] bg-[var(--mp-card)] px-3 py-1.5 text-[var(--mp-text-primary)]"
              >
                {jaren.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {data && !data.actief && (
            <div className="flex items-start gap-3 rounded-[var(--mp-radius)] bg-[var(--mp-card)] shadow-[var(--mp-shadow)] p-4">
              <Clock className="w-5 h-5 text-[var(--mp-accent)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--mp-text-primary)]">Binnenkort</p>
                <p className="text-sm text-[var(--mp-text-secondary)]">
                  Straks maakt TopTalent je facturen namens jou op en vind je ze hier per kwartaal, klaar voor je btw-aangifte.
                </p>
              </div>
            </div>
          )}

          <div role="tablist" aria-label="Kwartaal" className="flex gap-2">
            {[1, 2, 3, 4].map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={kwartaal === k}
                onClick={() => setKwartaal(k)}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                  kwartaal === k
                    ? "bg-[var(--mp-accent)] text-white"
                    : "bg-[var(--mp-card)] text-[var(--mp-text-secondary)] border border-[var(--mp-separator)]"
                }`}
              >
                Kwartaal {k}
              </button>
            ))}
          </div>

          {laden ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <section className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] shadow-[var(--mp-shadow)] p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="font-semibold text-[var(--mp-text-primary)]">
                    Totaal kwartaal {kwartaal} {jaar}
                  </h2>
                  {facturen.length > 0 && (
                    <a
                      href={`/api/medewerker/zelffacturen?jaar=${jaar}&kwartaal=${kwartaal}&formaat=csv`}
                      download
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--mp-accent)]"
                    >
                      <Download className="w-4 h-4" />
                      Download kwartaal (CSV)
                    </a>
                  )}
                </div>
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-[var(--mp-text-secondary)]">Excl. btw</dt>
                    <dd className="font-bold text-[var(--mp-text-primary)]">{euro(totaal?.bedrag_excl ?? 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--mp-text-secondary)]">Btw</dt>
                    <dd className="font-bold text-[var(--mp-text-primary)]">{euro(totaal?.btw_bedrag ?? 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--mp-text-secondary)]">Incl. btw</dt>
                    <dd className="font-bold text-[var(--mp-text-primary)]">{euro(totaal?.bedrag_incl ?? 0)}</dd>
                  </div>
                </dl>
                <p className="text-xs text-[var(--mp-text-tertiary)] mt-3">
                  Op factuurdatum. Dit overzicht is een hulpmiddel; jij blijft zelf verantwoordelijk voor je btw-aangifte.
                </p>
              </section>

              <section className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] shadow-[var(--mp-shadow)]">
                {facturen.length === 0 ? (
                  <p className="p-6 text-center text-sm text-[var(--mp-text-secondary)]">Geen facturen in dit kwartaal.</p>
                ) : (
                  <ul className="divide-y divide-[var(--mp-separator)]">
                    {facturen.map((f) => (
                      <li key={f.id} className="p-4 flex flex-wrap items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--mp-accent)]/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-[var(--mp-accent)]" />
                        </div>
                        <div className="flex-1 min-w-[12rem]">
                          <p className="font-semibold text-[var(--mp-text-primary)]">{f.factuur_nummer}</p>
                          <p className="text-xs text-[var(--mp-text-secondary)]">
                            {datum(f.factuur_datum)} · excl. {euro(f.bedrag_excl)} · {f.kor ? "btw: KOR" : `btw ${euro(f.btw_bedrag)}`}
                          </p>
                          <span
                            className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              f.status === "uitbetaald" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            {f.status_label}
                            {f.status === "uitbetaald" && f.uitbetaald_op ? ` op ${datum(f.uitbetaald_op)}` : ""}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[var(--mp-text-primary)]">{euro(f.bedrag_incl)}</p>
                          <a
                            href={`/api/medewerker/zelffacturen/${f.id}/pdf?redirect=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-[var(--mp-accent)]"
                          >
                            PDF bekijken
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {(data?.onderweg.length ?? 0) > 0 && (
                <section className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] shadow-[var(--mp-shadow)] p-4">
                  <h2 className="font-semibold text-[var(--mp-text-primary)]">Nog niet gefactureerd</h2>
                  <p className="text-sm text-[var(--mp-text-secondary)] mb-3">
                    Deze diensten zijn goedgekeurd. Je factuur volgt bij de uitbetaling, nadat de werkgever heeft betaald
                    {data?.uitbetaal_termijn_werkdagen ? ` (uitbetaling binnen ${data.uitbetaal_termijn_werkdagen} werkdagen daarna)` : ""}.
                  </p>
                  <ul className="divide-y divide-[var(--mp-separator)]">
                    {data!.onderweg.map((o) => (
                      <li key={o.uren_registratie_id} className="py-2 flex items-center justify-between gap-3 text-sm">
                        <div>
                          <p className="text-[var(--mp-text-primary)]">
                            {datum(o.datum)} · {o.werkgever}
                          </p>
                          <p className="text-xs text-[var(--mp-text-secondary)]">{o.status_label}</p>
                        </div>
                        <span className="font-semibold text-[var(--mp-text-primary)] whitespace-nowrap">{euro(o.bedrag_excl)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-[var(--mp-text-tertiary)] mt-2">Bedragen excl. btw, indicatie.</p>
                </section>
              )}

              <p className="text-xs text-[var(--mp-text-tertiary)]">
                Je facturen worden namens jou gemaakt door TopTalent (zelffacturering).{" "}
                <Link href="/medewerker/zelffacturering" className="underline">
                  Bekijk je akkoord
                </Link>
                .
              </p>
            </>
          )}
        </div>
      </div>
    </MedewerkerResponsiveLayout>
  );
}
