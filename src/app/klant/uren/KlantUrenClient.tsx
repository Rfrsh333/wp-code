"use client";

import { useState, useEffect } from "react";

interface Klant {
  id: string;
  bedrijfsnaam: string;
  contactpersoon: string;
  email: string;
}

interface UrenRegistratie {
  id: string;
  start_tijd: string;
  eind_tijd: string;
  pauze_minuten: number;
  gewerkte_uren: number;
  status: string;
  created_at: string;
  medewerker_naam: string;
  dienst_datum: string;
  dienst_locatie: string;
  uurtarief: number;
}

interface AanpassingModal {
  open: boolean;
  uren: UrenRegistratie | null;
  startTijd: string;
  eindTijd: string;
  pauzeMinuten: string;
  opmerking: string;
}

interface TeBeoordelen {
  dienst_id: string;
  medewerker_id: string;
  medewerker_naam: string;
  datum: string;
  locatie: string;
}

interface DashboardStats {
  pendingHoursCount: number;
  pendingHoursTotal: number;
  approvedHoursThisMonth: number;
  activeDienstenCount: number;
  openFacturenCount: number;
}

interface UpcomingDienst {
  id: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  locatie: string;
  functie: string;
  aantal_nodig: number;
  status: string;
}

interface Factuur {
  id: string;
  factuur_nummer: string;
  periode_start: string;
  periode_eind: string;
  totaal: number;
  status: string;
  created_at: string;
  viewUrl: string;
}

export default function KlantUrenClient({ klant }: { klant: Klant }) {
  const [uren, setUren] = useState<UrenRegistratie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved" | "beoordelen">("pending");
  const [teBeoordeelen, setTeBeoordeelen] = useState<TeBeoordelen[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [upcomingDiensten, setUpcomingDiensten] = useState<UpcomingDienst[]>([]);
  const [recentFacturen, setRecentFacturen] = useState<Factuur[]>([]);
  const [beoordeelModal, setBeoordeelModal] = useState<{ open: boolean; item: TeBeoordelen | null; score: number; opmerking: string }>({ open: false, item: null, score: 5, opmerking: "" });
  const [modal, setModal] = useState<AanpassingModal>({
    open: false,
    uren: null,
    startTijd: "",
    eindTijd: "",
    pauzeMinuten: "0",
    opmerking: "",
  });

  const fetchUren = async () => {
    setIsLoading(true);
    const [urenRes, beoorRes, dashboardRes] = await Promise.all([
      fetch("/api/klant/uren"),
      fetch("/api/klant/beoordelingen"),
      fetch("/api/klant/dashboard"),
    ]);
    const urenData = await urenRes.json();
    const beoorData = await beoorRes.json();
    const dashboardData = await dashboardRes.json();
    setUren(urenData.uren || []);
    setTeBeoordeelen(beoorData.teBeoordeelen || []);
    setDashboardStats(dashboardData.stats || null);
    setUpcomingDiensten(dashboardData.upcomingDiensten || []);
    setRecentFacturen(dashboardData.recentFacturen || []);
    setIsLoading(false);
  };

  useEffect(() => {
    void (async () => {
      await fetchUren();
    })();
  }, []);

  const submitBeoordeling = async () => {
    if (!beoordeelModal.item) return;
    await fetch("/api/klant/beoordelingen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dienst_id: beoordeelModal.item.dienst_id,
        medewerker_id: beoordeelModal.item.medewerker_id,
        score: beoordeelModal.score,
        opmerking: beoordeelModal.opmerking,
      }),
    });
    setBeoordeelModal({ open: false, item: null, score: 5, opmerking: "" });
    fetchUren();
  };

  const approveUren = async (id: string) => {
    await fetch("/api/klant/uren", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", id }),
    });
    fetchUren();
  };

  const openAanpassingModal = (u: UrenRegistratie) => {
    setModal({
      open: true,
      uren: u,
      startTijd: u.start_tijd?.slice(0, 5) || "",
      eindTijd: u.eind_tijd?.slice(0, 5) || "",
      pauzeMinuten: String(u.pauze_minuten || 0),
      opmerking: "",
    });
  };

  const submitAanpassing = async () => {
    if (!modal.uren) return;

    const [startH, startM] = modal.startTijd.split(":").map(Number);
    const [eindH, eindM] = modal.eindTijd.split(":").map(Number);
    const pauze = parseInt(modal.pauzeMinuten) || 0;
    const gewerkteUren = Math.max(0, ((eindH * 60 + eindM) - (startH * 60 + startM) - pauze) / 60);

    await fetch("/api/klant/uren", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "adjust",
        id: modal.uren.id,
        data: {
          startTijd: modal.startTijd,
          eindTijd: modal.eindTijd,
          pauzeMinuten: pauze,
          gewerkteUren: Math.round(gewerkteUren * 100) / 100,
          opmerking: modal.opmerking,
        },
      }),
    });

    setModal({ open: false, uren: null, startTijd: "", eindTijd: "", pauzeMinuten: "0", opmerking: "" });
    fetchUren();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  const formatDateLong = (d: string) => new Date(d).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
  const formatCurrency = (value: number) => `EUR ${value.toFixed(2)}`;
  const formatTime = (value: string) => value?.slice(0, 5) || "-";
  const statusTone: Record<string, string> = {
    ingediend: "bg-amber-100 text-amber-800",
    klant_goedgekeurd: "bg-blue-100 text-blue-800",
    goedgekeurd: "bg-green-100 text-green-800",
    klant_aangepast: "bg-orange-100 text-orange-800",
    verzonden: "bg-blue-100 text-blue-800",
    betaald: "bg-green-100 text-green-800",
    concept: "bg-neutral-200 text-neutral-700",
    open: "bg-blue-100 text-blue-800",
    bezig: "bg-amber-100 text-amber-800",
    vol: "bg-green-100 text-green-800",
  };

  const pending = uren.filter(u => u.status === "ingediend");
  const approved = uren.filter(u => ["klant_goedgekeurd", "goedgekeurd"].includes(u.status));

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff_0%,#fff7f1_42%,#f6f7f9_100%)]">
      <header className="border-b border-white/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#F27501]">Klantdashboard</p>
            <h1 className="text-xl font-bold text-neutral-900">TopTalent Jobs</h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/personeel-aanvragen"
              className="hidden rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 sm:inline-flex"
            >
              Nieuwe aanvraag
            </a>
            <a href="/api/klant/logout" className="text-sm text-neutral-500 transition hover:text-neutral-700">Uitloggen</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-6 overflow-hidden rounded-[28px] bg-neutral-900 text-white shadow-xl shadow-neutral-900/10">
          <div className="grid gap-6 px-6 py-7 md:grid-cols-[1.5fr_1fr] md:px-8">
            <div>
              <p className="mb-3 text-sm font-medium text-orange-200">Welkom terug, {klant.contactpersoon}</p>
              <h2 className="max-w-2xl text-3xl font-bold leading-tight">
                Alles voor je personeelsaanvragen, uren en opvolging op één plek.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
                {klant.bedrijfsnaam} ziet hier direct wat vandaag aandacht vraagt, welke diensten eraan komen en welke uren nog op jouw akkoord wachten.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="/personeel-aanvragen"
                  className="rounded-xl bg-[#F27501] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d96800]"
                >
                  Extra personeel aanvragen
                </a>
                <a
                  href="/contact"
                  className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
                >
                  Contact met TopTalent
                </a>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-neutral-300">Open uren ter controle</p>
                <p className="mt-2 text-3xl font-bold">{dashboardStats?.pendingHoursCount ?? pending.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-neutral-300">Actieve diensten</p>
                <p className="mt-2 text-3xl font-bold">{dashboardStats?.activeDienstenCount ?? 0}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Uren wachten op akkoord",
              value: String(dashboardStats?.pendingHoursCount ?? pending.length),
              helper: `${dashboardStats?.pendingHoursTotal ?? 0} uur open`,
              tone: "bg-amber-50 border-amber-200 text-amber-900",
            },
            {
              label: "Goedgekeurde uren deze maand",
              value: `${dashboardStats?.approvedHoursThisMonth ?? 0} u`,
              helper: "Actueel maandbeeld",
              tone: "bg-green-50 border-green-200 text-green-900",
            },
            {
              label: "Reviews wachten op jou",
              value: String(teBeoordeelen.length),
              helper: "Korte feedback helpt ons sneller schakelen",
              tone: "bg-blue-50 border-blue-200 text-blue-900",
            },
            {
              label: "Open facturen",
              value: String(dashboardStats?.openFacturenCount ?? 0),
              helper: "Laatste 5 facturen in beeld",
              tone: "bg-white border-neutral-200 text-neutral-900",
            },
          ].map((card) => (
            <div key={card.label} className={`rounded-2xl border p-5 ${card.tone}`}>
              <p className="text-sm font-medium">{card.label}</p>
              <p className="mt-3 text-3xl font-bold">{card.value}</p>
              <p className="mt-2 text-sm opacity-80">{card.helper}</p>
            </div>
          ))}
        </section>

        <section className="mb-6 grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-neutral-500">Komende diensten</p>
                <h3 className="text-lg font-bold text-neutral-900">Wat eraan komt</h3>
              </div>
              <a href="/personeel-aanvragen" className="text-sm font-medium text-[#F27501] hover:text-[#d96800]">
                Nieuwe aanvraag
              </a>
            </div>
            <div className="space-y-3">
              {upcomingDiensten.length === 0 ? (
                <div className="rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-500">
                  Nog geen komende diensten zichtbaar. Zodra er shifts ingepland zijn, zie je ze hier direct terug.
                </div>
              ) : (
                upcomingDiensten.map((dienst) => (
                  <div key={dienst.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{dienst.locatie}</p>
                        <p className="mt-1 text-sm text-neutral-500">
                          {formatDateLong(dienst.datum)} · {formatTime(dienst.start_tijd)} - {formatTime(dienst.eind_tijd)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[dienst.status] || "bg-neutral-200 text-neutral-700"}`}>
                        {dienst.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-600">
                      <span className="rounded-full bg-white px-3 py-1">{dienst.functie}</span>
                      <span className="rounded-full bg-white px-3 py-1">{dienst.aantal_nodig} medewerkers</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-sm text-neutral-500">Facturen</p>
              <h3 className="text-lg font-bold text-neutral-900">Recente facturen</h3>
            </div>
            <div className="space-y-3">
              {recentFacturen.length === 0 ? (
                <div className="rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-500">
                  Er staan nog geen facturen klaar in je portal.
                </div>
              ) : (
                recentFacturen.map((factuur) => (
                  <div key={factuur.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{factuur.factuur_nummer}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {formatDate(factuur.periode_start)} - {formatDate(factuur.periode_eind)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[factuur.status] || "bg-neutral-200 text-neutral-700"}`}>
                        {factuur.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-lg font-bold text-neutral-900">{formatCurrency(factuur.totaal)}</p>
                      <a
                        href={factuur.viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-[#F27501] hover:text-[#d96800]"
                      >
                        Factuur openen
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Aandacht nodig</p>
            <p className="mt-2 text-lg font-bold text-neutral-900">Snelle opvolging</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl bg-neutral-50 p-3">
                {pending.length > 0
                  ? `${pending.length} urenregistraties wachten nog op jouw akkoord.`
                  : "Geen open urenregistraties. Dat scheelt weer."}
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                {teBeoordeelen.length > 0
                  ? `${teBeoordeelen.length} medewerkers wachten nog op feedback na hun dienst.`
                  : "Er staan nu geen open beoordelingen klaar."}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Direct contact</p>
            <p className="mt-2 text-lg font-bold text-neutral-900">Hulp nodig?</p>
            <div className="mt-4 space-y-3 text-sm text-neutral-600">
              <a href="tel:+31649713766" className="block rounded-xl bg-neutral-50 p-3 transition hover:bg-neutral-100">
                Bel direct: +31 6 49 71 37 66
              </a>
              <a href="mailto:info@toptalentjobs.nl" className="block rounded-xl bg-neutral-50 p-3 transition hover:bg-neutral-100">
                Mail: info@toptalentjobs.nl
              </a>
              <a href="https://wa.me/31649713766" target="_blank" rel="noopener noreferrer" className="block rounded-xl bg-neutral-50 p-3 transition hover:bg-neutral-100">
                WhatsApp support openen
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">Handige acties</p>
            <p className="mt-2 text-lg font-bold text-neutral-900">Vandaag geregeld</p>
            <div className="mt-4 grid gap-3">
              <a href="/personeel-aanvragen" className="rounded-xl bg-[#F27501] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d96800]">
                Extra personeel aanvragen
              </a>
              <button
                onClick={() => setTab("pending")}
                className="rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                Open uren controleren
              </button>
              <button
                onClick={() => setTab("beoordelen")}
                className="rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                Medewerkers beoordelen
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-neutral-500">Uren & beoordelingen</p>
              <h2 className="text-2xl font-bold text-neutral-900">Operationeel overzicht</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setTab("pending")}
                className={`rounded-xl px-4 py-2 font-medium ${tab === "pending" ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-600"}`}>
                Te beoordelen ({pending.length})
              </button>
              <button onClick={() => setTab("approved")}
                className={`rounded-xl px-4 py-2 font-medium ${tab === "approved" ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-600"}`}>
                Goedgekeurd ({approved.length})
              </button>
              <button onClick={() => setTab("beoordelen")}
                className={`rounded-xl px-4 py-2 font-medium ${tab === "beoordelen" ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-600"}`}>
                Feedback ({teBeoordeelen.length})
              </button>
            </div>
          </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div>
          </div>
        ) : tab === "beoordelen" ? (
          <div className="space-y-4">
            {teBeoordeelen.map((item) => (
              <div key={`${item.dienst_id}-${item.medewerker_id}`} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-neutral-900">{item.medewerker_naam}</p>
                  <p className="text-sm text-neutral-500">{item.locatie} • {formatDate(item.datum)}</p>
                </div>
                <button onClick={() => setBeoordeelModal({ open: true, item, score: 5, opmerking: "" })}
                  className="px-4 py-2 bg-[#F27501] text-white rounded-lg text-sm font-medium hover:bg-[#d96800]">
                  Beoordelen
                </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {(tab === "pending" ? pending : approved).map((u) => (
              <div key={u.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-neutral-900">{u.medewerker_naam}</p>
                    <p className="text-sm text-neutral-500">{u.dienst_locatie} • {formatDate(u.dienst_datum)}</p>
                    <div className="flex gap-4 mt-2 text-sm text-neutral-600">
                      <span>{u.start_tijd?.slice(0,5)} - {u.eind_tijd?.slice(0,5)}</span>
                      <span>{u.pauze_minuten}m pauze</span>
                      <span className="font-medium">{u.gewerkte_uren} uur</span>
                    </div>
                    <p className="text-[#F27501] font-semibold mt-2">€{(u.gewerkte_uren * u.uurtarief).toFixed(2)}</p>
                  </div>
                  {tab === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => approveUren(u.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                        Goedkeuren
                      </button>
                      <button onClick={() => openAanpassingModal(u)}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">
                        Aanpassen
                      </button>
                    </div>
                  )}
                  {tab === "approved" && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Goedgekeurd
                    </span>
                  )}
                </div>
              </div>
            ))}
            {(tab === "pending" ? pending : approved).length === 0 && (
              <div className="text-center py-12 text-neutral-500">
                {tab === "pending" ? "Geen uren om te beoordelen" : "Nog geen goedgekeurde uren"}
              </div>
            )}
          </div>
        )}
        </section>
      </main>

      {/* Beoordeling Modal */}
      {beoordeelModal.open && beoordeelModal.item && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-neutral-900 mb-2">Medewerker Beoordelen</h3>
            <p className="text-sm text-neutral-500 mb-4">{beoordeelModal.item.medewerker_naam} • {beoordeelModal.item.locatie}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Score</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setBeoordeelModal({ ...beoordeelModal, score: s })}
                    className={`w-10 h-10 rounded-full text-lg font-medium ${beoordeelModal.score >= s ? "bg-yellow-400 text-white" : "bg-neutral-100 text-neutral-400"}`}>
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Opmerking (optioneel)</label>
              <textarea value={beoordeelModal.opmerking} onChange={(e) => setBeoordeelModal({ ...beoordeelModal, opmerking: e.target.value })}
                rows={2} className="w-full px-3 py-2 border border-neutral-200 rounded-xl" placeholder="Hoe was de medewerker?" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBeoordeelModal({ ...beoordeelModal, open: false })}
                className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl font-medium">Annuleren</button>
              <button onClick={submitBeoordeling}
                className="flex-1 px-4 py-2 bg-[#F27501] text-white rounded-xl font-medium">Versturen</button>
            </div>
          </div>
        </div>
      )}

      {/* Aanpassing Modal */}
      {modal.open && modal.uren && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-neutral-900 mb-4">Uren Aanpassen</h3>
            <p className="text-sm text-neutral-500 mb-4">
              {modal.uren.medewerker_naam} • {modal.uren.dienst_locatie}
            </p>

            <div className="bg-neutral-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-neutral-500 mb-1">Ingediend door medewerker:</p>
              <p className="text-sm font-medium">
                {modal.uren.start_tijd?.slice(0, 5)} - {modal.uren.eind_tijd?.slice(0, 5)}
                ({modal.uren.pauze_minuten}m pauze) = {modal.uren.gewerkte_uren} uur
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Starttijd</label>
                  <input type="time" value={modal.startTijd}
                    onChange={(e) => setModal({ ...modal, startTijd: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Eindtijd</label>
                  <input type="time" value={modal.eindTijd}
                    onChange={(e) => setModal({ ...modal, eindTijd: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Pauze (minuten)</label>
                <input type="number" value={modal.pauzeMinuten}
                  onChange={(e) => setModal({ ...modal, pauzeMinuten: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Reden aanpassing</label>
                <textarea value={modal.opmerking}
                  onChange={(e) => setModal({ ...modal, opmerking: e.target.value })}
                  placeholder="Bijv: Medewerker was later dan aangegeven"
                  rows={2}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal({ ...modal, open: false })}
                className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50">
                Annuleren
              </button>
              <button onClick={submitAanpassing}
                className="flex-1 px-4 py-2 bg-[#F27501] text-white rounded-xl font-medium hover:bg-[#d96800]">
                Versturen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
