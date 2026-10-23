"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { actieLabel, meldingTijd, veiligeMeldingUrl, type MeldingUserType } from "@/lib/meldingen/meldingen-regels";
import { useMarkeerGelezen, useMeldingenLijst, type Melding, type MeldingTab } from "./useMeldingen";

/**
 * Meldingencentrum (stap 5), gedeeld door het werknemers- en het werkgeversportaal.
 * Tabs Alles / Diensten / Uren & geld, "Alles gelezen" en tikbare kaarten (titel, tijd, tekst,
 * actieknop). Een tik markeert de melding als gelezen en opent de url; het klantportaal vangt zijn
 * eigen tab-urls af via `onOpenUrl` (één pagina met tabs).
 */

const TABS: { id: MeldingTab; label: string }[] = [
  { id: "alles", label: "Alles" },
  { id: "diensten", label: "Diensten" },
  { id: "uren_geld", label: "Uren & geld" },
];

const LEEG: Record<MeldingTab, string> = {
  alles: "Je hebt nog geen meldingen. Nieuwe diensten, planning en uren verschijnen hier.",
  diensten: "Geen meldingen over diensten.",
  uren_geld: "Geen meldingen over uren of geld.",
  account: "Geen meldingen over je account.",
};

const LEEG_KLANT: Record<MeldingTab, string> = {
  alles: "U heeft nog geen meldingen. Aanmeldingen, uren en facturen verschijnen hier.",
  diensten: "Geen meldingen over diensten.",
  uren_geld: "Geen meldingen over uren of facturen.",
  account: "Geen meldingen over uw account.",
};

type Thema = {
  kaart: string;
  kaartOngelezen: string;
  tekst1: string;
  tekst2: string;
  tekst3: string;
  rand: string;
  segment: string;
  segmentActief: string;
  stip: string;
  badge: string;
  actie: string;
  knop: string;
};

const THEMA: Record<MeldingUserType, Thema> = {
  medewerker: {
    kaart: "bg-[var(--mp-card)] rounded-[var(--mp-radius)] shadow-[var(--mp-shadow)]",
    kaartOngelezen: "ring-1 ring-[var(--mp-accent)]/40",
    tekst1: "text-[var(--mp-text-primary)]",
    tekst2: "text-[var(--mp-text-secondary)]",
    tekst3: "text-[var(--mp-text-tertiary)]",
    rand: "border-[var(--mp-separator)]",
    segment: "bg-[var(--mp-card)] shadow-[var(--mp-shadow)]",
    segmentActief: "bg-[var(--mp-accent)] text-[#1D1B19]",
    stip: "bg-[var(--mp-accent)]",
    badge: "bg-[var(--mp-danger)] text-white",
    actie: "bg-[var(--mp-accent)] text-[#1D1B19]",
    knop: "text-[var(--mp-text-primary)] bg-[var(--mp-card)] shadow-[var(--mp-shadow)]",
  },
  klant: {
    kaart: "bg-white rounded-2xl border border-[var(--kp-border)] shadow-sm",
    kaartOngelezen: "ring-1 ring-[var(--kp-accent)]/50",
    tekst1: "text-[var(--kp-text-primary)]",
    tekst2: "text-[var(--kp-text-secondary)]",
    tekst3: "text-[var(--kp-text-tertiary)]",
    rand: "border-[var(--kp-border)]",
    segment: "bg-white border border-[var(--kp-border)]",
    segmentActief: "bg-[var(--kp-primary)] text-white",
    stip: "bg-[var(--kp-accent)]",
    badge: "bg-[var(--kp-accent)] text-[#1D1B19]",
    actie: "bg-[var(--kp-primary)] text-white",
    knop: "text-[var(--kp-text-primary)] bg-white border border-[var(--kp-border)]",
  },
};

export default function MeldingenCentrum({
  rol,
  titelNiveau = "h1",
  onOpenUrl,
}: {
  rol: MeldingUserType;
  titelNiveau?: "h1" | "h2";
  /** Geeft true als de url zelf is afgehandeld (bv. een tab in het klantportaal). */
  onOpenUrl?: (url: string) => boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<MeldingTab>("alles");
  const lijst = useMeldingenLijst(rol, tab);
  const gelezen = useMarkeerGelezen(rol);
  const t = THEMA[rol];
  const Titel = titelNiveau;

  const pagina0 = lijst.data?.pages[0];
  const ongelezen = pagina0?.ongelezen;
  const meldingen = lijst.data?.pages.flatMap((p) => p.meldingen) ?? [];
  const ongelezenInTab = !ongelezen ? 0 : tab === "alles" ? ongelezen.totaal : ongelezen.per_categorie[tab];
  const nu = new Date();

  const open = (m: Melding) => {
    if (!m.gelezen) {
      gelezen.mutate({ id: m.id }, { onError: (e) => Sentry.captureException(e) });
    }
    const url = veiligeMeldingUrl(m.url);
    if (!url) return;
    if (onOpenUrl?.(url)) return;
    router.push(url);
  };

  const allesGelezen = () => {
    gelezen.mutate(tab === "alles" ? { alles: true } : { alles: true, categorie: tab }, {
      onError: (e) => Sentry.captureException(e),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Titel className={`text-2xl font-bold ${t.tekst1}`}>Meldingen</Titel>
        <button
          type="button"
          onClick={allesGelezen}
          disabled={ongelezenInTab === 0 || gelezen.isPending}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40 ${t.knop}`}
        >
          <CheckCheck className="w-4 h-4" aria-hidden />
          Alles gelezen
        </button>
      </div>

      <div role="tablist" aria-label="Soort meldingen" className={`flex gap-1 p-1 rounded-xl ${t.segment}`}>
        {TABS.map((item) => {
          const actief = tab === item.id;
          const aantal = !ongelezen ? 0 : item.id === "alles" ? ongelezen.totaal : ongelezen.per_categorie[item.id];
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={actief}
              onClick={() => setTab(item.id)}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                actief ? t.segmentActief : t.tekst2
              }`}
            >
              <span className="truncate">{item.label}</span>
              {/* Elke lijst-respons telt alle categorieën, dus de tellers kloppen op elke tab. */}
              {aantal > 0 && (
                <span className={`shrink-0 min-w-5 h-5 px-1 rounded-full text-[11px] font-bold flex items-center justify-center ${t.badge}`}>
                  {aantal > 99 ? "99+" : aantal}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {lijst.isLoading ? (
        <div className="flex justify-center py-12" aria-label="Meldingen laden">
          <div className="w-8 h-8 border-[3px] border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : lijst.isError ? (
        <div className={`${t.kaart} p-4 text-sm ${t.tekst2}`}>
          Meldingen ophalen is niet gelukt.{" "}
          <button type="button" onClick={() => void lijst.refetch()} className={`font-semibold underline ${t.tekst1}`}>
            Opnieuw proberen
          </button>
        </div>
      ) : pagina0 && !pagina0.beschikbaar ? (
        <div className={`${t.kaart} p-6 text-center text-sm ${t.tekst2}`}>Het meldingenoverzicht komt binnenkort beschikbaar.</div>
      ) : meldingen.length === 0 ? (
        <div className={`${t.kaart} p-8 flex flex-col items-center text-center gap-3`}>
          <Bell className={`w-8 h-8 ${t.tekst3}`} aria-hidden />
          <p className={`text-sm ${t.tekst2}`}>{(rol === "klant" ? LEEG_KLANT : LEEG)[tab]}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {meldingen.map((m) => {
            const label = actieLabel(m.url);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => open(m)}
                  className={`w-full text-left p-4 flex gap-3 transition-transform active:scale-[0.99] ${t.kaart} ${m.gelezen ? "" : t.kaartOngelezen}`}
                >
                  <span className="pt-1.5 shrink-0 w-2.5" aria-hidden>
                    {!m.gelezen && <span className={`block w-2.5 h-2.5 rounded-full ${t.stip}`} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={`text-[15px] leading-snug ${m.gelezen ? "font-medium" : "font-bold"} ${t.tekst1}`}>
                        {m.titel}
                        {!m.gelezen && <span className="sr-only"> (ongelezen)</span>}
                      </span>
                      <time dateTime={m.created_at} className={`shrink-0 text-xs ${t.tekst3}`}>
                        {meldingTijd(m.created_at, nu)}
                      </time>
                    </span>
                    {m.tekst && <span className={`block mt-1 text-sm leading-relaxed ${t.tekst2}`}>{m.tekst}</span>}
                    {label && (
                      <span className={`mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${t.actie}`}>
                        {label}
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden />
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {lijst.hasNextPage && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void lijst.fetchNextPage()}
            disabled={lijst.isFetchingNextPage}
            className={`px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 ${t.knop}`}
          >
            {lijst.isFetchingNextPage ? "Laden…" : "Oudere meldingen"}
          </button>
        </div>
      )}
      <p className={`text-xs text-center ${t.tekst3}`}>Meldingen worden 90 dagen bewaard.</p>
    </div>
  );
}
