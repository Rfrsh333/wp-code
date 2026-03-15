"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import KlantPortalLayout, { KlantTab } from "@/components/klant/KlantPortalLayout";
import KlantMobileHeader from "@/components/klant/KlantMobileHeader";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

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
  aanmeldingen_count?: number;
  aanmeldingen_aangemeld?: number;
  aanmeldingen_geaccepteerd?: number;
}

interface DienstAanmelding {
  id: string;
  dienst_id: string;
  medewerker_id: string;
  status: string;
  aangemeld_at: string;
  check_in_at: string | null;
  medewerker: {
    naam: string;
    functie: string | string[];
    profile_photo_url: string | null;
    gemiddelde_score: number | null;
    aantal_beoordelingen: number | null;
    badge: string | null;
    admin_score_aanwezigheid: number | null;
    admin_score_vaardigheden: number | null;
  } | null;
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

interface Favoriet {
  id: string;
  notitie: string | null;
  medewerker_id: string;
  naam: string;
  functie: string | string[];
  profile_photo_url: string | null;
  gemiddelde_score: number | null;
  diensten_count: number;
}

interface RecentMedewerker {
  medewerker_id: string;
  naam: string;
  functie: string | string[];
  profile_photo_url: string | null;
  gemiddelde_score: number | null;
  laatste_dienst: string;
}

interface RoosterItem {
  id: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  locatie: string;
  functie: string;
  status: string;
  aantal_nodig: number;
  medewerkers: { id: string; naam: string; functie: string | string[]; profile_photo_url: string | null }[];
}

interface KostenData {
  jaar: number;
  totaal: number;
  per_maand: { maand: string; kosten: number }[];
  per_functie: { functie: string; kosten: number }[];
  top_medewerkers: { naam: string; totaal: number; uren: number }[];
}

interface KlantBericht {
  id: string;
  created_at: string;
  afzender: "klant" | "toptalent";
  bericht: string;
  gelezen: boolean;
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
  const [ongelesCount, setOngelesCount] = useState(0);
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
  const [dienstenVolledig, setDienstenVolledig] = useState<UpcomingDienst[]>([]);
  const [aanmeldingenOpen, setAanmeldingenOpen] = useState<string | null>(null);
  const [aanmeldingen, setAanmeldingen] = useState<DienstAanmelding[]>([]);
  const [aanmeldingenLoading, setAanmeldingenLoading] = useState(false);
  const [aanmeldingenActie, setAanmeldingenActie] = useState<string | null>(null);
  const [scanReminderPopup, setScanReminderPopup] = useState<{
    open: boolean;
    medewerkers: Array<{ naam: string; dienst_datum: string; dienst_tijd: string }>;
  }>({ open: false, medewerkers: [] });

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

  const fetchDiensten = useCallback(async () => {
    try {
      const res = await fetch("/api/klant/diensten");
      const data = await res.json();
      setDienstenVolledig(data.diensten || []);
    } catch { /* ignore */ }
  }, []);

  // Fetch unread berichten count for badge
  const fetchOngelezen = useCallback(async () => {
    try {
      const res = await fetch("/api/klant/berichten");
      const data = await res.json();
      setOngelesCount(data.ongelezen_count || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchUren();
      await fetchOngelezen();
      await fetchDiensten();
    })();
  }, [fetchOngelezen, fetchDiensten]);

  // Check for non-scanned medewerkers when aanmeldingen are loaded
  useEffect(() => {
    if (!aanmeldingenOpen || aanmeldingen.length === 0) return;

    const nonScannedMedewerkers = aanmeldingen.filter(
      (a) => a.status === "geaccepteerd" && !a.check_in_at
    );

    if (nonScannedMedewerkers.length > 0) {
      // Get dienst info for display
      const dienst = dienstenVolledig.find((d) => d.id === aanmeldingenOpen);

      const medewerkersList = nonScannedMedewerkers.map((a) => {
        const mw = Array.isArray(a.medewerker) ? a.medewerker[0] : a.medewerker;
        return {
          naam: mw?.naam || "Onbekend",
          dienst_datum: dienst?.datum ? formatDateLong(dienst.datum) : "",
          dienst_tijd: dienst ? `${formatTime(dienst.start_tijd)} - ${formatTime(dienst.eind_tijd)}` : "",
        };
      });

      setScanReminderPopup({ open: true, medewerkers: medewerkersList });
    }
  }, [aanmeldingen, aanmeldingenOpen, dienstenVolledig]);

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

  const fetchAanmeldingen = async (dienstId: string) => {
    setAanmeldingenLoading(true);
    try {
      const res = await fetch("/api/klant/diensten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_aanmeldingen", dienst_id: dienstId }),
      });
      const data = await res.json();
      setAanmeldingen(data.data || []);
    } catch {
      toast.error("Aanmeldingen ophalen mislukt");
    }
    setAanmeldingenLoading(false);
  };

  const toggleAanmeldingen = (dienstId: string) => {
    if (aanmeldingenOpen === dienstId) {
      setAanmeldingenOpen(null);
      setAanmeldingen([]);
    } else {
      setAanmeldingenOpen(dienstId);
      fetchAanmeldingen(dienstId);
    }
  };

  const updateAanmelding = async (aanmeldingId: string, status: "geaccepteerd" | "afgewezen") => {
    setAanmeldingenActie(aanmeldingId);
    try {
      await fetch("/api/klant/diensten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_aanmelding", id: aanmeldingId, data: { status } }),
      });
      toast.success(status === "geaccepteerd" ? "Medewerker geaccepteerd" : "Medewerker afgewezen");
      if (aanmeldingenOpen) {
        await fetchAanmeldingen(aanmeldingenOpen);
      }
      fetchDiensten();
    } catch {
      toast.error("Actie mislukt");
    }
    setAanmeldingenActie(null);
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
    aangevraagd: "bg-blue-100 text-blue-800",
    bevestigd: "bg-green-100 text-green-800",
  };

  const pending = uren.filter(u => u.status === "ingediend");
  const approved = uren.filter(u => ["klant_goedgekeurd", "goedgekeurd"].includes(u.status));

  const tabs: KlantTab[] = [
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
      id: "rooster",
      label: "Rooster",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      id: "aanvragen",
      label: "Aanvragen",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      id: "favorieten",
      label: "Favorieten",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
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
      id: "kosten",
      label: "Kosten",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
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
      id: "berichten",
      label: "Berichten",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      badge: ongelesCount > 0 ? ongelesCount : undefined,
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
    {
      id: "qr-scanner",
      label: "QR Check-in",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9V5a2 2 0 012-2h4M15 3h4a2 2 0 012 2v4M21 15v4a2 2 0 01-2 2h-4M9 21H5a2 2 0 01-2-2v-4M12 8v4l2 2" />
        </svg>
      ),
    },
  ];

  const handleLogout = () => {
    window.location.href = "/api/klant/logout";
  };

  return (
    <>
      <KlantMobileHeader
        bedrijfsnaam={klant.bedrijfsnaam}
        contactpersoon={klant.contactpersoon}
        ongelezen={ongelesCount}
      />
      <KlantPortalLayout
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        bedrijfsnaam={klant.bedrijfsnaam}
        contactpersoon={klant.contactpersoon}
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
              <div className="space-y-5">
                {/* Greeting */}
                <div>
                  <h2 className="text-xl font-bold text-[var(--kp-text-primary)]">
                    {new Date().getHours() < 12 ? "Goedemorgen" : new Date().getHours() < 18 ? "Goedemiddag" : "Goedenavond"}, {klant.contactpersoon}
                  </h2>
                  <p className="text-sm text-[var(--kp-text-secondary)]">{klant.bedrijfsnaam}</p>
                </div>

                {/* PWA Install Banner (iOS) */}
                <KlantInstallBanner />

                {/* Horizontaal scrollbare stats */}
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                  {[
                    { label: "Uren wachten", value: String(dashboardStats?.pendingHoursCount ?? pending.length), targetTab: "uren", urgent: pending.length > 0 },
                    { label: "Goedgekeurd", value: `${dashboardStats?.approvedHoursThisMonth ?? 0}u`, targetTab: "uren", urgent: false },
                    { label: "Reviews", value: String(teBeoordeelen.length), targetTab: "beoordelingen", urgent: teBeoordeelen.length > 0 },
                    { label: "Open facturen", value: String(dashboardStats?.openFacturenCount ?? 0), targetTab: "facturen", urgent: false },
                  ].map((stat) => (
                    <button
                      key={stat.label}
                      onClick={() => setActiveTab(stat.targetTab)}
                      className="flex-shrink-0 bg-white rounded-2xl px-4 py-3 shadow-sm border border-[var(--kp-border)] min-w-[100px] text-left"
                    >
                      <p className="text-2xl font-bold text-[var(--kp-text-primary)]">{stat.value}</p>
                      <p className="text-xs text-[var(--kp-text-secondary)] mt-0.5 leading-tight">{stat.label}</p>
                      {stat.urgent && <div className="w-2 h-2 bg-[var(--kp-accent)] rounded-full mt-1.5" />}
                    </button>
                  ))}
                </div>

                {/* Actie vereist */}
                {(pending.length > 0 || teBeoordeelen.length > 0) && (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-orange-800 mb-2">Actie vereist</p>
                    {pending.length > 0 && (
                      <button
                        onClick={() => setActiveTab("uren")}
                        className="flex items-center justify-between w-full py-2 border-b border-orange-100 last:border-0"
                      >
                        <span className="text-sm text-orange-700">{pending.length} uren wachten op akkoord</span>
                        <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    )}
                    {teBeoordeelen.length > 0 && (
                      <button
                        onClick={() => setActiveTab("beoordelingen")}
                        className="flex items-center justify-between w-full py-2 border-b border-orange-100 last:border-0"
                      >
                        <span className="text-sm text-orange-700">{teBeoordeelen.length} medewerkers te beoordelen</span>
                        <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    )}
                  </div>
                )}

                {/* Vandaag & Morgen */}
                {upcomingDiensten.length > 0 && (
                  <div className="bg-white rounded-2xl border border-[var(--kp-border)] p-4 shadow-sm">
                    <p className="text-xs font-bold text-[var(--kp-text-tertiary)] uppercase tracking-wider mb-3">Vandaag & Morgen</p>
                    <div className="space-y-2">
                      {upcomingDiensten.slice(0, 5).map((d) => (
                        <div key={d.id} className="flex items-center gap-3 py-2 border-b border-[var(--kp-border)] last:border-0">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            (d.aanmeldingen_geaccepteerd || 0) >= d.aantal_nodig ? "bg-green-500" : "bg-amber-500"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--kp-text-primary)] truncate">{d.locatie || d.functie}</p>
                            <p className="text-xs text-[var(--kp-text-secondary)]">
                              {formatDateLong(d.datum)} · {formatTime(d.start_tijd)}-{formatTime(d.eind_tijd)}
                            </p>
                          </div>
                          <span className="text-xs text-[var(--kp-text-tertiary)]">
                            {d.aanmeldingen_geaccepteerd || 0}/{d.aantal_nodig}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                <button
                  onClick={() => setActiveTab("aanvragen")}
                  className="w-full py-3.5 rounded-2xl bg-[#1e3a5f] text-white font-semibold text-sm transition hover:bg-[#162d4a]"
                >
                  + Personeel aanvragen
                </button>

                {/* Desktop: Quick links grid */}
                <div className="hidden md:grid grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-[var(--kp-border)] bg-white p-5 shadow-sm">
                    <p className="text-sm text-[var(--kp-text-secondary)]">Direct contact</p>
                    <p className="mt-2 text-base font-bold text-[var(--kp-text-primary)]">Hulp nodig?</p>
                    <div className="mt-4 space-y-3 text-sm text-[var(--kp-text-secondary)]">
                      <a href="tel:+31649713766" className="block rounded-xl bg-[var(--kp-bg-page)] p-3 transition hover:bg-[var(--kp-border)]">
                        Bel: +31 6 49 71 37 66
                      </a>
                      <a href="https://wa.me/31649713766" target="_blank" rel="noopener noreferrer" className="block rounded-xl bg-[var(--kp-bg-page)] p-3 transition hover:bg-[var(--kp-border)]">
                        WhatsApp
                      </a>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--kp-border)] bg-white p-5 shadow-sm">
                    <p className="text-sm text-[var(--kp-text-secondary)]">Snelle acties</p>
                    <p className="mt-2 text-base font-bold text-[var(--kp-text-primary)]">Vandaag regelen</p>
                    <div className="mt-4 grid gap-3">
                      <button onClick={() => setActiveTab("uren")} className="rounded-xl border border-[var(--kp-border)] px-4 py-3 text-left text-sm font-medium text-[var(--kp-text-secondary)] transition hover:bg-[var(--kp-bg-page)]">
                        Open uren controleren
                      </button>
                      <button onClick={() => setActiveTab("beoordelingen")} className="rounded-xl border border-[var(--kp-border)] px-4 py-3 text-left text-sm font-medium text-[var(--kp-text-secondary)] transition hover:bg-[var(--kp-bg-page)]">
                        Medewerkers beoordelen
                      </button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--kp-border)] bg-white p-5 shadow-sm">
                    <p className="text-sm text-[var(--kp-text-secondary)]">Berichten</p>
                    <p className="mt-2 text-base font-bold text-[var(--kp-text-primary)]">Contact TopTalent</p>
                    <div className="mt-4">
                      <button onClick={() => setActiveTab("berichten")} className="w-full rounded-xl border border-[var(--kp-border)] px-4 py-3 text-sm font-medium text-[var(--kp-text-secondary)] transition hover:bg-[var(--kp-bg-page)]">
                        Open berichten {ongelesCount > 0 && `(${ongelesCount} ongelezen)`}
                      </button>
                    </div>
                  </div>
                </div>
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
                  <button onClick={() => setActiveTab("aanvragen")} className="rounded-xl bg-[#F27501] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d96800]">
                    Nieuwe aanvraag
                  </button>
                </div>

                {dienstenVolledig.length === 0 ? (
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
                    {dienstenVolledig.map((dienst) => (
                      <div key={dienst.id} className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                        <div className="p-5">
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
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                            <span className="rounded-full bg-neutral-100 px-3 py-1">{dienst.functie}</span>
                            <span className="rounded-full bg-neutral-100 px-3 py-1">{dienst.aantal_nodig} medewerkers</span>
                            {(dienst.aanmeldingen_count || 0) > 0 && (
                              <button
                                onClick={() => toggleAanmeldingen(dienst.id)}
                                className={`rounded-full px-3 py-1 font-semibold transition ${
                                  aanmeldingenOpen === dienst.id
                                    ? "bg-[#F27501] text-white"
                                    : (dienst.aanmeldingen_aangemeld || 0) > 0
                                      ? "bg-orange-100 text-orange-800 hover:bg-orange-200"
                                      : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                }`}
                              >
                                Aanmeldingen ({dienst.aanmeldingen_count})
                                {(dienst.aanmeldingen_aangemeld || 0) > 0 && (
                                  <span className="ml-1">· {dienst.aanmeldingen_aangemeld} nieuw</span>
                                )}
                              </button>
                            )}
                            {(dienst.aanmeldingen_geaccepteerd || 0) > 0 && (
                              <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
                                {dienst.aanmeldingen_geaccepteerd} / {dienst.aantal_nodig} geaccepteerd
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Aanmeldingen panel */}
                        {aanmeldingenOpen === dienst.id && (
                          <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-4">
                            {aanmeldingenLoading ? (
                              <div className="flex justify-center py-4">
                                <div className="animate-spin w-5 h-5 border-2 border-[#F27501] border-t-transparent rounded-full"></div>
                              </div>
                            ) : aanmeldingen.length === 0 ? (
                              <p className="text-sm text-neutral-500 text-center py-2">Geen aanmeldingen gevonden.</p>
                            ) : (
                              <div className="space-y-3">
                                {aanmeldingen.map((a) => {
                                  const mw = Array.isArray(a.medewerker) ? a.medewerker[0] : a.medewerker;
                                  const naam = mw?.naam || "Onbekend";
                                  const initialen = naam.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                                  const functie = Array.isArray(mw?.functie) ? mw.functie.join(", ") : mw?.functie || "";
                                  const statusKleur: Record<string, string> = {
                                    aangemeld: "bg-amber-100 text-amber-800",
                                    geaccepteerd: "bg-green-100 text-green-800",
                                    afgewezen: "bg-red-100 text-red-800",
                                    geannuleerd: "bg-neutral-200 text-neutral-600",
                                  };
                                  const badgeKleur: Record<string, string> = {
                                    starter: "bg-neutral-100 text-neutral-700",
                                    rising: "bg-blue-100 text-blue-700",
                                    star: "bg-purple-100 text-purple-700",
                                    toptalent: "bg-amber-100 text-amber-700",
                                  };

                                  return (
                                    <div key={a.id} className="rounded-xl bg-white p-3 border border-neutral-200">
                                      <div className="flex items-center gap-3">
                                        {mw?.profile_photo_url ? (
                                          <img src={mw.profile_photo_url} alt={naam} className="w-10 h-10 rounded-full object-cover" />
                                        ) : (
                                          <div className="w-10 h-10 rounded-full bg-[#0B2447] text-white flex items-center justify-center text-sm font-bold">
                                            {initialen}
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <p className="font-semibold text-sm text-neutral-900 truncate">{naam}</p>
                                            {mw?.badge && (
                                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${badgeKleur[mw.badge] || "bg-neutral-100 text-neutral-600"}`}>
                                                {mw.badge}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            {functie && <p className="text-xs text-neutral-500">{functie}</p>}
                                            {mw?.gemiddelde_score != null && (
                                              <div className="flex items-center gap-1">
                                                <div className="flex">
                                                  {[1, 2, 3, 4, 5].map((s) => (
                                                    <svg key={s} className={`w-3 h-3 ${s <= Math.round(mw.gemiddelde_score!) ? "text-amber-400" : "text-neutral-200"}`} fill="currentColor" viewBox="0 0 20 20">
                                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                  ))}
                                                </div>
                                                <span className="text-[10px] text-neutral-400">({mw.aantal_beoordelingen || 0})</span>
                                              </div>
                                            )}
                                          </div>
                                          {(mw?.admin_score_aanwezigheid != null || mw?.admin_score_vaardigheden != null) && (
                                            <div className="flex gap-3 mt-1">
                                              {mw?.admin_score_aanwezigheid != null && (
                                                <span className="text-[10px] text-neutral-400">Aanwezigheid: <span className="font-semibold text-neutral-600">{mw.admin_score_aanwezigheid}/5</span></span>
                                              )}
                                              {mw?.admin_score_vaardigheden != null && (
                                                <span className="text-[10px] text-neutral-400">Vaardigheden: <span className="font-semibold text-neutral-600">{mw.admin_score_vaardigheden}/5</span></span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex flex-col gap-2 items-end">
                                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusKleur[a.status] || "bg-neutral-200 text-neutral-600"}`}>
                                            {a.status}
                                          </span>
                                          {a.status === "geaccepteerd" && (
                                            a.check_in_at ? (
                                              <span className="flex items-center gap-1 text-xs text-green-600">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Ingecheckt
                                              </span>
                                            ) : (
                                              <span className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Niet gescand
                                              </span>
                                            )
                                          )}
                                        </div>
                                        {a.status === "aangemeld" && (
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => updateAanmelding(a.id, "geaccepteerd")}
                                              disabled={aanmeldingenActie === a.id}
                                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                                            >
                                              {aanmeldingenActie === a.id ? "..." : "Accepteren"}
                                            </button>
                                            <button
                                              onClick={() => updateAanmelding(a.id, "afgewezen")}
                                              disabled={aanmeldingenActie === a.id}
                                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                                            >
                                              {aanmeldingenActie === a.id ? "..." : "Afwijzen"}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Rooster */}
            {activeTab === "rooster" && <RoosterTab formatTime={formatTime} statusTone={statusTone} />}

            {/* Tab: Aanvragen */}
            {activeTab === "aanvragen" && <AanvraagTab klant={klant} onSuccess={() => { fetchUren(); setActiveTab("diensten"); }} />}

            {/* Tab: Favorieten */}
            {activeTab === "favorieten" && <FavorietenTab />}

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

            {/* Tab: Kosten */}
            {activeTab === "kosten" && <KostenTab />}

            {/* Tab: Beoordelingen */}
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

            {/* Tab: Berichten */}
            {activeTab === "berichten" && <BerichtenTab klant={klant} onUnreadChange={setOngelesCount} />}

            {/* Tab: Referral */}
            {activeTab === "referral" && <KlantReferralSection />}

            {/* Tab: QR Check-in */}
            {activeTab === "qr-scanner" && <QRScannerTab />}
          </>
        )}
      </KlantPortalLayout>

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

      {/* Scan Reminder Popup */}
      {scanReminderPopup.open && scanReminderPopup.medewerkers.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-neutral-900">Medewerker(s) niet gescand</h3>
                <p className="text-sm text-neutral-600 mt-1">
                  De volgende medewerker(s) zijn geaccepteerd maar nog niet ingecheckt via QR-scan:
                </p>
              </div>
            </div>

            <div className="bg-orange-50 rounded-xl p-4 mb-4 space-y-2">
              {scanReminderPopup.medewerkers.map((mw, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-neutral-900">{mw.naam}</p>
                    <p className="text-xs text-neutral-600">
                      {mw.dienst_datum} · {mw.dienst_tijd}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-neutral-600 mb-4">
              Scan de QR-pas van deze medewerker(s) voordat de dienst begint, zodat zij later hun uren kunnen indienen.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setScanReminderPopup({ open: false, medewerkers: [] })}
                className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition"
              >
                Later
              </button>
              <button
                onClick={() => {
                  setScanReminderPopup({ open: false, medewerkers: [] });
                  setActiveTab("qr-scanner");
                }}
                className="flex-1 px-4 py-2 bg-[#F27501] text-white rounded-xl font-medium hover:bg-[#d96800] transition"
              >
                Scan nu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   Feature 2: Favorieten Tab
   ============================================================ */
function FavorietenTab() {
  const toast = useToast();
  const [favorieten, setFavorieten] = useState<Favoriet[]>([]);
  const [recentMedewerkers, setRecentMedewerkers] = useState<RecentMedewerker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFavorieten = async () => {
    try {
      const res = await fetch("/api/klant/favorieten");
      const data = await res.json();
      setFavorieten(data.favorieten || []);
      setRecentMedewerkers(data.recentMedewerkers || []);
    } catch {
      toast.error("Favorieten laden mislukt");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchFavorieten(); }, []);

  const toggleFavoriet = async (medewerker_id: string, isFav: boolean) => {
    try {
      await fetch("/api/klant/favorieten", {
        method: isFav ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medewerker_id }),
      });
      toast.success(isFav ? "Favoriet verwijderd" : "Favoriet toegevoegd");
      fetchFavorieten();
    } catch {
      toast.error("Actie mislukt");
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" /></div>;
  }

  const renderAvatar = (naam: string, photo: string | null) => {
    const initials = naam.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    return photo ? (
      <img src={photo} alt={naam} className="w-10 h-10 rounded-full object-cover" />
    ) : (
      <div className="w-10 h-10 rounded-full bg-[#F27501]/10 flex items-center justify-center text-sm font-bold text-[#F27501]">{initials}</div>
    );
  };

  const renderFuncties = (functie: string | string[]) => {
    const list = Array.isArray(functie) ? functie : [functie].filter(Boolean);
    return list.join(", ");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Favoriete Medewerkers</h2>
        <p className="mt-1 text-sm text-neutral-500">Bewaar uw favoriete medewerkers voor snelle aanvragen.</p>
      </div>

      {favorieten.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          }
          title="Nog geen favorieten"
          description="Voeg medewerkers toe als favoriet vanuit de lijst hieronder, zodat u ze snel kunt aanvragen."
        />
      ) : (
        <div className="space-y-3">
          {favorieten.map((f) => (
            <div key={f.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                {renderAvatar(f.naam, f.profile_photo_url)}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900">{f.naam}</p>
                  <p className="text-sm text-neutral-500">{renderFuncties(f.functie)}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                    {f.gemiddelde_score != null && (
                      <span className="flex items-center gap-1">
                        <span className="text-yellow-400">★</span> {f.gemiddelde_score.toFixed(1)}
                      </span>
                    )}
                    <span>{f.diensten_count} diensten bij u</span>
                  </div>
                  {f.notitie && <p className="mt-1 text-xs text-neutral-400 italic">{f.notitie}</p>}
                </div>
                <button onClick={() => toggleFavoriet(f.medewerker_id, true)}
                  className="p-2 text-red-400 hover:text-red-600 transition" title="Verwijder favoriet">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {recentMedewerkers.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-neutral-900 mb-3">Recent gewerkt</h3>
          <div className="space-y-2">
            {recentMedewerkers.map((m) => (
              <div key={m.medewerker_id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm flex items-center gap-4">
                {renderAvatar(m.naam, m.profile_photo_url)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900">{m.naam}</p>
                  <p className="text-sm text-neutral-500">{renderFuncties(m.functie)}</p>
                  {m.gemiddelde_score != null && (
                    <span className="text-xs text-neutral-400 flex items-center gap-1"><span className="text-yellow-400">★</span> {m.gemiddelde_score.toFixed(1)}</span>
                  )}
                </div>
                <button onClick={() => toggleFavoriet(m.medewerker_id, false)}
                  className="px-3 py-1.5 bg-[#F27501] text-white rounded-lg text-sm font-medium hover:bg-[#d96800] transition">
                  Favoriet
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Feature 3: Aanvraag Tab (Multi-step form)
   ============================================================ */
function AanvraagTab({ klant, onSuccess }: { klant: Klant; onSuccess: () => void }) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [locaties, setLocaties] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [form, setForm] = useState({
    functie: "",
    datum: "",
    start_tijd: "",
    eind_tijd: "",
    aantal: "1",
    uurtarief: "",
    locatie: "",
    opmerkingen: "",
    favoriet_medewerker_ids: [] as string[],
  });
  const [favorieten, setFavorieten] = useState<Favoriet[]>([]);

  useEffect(() => {
    fetch("/api/klant/aanvraag").then(r => r.json()).then(d => setLocaties(d.locaties || [])).catch(() => {});
    fetch("/api/klant/favorieten").then(r => r.json()).then(d => setFavorieten(d.favorieten || [])).catch(() => {});
  }, []);

  const functies = [
    { value: "bediening", label: "Bediening" },
    { value: "bar", label: "Bar" },
    { value: "keuken", label: "Keuken" },
    { value: "afwas", label: "Afwas" },
  ];

  const canNext = () => {
    if (step === 1) return !!form.functie;
    if (step === 2) return !!form.datum && !!form.start_tijd && !!form.eind_tijd && !!form.uurtarief && parseFloat(form.uurtarief) > 0;
    if (step === 3) return true;
    return true;
  };

  const submit = async () => {
    setIsSending(true);
    try {
      const res = await fetch("/api/klant/aanvraag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Aanvraag mislukt");
      }
      toast.success("Aanvraag succesvol verstuurd!");
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aanvraag versturen mislukt");
    } finally {
      setIsSending(false);
    }
  };

  const stepLabels = ["Functie", "Datum & Tijd", "Details", "Favorieten"];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Personeel Aanvragen</h2>
        <p className="mt-1 text-sm text-neutral-500">Vul het formulier in om personeel aan te vragen.</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step > i + 1 ? "bg-green-500 text-white" : step === i + 1 ? "bg-[#F27501] text-white" : "bg-neutral-200 text-neutral-500"
            }`}>
              {step > i + 1 ? "✓" : i + 1}
            </div>
            <span className={`text-sm hidden sm:inline ${step === i + 1 ? "font-medium text-neutral-900" : "text-neutral-400"}`}>{label}</span>
            {i < stepLabels.length - 1 && <div className="w-8 h-0.5 bg-neutral-200" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200">
        {/* Step 1: Functie */}
        {step === 1 && (
          <div>
            <h3 className="text-lg font-bold text-neutral-900 mb-4">Welke functie zoekt u?</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {functies.map((f) => (
                <button key={f.value} onClick={() => setForm({ ...form, functie: f.value })}
                  className={`p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.functie === f.value ? "border-[#F27501] bg-[#F27501]/5 text-[#F27501]" : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Datum & Tijd */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-neutral-900 mb-4">Wanneer heeft u personeel nodig?</h3>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Datum</label>
              <input type="date" value={form.datum} onChange={(e) => setForm({ ...form, datum: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Starttijd</label>
                <input type="time" value={form.start_tijd} onChange={(e) => setForm({ ...form, start_tijd: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Eindtijd</label>
                <input type="time" value={form.eind_tijd} onChange={(e) => setForm({ ...form, eind_tijd: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Aantal medewerkers</label>
              <input type="number" min="1" max="20" value={form.aantal} onChange={(e) => setForm({ ...form, aantal: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Uurtarief (€) <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.uurtarief}
                onChange={(e) => setForm({ ...form, uurtarief: e.target.value })}
                placeholder="Bijv. 14.50"
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
              />
              <p className="mt-1 text-xs text-neutral-500">Het uurtarief dat wordt uitbetaald aan de medewerker</p>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-neutral-900 mb-4">Aanvullende details</h3>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Locatie</label>
              {locaties.length > 0 ? (
                <select value={form.locatie} onChange={(e) => setForm({ ...form, locatie: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]">
                  <option value="">Selecteer locatie...</option>
                  {locaties.map((l) => <option key={l} value={l}>{l}</option>)}
                  <option value="__nieuw">Andere locatie...</option>
                </select>
              ) : (
                <input type="text" value={form.locatie} onChange={(e) => setForm({ ...form, locatie: e.target.value })}
                  placeholder="Adres of naam van de locatie"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" />
              )}
              {form.locatie === "__nieuw" && (
                <input type="text" onChange={(e) => setForm({ ...form, locatie: e.target.value })}
                  placeholder="Vul locatie in..."
                  className="w-full mt-2 px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Opmerkingen (optioneel)</label>
              <textarea value={form.opmerkingen} onChange={(e) => setForm({ ...form, opmerkingen: e.target.value })}
                rows={3} placeholder="Bijzonderheden, kledingvoorschriften, etc."
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]" />
            </div>
          </div>
        )}

        {/* Step 4: Favorieten */}
        {step === 4 && (
          <div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Voorkeur medewerkers (optioneel)</h3>
            <p className="text-sm text-neutral-500 mb-4">Selecteer favoriete medewerkers die u graag wilt inzetten.</p>
            {favorieten.length === 0 ? (
              <p className="text-sm text-neutral-400 py-4 text-center">Geen favoriete medewerkers beschikbaar.</p>
            ) : (
              <div className="space-y-2">
                {favorieten.map((f) => {
                  const selected = form.favoriet_medewerker_ids.includes(f.medewerker_id);
                  return (
                    <button key={f.medewerker_id}
                      onClick={() => setForm({
                        ...form,
                        favoriet_medewerker_ids: selected
                          ? form.favoriet_medewerker_ids.filter(id => id !== f.medewerker_id)
                          : [...form.favoriet_medewerker_ids, f.medewerker_id],
                      })}
                      className={`w-full text-left p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                        selected ? "border-[#F27501] bg-[#F27501]/5" : "border-neutral-200 hover:border-neutral-300"
                      }`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? "border-[#F27501] bg-[#F27501]" : "border-neutral-300"}`}>
                        {selected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="text-sm font-medium text-neutral-900">{f.naam}</span>
                      <span className="text-xs text-neutral-500">{Array.isArray(f.functie) ? f.functie.join(", ") : f.functie}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-neutral-100">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-800 transition">
              Vorige
            </button>
          ) : <div />}
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canNext()}
              className="px-6 py-2 bg-[#F27501] text-white rounded-xl text-sm font-medium hover:bg-[#d96800] transition disabled:opacity-40 disabled:cursor-not-allowed">
              Volgende
            </button>
          ) : (
            <button onClick={submit} disabled={isSending}
              className="px-6 py-2 bg-[#F27501] text-white rounded-xl text-sm font-medium hover:bg-[#d96800] transition disabled:opacity-50">
              {isSending ? "Versturen..." : "Aanvraag versturen"}
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      {step >= 2 && (
        <div className="bg-neutral-50 rounded-2xl p-4 text-sm">
          <p className="font-medium text-neutral-700 mb-2">Samenvatting</p>
          <div className="grid grid-cols-2 gap-2 text-neutral-600">
            <span>Functie:</span><span className="font-medium">{form.functie}</span>
            {form.datum && <><span>Datum:</span><span className="font-medium">{new Date(form.datum).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}</span></>}
            {form.start_tijd && <><span>Tijd:</span><span className="font-medium">{form.start_tijd} - {form.eind_tijd}</span></>}
            <span>Aantal:</span><span className="font-medium">{form.aantal}</span>
            {form.locatie && form.locatie !== "__nieuw" && <><span>Locatie:</span><span className="font-medium">{form.locatie}</span></>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Feature 4: Rooster Tab
   ============================================================ */
function RoosterTab({ formatTime, statusTone }: { formatTime: (v: string) => string; statusTone: Record<string, string> }) {
  const [view, setView] = useState<"week" | "maand">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [rooster, setRooster] = useState<RoosterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getWeekRange = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  };

  const getMonthRange = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start, end };
  };

  const fetchRooster = useCallback(async () => {
    setIsLoading(true);
    const range = view === "week" ? getWeekRange(currentDate) : getMonthRange(currentDate);
    const startStr = range.start.toISOString().split("T")[0];
    const endStr = range.end.toISOString().split("T")[0];
    try {
      const res = await fetch(`/api/klant/rooster?start=${startStr}&end=${endStr}`);
      const data = await res.json();
      setRooster(data.rooster || []);
    } catch { /* ignore */ }
    setIsLoading(false);
  }, [currentDate, view]);

  useEffect(() => { fetchRooster(); }, [fetchRooster]);

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const statusColor: Record<string, string> = {
    bevestigd: "bg-green-500",
    open: "bg-amber-500",
    vol: "bg-green-500",
    bezig: "bg-amber-500",
    afgerond: "bg-neutral-400",
    geannuleerd: "bg-red-500",
  };

  const dagNamen = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  const renderWeekView = () => {
    const { start } = getWeekRange(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });

    return (
      <div className="space-y-4">
        {days.map((day) => {
          const dateStr = day.toISOString().split("T")[0];
          const dayItems = rooster.filter((r) => r.datum === dateStr);
          const isToday = dateStr === new Date().toISOString().split("T")[0];

          return (
            <div key={dateStr} className={`rounded-2xl border p-4 ${isToday ? "border-[#F27501]/30 bg-orange-50/30" : "border-neutral-200 bg-white"}`}>
              <p className={`text-sm font-semibold mb-2 ${isToday ? "text-[#F27501]" : "text-neutral-700"}`}>
                {day.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "short" })}
                {isToday && <span className="ml-2 text-xs font-normal text-[#F27501]">Vandaag</span>}
              </p>
              {dayItems.length === 0 ? (
                <p className="text-xs text-neutral-400">Geen diensten</p>
              ) : (
                <div className="space-y-2">
                  {dayItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-neutral-50 rounded-xl p-3">
                      <div className={`w-2 h-2 rounded-full ${statusColor[item.status] || "bg-neutral-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900">{item.locatie || item.functie}</p>
                        <p className="text-xs text-neutral-500">{formatTime(item.start_tijd)} - {formatTime(item.eind_tijd)} · {item.functie}</p>
                        {item.medewerkers.length > 0 && (
                          <p className="text-xs text-neutral-400 mt-1">{item.medewerkers.map(m => m.naam).join(", ")}</p>
                        )}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone[item.status] || "bg-neutral-200 text-neutral-700"}`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();
    const todayStr = new Date().toISOString().split("T")[0];

    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);

    return (
      <div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dagNamen.map(d => <div key={d} className="text-center text-xs font-medium text-neutral-400 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayItems = rooster.filter(r => r.datum === dateStr);
            const isToday = dateStr === todayStr;

            return (
              <div key={dateStr} className={`p-1.5 min-h-[60px] rounded-lg text-center ${isToday ? "bg-[#F27501]/5 ring-1 ring-[#F27501]/30" : "bg-white"}`}>
                <span className={`text-xs ${isToday ? "font-bold text-[#F27501]" : "text-neutral-600"}`}>{day}</span>
                <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                  {dayItems.map((item) => (
                    <div key={item.id} className={`w-2 h-2 rounded-full ${statusColor[item.status] || "bg-neutral-400"}`} title={`${item.functie} ${formatTime(item.start_tijd)}-${formatTime(item.eind_tijd)}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Rooster</h2>
          <p className="mt-1 text-sm text-neutral-500">Overzicht van alle ingeplande diensten.</p>
        </div>
        <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
          <button onClick={() => setView("week")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${view === "week" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"}`}>
            Week
          </button>
          <button onClick={() => setView("maand")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${view === "maand" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"}`}>
            Maand
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-neutral-100 rounded-lg transition">
          <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-sm font-semibold text-neutral-900">
          {view === "week"
            ? `Week van ${getWeekRange(currentDate).start.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`
            : currentDate.toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}
        </span>
        <button onClick={() => navigate(1)} className="p-2 hover:bg-neutral-100 rounded-lg transition">
          <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Bevestigd</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> In afwachting</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Aangevraagd</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" /></div>
      ) : view === "week" ? renderWeekView() : renderMonthView()}
    </div>
  );
}

/* ============================================================
   Feature 5: Kosten Tab
   ============================================================ */
const PIE_COLORS = ["#F27501", "#d96800", "#fb923c", "#fdba74", "#fed7aa", "#fef3c7"];

function KostenTab() {
  const [data, setData] = useState<KostenData | null>(null);
  const [jaar, setJaar] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);

  const fetchKosten = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/klant/kosten?jaar=${jaar}`);
      const d = await res.json();
      setData(d);
    } catch { /* ignore */ }
    setIsLoading(false);
  }, [jaar]);

  useEffect(() => { fetchKosten(); }, [fetchKosten]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [["Maand", "Kosten"], ...data.per_maand.map(m => [m.maand, m.kosten.toFixed(2)])];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kosten-${jaar}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Kosten Dashboard</h2>
          <p className="mt-1 text-sm text-neutral-500">Inzicht in uw personeelskosten.</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={jaar} onChange={(e) => setJaar(Number(e.target.value))}
            className="px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={exportCSV} className="px-4 py-2 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition">
            CSV Export
          </button>
        </div>
      </div>

      {/* Totaal */}
      <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 rounded-2xl p-6 text-white">
        <p className="text-sm text-neutral-300">Totale kosten {jaar}</p>
        <p className="text-4xl font-bold mt-2">EUR {(data?.totaal ?? 0).toFixed(2)}</p>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-neutral-700 mb-4">Kosten per maand</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.per_maand || []}>
                <XAxis dataKey="maand" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`EUR ${Number(value).toFixed(2)}`, "Kosten"]} />
                <Bar dataKey="kosten" fill="#F27501" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-neutral-700 mb-4">Verdeling per functie</h3>
          <div className="h-64">
            {data?.per_functie && data.per_functie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.per_functie} dataKey="kosten" nameKey="functie" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                    {data.per_functie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`EUR ${Number(value).toFixed(2)}`, "Kosten"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-neutral-400">Geen data beschikbaar</div>
            )}
          </div>
        </div>
      </div>

      {/* Top medewerkers */}
      {data?.top_medewerkers && data.top_medewerkers.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-neutral-700 mb-4">Top medewerkers</h3>
          <div className="space-y-3">
            {data.top_medewerkers.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#F27501]/10 text-[#F27501] text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{m.naam}</p>
                    <p className="text-xs text-neutral-500">{m.uren} uur</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-neutral-900">EUR {m.totaal.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Feature 6: Berichten Tab (Chat style)
   ============================================================ */
function BerichtenTab({ klant, onUnreadChange }: { klant: Klant; onUnreadChange: (n: number) => void }) {
  const toast = useToast();
  const [berichten, setBerichten] = useState<KlantBericht[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nieuwBericht, setNieuwBericht] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchBerichten = useCallback(async () => {
    try {
      const res = await fetch("/api/klant/berichten");
      const data = await res.json();
      setBerichten(data.berichten || []);
      onUnreadChange(data.ongelezen_count || 0);
    } catch { /* ignore */ }
    setIsLoading(false);
  }, [onUnreadChange]);

  useEffect(() => {
    fetchBerichten();
    const interval = setInterval(fetchBerichten, 15000);
    return () => clearInterval(interval);
  }, [fetchBerichten]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [berichten]);

  const verstuur = async () => {
    if (!nieuwBericht.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/klant/berichten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bericht: nieuwBericht.trim() }),
      });
      if (!res.ok) throw new Error();
      setNieuwBericht("");
      fetchBerichten();
    } catch {
      toast.error("Bericht versturen mislukt");
    }
    setIsSending(false);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[700px]">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-neutral-900">Berichten</h2>
        <p className="mt-1 text-sm text-neutral-500">Chat met het TopTalent team.</p>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white rounded-2xl border border-neutral-200 p-4 space-y-3 shadow-sm">
        {berichten.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-12 h-12 text-neutral-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm text-neutral-400">Nog geen berichten. Stuur uw eerste bericht!</p>
            </div>
          </div>
        ) : (
          berichten.map((b) => (
            <div key={b.id} className={`flex ${b.afzender === "klant" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                b.afzender === "klant"
                  ? "bg-[#F27501] text-white rounded-br-md"
                  : "bg-neutral-100 text-neutral-800 rounded-bl-md"
              }`}>
                <p className="text-sm whitespace-pre-wrap">{b.bericht}</p>
                <p className={`text-xs mt-1 ${b.afzender === "klant" ? "text-white/60" : "text-neutral-400"}`}>
                  {new Date(b.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                  {b.afzender === "toptalent" && " · TopTalent"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={nieuwBericht}
          onChange={(e) => setNieuwBericht(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); verstuur(); } }}
          placeholder="Typ uw bericht..."
          className="flex-1 px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] text-sm"
        />
        <button onClick={verstuur} disabled={isSending || !nieuwBericht.trim()}
          className="px-5 py-3 bg-[#F27501] text-white rounded-xl font-medium text-sm hover:bg-[#d96800] transition disabled:opacity-40">
          {isSending ? "..." : "Verstuur"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Existing: Klant Referral Section
   ============================================================ */
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

/* ============================================================
   Existing: Sub-component for Uren tab
   ============================================================ */
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
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${subTab === "pending" ? "bg-[#1e3a5f] text-white" : "bg-[var(--kp-primary-light)] text-[var(--kp-text-secondary)] hover:bg-[var(--kp-border)]"}`}>
          Te beoordelen ({pending.length})
        </button>
        <button onClick={() => setSubTab("approved")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${subTab === "approved" ? "bg-[#1e3a5f] text-white" : "bg-[var(--kp-primary-light)] text-[var(--kp-text-secondary)] hover:bg-[var(--kp-border)]"}`}>
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
            <div key={u.id} className="rounded-2xl border border-[var(--kp-border)] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-[var(--kp-text-primary)]">{u.medewerker_naam}</p>
                  <p className="text-sm text-[var(--kp-text-secondary)]">{formatDate(u.dienst_datum)}</p>
                  <p className="text-xs text-[var(--kp-text-tertiary)] mt-0.5">{u.dienst_locatie}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[var(--kp-text-primary)]">{u.gewerkte_uren}u</p>
                  <p className="text-sm text-[var(--kp-text-secondary)]">&euro;{(u.gewerkte_uren * u.uurtarief).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-1 text-xs text-[var(--kp-text-tertiary)]">
                <span>{u.start_tijd?.slice(0, 5)} - {u.eind_tijd?.slice(0, 5)}</span>
                <span>{u.pauze_minuten}m pauze</span>
                {u.reiskosten_km > 0 && <span>{u.reiskosten_km}km reiskosten ({formatCurrency(u.reiskosten_bedrag)})</span>}
              </div>
              {subTab === "pending" && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => onApprove(u.id)}
                    className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold transition hover:bg-green-600">
                    Akkoord
                  </button>
                  <button onClick={() => onAdjust(u)}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--kp-border)] text-[var(--kp-text-secondary)] text-sm font-medium transition hover:bg-[var(--kp-bg-page)]">
                    Aanpassen
                  </button>
                </div>
              )}
              {subTab === "approved" && (
                <div className="mt-2">
                  <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    Goedgekeurd
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// === QR Scanner Tab ===

interface CheckinResult {
  status: "ingecheckt" | "al_ingecheckt";
  check_in_at: string;
  medewerker: { naam: string; functie: string | string[]; profile_photo_url: string | null } | null;
  dienst: { datum: string; start_tijd: string; eind_tijd: string; locatie: string; functie: string } | null;
}

interface CheckinListItem {
  id: string;
  check_in_at: string;
  medewerker_naam: string;
  medewerker_functie: string | string[];
  medewerker_foto: string | null;
  dienst_start: string;
  dienst_eind: string;
  dienst_locatie: string;
  dienst_functie: string;
}

function QRScannerTab() {
  const toast = useToast();
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "warning" | "error"; data?: CheckinResult; message?: string } | null>(null);
  const [checkins, setCheckins] = useState<CheckinListItem[]>([]);
  const [loadingCheckins, setLoadingCheckins] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchCheckins = useCallback(async () => {
    try {
      const res = await fetch("/api/klant/checkin");
      const data = await res.json();
      setCheckins(data.checkins || []);
    } catch {
      // Silently fail
    } finally {
      setLoadingCheckins(false);
    }
  }, []);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanner = async () => {
    setResult(null);
    setScanning(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      // Wait for DOM element
      await new Promise((r) => setTimeout(r, 100));

      if (!scannerRef.current) return;

      const scannerId = "qr-scanner-element";
      scannerRef.current.id = scannerId;

      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // Stop scanner immediately
          await html5QrCode.stop().catch(() => {});
          html5QrCodeRef.current = null;
          setScanning(false);
          await handleScan(decodedText);
        },
        () => {
          // QR code not found in frame — do nothing
        }
      );
    } catch (err) {
      setScanning(false);
      const message = err instanceof Error ? err.message : "Camera kon niet worden geopend";
      setResult({ type: "error", message });
      toast.error("Camera kon niet worden geopend. Controleer de cameratoegang.");
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      await html5QrCodeRef.current.stop().catch(() => {});
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  };

  const handleScan = async (decodedText: string) => {
    setProcessing(true);
    try {
      // Parse QR data
      let qrData: { type?: string; id?: string; naam?: string };
      try {
        qrData = JSON.parse(decodedText);
      } catch {
        setResult({ type: "error", message: "Ongeldige QR-code: geen geldig TopTalent ID" });
        setProcessing(false);
        return;
      }

      if (qrData.type !== "toptalent_medewerker" || !qrData.id) {
        setResult({ type: "error", message: "Ongeldige QR-code: dit is geen TopTalent medewerker ID" });
        setProcessing(false);
        return;
      }

      // Send check-in request
      const res = await fetch("/api/klant/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medewerker_id: qrData.id }),
      });

      const data = await res.json();

      if (res.status === 200) {
        setResult({ type: "success", data });
        toast.success(`${data.medewerker?.naam || "Medewerker"} is ingecheckt!`);
        fetchCheckins();
      } else if (res.status === 409) {
        setResult({ type: "warning", data });
      } else {
        setResult({ type: "error", message: data.error || "Check-in mislukt" });
      }
    } catch {
      setResult({ type: "error", message: "Netwerkfout — probeer opnieuw" });
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (t: string) => {
    if (!t) return "";
    return t.slice(0, 5);
  };

  const formatCheckinTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  };

  const renderFunctie = (f: string | string[]) => {
    return Array.isArray(f) ? f.join(", ") : f || "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">QR Check-in</h2>
        <p className="mt-1 text-sm text-neutral-500">Scan de QR-code van een medewerker om aanwezigheid te registreren.</p>
      </div>

      {/* Scanner Controls */}
      {!scanning && !result && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F27501]/10">
            <svg className="h-8 w-8 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9V5a2 2 0 012-2h4M15 3h4a2 2 0 012 2v4M21 15v4a2 2 0 01-2 2h-4M9 21H5a2 2 0 01-2-2v-4" />
            </svg>
          </div>
          <p className="text-center text-sm text-neutral-600">Richt de camera op de QR-code op het ID-kaartje van de medewerker.</p>
          <button
            onClick={startScanner}
            className="rounded-xl bg-[#F27501] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#d96800]"
          >
            Camera openen & scannen
          </button>
        </div>
      )}

      {/* Active Scanner */}
      {scanning && (
        <div className="space-y-4">
          <div
            ref={scannerRef}
            className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border-2 border-[#F27501]/30"
          />
          <div className="flex justify-center">
            <button
              onClick={stopScanner}
              className="rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Scanner sluiten
            </button>
          </div>
        </div>
      )}

      {/* Processing */}
      {processing && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-8">
          <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
          <p className="text-sm text-neutral-600">Check-in verwerken...</p>
        </div>
      )}

      {/* Result Card */}
      {result && !processing && (
        <div className={`rounded-2xl border-2 p-6 ${
          result.type === "success" ? "border-green-300 bg-green-50" :
          result.type === "warning" ? "border-amber-300 bg-amber-50" :
          "border-red-300 bg-red-50"
        }`}>
          {/* Icon */}
          <div className="flex items-center gap-3 mb-4">
            {result.type === "success" && (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-green-800">Ingecheckt!</span>
              </>
            )}
            {result.type === "warning" && (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3l9 16H3L12 3z" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-amber-800">Al ingecheckt</span>
              </>
            )}
            {result.type === "error" && (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-red-800">Mislukt</span>
              </>
            )}
          </div>

          {/* Details */}
          {result.data?.medewerker && (
            <div className="flex items-center gap-3 mb-3">
              {result.data.medewerker.profile_photo_url ? (
                <img src={result.data.medewerker.profile_photo_url} alt={result.data.medewerker.naam} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-bold text-[#F27501]">
                  {result.data.medewerker.naam.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold text-neutral-900">{result.data.medewerker.naam}</p>
                <p className="text-sm text-neutral-600">{renderFunctie(result.data.medewerker.functie)}</p>
              </div>
            </div>
          )}

          {result.data?.dienst && (
            <div className="rounded-xl bg-white/60 p-3 text-sm text-neutral-700 space-y-1">
              <p><span className="font-medium">Dienst:</span> {formatTime(result.data.dienst.start_tijd)} – {formatTime(result.data.dienst.eind_tijd)}</p>
              <p><span className="font-medium">Locatie:</span> {result.data.dienst.locatie}</p>
              <p><span className="font-medium">Functie:</span> {result.data.dienst.functie}</p>
            </div>
          )}

          {result.data?.check_in_at && (
            <p className="mt-2 text-sm text-neutral-500">
              {result.type === "warning" ? "Ingecheckt om" : "Tijdstip"}: {formatCheckinTime(result.data.check_in_at)}
            </p>
          )}

          {result.type === "error" && result.message && (
            <p className="text-sm text-red-700">{result.message}</p>
          )}

          {/* Next scan button */}
          <button
            onClick={() => { setResult(null); startScanner(); }}
            className="mt-4 w-full rounded-xl bg-[#F27501] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d96800]"
          >
            Volgende scan
          </button>
        </div>
      )}

      {/* Today's Check-ins */}
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-3">Check-ins vandaag</h3>
        {loadingCheckins ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-3 border-[#F27501] border-t-transparent rounded-full" />
          </div>
        ) : checkins.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
            Nog geen check-ins vandaag
          </div>
        ) : (
          <div className="space-y-2">
            {checkins.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
                {c.medewerker_foto ? (
                  <img src={c.medewerker_foto} alt={c.medewerker_naam} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F27501]/10 text-sm font-bold text-[#F27501]">
                    {c.medewerker_naam.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{c.medewerker_naam}</p>
                  <p className="text-xs text-neutral-500">{renderFunctie(c.medewerker_functie)} · {c.dienst_locatie}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs font-medium">{formatCheckinTime(c.check_in_at)}</span>
                  </div>
                  <p className="text-xs text-neutral-400">{formatTime(c.dienst_start)} – {formatTime(c.dienst_eind)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   PWA Install Banner for Klant Portal
   ============================================================ */
function KlantInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [bannerGesloten, setBannerGesloten] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setBannerGesloten(localStorage.getItem("klant-pwa-banner-gesloten") === "true");
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (installPrompt as unknown as { prompt: () => void }).prompt();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (installPrompt as unknown as { userChoice: Promise<{ outcome: string }> }).userChoice;
    if (result.outcome === "accepted") setInstallPrompt(null);
  };

  const handleSluit = () => {
    setBannerGesloten(true);
    localStorage.setItem("klant-pwa-banner-gesloten", "true");
  };

  if (bannerGesloten || isStandalone) return null;

  // Android: native install prompt
  if (installPrompt) {
    return (
      <div className="bg-[#1e3a5f] rounded-2xl p-4 flex items-center gap-3">
        <span className="text-2xl flex-shrink-0">📲</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Installeer TopTalent Beheer</p>
          <p className="text-blue-200 text-xs">Beheer uw personeel direct vanaf uw beginscherm</p>
        </div>
        <button onClick={handleInstall} className="bg-white text-[#1e3a5f] text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0">
          Installeer
        </button>
        <button onClick={handleSluit} className="text-blue-300 flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    );
  }

  // iOS: instructie banner
  if (isIOS) {
    return (
      <div className="bg-[#1e3a5f] rounded-2xl p-4 flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">📲</span>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">Installeer TopTalent Beheer</p>
          <p className="text-blue-200 text-xs mt-1">
            Tik op <strong className="text-white">⬆</strong> onderaan en kies <strong className="text-white">&quot;Zet op beginscherm&quot;</strong>
          </p>
        </div>
        <button onClick={handleSluit} className="text-blue-300 flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    );
  }

  return null;
}
