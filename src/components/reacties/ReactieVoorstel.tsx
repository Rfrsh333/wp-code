"use client";

/**
 * De extra's van een reactie zoals de werkgever (klantportaal) en TopTalent (admin) ze zien bij het
 * kiezen: wat de werkgever per uur betaalt, de tijden, ± kosten, motivatie, akkoord kleding en
 * automatisch intrekken. De velden komen uit `reactie` van get_aanmeldingen
 * (lib/medewerker/reactie-regels.ts → reactieVoorWerkgever).
 */

export type ReactieWeergave = {
  motivatie: string | null;
  start_tijd: string;
  eind_tijd: string;
  eigen_tijden: boolean;
  klant_uurtarief: number;
  dienst_uurtarief: number;
  eigen_tarief: boolean;
  geschatte_uren: number;
  geschatte_kosten: number;
  kleding_akkoord_op: string | null;
  auto_intrekken_uren: number | null;
  intrekken_op: string | null;
  automatisch_ingetrokken: boolean;
  /** Alleen in de admin: wat de medewerker zelf per uur krijgt. */
  medewerker_uurtarief?: number;
};

const euro = (n: number) => `€ ${n.toFixed(2).replace(".", ",")}`;

function datumTijd(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReactieVoorstel({
  reactie,
  kledingvoorschrift,
  toonMedewerkerTarief = false,
}: {
  reactie: ReactieWeergave | null | undefined;
  /** Kledingvoorschrift van de dienst; alleen dan is "akkoord kleding" zinvol om te tonen. */
  kledingvoorschrift?: string | null;
  /** Admin-weergave: ook wat de medewerker krijgt, en teksten in de derde persoon. */
  toonMedewerkerTarief?: boolean;
}) {
  if (!reactie) return null;
  const duurder = reactie.eigen_tarief && reactie.klant_uurtarief > reactie.dienst_uurtarief;

  return (
    <div className="mt-3 space-y-2 border-t border-neutral-100 pt-3 text-xs text-neutral-600">
      {reactie.automatisch_ingetrokken && (
        <p className="rounded-lg bg-neutral-100 px-2.5 py-1.5 font-medium text-neutral-600">
          Automatisch ingetrokken: de medewerker was op het gekozen moment nog niet gekozen.
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-neutral-50 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">Tijden</p>
          <p className="font-semibold text-neutral-800">
            {reactie.start_tijd} – {reactie.eind_tijd}
          </p>
          <p className="text-neutral-500">{reactie.eigen_tijden ? "Eigen tijden voorgesteld" : "Hele dienst"}</p>
        </div>
        <div className={`rounded-lg px-2.5 py-2 ${duurder ? "bg-amber-50" : "bg-neutral-50"}`}>
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">
            {toonMedewerkerTarief ? "Werkgever betaalt per uur" : "U betaalt per uur"}
          </p>
          <p className={`font-semibold ${duurder ? "text-amber-800" : "text-neutral-800"}`}>{euro(reactie.klant_uurtarief)}</p>
          <p className="text-neutral-500">
            {reactie.eigen_tarief ? `Eigen tarief (dienst: ${euro(reactie.dienst_uurtarief)})` : "Tarief van de dienst"}
          </p>
          {toonMedewerkerTarief && reactie.medewerker_uurtarief != null && (
            <p className="text-neutral-500">Medewerker krijgt {euro(reactie.medewerker_uurtarief)}</p>
          )}
        </div>
        <div className="rounded-lg bg-neutral-50 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">± Kosten</p>
          <p className="font-semibold text-neutral-800">{euro(reactie.geschatte_kosten)}</p>
          <p className="text-neutral-500">{reactie.geschatte_uren.toFixed(1).replace(".", ",")} uur, excl. toeslag en reiskosten</p>
        </div>
      </div>

      {reactie.motivatie && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">Motivatie</p>
          <p className="whitespace-pre-line text-sm text-neutral-800">{reactie.motivatie}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {kledingvoorschrift && (
          <span
            className={`rounded-full px-2.5 py-1 font-medium ${
              reactie.kleding_akkoord_op ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {reactie.kleding_akkoord_op ? "Akkoord met kledingvoorschrift" : "Geen akkoord kleding geregistreerd"}
          </span>
        )}
        {reactie.intrekken_op && !reactie.automatisch_ingetrokken && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-800">
            Vervalt {datumTijd(reactie.intrekken_op)} {toonMedewerkerTarief ? "als er niet gekozen is" : "als u niet kiest"}
          </span>
        )}
      </div>
    </div>
  );
}
