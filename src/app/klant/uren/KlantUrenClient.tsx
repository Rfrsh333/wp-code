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
import DashboardWidgets from "@/components/klant/DashboardWidgets";
import KlantPushNotificationBanner from "../components/PushNotificationBanner";
import QuickActions from "@/components/klant/QuickActions";
import LiveStatusTracker from "@/components/klant/LiveStatusTracker";
import TabSearchBar from "@/components/klant/TabSearchBar";
import StarRating from "@/components/ui/StarRating";
import { useKlantUren, useKlantBeoordelingen, useKlantDashboard, useKlantDiensten, useKlantFacturen, useKlantFavorieten, useKlantTemplates, useKlantAanvraagLocaties, useKlantRooster, useKlantKosten, useKlantCheckins, useUrenAction, useFactuurAction, useBeoordelingAction, useDienstenAction, useFavorietAction, useAanvraagAction, useTemplateAction, useCheckinAction, klantKeys } from "@/hooks/queries/useKlantQueries";
import { useKlantRealtime } from "@/hooks/queries/useKlantRealtime";
import { usePlatformOptions } from "@/hooks/queries/usePlatformOptions";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

interface DienstTemplate {
  id: string;
  naam: string;
  beschrijving: string | null;
  functie: string;
  aantal_nodig: number;
  locatie: string;
  duur_uren: number | null;
  uurtarief: number | null;
  favoriet_medewerker_ids: string[];
  aantal_keer_gebruikt: number;
  laatst_gebruikt_op: string | null;
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

export default function KlantUrenClient({ klant }: { klant: Klant }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overzicht");

  // React Query data fetching
  const { data: urenData, isLoading: urenLoading } = useKlantUren();
  const { data: beoorData } = useKlantBeoordelingen();
  const { data: dashboardData } = useKlantDashboard();
  const { data: dienstenData } = useKlantDiensten();
  const { data: facturenData } = useKlantFacturen();

  // Realtime subscriptions
  useKlantRealtime(klant.id);

  // Mutations
  const urenAction = useUrenAction();
  const factuurAction = useFactuurAction();
  const beoordelingAction = useBeoordelingAction();
  const dienstenMutation = useDienstenAction();

  // Derived state from React Query
  const uren: UrenRegistratie[] = urenData?.uren ?? [];
  const teBeoordeelen: TeBeoordelen[] = beoorData?.teBeoordeelen ?? [];
  const dashboardStats: DashboardStats | null = dashboardData?.stats ?? null;
  const upcomingDiensten: UpcomingDienst[] = dashboardData?.upcomingDiensten ?? [];
  const recentFacturen: Factuur[] = facturenData?.facturen ?? [];
  const dienstenVolledig: UpcomingDienst[] = dienstenData?.diensten ?? [];
  const isLoading = urenLoading;

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
  const [aanmeldingenOpen, setAanmeldingenOpen] = useState<string | null>(null);
  const [aanmeldingen, setAanmeldingen] = useState<DienstAanmelding[]>([]);
  const [aanmeldingenLoading, setAanmeldingenLoading] = useState(false);
  const [aanmeldingenActie, setAanmeldingenActie] = useState<string | null>(null);
  const [approveModal, setApproveModal] = useState<{
    open: boolean;
    uren: UrenRegistratie | null;
    score_punctualiteit: number;
    score_functie: number;
  }>({ open: false, uren: null, score_punctualiteit: 5, score_functie: 5 });
  const [urenZoek, setUrenZoek] = useState("");

  const createFactuur = async (urenIds: string[]) => {
    try {
      const data = await factuurAction.mutateAsync({ uren_ids: urenIds });
      toast.success(`Factuur ${data.factuur_nummer} aangemaakt!`);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Factuur aanmaken mislukt");
      return false;
    }
  };

  const submitBeoordeling = async () => {
    if (!beoordeelModal.item) return;
    beoordelingAction.mutate(
      {
        dienst_id: beoordeelModal.item.dienst_id,
        medewerker_id: beoordeelModal.item.medewerker_id,
        score: beoordeelModal.score,
        opmerking: beoordeelModal.opmerking,
        score_punctualiteit: beoordeelModal.score_punctualiteit,
        score_professionaliteit: beoordeelModal.score_professionaliteit,
        score_vaardigheden: beoordeelModal.score_vaardigheden,
        score_communicatie: beoordeelModal.score_communicatie,
        zou_opnieuw_boeken: beoordeelModal.zou_opnieuw_boeken,
      },
      {
        onSuccess: () => {
          // Invalidate queries to refresh data (React Query v5)
          queryClient.invalidateQueries({ queryKey: klantKeys.beoordelingen() });
          queryClient.invalidateQueries({ queryKey: klantKeys.dashboard() });
          queryClient.invalidateQueries({ queryKey: klantKeys.uren() });

          toast.success("Beoordeling verstuurd");
          setBeoordeelModal({ open: false, item: null, score: 5, opmerking: "", score_punctualiteit: 5, score_professionaliteit: 5, score_vaardigheden: 5, score_communicatie: 5, zou_opnieuw_boeken: true });
        },
        onError: () => toast.error("Beoordeling versturen mislukt"),
      }
    );
  };

  const approveUren = (urenItem: UrenRegistratie) => {
    setApproveModal({
      open: true,
      uren: urenItem,
      score_punctualiteit: 5,
      score_functie: 5,
    });
  };

  const submitApproval = async () => {
    if (!approveModal.uren) return;
    urenAction.mutate(
      {
        action: "approve",
        id: approveModal.uren.id,
        score_punctualiteit: approveModal.score_punctualiteit,
        score_functie: approveModal.score_functie,
      },
      {
        onSuccess: () => {
          // Invalidate queries to refresh data (React Query v5)
          queryClient.invalidateQueries({ queryKey: klantKeys.uren() });
          queryClient.invalidateQueries({ queryKey: klantKeys.dashboard() });
          queryClient.invalidateQueries({ queryKey: klantKeys.beoordelingen() });

          toast.success("Uren goedgekeurd");
          setApproveModal({ open: false, uren: null, score_punctualiteit: 5, score_functie: 5 });
        },
        onError: () => toast.error("Goedkeuren mislukt"),
      }
    );
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

    urenAction.mutate(
      {
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
      },
      {
        onSuccess: () => {
          // Invalidate queries to refresh data (React Query v5)
          queryClient.invalidateQueries({ queryKey: klantKeys.uren() });
          queryClient.invalidateQueries({ queryKey: klantKeys.dashboard() });

          toast.success("Aanpassing verstuurd");
          setModal({ open: false, uren: null, startTijd: "", eindTijd: "", pauzeMinuten: "0", reiskostenKm: "0", opmerking: "" });
        },
        onError: () => toast.error("Aanpassing versturen mislukt"),
      }
    );
  };

  const fetchAanmeldingen = async (dienstId: string) => {
    setAanmeldingenLoading(true);
    dienstenMutation.mutate(
      { action: "get_aanmeldingen", dienst_id: dienstId },
      {
        onSuccess: (data) => {
          setAanmeldingen(data.data || []);
          setAanmeldingenLoading(false);
        },
        onError: () => {
          toast.error("Aanmeldingen ophalen mislukt");
          setAanmeldingenLoading(false);
        },
      }
    );
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
    dienstenMutation.mutate(
      { action: "update_aanmelding", id: aanmeldingId, data: { status } },
      {
        onSuccess: () => {
          // Invalidate queries to refresh data (React Query v5)
          queryClient.invalidateQueries({ queryKey: klantKeys.diensten() });
          queryClient.invalidateQueries({ queryKey: klantKeys.dashboard() });

          toast.success(status === "geaccepteerd" ? "Medewerker geaccepteerd" : "Medewerker afgewezen");
          if (aanmeldingenOpen) {
            fetchAanmeldingen(aanmeldingenOpen);
          }
          setAanmeldingenActie(null);
        },
        onError: () => {
          toast.error("Actie mislukt");
          setAanmeldingenActie(null);
        },
      }
    );
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

  // Filter uren op basis van zoekterm
  const gefilterdeUren = uren.filter(u =>
    u.medewerker_naam.toLowerCase().includes(urenZoek.toLowerCase())
  );

  const pending = gefilterdeUren.filter(u => u.status === "ingediend");
  const approved = gefilterdeUren.filter(u => ["klant_goedgekeurd", "goedgekeurd"].includes(u.status));

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

  // Totaal notificatie count: goedkeuringen + te beoordelen
  const totalNotifCount = (dashboardStats?.pendingHoursCount ?? 0) + teBeoordeelen.length;

  return (
    <>
      <KlantMobileHeader
        bedrijfsnaam={klant.bedrijfsnaam}
        contactpersoon={klant.contactpersoon}
        ongelezen={totalNotifCount}
      />
      <KlantPushNotificationBanner />
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

                {/* NIEUW: Dashboard Widgets */}
                <DashboardWidgets
                  stats={dashboardStats}
                  volgendeDienst={upcomingDiensten[0] ?? null}
                  openFacturen={recentFacturen}
                  maandBedrag={0}
                  budgetGebruikt={0}
                  budgetTotaal={3000}
                  onTabChange={setActiveTab}
                />

                {/* NIEUW: Quick Actions */}
                <QuickActions onTabChange={setActiveTab} />

                {/* NIEUW: Live Status */}
                <LiveStatusTracker
                  diensten={upcomingDiensten}
                  onTabChange={setActiveTab}
                />

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

                {/* NIEUW: Zoekbalk */}
                <TabSearchBar
                  placeholder="Zoek op medewerker naam..."
                  onSearch={setUrenZoek}
                />

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

                {/* Verstuur factuur voor goedgekeurde uren */}
                {approved.filter(u => u.status === "klant_goedgekeurd").length > 0 && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-neutral-900 mb-1">
                          Factuur aanmaken
                        </h3>
                        <p className="text-sm text-neutral-600 mb-4">
                          U heeft {approved.filter(u => u.status === "klant_goedgekeurd").length} goedgekeurde uren die nog niet zijn gefactureerd.
                          Maak een factuur aan om deze uren te factureren.
                        </p>
                        <button
                          onClick={async () => {
                            const urenToInvoice = approved.filter(u => u.status === "klant_goedgekeurd");
                            if (urenToInvoice.length > 0) {
                              await createFactuur(urenToInvoice.map(u => u.id));
                            }
                          }}
                          className="px-6 py-3 rounded-xl bg-blue-500 text-white font-semibold text-sm transition hover:bg-blue-600 flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Verstuur factuur ({approved.filter(u => u.status === "klant_goedgekeurd").length} uren)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[dienst.status] || "bg-neutral-200 text-neutral-700"}`}>
                                {dienst.status}
                              </span>
                              {dienst.status === "vol" && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await dienstenMutation.mutateAsync({ action: "heropenen", dienst_id: dienst.id });
                                      toast.success("Dienst heropend! Medewerkers kunnen zich weer aanmelden.");
                                    } catch (err) {
                                      toast.error(err instanceof Error ? err.message : "Heropenen mislukt");
                                    }
                                  }}
                                  className="rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                                >
                                  Heropenen
                                </button>
                              )}
                            </div>
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
            {activeTab === "aanvragen" && <AanvraagTab klant={klant} onSuccess={() => { setActiveTab("diensten"); }} />}

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

            {/* Tab: QR Check-in */}
            {activeTab === "qr-scanner" && <QRScannerTab />}
          </>
        )}
      </KlantPortalLayout>

      {/* Beoordeling Modal — Premium Design */}
      {beoordeelModal.open && beoordeelModal.item && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setBeoordeelModal({ ...beoordeelModal, open: false })}>
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header with gradient */}
            <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] rounded-t-3xl px-6 py-5 text-white">
              <h3 className="text-lg font-bold">Beoordeling</h3>
              <p className="text-white/70 text-sm mt-0.5">{beoordeelModal.item.medewerker_naam} · {beoordeelModal.item.locatie}</p>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Algemene score — groot en centraal */}
              <div className="text-center">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Algemene score</label>
                <div className="flex justify-center">
                  <StarRating value={beoordeelModal.score} onChange={(s) => setBeoordeelModal({ ...beoordeelModal, score: s })} size="lg" />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-neutral-100" />

              {/* Categorie scores — compact grid */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Score per categorie</label>
                <div className="space-y-3">
                  {([
                    { key: "score_punctualiteit" as const, label: "Op tijd", emoji: "⏰" },
                    { key: "score_professionaliteit" as const, label: "Professionaliteit", emoji: "💼" },
                    { key: "score_vaardigheden" as const, label: "Vaardigheden", emoji: "🎯" },
                    { key: "score_communicatie" as const, label: "Communicatie", emoji: "💬" },
                  ]).map(({ key, label, emoji }) => (
                    <div key={key} className="flex items-center justify-between bg-neutral-50 rounded-xl px-3 py-2.5">
                      <span className="text-sm text-neutral-700 flex items-center gap-2">
                        <span className="text-base">{emoji}</span>
                        {label}
                      </span>
                      <StarRating value={beoordeelModal[key]} onChange={(s) => setBeoordeelModal({ ...beoordeelModal, [key]: s })} size="sm" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Zou opnieuw boeken — toggle style */}
              <button
                type="button"
                onClick={() => setBeoordeelModal({ ...beoordeelModal, zou_opnieuw_boeken: !beoordeelModal.zou_opnieuw_boeken })}
                className={`flex items-center gap-3 w-full rounded-xl px-4 py-3 border-2 transition-all ${
                  beoordeelModal.zou_opnieuw_boeken
                    ? "border-green-300 bg-green-50"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                  beoordeelModal.zou_opnieuw_boeken ? "bg-green-500 text-white" : "bg-neutral-200 text-transparent"
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-sm font-medium text-neutral-700">Ik zou deze medewerker opnieuw boeken</span>
              </button>

              {/* Opmerking */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Opmerking (optioneel)</label>
                <textarea
                  value={beoordeelModal.opmerking}
                  onChange={(e) => setBeoordeelModal({ ...beoordeelModal, opmerking: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] text-sm resize-none"
                  placeholder="Hoe was de medewerker?"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setBeoordeelModal({ ...beoordeelModal, open: false })}
                  className="flex-1 px-4 py-3 border border-neutral-200 text-neutral-600 rounded-xl font-medium hover:bg-neutral-50 transition text-sm"
                >
                  Annuleren
                </button>
                <button
                  onClick={submitBeoordeling}
                  disabled={beoordelingAction.isPending}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#F27501] to-[#ff8a1e] text-white rounded-xl font-semibold hover:from-[#d96800] hover:to-[#F27501] transition text-sm shadow-md shadow-orange-200 disabled:opacity-60"
                >
                  {beoordelingAction.isPending ? "Versturen..." : "Versturen"}
                </button>
              </div>
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

      {/* Approval Modal with Ratings */}
      {approveModal.open && approveModal.uren && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-neutral-900 mb-2">Uren Goedkeuren</h3>
            <p className="text-sm text-neutral-500 mb-4">
              {approveModal.uren.medewerker_naam} · {approveModal.uren.dienst_locatie}
            </p>

            <div className="bg-neutral-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium">
                {approveModal.uren.start_tijd?.slice(0, 5)} - {approveModal.uren.eind_tijd?.slice(0, 5)} ({approveModal.uren.pauze_minuten}m pauze)
              </p>
              <p className="text-lg font-bold text-neutral-900 mt-1">{approveModal.uren.gewerkte_uren} uur</p>
            </div>

            {/* Punctualiteit rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Was de medewerker op tijd?
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setApproveModal({ ...approveModal, score_punctualiteit: s })}
                    className={`w-12 h-12 rounded-full text-xl transition ${
                      approveModal.score_punctualiteit >= s
                        ? "bg-yellow-400 text-white"
                        : "bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Functie rating */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Hoe goed heeft de medewerker de functie uitgevoerd?
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setApproveModal({ ...approveModal, score_functie: s })}
                    className={`w-12 h-12 rounded-full text-xl transition ${
                      approveModal.score_functie >= s
                        ? "bg-yellow-400 text-white"
                        : "bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setApproveModal({ open: false, uren: null, score_punctualiteit: 5, score_functie: 5 })}
                className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition"
              >
                Annuleren
              </button>
              <button
                onClick={submitApproval}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition"
              >
                Goedkeuren
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
  const queryClient = useQueryClient();
  const { data: favData, isLoading } = useKlantFavorieten();
  const favorietAction = useFavorietAction();
  const favorieten: Favoriet[] = favData?.favorieten ?? [];
  const recentMedewerkers: RecentMedewerker[] = favData?.recentMedewerkers ?? [];

  const toggleFavoriet = async (medewerker_id: string, isFav: boolean) => {
    favorietAction.mutate(
      { medewerker_id, method: isFav ? "DELETE" : "POST" },
      {
        onSuccess: () => {
          // Invalidate queries to refresh data (React Query v5)
          queryClient.invalidateQueries({ queryKey: klantKeys.favorieten() });

          toast.success(isFav ? "Favoriet verwijderd" : "Favoriet toegevoegd");
        },
        onError: () => toast.error("Actie mislukt"),
      }
    );
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
            <div key={f.id} className="rounded-2xl border border-[var(--kp-border)] bg-white overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                {/* Avatar met favoriet ster */}
                <div className="relative flex-shrink-0">
                  {f.profile_photo_url ? (
                    <img src={f.profile_photo_url} alt={f.naam} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-lg">
                      {f.naam.charAt(0)}
                    </div>
                  )}
                  {/* Favoriet ster badge */}
                  <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[var(--kp-text-primary)]">{f.naam}</p>
                  <p className="text-[var(--kp-text-tertiary)] text-sm">
                    {renderFuncties(f.functie)}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    {/* Sterren */}
                    {f.gemiddelde_score != null && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 fill-amber-400 text-amber-400" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        <span className="text-[var(--kp-text-secondary)] text-xs font-semibold">
                          {f.gemiddelde_score.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {/* Aantal diensten */}
                    <span className="text-[var(--kp-text-tertiary)] text-xs">
                      {f.diensten_count}× gewerkt
                    </span>
                  </div>
                  {f.notitie && <p className="mt-1 text-xs text-[var(--kp-text-tertiary)] italic">{f.notitie}</p>}
                </div>

                {/* Boek opnieuw knop */}
                <button
                  onClick={() => window.location.href = "/klant/uren?tab=aanvragen"}
                  className="flex-shrink-0 bg-[#F27501] text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
                >
                  Boek
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
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const [form, setForm] = useState({
    functie: "", // ✅ Will be set based on selected functions
    categorie_id: "",
    functie_id: "",
    vereiste_taal: null as 'nl' | 'en' | 'nl_en' | null,
    vereiste_vaardigheden: [] as string[], // Skills required
    functies_met_aantal: [] as Array<{functie: string; aantal: number; uurtarief: string}>, // Multiple functions with counts and rates
    datum: "",
    start_tijd: "",
    eind_tijd: "",
    aantal: "1",
    uurtarief: "",
    locatie: "",
    opmerkingen: "",
    favoriet_medewerker_ids: [] as string[],
  });
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateNaam, setTemplateNaam] = useState("");

  // Platform opties (functies & vaardigheden uit admin)
  const { data: functieOptions = [] } = usePlatformOptions("functie");
  const { data: vaardigheidOptions = [] } = usePlatformOptions("vaardigheid");
  const { data: aanvraagData } = useKlantAanvraagLocaties();
  const { data: favData } = useKlantFavorieten();
  const { data: templData } = useKlantTemplates();
  const templateAction = useTemplateAction();
  const aanvraagAction = useAanvraagAction();

  // Fetch filter options (categorieën, functies, tags)
  const { data: filterOptions } = useQuery({
    queryKey: ['dienst-filters'],
    queryFn: async () => {
      const res = await fetch('/api/dienst-filters');
      if (!res.ok) throw new Error('Failed to load filters');
      return res.json();
    },
  });

  const locaties: string[] = aanvraagData?.locaties ?? [];
  const favorieten: Favoriet[] = favData?.favorieten ?? [];
  const templates: DienstTemplate[] = templData?.templates ?? [];

  // Get functions for selected category
  const selectedCategorie = filterOptions?.categorieen?.find((c: any) => c.id === form.categorie_id);
  const availableFuncties = selectedCategorie?.functies || [];
  const availableTags = filterOptions?.tags || [];

  const canNext = () => {
    if (step === 1) return form.functies_met_aantal.length > 0 && form.functies_met_aantal.every(f => f.uurtarief && parseFloat(f.uurtarief) > 0);
    if (step === 2) return !!form.datum && !!form.start_tijd && !!form.eind_tijd;
    if (step === 3) return true;
    return true;
  };

  const submit = async () => {
    setIsSending(true);
    aanvraagAction.mutate(form, {
      onSuccess: () => {
        // Invalidate queries to refresh data (React Query v5)
        queryClient.invalidateQueries({ queryKey: klantKeys.diensten() });
        queryClient.invalidateQueries({ queryKey: klantKeys.dashboard() });

        toast.success("Aanvraag succesvol verstuurd!");
        setShowSaveTemplate(true);
        setTimeout(() => {
          if (!showSaveTemplate) onSuccess();
        }, 3000);
        setIsSending(false);
      },
      onError: (e) => {
        toast.error(e instanceof Error ? e.message : "Aanvraag versturen mislukt");
        setIsSending(false);
      },
    });
  };

  const stepLabels = ["Functie(s)", "Datum & Tijd", "Details", "Favorieten"];

  const useTemplate = (template: DienstTemplate) => {
    setForm({
      functie: template.functie,
      categorie_id: "",
      functie_id: "",
      vereiste_taal: null,
      vereiste_vaardigheden: [],
      functies_met_aantal: [{functie: template.functie, aantal: template.aantal_nodig, uurtarief: template.uurtarief?.toString() || ""}],
      datum: "",
      start_tijd: "",
      eind_tijd: "",
      aantal: template.aantal_nodig.toString(),
      uurtarief: template.uurtarief?.toString() || "",
      locatie: template.locatie,
      opmerkingen: template.beschrijving || "",
      favoriet_medewerker_ids: template.favoriet_medewerker_ids || [],
    });
    setStep(2); // Skip naar datum selectie

    // Update template usage
    templateAction.mutate({ method: "PATCH", data: { template_id: template.id, increment_gebruik: true } });
  };

  const saveAsTemplate = async () => {
    if (!templateNaam.trim()) {
      toast.error("Geef je template een naam");
      return;
    }

    const functieSamenvatting = form.functies_met_aantal.length > 0
      ? form.functies_met_aantal.map(f => f.functie).join(", ")
      : form.functie;
    const totaalNodig = form.functies_met_aantal.length > 0
      ? form.functies_met_aantal.reduce((sum, f) => sum + f.aantal, 0)
      : parseInt(form.aantal) || 1;

    templateAction.mutate(
      {
        method: "POST",
        data: {
          naam: templateNaam,
          functie: functieSamenvatting,
          aantal_nodig: totaalNodig,
          locatie: form.locatie,
          uurtarief: parseFloat(form.uurtarief),
          favoriet_medewerker_ids: form.favoriet_medewerker_ids,
          beschrijving: form.opmerkingen,
        },
      },
      {
        onSuccess: () => {
          // Invalidate queries to refresh data (React Query v5)
          queryClient.invalidateQueries({ queryKey: klantKeys.templates() });

          toast.success("Template opgeslagen!");
          setShowSaveTemplate(false);
          setTemplateNaam("");
        },
        onError: () => toast.error("Template opslaan mislukt"),
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Personeel Aanvragen</h2>
        <p className="mt-1 text-sm text-neutral-500">Vul het formulier in om personeel aan te vragen.</p>
      </div>

      {/* Snelle Aanvraag - Templates */}
      {templates.length > 0 && step === 1 && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-200">
          <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Snelle aanvraag
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {templates.slice(0, 4).map((t) => (
              <button
                key={t.id}
                onClick={() => useTemplate(t)}
                className="text-left p-3 bg-white rounded-xl border border-orange-200 hover:border-[#F27501] hover:shadow-sm transition-all group"
              >
                <p className="font-medium text-sm text-neutral-900 group-hover:text-[#F27501] transition">
                  {t.naam}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {t.functie} • {t.aantal_nodig}x • {t.locatie}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {t.aantal_keer_gebruikt}x gebruikt
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

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
        {/* Step 1: Functie(s) & Aantal */}
        {step === 1 && (
          <div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Welke functie(s) zoekt u?</h3>
            <p className="text-sm text-neutral-600 mb-4">Selecteer één of meerdere functies en vul het aantal medewerkers in per functie</p>

            <div className="space-y-2">
              {functieOptions.map((opt) => opt.value).map((functie) => {
                const functieData = form.functies_met_aantal.find(f => f.functie === functie);
                const selected = !!functieData;

                return (
                  <div key={functie} className={`p-3 rounded-xl border-2 transition-all ${
                    selected ? "border-[#F27501] bg-[#F27501]/5" : "border-neutral-200 hover:border-neutral-300"
                  }`}>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (selected) {
                            setForm({
                              ...form,
                              functies_met_aantal: form.functies_met_aantal.filter(f => f.functie !== functie)
                            });
                          } else {
                            setForm({
                              ...form,
                              functies_met_aantal: [...form.functies_met_aantal, { functie, aantal: 1, uurtarief: "" }]
                            });
                          }
                        }}
                        className="flex-1 text-left">
                        <span className={`text-sm font-medium ${selected ? "text-[#F27501]" : "text-neutral-700"}`}>
                          {functie}
                        </span>
                      </button>

                      {selected && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-neutral-600 whitespace-nowrap">Aantal:</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={functieData?.aantal || 1}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const aantal = Math.max(1, parseInt(e.target.value) || 1);
                              setForm({
                                ...form,
                                functies_met_aantal: form.functies_met_aantal.map(f =>
                                  f.functie === functie ? { ...f, aantal } : f
                                )
                              });
                            }}
                            className="w-16 px-2 py-1 border border-neutral-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                          />
                        </div>
                      )}
                    </div>

                    {selected && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#F27501]/20">
                        <label className="text-xs text-neutral-600 whitespace-nowrap">Uurtarief €:</label>
                        <input
                          type="number"
                          min="0"
                          step="0.50"
                          value={functieData?.uurtarief || ""}
                          placeholder="Bijv. 14.50"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            setForm({
                              ...form,
                              functies_met_aantal: form.functies_met_aantal.map(f =>
                                f.functie === functie ? { ...f, uurtarief: e.target.value } : f
                              )
                            });
                          }}
                          className="flex-1 px-2 py-1 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {form.functies_met_aantal.length > 0 && (
              <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
                <p className="text-sm font-medium text-neutral-700">
                  Totaal: {form.functies_met_aantal.reduce((sum, f) => sum + f.aantal, 0)} medewerkers
                </p>
              </div>
            )}
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
            {/* Overzicht geselecteerde functies met tarieven */}
            {form.functies_met_aantal.length > 0 && (
              <div className="bg-neutral-50 rounded-xl p-3">
                <p className="text-xs font-medium text-neutral-500 mb-2">Geselecteerde functies</p>
                <div className="space-y-1.5">
                  {form.functies_met_aantal.map((f) => (
                    <div key={f.functie} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-700">{f.functie}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-neutral-500">{f.uurtarief ? `€${f.uurtarief}/u` : "—"}</span>
                        <span className="font-medium text-[#F27501]">{f.aantal}x</span>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-neutral-200 pt-1.5 mt-1.5 flex items-center justify-between text-sm font-bold">
                    <span className="text-neutral-900">Totaal</span>
                    <span className="text-[#F27501]">{form.functies_met_aantal.reduce((sum, f) => sum + f.aantal, 0)} medewerkers</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-neutral-900 mb-4">Aanvullende details</h3>

            {/* Vereiste taal */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Vereiste taalvaardigheid (optioneel)</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, vereiste_taal: null })}
                  className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                    form.vereiste_taal === null ? "border-[#F27501] bg-[#F27501]/5 text-[#F27501] font-medium" : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                  }`}>
                  Geen voorkeur
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, vereiste_taal: 'nl' })}
                  className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                    form.vereiste_taal === 'nl' ? "border-[#F27501] bg-[#F27501]/5 text-[#F27501] font-medium" : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                  }`}>
                  Nederlands
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, vereiste_taal: 'en' })}
                  className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                    form.vereiste_taal === 'en' ? "border-[#F27501] bg-[#F27501]/5 text-[#F27501] font-medium" : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                  }`}>
                  Engels
                </button>
              </div>
            </div>

            {/* Vereiste Vaardigheden */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Vereiste vaardigheden (optioneel)</label>
              <p className="text-xs text-neutral-500 mb-2">Selecteer vaardigheden waar de medewerker aan moet voldoen</p>
              <div className="flex flex-wrap gap-2">
                {vaardigheidOptions.map((opt) => opt.value).map((skill) => {
                  const selected = form.vereiste_vaardigheden.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => setForm({
                        ...form,
                        vereiste_vaardigheden: selected
                          ? form.vereiste_vaardigheden.filter(s => s !== skill)
                          : [...form.vereiste_vaardigheden, skill]
                      })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-all ${
                        selected
                          ? 'border-[#F27501] bg-[#F27501]/10 text-[#F27501]'
                          : 'border-neutral-200 text-neutral-700 hover:border-neutral-300'
                      }`}>
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Locatie */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Locatie</label>

              {/* Saved locations dropdown */}
              {locaties.length > 0 && (
                <div className="mb-3">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && e.target.value !== "__nieuw") {
                        setForm({ ...form, locatie: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  >
                    <option value="">Kies uit opgeslagen locaties...</option>
                    {locaties.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}

              {/* Structured address fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-neutral-500 mb-1">Straatnaam + huisnummer</label>
                  <input
                    type="text"
                    value={form.locatie.includes(",") ? form.locatie.split(",")[0].trim() : form.locatie}
                    onChange={(e) => {
                      const parts = form.locatie.split(",").map(p => p.trim());
                      parts[0] = e.target.value;
                      setForm({ ...form, locatie: parts.filter(Boolean).join(", ") });
                    }}
                    placeholder="Bijv. Keizersgracht 100"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Postcode</label>
                  <input
                    type="text"
                    value={(() => {
                      const parts = form.locatie.split(",").map(p => p.trim());
                      return parts[1] || "";
                    })()}
                    onChange={(e) => {
                      const parts = form.locatie.split(",").map(p => p.trim());
                      while (parts.length < 3) parts.push("");
                      parts[1] = e.target.value;
                      setForm({ ...form, locatie: parts.filter(Boolean).join(", ") });
                    }}
                    placeholder="1015 AB"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Stad</label>
                  <input
                    type="text"
                    value={(() => {
                      const parts = form.locatie.split(",").map(p => p.trim());
                      return parts[2] || "";
                    })()}
                    onChange={(e) => {
                      const parts = form.locatie.split(",").map(p => p.trim());
                      while (parts.length < 3) parts.push("");
                      parts[2] = e.target.value;
                      setForm({ ...form, locatie: parts.filter(Boolean).join(", ") });
                    }}
                    placeholder="Amsterdam"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  />
                </div>
              </div>
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
      {step >= 2 && !showSaveTemplate && (
        <div className="bg-neutral-50 rounded-2xl p-4 text-sm">
          <p className="font-medium text-neutral-700 mb-2">Samenvatting</p>
          <div className="grid grid-cols-2 gap-2 text-neutral-600">
            {form.functies_met_aantal.length > 0 ? (
              <>
                <span>Functies:</span>
                <span className="font-medium">
                  {form.functies_met_aantal.map(f => `${f.functie} (${f.aantal}x, €${f.uurtarief || "—"}/u)`).join(", ")}
                </span>
                <span>Totaal:</span>
                <span className="font-medium">{form.functies_met_aantal.reduce((sum, f) => sum + f.aantal, 0)} medewerkers</span>
              </>
            ) : (
              <><span>Functie:</span><span className="font-medium">{form.functie}</span></>
            )}
            {form.datum && <><span>Datum:</span><span className="font-medium">{new Date(form.datum).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}</span></>}
            {form.start_tijd && <><span>Tijd:</span><span className="font-medium">{form.start_tijd} - {form.eind_tijd}</span></>}
            {form.locatie && form.locatie !== "__nieuw" && <><span>Locatie:</span><span className="font-medium">{form.locatie}</span></>}
          </div>
        </div>
      )}

      {/* Save as Template */}
      {showSaveTemplate && (
        <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-200">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-neutral-900">Aanvraag verstuurd!</h3>
            <p className="text-sm text-neutral-600 mt-1">Wil je deze aanvraag opslaan als template voor volgende keer?</p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={templateNaam}
              onChange={(e) => setTemplateNaam(e.target.value)}
              placeholder="Geef je template een naam (bijv. 'Vrijdag avond shift')"
              className="w-full px-4 py-2 border border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowSaveTemplate(false); onSuccess(); }}
                className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50 transition"
              >
                Nee, bedankt
              </button>
              <button
                onClick={() => { saveAsTemplate(); onSuccess(); }}
                className="flex-1 px-4 py-2 bg-[#F27501] text-white rounded-xl text-sm font-medium hover:bg-[#d96800] transition"
              >
                Opslaan als template
              </button>
            </div>
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
  const [view, setView] = useState<"week" | "tijdlijn" | "maand">("week");
  const [currentDate, setCurrentDate] = useState(new Date());

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

  const range = view === "maand" ? getMonthRange(currentDate) : getWeekRange(currentDate);
  const startStr = range.start.toISOString().split("T")[0];
  const endStr = range.end.toISOString().split("T")[0];

  const { data: roosterData, isLoading } = useKlantRooster(startStr, endStr);
  const rooster: RoosterItem[] = roosterData?.rooster ?? [];

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "maand") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
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

  const statusBarColor: Record<string, string> = {
    bevestigd: "bg-green-400",
    open: "bg-amber-400",
    vol: "bg-green-400",
    bezig: "bg-amber-400",
    afgerond: "bg-neutral-300",
    geannuleerd: "bg-red-300",
  };

  const dagNamen = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  // Tijdlijn helpers
  const TIMELINE_START = 6; // 06:00
  const TIMELINE_END = 24; // 00:00 (middernacht)
  const TIMELINE_HOURS = TIMELINE_END - TIMELINE_START;

  const timeToPercent = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    let hour = h + m / 60;
    if (hour < TIMELINE_START) hour += 24; // nachtdienst
    return Math.max(0, Math.min(100, ((hour - TIMELINE_START) / TIMELINE_HOURS) * 100));
  };

  const renderTijdlijnView = () => {
    const { start } = getWeekRange(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    const uurLabels = Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => TIMELINE_START + i);

    return (
      <div className="space-y-4">
        {/* Uur labels header */}
        <div className="flex items-end gap-0 pl-[120px]">
          {uurLabels.map((h) => (
            <div key={h} className="flex-1 text-[10px] text-neutral-400 text-center">
              {h === 24 ? "00" : String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dateStr = day.toISOString().split("T")[0];
          const dayItems = rooster.filter((r) => r.datum === dateStr);
          const isToday = dateStr === new Date().toISOString().split("T")[0];

          return (
            <div key={dateStr} className={`rounded-2xl border p-3 ${isToday ? "border-[#F27501]/30 bg-orange-50/30" : "border-neutral-200 bg-white"}`}>
              {/* Dag label + tijdlijn */}
              <div className="flex items-start gap-0">
                <div className="w-[120px] flex-shrink-0 pr-3">
                  <p className={`text-xs font-semibold ${isToday ? "text-[#F27501]" : "text-neutral-700"}`}>
                    {day.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                  {isToday && <span className="text-[10px] text-[#F27501]">Vandaag</span>}
                  <p className="text-[10px] text-neutral-400 mt-0.5">{dayItems.length} dienst{dayItems.length !== 1 ? "en" : ""}</p>
                </div>

                {/* Tijdlijn container */}
                <div className="flex-1 min-w-0">
                  {dayItems.length === 0 ? (
                    <div className="h-10 rounded-lg bg-neutral-50 border border-dashed border-neutral-200 flex items-center justify-center">
                      <span className="text-[10px] text-neutral-300">Vrij</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {dayItems.map((item) => {
                        const left = timeToPercent(item.start_tijd);
                        const right = timeToPercent(item.eind_tijd);
                        const width = Math.max(right - left, 5); // minimaal 5%

                        return (
                          <div key={item.id} className="relative h-9 bg-neutral-50 rounded-lg border border-neutral-100">
                            {/* Uur gridlijnen */}
                            {uurLabels.slice(0, -1).map((h) => (
                              <div key={h} className="absolute top-0 bottom-0 border-l border-neutral-100" style={{ left: `${((h - TIMELINE_START) / TIMELINE_HOURS) * 100}%` }} />
                            ))}
                            {/* Dienst balk */}
                            <div
                              className={`absolute top-1 bottom-1 rounded-md ${statusBarColor[item.status] || "bg-neutral-300"} flex items-center px-2 overflow-hidden cursor-default`}
                              style={{ left: `${left}%`, width: `${width}%` }}
                              title={`${item.functie} · ${formatTime(item.start_tijd)}-${formatTime(item.eind_tijd)} · ${item.medewerkers.map(m => m.naam).join(", ") || "Geen medewerkers"}`}
                            >
                              <span className="text-[10px] font-semibold text-white truncate">
                                {item.functie} · {item.medewerkers.length > 0
                                  ? item.medewerkers.map(m => m.naam.split(" ")[0]).join(", ")
                                  : "Geen MW"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.medewerkers.map((mw) => (
                              <span key={mw.id} className="inline-flex items-center gap-1 rounded-full bg-white border border-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-700">
                                {mw.profile_photo_url ? (
                                  <img src={mw.profile_photo_url} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-full bg-[#F27501]/10 text-[#F27501] text-[8px] font-bold flex items-center justify-center">
                                    {mw.naam.charAt(0)}
                                  </span>
                                )}
                                {mw.naam}
                              </span>
                            ))}
                          </div>
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

    const cells: (number | null)[] = [];
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Rooster</h2>
          <p className="mt-1 text-sm text-neutral-500">Overzicht van alle ingeplande diensten.</p>
        </div>
        <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
          {(["week", "tijdlijn", "maand"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${view === v ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"}`}>
              {v === "week" ? "Week" : v === "tijdlijn" ? "Tijdlijn" : "Maand"}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-neutral-100 rounded-lg transition">
          <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-sm font-semibold text-neutral-900">
          {view === "maand"
            ? currentDate.toLocaleDateString("nl-NL", { month: "long", year: "numeric" })
            : `Week van ${getWeekRange(currentDate).start.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`}
        </span>
        <button onClick={() => navigate(1)} className="p-2 hover:bg-neutral-100 rounded-lg transition">
          <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Bevestigd / Vol</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Open / In afwachting</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neutral-400" /> Afgerond</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" /></div>
      ) : view === "tijdlijn" ? renderTijdlijnView() : view === "week" ? renderWeekView() : renderMonthView()}
    </div>
  );
}

/* ============================================================
   Feature 5: Kosten Tab
   ============================================================ */
const PIE_COLORS = ["#F27501", "#d96800", "#fb923c", "#fdba74", "#fed7aa", "#fef3c7"];

function KostenTab() {
  const [jaar, setJaar] = useState(new Date().getFullYear());

  const { data: rawData, isLoading } = useKlantKosten(jaar);
  const data = rawData as KostenData | null;

  const exportCSV = () => {
    if (!data) return;
    const rows = [["Maand", "Kosten"], ...data.per_maand.map((m: { maand: string; kosten: number }) => [m.maand, m.kosten.toFixed(2)])];
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

      {/* NIEUW: Budget Alert */}
      {(() => {
        const MAANDBUDGET = 3000;
        const budgetGebruikt = data?.totaal ?? 0;
        const budgetPct = Math.min(100, Math.round((budgetGebruikt / MAANDBUDGET) * 100));

        return budgetPct >= 80 ? (
          <div className={`flex items-start gap-3 rounded-2xl p-4 ${
            budgetPct >= 95
              ? "bg-red-50 border border-red-200"
              : "bg-amber-50 border border-amber-200"
          }`}>
            <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${budgetPct >= 95 ? "text-red-600" : "text-amber-600"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className={`font-semibold text-sm ${budgetPct >= 95 ? "text-red-900" : "text-amber-900"}`}>
                {budgetPct >= 95 ? "Budget bijna uitgeput!" : "Budget waarschuwing"}
              </p>
              <p className={`text-xs mt-0.5 ${budgetPct >= 95 ? "text-red-700" : "text-amber-700"}`}>
                €{budgetGebruikt.toLocaleString("nl-NL")} van €{MAANDBUDGET.toLocaleString("nl-NL")} gebruikt ({budgetPct}%).
                Nog €{(MAANDBUDGET - budgetGebruikt).toLocaleString("nl-NL")} beschikbaar.
              </p>
            </div>
          </div>
        ) : null;
      })()}

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
  onApprove: (u: UrenRegistratie) => void;
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
                  <button onClick={() => onApprove(u)}
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
  const [result, setResult] = useState<{ type: "success" | "warning" | "error" | "multiple"; data?: CheckinResult; message?: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [multipleData, setMultipleData] = useState<{ medewerker_id: string; medewerker?: { naam: string; functie?: string; profile_photo_url?: string | null }; diensten: Array<{ dienst_id: string; aanmelding_id: string; datum: string; start_tijd: string; eind_tijd: string; locatie: string; functie: string; check_in_at: string | null }> } | null>(null);

  const { data: checkinsData, isLoading: loadingCheckins } = useKlantCheckins();
  const checkinAction = useCheckinAction();
  const checkins: CheckinListItem[] = checkinsData?.checkins ?? [];

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
      checkinAction.mutate(
        { medewerker_id: qrData.id },
        {
          onSuccess: (data) => {
            if (data.status === 200 || !data.status || data.status === "multiple_diensten") {
              if (data.status === "multiple_diensten") {
                setMultipleData({ ...data, medewerker_id: qrData.id! });
                setResult({ type: "multiple", data });
              } else {
                  setResult({ type: "success", data });
                toast.success(`${data.medewerker?.naam || "Medewerker"} is ingecheckt!`);
              }
            } else if (data.status === 409) {
              setResult({ type: "warning", data });
            } else {
              setResult({ type: "error", message: data.error || "Check-in mislukt" });
            }
            setProcessing(false);
          },
          onError: () => {
            setResult({ type: "error", message: "Netwerkfout — probeer opnieuw" });
            setProcessing(false);
          },
        }
      );
      return; // Don't set processing false here - callbacks handle it
    } catch {
      setResult({ type: "error", message: "Netwerkfout — probeer opnieuw" });
    } finally {
      setProcessing(false);
    }
  };

  const handleDienstSelect = async (dienst_id: string) => {
    if (!multipleData) return;

    setProcessing(true);
    checkinAction.mutate(
      { medewerker_id: multipleData.medewerker_id, dienst_id },
      {
        onSuccess: (data) => {
          if (data.status === 200 || !data.status) {
            setResult({ type: "success", data });
            setMultipleData(null);
            toast.success(`${data.medewerker?.naam || "Medewerker"} is ingecheckt!`);
          } else if (data.status === 409) {
            setResult({ type: "warning", data });
            setMultipleData(null);
          } else {
            setResult({ type: "error", message: data.error || "Check-in mislukt" });
          }
          setProcessing(false);
        },
        onError: () => {
          setResult({ type: "error", message: "Netwerkfout — probeer opnieuw" });
          setProcessing(false);
        },
      }
    );
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

      {/* Multiple Diensten Selection */}
      {result && result.type === "multiple" && multipleData && !processing && (
        <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-blue-800">Meerdere diensten gevonden</span>
          </div>
          {multipleData.medewerker && (
            <p className="text-sm text-blue-700 mb-4">
              Selecteer de dienst waarvoor je <strong>{multipleData.medewerker.naam}</strong> wilt inchecken:
            </p>
          )}
          <div className="space-y-2">
            {multipleData.diensten.map((dienst) => {
              const datum = new Date(dienst.datum).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
              const isIngecheckt = !!dienst.check_in_at;
              return (
                <button
                  key={dienst.dienst_id}
                  onClick={() => handleDienstSelect(dienst.dienst_id)}
                  disabled={isIngecheckt}
                  className={`w-full rounded-xl border-2 p-4 text-left transition ${
                    isIngecheckt
                      ? "border-neutral-300 bg-neutral-100 cursor-not-allowed opacity-60"
                      : "border-blue-200 bg-white hover:border-blue-400 hover:bg-blue-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900">{dienst.functie} - {dienst.locatie}</p>
                      <p className="text-sm text-neutral-600">{datum} · {formatTime(dienst.start_tijd)} - {formatTime(dienst.eind_tijd)}</p>
                    </div>
                    {isIngecheckt && (
                      <span className="text-xs font-medium text-green-600 px-2 py-1 rounded-full bg-green-100">
                        Al ingecheckt
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              setResult(null);
              setMultipleData(null);
            }}
            className="mt-4 w-full rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
          >
            Annuleren
          </button>
        </div>
      )}

      {/* Result Card */}
      {result && result.type !== "multiple" && !processing && (
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
    // Only show on mobile/tablet — hide on desktop
    const isMobileOrTablet = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    if (!isMobileOrTablet) {
      setBannerGesloten(true);
      return;
    }

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
