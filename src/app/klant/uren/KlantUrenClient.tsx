"use client";

import { useState, useEffect } from "react";
import PortalLayout, { PortalTab } from "@/components/portal/PortalLayout";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

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
  reiskosten_km: number;
  reiskosten_bedrag: number;
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
  reiskostenKm: string;
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
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("overzicht");
  const [uren, setUren] = useState<UrenRegistratie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [teBeoordeelen, setTeBeoordeelen] = useState<TeBeoordelen[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [upcomingDiensten, setUpcomingDiensten] = useState<UpcomingDienst[]>([]);
  const [recentFacturen, setRecentFacturen] = useState<Factuur[]>([]);
  const [beoordeelModal, setBeoordeelModal] = useState<{
    open: boolean;
    item: TeBeoordelen | null;
    score: number;
    opmerking: string;
    score_punctualiteit: number;
    score_professionaliteit: number;
    score_vaardigheden: number;
    score_communicatie: number;
    zou_opnieuw_boeken: boolean;
  }>({ open: false, item: null, score: 5, opmerking: "", score_punctualiteit: 5, score_professionaliteit: 5, score_vaardigheden: 5, score_communicatie: 5, zou_opnieuw_boeken: true });
  const [modal, setModal] = useState<AanpassingModal>({
    open: false,
    uren: null,
    startTijd: "",
    eindTijd: "",
    pauzeMinuten: "0",
    reiskostenKm: "0",
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
    try {
      await fetch("/api/klant/beoordelingen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dienst_id: beoordeelModal.item.dienst_id,
          medewerker_id: beoordeelModal.item.medewerker_id,
          score: beoordeelModal.score,
          opmerking: beoordeelModal.opmerking,
          score_punctualiteit: beoordeelModal.score_punctualiteit,
          score_professionaliteit: beoordeelModal.score_professionaliteit,
          score_vaardigheden: beoordeelModal.score_vaardigheden,
          score_communicatie: beoordeelModal.score_communicatie,
          zou_opnieuw_boeken: beoordeelModal.zou_opnieuw_boeken,
        }),
      });
      toast.success("Beoordeling verstuurd");
      setBeoordeelModal({ open: false, item: null, score: 5, opmerking: "", score_punctualiteit: 5, score_professionaliteit: 5, score_vaardigheden: 5, score_communicatie: 5, zou_opnieuw_boeken: true });
      fetchUren();
    } catch {
      toast.error("Beoordeling versturen mislukt");
    }
  };

  const approveUren = async (id: string) => {
    try {
      await fetch("/api/klant/uren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", id }),
      });
      toast.success("Uren goedgekeurd");
      fetchUren();
    } catch {
      toast.error("Goedkeuren mislukt");
    }
  };

  const openAanpassingModal = (u: UrenRegistratie) => {
    setModal({
      open: true,
      uren: u,
      startTijd: u.start_tijd?.slice(0, 5) || "",
      eindTijd: u.eind_tijd?.slice(0, 5) || "",
      pauzeMinuten: String(u.pauze_minuten || 0),
      reiskostenKm: String(u.reiskosten_km || 0),
      opmerking: "",
    });
  };

  const submitAanpassing = async () => {
    if (!modal.uren) return;

    const [startH, startM] = modal.startTijd.split(":").map(Number);
    const [eindH, eindM] = modal.eindTijd.split(":").map(Number);
    const pauze = parseInt(modal.pauzeMinuten) || 0;
    const gewerkteUren = Math.max(0, ((eindH * 60 + eindM) - (startH * 60 + startM) - pauze) / 60);
    const reiskostenKm = Math.max(0, Number(modal.reiskostenKm) || 0);

    try {
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
            reiskostenKm,
            opmerking: modal.opmerking,
          },
        }),
      });
      toast.success("Aanpassing verstuurd");
      setModal({ open: false, uren: null, startTijd: "", eindTijd: "", pauzeMinuten: "0", reiskostenKm: "0", opmerking: "" });
      fetchUren();
    } catch {
      toast.error("Aanpassing versturen mislukt");
    }
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

  const tabs: PortalTab[] = [
    {
      id: "overzicht",
      label: "Overzicht",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "uren",
      label: "Uren beoordelen",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      badge: pending.length > 0 ? pending.length : undefined,
    },
    {
      id: "diensten",
      label: "Diensten",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "facturen",
      label: "Facturen",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
      ),
      badge: (dashboardStats?.openFacturenCount ?? 0) > 0 ? dashboardStats?.openFacturenCount : undefined,
    },
    {
      id: "beoordelingen",
      label: "Beoordelingen",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      badge: teBeoordeelen.length > 0 ? teBeoordeelen.length : undefined,
    },
    {
      id: "referral",
      label: "Verwijs & Bespaar",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  const handleLogout = () => {
    window.location.href = "/api/klant/logout";
  };

  return (
    <>
      <PortalLayout
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        portalType="klant"
        userName={klant.contactpersoon}
        onLogout={handleLogout}
      >
        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Tab: Overzicht */}
            {activeTab === "overzicht" && (
              <div className="space-y-6">
                {/* Hero banner */}
                <section className="overflow-hidden rounded-[28px] bg-neutral-900 text-white shadow-xl shadow-neutral-900/10">
                  <div className="grid gap-6 px-6 py-7 md:grid-cols-[1.5fr_1fr] md:px-8">
                    <div>
                      <p className="mb-3 text-sm font-medium text-orange-200">Welkom terug, {klant.contactpersoon}</p>
                      <h2 className="max-w-2xl text-3xl font-bold leading-tight">
                        Alles voor uw personeelsaanvragen, uren en opvolging op één plek.
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
                        {klant.bedrijfsnaam} ziet hier direct wat vandaag aandacht vraagt, welke diensten eraan komen en welke uren nog op uw akkoord wachten.
                      </p>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <a href="/personeel-aanvragen" className="rounded-xl bg-[#F27501] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d96800]">
                          Extra personeel aanvragen
                        </a>
                        <a href="/contact" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5">
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

                {/* Stats cards */}
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Uren wachten op akkoord", value: String(dashboardStats?.pendingHoursCount ?? pending.length), helper: `${dashboardStats?.pendingHoursTotal ?? 0} uur open`, tone: "bg-amber-50 border-amber-200 text-amber-900" },
                    { label: "Goedgekeurde uren deze maand", value: `${dashboardStats?.approvedHoursThisMonth ?? 0} u`, helper: "Actueel maandbeeld", tone: "bg-green-50 border-green-200 text-green-900" },
                    { label: "Reviews wachten op u", value: String(teBeoordeelen.length), helper: "Korte feedback helpt ons sneller te schakelen", tone: "bg-blue-50 border-blue-200 text-blue-900" },
                    { label: "Open facturen", value: String(dashboardStats?.openFacturenCount ?? 0), helper: "Laatste 5 facturen in beeld", tone: "bg-white border-neutral-200 text-neutral-900" },
                  ].map((card) => (
                    <div key={card.label} className={`rounded-2xl border p-5 ${card.tone}`}>
                      <p className="text-sm font-medium">{card.label}</p>
                      <p className="mt-3 text-3xl font-bold">{card.value}</p>
                      <p className="mt-2 text-sm opacity-80">{card.helper}</p>
                    </div>
                  ))}
                </section>

                {/* Quick actions */}
                <section className="grid gap-4 xl:grid-cols-3">
                  <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-neutral-500">Aandacht nodig</p>
                    <p className="mt-2 text-lg font-bold text-neutral-900">Snelle opvolging</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="rounded-xl bg-neutral-50 p-3">
                        {pending.length > 0
                          ? `${pending.length} urenregistraties wachten nog op uw akkoord.`
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
                      <a href="/personeel-aanvragen" className="rounded-xl bg-[#F27501] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#d96800]">
                        Extra personeel aanvragen
                      </a>
                      <button onClick={() => setActiveTab("uren")} className="rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
                        Open uren controleren
                      </button>
                      <button onClick={() => setActiveTab("beoordelingen")} className="rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
                        Medewerkers beoordelen
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Tab: Uren beoordelen */}
            {activeTab === "uren" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900">Uren beoordelen</h2>
                  <p className="mt-1 text-sm text-neutral-500">Controleer en keur ingediende uren goed of pas ze aan.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => {}} className="rounded-xl bg-[#F27501] px-4 py-2 font-medium text-white">
                    Te beoordelen ({pending.length})
                  </button>
                  <button onClick={() => {}} className="rounded-xl bg-neutral-100 px-4 py-2 font-medium text-neutral-600">
                    Goedgekeurd ({approved.length})
                  </button>
                </div>

                <UrenSubTabs
                  pending={pending}
                  approved={approved}
                  onApprove={approveUren}
                  onAdjust={openAanpassingModal}
                  formatDate={formatDate}
                  formatCurrency={formatCurrency}
                  statusTone={statusTone}
                />
              </div>
            )}

            {/* Tab: Diensten */}
            {activeTab === "diensten" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900">Diensten</h2>
                    <p className="mt-1 text-sm text-neutral-500">Overzicht van komende en lopende diensten.</p>
                  </div>
                  <a href="/personeel-aanvragen" className="rounded-xl bg-[#F27501] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d96800]">
                    Nieuwe aanvraag
                  </a>
                </div>

                {upcomingDiensten.length === 0 ? (
                  <EmptyState
                    icon={
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    }
                    title="Geen komende diensten"
                    description="Zodra er shifts ingepland zijn, verschijnen ze hier. Vraag extra personeel aan om te beginnen."
                    actionLabel="Personeel aanvragen"
                    actionHref="/personeel-aanvragen"
                  />
                ) : (
                  <div className="space-y-3">
                    {upcomingDiensten.map((dienst) => (
                      <div key={dienst.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-neutral-900">{dienst.locatie}</p>
                            <p className="mt-1 text-sm text-neutral-500">
                              {formatDateLong(dienst.datum)} · {formatTime(dienst.start_tijd)} - {formatTime(dienst.eind_tijd)}
                            </p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[dienst.status] || "bg-neutral-200 text-neutral-700"}`}>
                            {dienst.status}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-600">
                          <span className="rounded-full bg-neutral-100 px-3 py-1">{dienst.functie}</span>
                          <span className="rounded-full bg-neutral-100 px-3 py-1">{dienst.aantal_nodig} medewerkers</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Facturen */}
            {activeTab === "facturen" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900">Facturen</h2>
                  <p className="mt-1 text-sm text-neutral-500">Bekijk en download uw facturen.</p>
                </div>

                {recentFacturen.length === 0 ? (
                  <EmptyState
                    icon={
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                      </svg>
                    }
                    title="Nog geen facturen"
                    description="Er staan nog geen facturen klaar in uw portal. Zodra er facturen zijn aangemaakt, verschijnen ze hier."
                  />
                ) : (
                  <div className="space-y-3">
                    {recentFacturen.map((factuur) => (
                      <div key={factuur.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-neutral-900">{factuur.factuur_nummer}</p>
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
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Beoordelingen */}
            {activeTab === "referral" && <KlantReferralSection />}

            {activeTab === "beoordelingen" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900">Beoordelingen</h2>
                  <p className="mt-1 text-sm text-neutral-500">Geef feedback over medewerkers na hun dienst.</p>
                </div>

                {teBeoordeelen.length === 0 ? (
                  <EmptyState
                    icon={
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    }
                    title="Geen openstaande beoordelingen"
                    description="Er staan momenteel geen medewerkers klaar voor feedback. Zodra er diensten zijn afgerond, verschijnen ze hier."
                  />
                ) : (
                  <div className="space-y-3">
                    {teBeoordeelen.map((item) => (
                      <div key={`${item.dienst_id}-${item.medewerker_id}`} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-neutral-900">{item.medewerker_naam}</p>
                            <p className="text-sm text-neutral-500">{item.locatie} · {formatDate(item.datum)}</p>
                          </div>
                          <button
                            onClick={() => setBeoordeelModal({ open: true, item, score: 5, opmerking: "", score_punctualiteit: 5, score_professionaliteit: 5, score_vaardigheden: 5, score_communicatie: 5, zou_opnieuw_boeken: true })}
                            className="px-4 py-2 bg-[#F27501] text-white rounded-xl text-sm font-medium hover:bg-[#d96800] transition"
                          >
                            Beoordelen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </PortalLayout>

      {/* Beoordeling Modal */}
      {beoordeelModal.open && beoordeelModal.item && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-neutral-900 mb-2">Medewerker Beoordelen</h3>
            <p className="text-sm text-neutral-500 mb-4">{beoordeelModal.item.medewerker_naam} · {beoordeelModal.item.locatie}</p>

            {/* Algemene score */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Algemene score</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setBeoordeelModal({ ...beoordeelModal, score: s })}
                    className={`w-10 h-10 rounded-full text-lg font-medium transition ${beoordeelModal.score >= s ? "bg-yellow-400 text-white" : "bg-neutral-100 text-neutral-400"}`}>
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Categorie scores */}
            <div className="mb-4 space-y-3">
              <p className="text-sm font-medium text-neutral-700">Score per categorie</p>
              {([
                { key: "score_punctualiteit" as const, label: "Op tijd" },
                { key: "score_professionaliteit" as const, label: "Professionaliteit" },
                { key: "score_vaardigheden" as const, label: "Vaardigheden" },
                { key: "score_communicatie" as const, label: "Communicatie" },
              ]).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">{label}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setBeoordeelModal({ ...beoordeelModal, [key]: s })}
                        className={`w-7 h-7 rounded-full text-sm transition ${beoordeelModal[key] >= s ? "bg-yellow-400 text-white" : "bg-neutral-100 text-neutral-400"}`}>
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Zou opnieuw boeken */}
            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={beoordeelModal.zou_opnieuw_boeken}
                  onChange={(e) => setBeoordeelModal({ ...beoordeelModal, zou_opnieuw_boeken: e.target.checked })}
                  className="w-5 h-5 rounded border-neutral-300 text-[#F27501] focus:ring-[#F27501]"
                />
                <span className="text-sm font-medium text-neutral-700">Ik zou deze medewerker opnieuw boeken</span>
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Opmerking (optioneel)</label>
              <textarea value={beoordeelModal.opmerking} onChange={(e) => setBeoordeelModal({ ...beoordeelModal, opmerking: e.target.value })}
                rows={2} className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" placeholder="Hoe was de medewerker?" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBeoordeelModal({ ...beoordeelModal, open: false })}
                className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition">Annuleren</button>
              <button onClick={submitBeoordeling}
                className="flex-1 px-4 py-2 bg-[#F27501] text-white rounded-xl font-medium hover:bg-[#d96800] transition">Versturen</button>
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
              {modal.uren.medewerker_naam} · {modal.uren.dienst_locatie}
            </p>

            <div className="bg-neutral-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-neutral-500 mb-1">Ingediend door medewerker:</p>
              <p className="text-sm font-medium">
                {modal.uren.start_tijd?.slice(0, 5)} - {modal.uren.eind_tijd?.slice(0, 5)}
                ({modal.uren.pauze_minuten}m pauze) = {modal.uren.gewerkte_uren} uur
              </p>
              {modal.uren.reiskosten_km > 0 && (
                <p className="mt-1 text-sm text-neutral-600">
                  Reiskosten: {modal.uren.reiskosten_km} km = {formatCurrency(modal.uren.reiskosten_bedrag)}
                </p>
              )}
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
                <label className="block text-sm font-medium text-neutral-700 mb-1">Reiskosten (km)</label>
                <input type="number" value={modal.reiskostenKm}
                  onChange={(e) => setModal({ ...modal, reiskostenKm: e.target.value })}
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" />
                <p className="mt-1 text-xs text-neutral-500">
                  Medewerkervergoeding: {formatCurrency((Math.max(0, Number(modal.reiskostenKm) || 0)) * 0.21)}
                </p>
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
                className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition">
                Annuleren
              </button>
              <button onClick={submitAanpassing}
                className="flex-1 px-4 py-2 bg-[#F27501] text-white rounded-xl font-medium hover:bg-[#d96800] transition">
                Versturen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Klant Referral Section */
function KlantReferralSection() {
  const [data, setData] = useState<{ referral_code: string; referral_link: string; stats: { totaal_verwezen: number; qualified: number; totaal_korting: number }; referrals: { naam: string; status: string; created_at: string }[] } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/klant/referral").then(r => r.json()).then(d => setData(d)).catch(() => {});
  }, []);

  if (!data) return <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-[#F27501] border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Verwijs & Bespaar</h2>
        <p className="mt-1 text-sm text-neutral-500">Verwijs een collega-ondernemer en ontvang €100 korting!</p>
      </div>

      <div className="bg-gradient-to-r from-[#F27501] to-[#d96800] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🎁</span>
          <h3 className="text-xl font-bold">€100 korting per verwijzing!</h3>
        </div>
        <p className="text-white/80 text-sm">Wanneer uw verwezen collega de eerste dienst boekt, ontvangt u €100 korting op uw volgende factuur.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-neutral-900">{data.stats.totaal_verwezen}</p>
          <p className="text-xs text-neutral-500">Verwezen</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">{data.stats.qualified}</p>
          <p className="text-xs text-neutral-500">Gekwalificeerd</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-[#F27501]">€{data.stats.totaal_korting}</p>
          <p className="text-xs text-neutral-500">Korting verdiend</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-neutral-900 mb-3">Uw verwijzingslink</h3>
        <div className="flex gap-2">
          <div className="flex-1 bg-neutral-50 rounded-xl px-4 py-3 text-sm text-neutral-600 font-mono truncate border border-neutral-200">
            {data.referral_link}
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(data.referral_link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className={`px-4 py-3 rounded-xl font-medium text-sm transition-colors ${copied ? "bg-green-500 text-white" : "bg-[#F27501] text-white hover:bg-[#d96800]"}`}
          >
            {copied ? "✓ Gekopieerd" : "Kopieer"}
          </button>
        </div>
      </div>

      {data.referrals.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 mb-3">Uw verwijzingen</h3>
          <div className="space-y-2">
            {data.referrals.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{r.naam}</p>
                  <p className="text-xs text-neutral-500">{new Date(r.created_at).toLocaleDateString("nl-NL")}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.status === "rewarded" ? "bg-[#F27501]/10 text-[#F27501]" :
                  r.status === "qualified" ? "bg-green-100 text-green-700" :
                  "bg-orange-100 text-orange-700"
                }`}>
                  {r.status === "rewarded" ? "Uitbetaald" : r.status === "qualified" ? "Gekwalificeerd" : "In afwachting"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* Sub-component for Uren tab with pending/approved toggle */
function UrenSubTabs({
  pending,
  approved,
  onApprove,
  onAdjust,
  formatDate,
  formatCurrency,
  statusTone: _statusTone,
}: {
  pending: UrenRegistratie[];
  approved: UrenRegistratie[];
  onApprove: (id: string) => void;
  onAdjust: (u: UrenRegistratie) => void;
  formatDate: (d: string) => string;
  formatCurrency: (value: number) => string;
  statusTone: Record<string, string>;
}) {
  const [subTab, setSubTab] = useState<"pending" | "approved">("pending");
  const items = subTab === "pending" ? pending : approved;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setSubTab("pending")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${subTab === "pending" ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
          Te beoordelen ({pending.length})
        </button>
        <button onClick={() => setSubTab("approved")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${subTab === "approved" ? "bg-[#F27501] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
          Goedgekeurd ({approved.length})
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title={subTab === "pending" ? "Geen uren om te beoordelen" : "Nog geen goedgekeurde uren"}
          description={subTab === "pending" ? "Er zijn momenteel geen openstaande uren die op uw goedkeuring wachten." : "Goedgekeurde uren verschijnen hier zodra u ze heeft beoordeeld."}
        />
      ) : (
        <div className="space-y-3">
          {items.map((u) => (
            <div key={u.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-neutral-900">{u.medewerker_naam}</p>
                  <p className="text-sm text-neutral-500">{u.dienst_locatie} · {formatDate(u.dienst_datum)}</p>
                  <div className="flex gap-4 mt-2 text-sm text-neutral-600">
                    <span>{u.start_tijd?.slice(0, 5)} - {u.eind_tijd?.slice(0, 5)}</span>
                    <span>{u.pauze_minuten}m pauze</span>
                    <span className="font-medium">{u.gewerkte_uren} uur</span>
                  </div>
                  {u.reiskosten_km > 0 && (
                    <p className="mt-2 text-sm text-neutral-600">
                      Reiskosten: {u.reiskosten_km} km · medewerkervergoeding {formatCurrency(u.reiskosten_bedrag)}
                    </p>
                  )}
                  <p className="text-[#F27501] font-semibold mt-2">€{(u.gewerkte_uren * u.uurtarief).toFixed(2)}</p>
                </div>
                {subTab === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => onApprove(u.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition">
                      Goedkeuren
                    </button>
                    <button onClick={() => onAdjust(u)}
                      className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition">
                      Aanpassen
                    </button>
                  </div>
                )}
                {subTab === "approved" && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    Goedgekeurd
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
