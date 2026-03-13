"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

import Pagination from "@/components/ui/Pagination";
import DropdownMenu from "@/components/ui/DropdownMenu";
import { useToast } from "@/components/ui/Toast";

const TabSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 w-48 bg-neutral-200 rounded" />
    <div className="h-64 bg-neutral-100 rounded-xl" />
  </div>
);

const MedewerkersTab = dynamic(() => import("./MedewerkersTab"), { loading: () => <TabSkeleton />, ssr: false });
const DienstenTab = dynamic(() => import("./DienstenTab"), { loading: () => <TabSkeleton />, ssr: false });
const UrenTab = dynamic(() => import("./UrenTab"), { loading: () => <TabSkeleton />, ssr: false });
const FacturenTab = dynamic(() => import("./FacturenTab"), { loading: () => <TabSkeleton />, ssr: false });
const StatsTab = dynamic(() => import("./StatsTab"), { loading: () => <TabSkeleton />, ssr: false });
const KandidaatWorkflowPanel = dynamic(() => import("./KandidaatWorkflowPanel"), { ssr: false });
const MatchingTab = dynamic(() => import("./MatchingTab"), { loading: () => <TabSkeleton />, ssr: false });
const AITab = dynamic(() => import("./AITab"), { loading: () => <TabSkeleton />, ssr: false });
const AcquisitieTab = dynamic(() => import("./AcquisitieTab"), { loading: () => <TabSkeleton />, ssr: false });
const OnboardingPipelineView = dynamic(() => import("./onboarding/PipelineView"), { loading: () => <TabSkeleton />, ssr: false });
const KlantenTab = dynamic(() => import("./KlantenTab"), { loading: () => <TabSkeleton />, ssr: false });
const ReferralsTab = dynamic(() => import("./ReferralsTab"), { loading: () => <TabSkeleton />, ssr: false });
const OffertesTab = dynamic(() => import("./OffertesTab"), { loading: () => <TabSkeleton />, ssr: false });
const FAQTab = dynamic(() => import("./FAQTab"), { loading: () => <TabSkeleton />, ssr: false });
const TicketsTab = dynamic(() => import("./TicketsTab"), { loading: () => <TabSkeleton />, ssr: false });
const PricingTab = dynamic(() => import("./PricingTab"), { loading: () => <TabSkeleton />, ssr: false });
const ContentTab = dynamic(() => import("./ContentTab"), { loading: () => <TabSkeleton />, ssr: false });
const AgendaTab = dynamic(() => import("./AgendaTab"), { loading: () => <TabSkeleton />, ssr: false });
const BerichtenTab = dynamic(() => import("./BerichtenTab"), { loading: () => <TabSkeleton />, ssr: false });

type Tab = "overzicht" | "stats" | "aanvragen" | "inschrijvingen" | "contact" | "calculator" | "medewerkers" | "diensten" | "uren" | "facturen" | "matching" | "ai" | "acquisitie" | "klanten" | "referrals" | "offertes" | "faq" | "tickets" | "pricing" | "content" | "agenda" | "berichten";
type Status = "nieuw" | "in_behandeling" | "afgehandeld";
type OnboardingStatus =
  | "nieuw"
  | "in_beoordeling"
  | "documenten_opvragen"
  | "wacht_op_kandidaat"
  | "goedgekeurd"
  | "inzetbaar"
  | "afgewezen";
type ChecklistKey =
  | "identiteit_gecheckt"
  | "ervaring_beoordeeld"
  | "beschikbaarheid_bevestigd"
  | "documenten_gecontroleerd"
  | "contracttype_bepaald"
  | "klaar_voor_inzet";

interface PersoneelAanvraag {
  id: string;
  created_at: string;
  bedrijfsnaam: string;
  contactpersoon: string;
  email: string;
  telefoon: string;
  type_personeel: string[];
  aantal_personen: string;
  start_datum: string;
  eind_datum: string | null;
  werkdagen: string[];
  werktijden: string;
  locatie: string;
  opmerkingen: string | null;
  status: Status;
  // Lead tracking
  lead_source?: string;
  campaign_name?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

interface Inschrijving {
  id: string;
  created_at: string;
  voornaam: string;
  tussenvoegsel: string | null;
  achternaam: string;
  email: string;
  telefoon: string;
  stad: string;
  geboortedatum: string;
  geslacht: string;
  motivatie: string;
  hoe_gekomen: string;
  uitbetalingswijze: string;
  kvk_nummer: string | null;
  status: Status;
  onboarding_status?: OnboardingStatus;
  documenten_compleet?: boolean;
  interne_notitie?: string | null;
  laatste_contact_op?: string | null;
  goedgekeurd_op?: string | null;
  inzetbaar_op?: string | null;
  onboarding_checklist?: Partial<Record<ChecklistKey, boolean>>;
  medewerker_id?: string | null;
  is_test_candidate?: boolean;
  onboarding_portal_token?: string | null;
  onboarding_portal_token_expires_at?: string | null;
  intake_bevestiging_verstuurd_op?: string | null;
  documenten_verzoek_verstuurd_op?: string | null;
  welkom_mail_verstuurd_op?: string | null;
  horeca_ervaring?: string | null;
  gewenste_functies?: string[] | null;
  talen?: string[] | null;
  eigen_vervoer?: boolean | null;
  beschikbaarheid?: string | { [key: string]: string[] };
  beschikbaar_vanaf?: string;
  max_uren_per_week?: number;
  // Lead tracking
  lead_source?: string;
  campaign_name?: string;
  // Onboarding autopilot
  onboarding_auto?: boolean;
  onboarding_step?: string | null;
  ai_screening_score?: number | null;
  laatste_onboarding_actie?: string | null;
}

type KandidaatDocumentStatus = "ontvangen" | "goedgekeurd" | "afgekeurd";

interface KandidaatDocument {
  id: string;
  inschrijving_id: string;
  type: string;
  bestandsnaam: string;
  bestand_pad: string;
  mime_type: string | null;
  bestand_grootte: number | null;
  status: KandidaatDocumentStatus;
  notitie: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
  download_url?: string | null;
}

interface ContactBericht {
  id: string;
  created_at: string;
  naam: string;
  email: string;
  telefoon: string | null;
  onderwerp: string;
  bericht: string;
  status: Status;
  // Lead tracking
  lead_source?: string;
  campaign_name?: string;
}

interface CalculatorLead {
  id: string;
  created_at: string;
  naam: string;
  bedrijfsnaam: string;
  email: string;
  functie: string;
  aantal_medewerkers: number;
  ervaring: string;
  uren_per_dienst: number;
  dagen_per_week: number[];
  inzet_type: string;
  vergelijkingen: string[];
  resultaten: {
    vast?: { uurtarief: number; perMaand: number };
    uitzend?: { uurtarief: number; perMaand: number };
    zzp?: { uurtarief: number; perMaand: number };
  };
  pdf_token: string;
  pdf_downloaded: boolean;
  pdf_downloaded_at: string | null;
  email_sent: boolean;
  contacted: boolean;
}

interface Stats {
  aanvragen: { total: number; nieuw: number };
  inschrijvingen: { total: number; nieuw: number };
  contact: { total: number; nieuw: number };
  calculator: { total: number; downloaded: number };
}

interface OpsSnapshot {
  health: {
    resendConfigured: boolean;
    redisConfigured: boolean;
    cronConfigured: boolean;
    serviceRoleConfigured: boolean;
  };
  counters: {
    expiredUploadLinks: number;
    candidatesWaitingTooLong: number;
    inzetbaarWithoutProfile: number;
    pendingDocumentReviews: number;
    bouncedEmails: number;
    openTasks: number;
    overdueTasks: number;
    testCandidates: number;
  };
  recentAudit: Array<{
    id: string;
    actor_email: string | null;
    actor_role: string | null;
    action: string;
    target_table: string;
    target_id: string | null;
    summary: string;
    created_at: string;
  }>;
}

const onboardingStatusColors: Record<OnboardingStatus, string> = {
  nieuw: "bg-sky-100 text-sky-700",
  in_beoordeling: "bg-amber-100 text-amber-700",
  documenten_opvragen: "bg-orange-100 text-orange-700",
  wacht_op_kandidaat: "bg-yellow-100 text-yellow-700",
  goedgekeurd: "bg-emerald-100 text-emerald-700",
  inzetbaar: "bg-green-100 text-green-700",
  afgewezen: "bg-red-100 text-red-700",
};

const onboardingStatusLabels: Record<OnboardingStatus, string> = {
  nieuw: "Nieuw",
  in_beoordeling: "In beoordeling",
  documenten_opvragen: "Documenten opvragen",
  wacht_op_kandidaat: "Wacht op kandidaat",
  goedgekeurd: "Goedgekeurd",
  inzetbaar: "Inzetbaar",
  afgewezen: "Afgewezen",
};

const onboardingChecklistItems: { key: ChecklistKey; label: string }[] = [
  { key: "identiteit_gecheckt", label: "Identiteit gecheckt" },
  { key: "ervaring_beoordeeld", label: "Ervaring beoordeeld" },
  { key: "beschikbaarheid_bevestigd", label: "Beschikbaarheid bevestigd" },
  { key: "documenten_gecontroleerd", label: "Documenten gecontroleerd" },
  { key: "contracttype_bepaald", label: "Contracttype bepaald" },
  { key: "klaar_voor_inzet", label: "Klaar voor inzet" },
];

const kandidaatDocumentTypeOptions = [
  { value: "id", label: "ID" },
  { value: "cv", label: "CV" },
  { value: "kvk", label: "KvK" },
  { value: "btw", label: "BTW" },
  { value: "certificaat", label: "Certificaat" },
  { value: "contract", label: "Contract" },
  { value: "bankbewijs", label: "Bankbewijs" },
] as const;

const kandidaatDocumentStatusLabels: Record<KandidaatDocumentStatus, string> = {
  ontvangen: "Ontvangen",
  goedgekeurd: "Goedgekeurd",
  afgekeurd: "Afgekeurd",
};

const kandidaatDocumentStatusColors: Record<KandidaatDocumentStatus, string> = {
  ontvangen: "bg-blue-100 text-blue-700",
  goedgekeurd: "bg-green-100 text-green-700",
  afgekeurd: "bg-red-100 text-red-700",
};

function getInschrijvingOnboardingStatus(inschrijving: Inschrijving): OnboardingStatus {
  if (inschrijving.onboarding_status) {
    return inschrijving.onboarding_status;
  }

  if (inschrijving.status === "in_behandeling") {
    return "in_beoordeling";
  }

  if (inschrijving.status === "afgehandeld") {
    return "goedgekeurd";
  }

  return "nieuw";
}

function OnboardingStatusBadge({ status }: { status: OnboardingStatus }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${onboardingStatusColors[status]}`}>
      {onboardingStatusLabels[status]}
    </span>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overzicht");
  const [leadSourceFilter, setLeadSourceFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [inschrijvingStatusFilter, setInschrijvingStatusFilter] = useState<OnboardingStatus | "all">("all");
  const [inschrijvingView, setInschrijvingView] = useState<"tabel" | "pipeline">("tabel");
  const [stats, setStats] = useState<Stats>({
    aanvragen: { total: 0, nieuw: 0 },
    inschrijvingen: { total: 0, nieuw: 0 },
    contact: { total: 0, nieuw: 0 },
    calculator: { total: 0, downloaded: 0 },
  });
  const [aanvragen, setAanvragen] = useState<PersoneelAanvraag[]>([]);
  const [inschrijvingen, setInschrijvingen] = useState<Inschrijving[]>([]);
  const [contactBerichten, setContactBerichten] = useState<ContactBericht[]>([]);
  const [calculatorLeads, setCalculatorLeads] = useState<CalculatorLead[]>([]);
  const [opsSnapshot, setOpsSnapshot] = useState<OpsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PersoneelAanvraag | Inschrijving | ContactBericht | CalculatorLead | null>(null);
  const [detailType, setDetailType] = useState<Tab | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inschrijvingNotitieDraft, setInschrijvingNotitieDraft] = useState("");
  const [kandidaatDocumenten, setKandidaatDocumenten] = useState<KandidaatDocument[]>([]);
  const [documentenLoading, setDocumentenLoading] = useState(false);
  const [documentTypeDraft, setDocumentTypeDraft] = useState("id");
  const [documentNotitieDraft, setDocumentNotitieDraft] = useState("");
  const [documentFileDraft, setDocumentFileDraft] = useState<File | null>(null);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [bulkOnboardingStatus, setBulkOnboardingStatus] = useState<OnboardingStatus | "">("");
  const [bulkEmailSending, setBulkEmailSending] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [replyModal, setReplyModal] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replySending, setReplySending] = useState(false);
  const [replyInquiry, setReplyInquiry] = useState<{ contactpersoon: string; bedrijfsnaam: string; email: string; type_personeel: string[]; aantal_personen: string; start_datum: string; locatie: string } | null>(null);
  const ITEMS_PER_PAGE = 25;
  const router = useRouter();
  const toast = useToast();

  // Helper to get auth headers for admin API calls
  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token
      ? {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        }
      : { "Content-Type": "application/json" };
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (ids: string[]) => {
    setSelectedIds(prev => prev.size === ids.length ? new Set() : new Set(ids));
  };

  const deleteSelected = async (table: string) => {
    if (selectedIds.size === 0) return;
    if (confirm(`Weet je zeker dat je ${selectedIds.size} items wilt verwijderen?`)) {
      await fetch("/api/admin/data", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: "delete_many", table, data: { ids: Array.from(selectedIds) } }),
      });
      setSelectedIds(new Set());
      fetchData();
    }
  };

  const exportSelected = (data: object[], filename: string) => {
    const toExport = selectedIds.size > 0
      ? data.filter((d: { id?: string }) => selectedIds.has(d.id || ""))
      : data;
    exportToCSV(toExport, filename);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    // Get session token for admin API auth
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = session?.access_token
      ? { "Authorization": `Bearer ${session.access_token}` }
      : {};

    // Fetch all data via admin API (bypasses RLS)
    const [aanvragenRes, inschrijvingenRes, contactRes, calculatorRes, opsRes] = await Promise.all([
      fetch("/api/admin/data?table=personeel_aanvragen", { headers }).then(r => r.json()),
      fetch("/api/admin/data?table=inschrijvingen", { headers }).then(r => r.json()),
      fetch("/api/admin/data?table=contact_berichten", { headers }).then(r => r.json()),
      fetch("/api/admin/data?table=calculator_leads", { headers }).then(r => r.json()),
      fetch("/api/admin/ops", { headers }).then(r => r.json()),
    ]);

    if (aanvragenRes.data) setAanvragen(aanvragenRes.data);
    if (inschrijvingenRes.data) setInschrijvingen(inschrijvingenRes.data);
    if (contactRes.data) setContactBerichten(contactRes.data);
    if (calculatorRes.data) setCalculatorLeads(calculatorRes.data);
    if (!opsRes.error) setOpsSnapshot(opsRes);

    // Calculate stats
    setStats({
      aanvragen: {
        total: aanvragenRes.data?.length || 0,
        nieuw: aanvragenRes.data?.filter((a: PersoneelAanvraag) => a.status === "nieuw").length || 0,
      },
      inschrijvingen: {
        total: inschrijvingenRes.data?.length || 0,
        nieuw:
          inschrijvingenRes.data?.filter(
            (i: Inschrijving) => getInschrijvingOnboardingStatus(i) === "nieuw"
          ).length || 0,
      },
      contact: {
        total: contactRes.data?.length || 0,
        nieuw: contactRes.data?.filter((c: ContactBericht) => c.status === "nieuw").length || 0,
      },
      calculator: {
        total: calculatorRes.data?.length || 0,
        downloaded: calculatorRes.data?.filter((c: CalculatorLead) => c.pdf_downloaded).length || 0,
      },
    });

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const updateStatus = async (table: string, id: string, status: Status) => {
    await fetch("/api/admin/data", {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ action: "update", table, id, data: { status } }),
    });
    fetchData();
    setSelectedItem(null);
  };

  const updateInschrijvingOnboardingStatus = async (
    inschrijving: Inschrijving,
    onboardingStatus: OnboardingStatus
  ) => {
    const payload: Record<string, string | boolean | null> = {
      onboarding_status: onboardingStatus,
    };

    if (onboardingStatus === "goedgekeurd" && !inschrijving.goedgekeurd_op) {
      payload.goedgekeurd_op = new Date().toISOString();
    }

    if (onboardingStatus === "inzetbaar") {
      payload.documenten_compleet = true;
      if (!inschrijving.inzetbaar_op) {
        payload.inzetbaar_op = new Date().toISOString();
      }
    }

    if (onboardingStatus === "afgewezen") {
      payload.inzetbaar_op = null;
    }

    await fetch("/api/admin/data", {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        action: "update",
        table: "inschrijvingen",
        id: inschrijving.id,
        data: payload,
      }),
    });

    // ✨ Auto-trigger emails on specific status changes
    try {
      if (onboardingStatus === "documenten_opvragen") {
        // Send document request email
        await fetch("/api/admin/inschrijvingen/onboarding", {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            kandidaat_id: inschrijving.id,
            action: "documenten_opvragen",
          }),
        });
      }

      if (onboardingStatus === "inzetbaar") {
        // Send welcome/ready email
        await fetch("/api/admin/inschrijvingen/onboarding", {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            kandidaat_id: inschrijving.id,
            action: "inzetbaar",
          }),
        });
      }
    } catch (emailError) {
      console.error("Auto-email trigger error:", emailError);
      // Don't fail the status update if email fails
    }

    await fetchData();
    setSelectedItem((prev) =>
      prev && prev.id === inschrijving.id ? ({ ...prev, ...payload } as Inschrijving) : prev
    );
  };

  const updateInschrijvingFields = async (
    inschrijving: Inschrijving,
    data: Record<string, unknown>
  ) => {
    await fetch("/api/admin/data", {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        action: "update",
        table: "inschrijvingen",
        id: inschrijving.id,
        data,
      }),
    });

    await fetchData();
    setSelectedItem((prev) =>
      prev && prev.id === inschrijving.id ? ({ ...prev, ...data } as Inschrijving) : prev
    );
  };

  const fetchKandidaatDocumenten = useCallback(async (inschrijvingId: string) => {
    setDocumentenLoading(true);

    try {
      const response = await fetch(
        `/api/admin/kandidaat-documenten?inschrijvingId=${inschrijvingId}`,
        { headers: await getAuthHeaders() }
      );
      const result = await response.json();

      if (response.ok) {
        setKandidaatDocumenten(result.data || []);
      }
    } finally {
      setDocumentenLoading(false);
    }
  }, [getAuthHeaders]);

  const uploadKandidaatDocument = async (inschrijving: Inschrijving) => {
    if (!documentFileDraft) {
      toast.warning("Kies eerst een bestand om te uploaden.");
      return;
    }

    setDocumentUploading(true);

    try {
      const headers = await getAuthHeaders();
      const authHeader = typeof headers === "object" && "Authorization" in headers
        ? headers.Authorization
        : undefined;
      const submitData = new FormData();

      submitData.append("inschrijvingId", inschrijving.id);
      submitData.append("type", documentTypeDraft);
      submitData.append("notitie", documentNotitieDraft);
      submitData.append("file", documentFileDraft);

      const response = await fetch("/api/admin/kandidaat-documenten", {
        method: "POST",
        headers: authHeader ? { Authorization: String(authHeader) } : undefined,
        body: submitData,
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "Document upload mislukt.");
        return;
      }

      setDocumentFileDraft(null);
      setDocumentNotitieDraft("");
      setDocumentTypeDraft("id");
      await fetchKandidaatDocumenten(inschrijving.id);
    } finally {
      setDocumentUploading(false);
    }
  };

  const updateKandidaatDocument = async (
    inschrijving: Inschrijving,
    documentId: string,
    data: { status?: KandidaatDocumentStatus; notitie?: string }
  ) => {
    const response = await fetch("/api/admin/kandidaat-documenten", {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        id: documentId,
        ...data,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      toast.error(result.error || "Document kon niet worden bijgewerkt.");
      return;
    }

    await fetchKandidaatDocumenten(inschrijving.id);
  };

  useEffect(() => {
    if (detailType === "inschrijvingen" && selectedItem) {
      setDocumentTypeDraft("id");
      setDocumentNotitieDraft("");
      setDocumentFileDraft(null);
      void fetchKandidaatDocumenten(selectedItem.id);
      return;
    }

    setKandidaatDocumenten([]);
  }, [detailType, fetchKandidaatDocumenten, selectedItem]);

  const toggleInschrijvingChecklistItem = async (
    inschrijving: Inschrijving,
    key: ChecklistKey
  ) => {
    const nextChecklist = {
      ...(inschrijving.onboarding_checklist || {}),
      [key]: !Boolean(inschrijving.onboarding_checklist?.[key]),
    };

    await updateInschrijvingFields(inschrijving, {
      onboarding_checklist: nextChecklist,
    });
  };

  const bulkUpdateOnboardingStatus = async (status: OnboardingStatus) => {
    if (selectedIds.size === 0) return;

    const confirmMessage = `Weet je zeker dat je ${selectedIds.size} kandidaten wilt updaten naar "${onboardingStatusLabels[status]}"?`;
    if (!confirm(confirmMessage)) return;

    const payload: Record<string, string | boolean | null> = {
      onboarding_status: status,
    };

    if (status === "goedgekeurd") {
      payload.goedgekeurd_op = new Date().toISOString();
    }

    if (status === "inzetbaar") {
      payload.documenten_compleet = true;
      payload.inzetbaar_op = new Date().toISOString();
    }

    if (status === "afgewezen") {
      payload.inzetbaar_op = null;
    }

    await fetch("/api/admin/data", {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        action: "bulk_update",
        table: "inschrijvingen",
        ids: Array.from(selectedIds),
        data: payload,
      }),
    });

    setSelectedIds(new Set());
    setBulkOnboardingStatus("");
    await fetchData();
  };

  const calculateOnboardingMetrics = () => {
    const metrics: Record<OnboardingStatus, number> = {
      nieuw: 0,
      in_beoordeling: 0,
      documenten_opvragen: 0,
      wacht_op_kandidaat: 0,
      goedgekeurd: 0,
      inzetbaar: 0,
      afgewezen: 0,
    };

    const processingTimes: number[] = [];

    inschrijvingen.forEach((inschrijving) => {
      const status = getInschrijvingOnboardingStatus(inschrijving);
      metrics[status]++;

      // Calculate processing time for completed candidates (goedgekeurd or inzetbaar)
      if (inschrijving.inzetbaar_op) {
        const created = new Date(inschrijving.created_at).getTime();
        const completed = new Date(inschrijving.inzetbaar_op).getTime();
        const days = (completed - created) / (1000 * 60 * 60 * 24);
        processingTimes.push(days);
      } else if (inschrijving.goedgekeurd_op) {
        const created = new Date(inschrijving.created_at).getTime();
        const approved = new Date(inschrijving.goedgekeurd_op).getTime();
        const days = (approved - created) / (1000 * 60 * 60 * 24);
        processingTimes.push(days);
      }
    });

    const avgProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0;

    return { metrics, avgProcessingTime };
  };

  const workflowAlerts = useMemo(() => {
    if (!opsSnapshot) return [];

    return [
      {
        label: "Kandidaten wachten te lang",
        value: opsSnapshot.counters.candidatesWaitingTooLong,
        tone: "bg-amber-50 text-amber-800 border-amber-200",
      },
      {
        label: "Documenten in review",
        value: opsSnapshot.counters.pendingDocumentReviews,
        tone: "bg-blue-50 text-blue-800 border-blue-200",
      },
      {
        label: "Overdue taken",
        value: opsSnapshot.counters.overdueTasks,
        tone: "bg-red-50 text-red-800 border-red-200",
      },
      {
        label: "Bounced mails",
        value: opsSnapshot.counters.bouncedEmails,
        tone: "bg-rose-50 text-rose-800 border-rose-200",
      },
    ].filter((alert) => alert.value > 0);
  }, [opsSnapshot]);

  const deleteItem = async (table: string, id: string) => {
    if (confirm("Weet je zeker dat je dit item wilt verwijderen?")) {
      await fetch("/api/admin/data", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: "delete", table, id }),
      });
      fetchData();
      setSelectedItem(null);
    }
  };

  const exportToCSV = (data: object[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => {
          const value = (row as Record<string, unknown>)[header];
          if (Array.isArray(value)) return `"${value.join("; ")}"`;
          if (typeof value === "string" && (value.includes(",") || value.includes("\n"))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? "";
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const generateKandidaatPortalLink = async (kandidaatId: string) => {
    try {
      const response = await fetch("/api/kandidaat/status", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ kandidaat_id: kandidaatId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Link genereren mislukt");
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(result.statusUrl);
      toast.success("Kandidaat portal link gekopieerd naar klembord!");
    } catch (error) {
      console.error("Generate link error:", error);
      toast.error(`Fout bij genereren link: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
    }
  };

  const bulkSendEmail = async () => {
    if (selectedIds.size === 0) return;

    // Safety check: max 50 emails per batch
    if (selectedIds.size > 50) {
      toast.warning("Je kunt maximaal 50 kandidaten tegelijk emailen. Selecteer minder kandidaten.");
      return;
    }

    const selectedKandidaten = inschrijvingen.filter(ins => selectedIds.has(ins.id));
    const confirmMessage = `Je gaat een email sturen naar ${selectedIds.size} kandidaten:\n\n${selectedKandidaten.slice(0, 5).map(k => `- ${k.voornaam} ${k.achternaam} (${k.email})`).join('\n')}${selectedIds.size > 5 ? `\n... en ${selectedIds.size - 5} anderen` : ''}\n\nWeet je het zeker?`;

    if (!confirm(confirmMessage)) return;

    setBulkEmailSending(true);

    try {
      const response = await fetch("/api/admin/bulk-email", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          kandidaat_ids: Array.from(selectedIds),
          template: "onboarding_update", // Can be extended later
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Email verzenden mislukt");
      }

      toast.success(`Emails succesvol verzonden naar ${result.sent} kandidaten!${result.failed > 0 ? ` ${result.failed} konden niet worden verzonden.` : ''}`);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Bulk email error:", error);
      toast.error(`Fout bij verzenden emails: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
    } finally {
      setBulkEmailSending(false);
    }
  };

  const exportOnboardingMetrics = () => {
    const { metrics, avgProcessingTime } = calculateOnboardingMetrics();

    // Summary report
    const summaryData = [
      { metric: "Totaal Actief (excl. afgewezen)", waarde: Object.entries(metrics).filter(([k]) => k !== "afgewezen").reduce((sum, [, v]) => sum + v, 0) },
      { metric: "Nieuw", waarde: metrics.nieuw },
      { metric: "In beoordeling", waarde: metrics.in_beoordeling },
      { metric: "Documenten opvragen", waarde: metrics.documenten_opvragen },
      { metric: "Wacht op kandidaat", waarde: metrics.wacht_op_kandidaat },
      { metric: "Goedgekeurd", waarde: metrics.goedgekeurd },
      { metric: "Inzetbaar", waarde: metrics.inzetbaar },
      { metric: "Afgewezen", waarde: metrics.afgewezen },
      { metric: "Gemiddelde doorlooptijd (dagen)", waarde: avgProcessingTime > 0 ? avgProcessingTime.toFixed(1) : "N/A" },
    ];

    exportToCSV(summaryData, "onboarding_metrics_summary");

    // Detailed candidate report
    const detailedData = inschrijvingen.map(ins => {
      const status = getInschrijvingOnboardingStatus(ins);
      const daysSinceCreated = (Date.now() - new Date(ins.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const daysToApproval = ins.goedgekeurd_op
        ? (new Date(ins.goedgekeurd_op).getTime() - new Date(ins.created_at).getTime()) / (1000 * 60 * 60 * 24)
        : null;
      const daysToDeployable = ins.inzetbaar_op
        ? (new Date(ins.inzetbaar_op).getTime() - new Date(ins.created_at).getTime()) / (1000 * 60 * 60 * 24)
        : null;

      return {
        naam: `${ins.voornaam} ${ins.tussenvoegsel || ''} ${ins.achternaam}`.trim(),
        email: ins.email,
        telefoon: ins.telefoon,
        stad: ins.stad,
        onboarding_status: onboardingStatusLabels[status],
        documenten_compleet: ins.documenten_compleet ? "Ja" : "Nee",
        inzetbaar: ins.inzetbaar_op ? "Ja" : "Nee",
        inschrijfdatum: ins.created_at.split("T")[0],
        dagen_sinds_inschrijving: daysSinceCreated.toFixed(0),
        goedgekeurd_op: ins.goedgekeurd_op?.split("T")[0] || "",
        dagen_tot_goedkeuring: daysToApproval ? daysToApproval.toFixed(1) : "",
        inzetbaar_op: ins.inzetbaar_op?.split("T")[0] || "",
        dagen_tot_inzetbaar: daysToDeployable ? daysToDeployable.toFixed(1) : "",
        horeca_ervaring: ins.horeca_ervaring || "",
        functies: ins.gewenste_functies?.join("; ") || "",
        talen: ins.talen?.join("; ") || "",
        eigen_vervoer: ins.eigen_vervoer ? "Ja" : "Nee",
        uitbetalingswijze: ins.uitbetalingswijze,
      };
    });

    exportToCSV(detailedData, "onboarding_metrics_detailed");
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const StatusBadge = ({ status }: { status: Status }) => {
    const colors = {
      nieuw: "bg-blue-100 text-blue-700",
      in_behandeling: "bg-yellow-100 text-yellow-700",
      afgehandeld: "bg-green-100 text-green-700",
    };
    const labels = {
      nieuw: "Nieuw",
      in_behandeling: "In behandeling",
      afgehandeld: "Afgehandeld",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
        {labels[status]}
      </span>
    );
  };

  // Global search helper
  const matchesSearch = useCallback((searchStr: string, ...fields: (string | null | undefined)[]) => {
    if (!searchStr.trim()) return true;
    const lower = searchStr.toLowerCase();
    return fields.some(f => f?.toLowerCase().includes(lower));
  }, []);

  const filteredInschrijvingen = inschrijvingen.filter((item) => {
    if (inschrijvingStatusFilter !== "all" && getInschrijvingOnboardingStatus(item) !== inschrijvingStatusFilter) {
      return false;
    }
    return matchesSearch(globalSearch, item.voornaam, item.achternaam, item.email, item.telefoon, item.stad);
  });

  const filteredAanvragen = aanvragen.filter(item =>
    matchesSearch(globalSearch, item.bedrijfsnaam, item.contactpersoon, item.email, item.telefoon, item.locatie)
  );

  const filteredContactBerichten = contactBerichten.filter(item =>
    matchesSearch(globalSearch, item.naam, item.email, item.onderwerp, item.bericht)
  );

  const filteredCalculatorLeads = calculatorLeads.filter(item =>
    matchesSearch(globalSearch, item.naam, item.bedrijfsnaam, item.email, item.functie)
  );

  // Pagination helpers
  const paginateItems = <T,>(items: T[]): T[] => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "overzicht",
      label: "Overzicht",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: "agenda",
      label: "Agenda",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "stats",
      label: "Statistieken",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: "aanvragen",
      label: "Personeel Aanvragen",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: "inschrijvingen",
      label: "Inschrijvingen",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: "contact",
      label: "Contact Berichten",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "calculator",
      label: "Calculator Leads",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "medewerkers",
      label: "Medewerkers",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: "diensten",
      label: "Diensten",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "uren",
      label: "Uren goedkeuren",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "facturen",
      label: "Facturen",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "matching",
      label: "Auto-Matching",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: "ai",
      label: "AI Agents",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      ),
    },
    {
      id: "acquisitie",
      label: "Acquisitie",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: "klanten",
      label: "Klanten",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: "referrals",
      label: "Referrals",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: "offertes",
      label: "Offertes",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "faq",
      label: "FAQ",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "tickets",
      label: "Tickets",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
    },
    {
      id: "pricing",
      label: "Pricing",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "content",
      label: "Content",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      id: "berichten",
      label: "Berichten",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-900 text-white flex flex-col">
        <div className="p-6 border-b border-neutral-800">
          <h1 className="text-xl font-bold text-[#F27501]">TopTalent</h1>
          <p className="text-neutral-400 text-sm">Admin Dashboard</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedIds(new Set()); setCurrentPage(1); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === tab.id
                  ? "bg-[#F27501] text-white"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              {tab.icon}
              <span className="text-sm font-medium">{tab.label}</span>
              {tab.id === "aanvragen" && stats.aanvragen.nieuw > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {stats.aanvragen.nieuw}
                </span>
              )}
              {tab.id === "inschrijvingen" && stats.inschrijvingen.nieuw > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {stats.inschrijvingen.nieuw}
                </span>
              )}
              {tab.id === "contact" && stats.contact.nieuw > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {stats.contact.nieuw}
                </span>
              )}
              {tab.id === "calculator" && stats.calculator.total > 0 && (
                <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {stats.calculator.total}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800 space-y-1">
          <Link
            href="/admin/settings"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium">Instellingen</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm font-medium">Uitloggen</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {/* Global Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-xl">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => { setGlobalSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Zoek op naam, email, bedrijf, telefoon..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
            />
            {globalSearch && (
              <button
                onClick={() => setGlobalSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Overzicht Tab */}
            {activeTab === "overzicht" && (
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-6">Dashboard Overzicht</h2>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      {stats.aanvragen.nieuw > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-1 rounded-full">
                          {stats.aanvragen.nieuw} nieuw
                        </span>
                      )}
                    </div>
                    <h3 className="text-3xl font-bold text-neutral-900">{stats.aanvragen.total}</h3>
                    <p className="text-neutral-500">Personeel aanvragen</p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      {stats.inschrijvingen.nieuw > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-1 rounded-full">
                          {stats.inschrijvingen.nieuw} nieuw
                        </span>
                      )}
                    </div>
                    <h3 className="text-3xl font-bold text-neutral-900">{stats.inschrijvingen.total}</h3>
                    <p className="text-neutral-500">Inschrijvingen</p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      {stats.contact.nieuw > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-1 rounded-full">
                          {stats.contact.nieuw} nieuw
                        </span>
                      )}
                    </div>
                    <h3 className="text-3xl font-bold text-neutral-900">{stats.contact.total}</h3>
                    <p className="text-neutral-500">Contact berichten</p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      {stats.calculator.downloaded > 0 && (
                        <span className="bg-green-100 text-green-600 text-xs font-semibold px-2 py-1 rounded-full">
                          {stats.calculator.downloaded} PDF
                        </span>
                      )}
                    </div>
                    <h3 className="text-3xl font-bold text-neutral-900">{stats.calculator.total}</h3>
                    <p className="text-neutral-500">Calculator leads</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 mb-8">
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-neutral-900">Onboarding Funnel</h3>
                      <button
                        onClick={exportOnboardingMetrics}
                        className="px-3 py-2 rounded-xl bg-neutral-100 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
                      >
                        Exporteer funnel
                      </button>
                    </div>
                    {(() => {
                      const { metrics, avgProcessingTime } = calculateOnboardingMetrics();
                      const totalActive = Math.max(
                        1,
                        Object.entries(metrics)
                          .filter(([status]) => status !== "afgewezen")
                          .reduce((sum, [, value]) => sum + value, 0)
                      );

                      return (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {([
                              ["Nieuw", metrics.nieuw],
                              ["Docs opvragen", metrics.documenten_opvragen],
                              ["Goedgekeurd", metrics.goedgekeurd],
                              ["Inzetbaar", metrics.inzetbaar],
                            ] as const).map(([label, value]) => (
                              <div key={label} className="rounded-xl bg-neutral-50 p-4">
                                <p className="text-sm text-neutral-500">{label}</p>
                                <p className="text-2xl font-bold text-neutral-900">{value}</p>
                                <p className="text-xs text-neutral-500 mt-1">{Math.round((value / totalActive) * 100)}%</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 rounded-xl bg-orange-50 border border-orange-100 px-4 py-3 text-sm text-orange-900">
                            Gemiddelde doorlooptijd: <strong>{avgProcessingTime > 0 ? `${avgProcessingTime.toFixed(1)} dagen` : "nog onvoldoende data"}</strong>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-neutral-900">Wat vraagt aandacht</h3>
                      <span className="text-xs text-neutral-500">Vandaag</span>
                    </div>
                    <div className="space-y-3">
                      {workflowAlerts.length === 0 ? (
                        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                          Geen acute onboarding issues gevonden.
                        </div>
                      ) : (
                        workflowAlerts.map((alert) => (
                          <div key={alert.label} className={`rounded-xl border px-4 py-3 ${alert.tone}`}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium">{alert.label}</span>
                              <span className="text-lg font-bold">{alert.value}</span>
                            </div>
                          </div>
                        ))
                      )}
                      <div className="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 text-sm text-neutral-700">
                        Open taken: <strong>{opsSnapshot?.counters.openTasks ?? 0}</strong><br />
                        Testkandidaten: <strong>{opsSnapshot?.counters.testCandidates ?? 0}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">Recente activiteit</h3>
                  <div className="space-y-4">
                    {[...aanvragen.slice(0, 3).map((a) => ({ ...a, type: "aanvraag" as const })),
                      ...inschrijvingen.slice(0, 3).map((i) => ({ ...i, type: "inschrijving" as const })),
                      ...contactBerichten.slice(0, 3).map((c) => ({ ...c, type: "contact" as const }))]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .slice(0, 5)
                      .map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-3 bg-neutral-50 rounded-xl">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            item.type === "aanvraag" ? "bg-blue-100 text-blue-600" :
                            item.type === "inschrijving" ? "bg-green-100 text-green-600" :
                            "bg-purple-100 text-purple-600"
                          }`}>
                            {item.type === "aanvraag" && (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                              </svg>
                            )}
                            {item.type === "inschrijving" && (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            )}
                            {item.type === "contact" && (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-neutral-900">
                              {item.type === "aanvraag" && `Nieuwe aanvraag van ${(item as PersoneelAanvraag).bedrijfsnaam}`}
                              {item.type === "inschrijving" && `Nieuwe inschrijving van ${(item as Inschrijving).voornaam} ${(item as Inschrijving).achternaam}`}
                              {item.type === "contact" && `Nieuw bericht van ${(item as ContactBericht).naam}`}
                            </p>
                            <p className="text-sm text-neutral-500">{formatDate(item.created_at)}</p>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>
                      ))}
                  </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-neutral-900">Operations</h3>
                        <span className="text-xs text-neutral-500">Live checks</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl bg-neutral-50 p-4">
                          <p className="text-sm text-neutral-500">Verlopen uploadlinks</p>
                          <p className="text-2xl font-bold text-neutral-900">{opsSnapshot?.counters.expiredUploadLinks ?? 0}</p>
                        </div>
                        <div className="rounded-xl bg-neutral-50 p-4">
                          <p className="text-sm text-neutral-500">Kandidaten wachten te lang</p>
                          <p className="text-2xl font-bold text-neutral-900">{opsSnapshot?.counters.candidatesWaitingTooLong ?? 0}</p>
                        </div>
                        <div className="rounded-xl bg-neutral-50 p-4">
                          <p className="text-sm text-neutral-500">In review documenten</p>
                          <p className="text-2xl font-bold text-neutral-900">{opsSnapshot?.counters.pendingDocumentReviews ?? 0}</p>
                        </div>
                        <div className="rounded-xl bg-neutral-50 p-4">
                          <p className="text-sm text-neutral-500">Inzetbaar zonder profiel</p>
                          <p className="text-2xl font-bold text-neutral-900">{opsSnapshot?.counters.inzetbaarWithoutProfile ?? 0}</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2">
                          <span>Redis rate limiting</span>
                          <span className={opsSnapshot?.health.redisConfigured ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {opsSnapshot?.health.redisConfigured ? "Actief" : "Mist"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2">
                          <span>Cron secret</span>
                          <span className={opsSnapshot?.health.cronConfigured ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {opsSnapshot?.health.cronConfigured ? "Actief" : "Mist"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2">
                          <span>Resend</span>
                          <span className={opsSnapshot?.health.resendConfigured ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {opsSnapshot?.health.resendConfigured ? "Actief" : "Mist"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-neutral-900 mb-4">Audit log</h3>
                      <div className="space-y-3">
                        {(opsSnapshot?.recentAudit || []).slice(0, 5).map((item) => (
                          <div key={item.id} className="rounded-xl bg-neutral-50 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-neutral-900">{item.summary}</p>
                              <span className="text-xs text-neutral-500">
                                {new Date(item.created_at).toLocaleString("nl-NL")}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">
                              {(item.actor_email || "onbekend")} · {item.target_table} · {item.action}
                            </p>
                          </div>
                        ))}
                        {(!opsSnapshot?.recentAudit || opsSnapshot.recentAudit.length === 0) && (
                          <p className="text-sm text-neutral-500">Nog geen audit events gevonden.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Personeel Aanvragen Tab */}
            {activeTab === "aanvragen" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-neutral-900">Personeel Aanvragen</h2>
                  <div className="flex items-center gap-4">
                    {/* Lead Source Filter */}
                    <select
                      value={leadSourceFilter}
                      onChange={(e) => setLeadSourceFilter(e.target.value)}
                      className="px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] bg-white text-neutral-900"
                    >
                      <option value="all">Alle bronnen</option>
                      <option value="website">Website</option>
                      <option value="outreach">Cold Outreach</option>
                      <option value="google">Google Ads</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="facebook">Facebook</option>
                      <option value="other">Overig</option>
                    </select>

                    {/* Campaign Filter */}
                    {(() => {
                      const campaigns = Array.from(new Set(
                        aanvragen
                          .map(a => a.campaign_name)
                          .filter(Boolean)
                      )).sort();
                      return campaigns.length > 0 ? (
                        <select
                          value={campaignFilter}
                          onChange={(e) => setCampaignFilter(e.target.value)}
                          className="px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] bg-white text-neutral-900"
                        >
                          <option value="all">Alle campagnes</option>
                          {campaigns.map(campaign => (
                            <option key={campaign} value={campaign}>{campaign}</option>
                          ))}
                        </select>
                      ) : null;
                    })()}

                    <button
                      onClick={() => exportToCSV(
                        aanvragen.filter(a =>
                          (leadSourceFilter === "all" || a.lead_source === leadSourceFilter) &&
                          (campaignFilter === "all" || a.campaign_name === campaignFilter)
                        ),
                        "personeel_aanvragen"
                      )}
                      className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Exporteer CSV
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-neutral-50 border-b border-neutral-100">
                      <tr>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Bedrijf</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Contact</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Type</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Datum</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Status</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-neutral-600">Acties</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {paginateItems(filteredAanvragen
                        .filter(a =>
                          (leadSourceFilter === "all" || a.lead_source === leadSourceFilter) &&
                          (campaignFilter === "all" || a.campaign_name === campaignFilter)
                        ))
                        .map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-50">
                          <td className="px-6 py-4">
                            <p className="font-medium text-neutral-900">{item.bedrijfsnaam}</p>
                            <p className="text-sm text-neutral-500">{item.locatie}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-neutral-900">{item.contactpersoon}</p>
                            <p className="text-sm text-neutral-500">{item.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-neutral-900">{item.type_personeel?.slice(0, 2).join(", ")}</p>
                            <p className="text-sm text-neutral-500">{item.aantal_personen} personen</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-500">
                            {formatDate(item.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <StatusBadge status={item.status} />
                              {(item as PersoneelAanvraag & { replied_at?: string }).replied_at && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 inline-block w-fit">
                                  Reactie verstuurd
                                </span>
                              )}
                              {(item as PersoneelAanvraag & { booking_id?: string }).booking_id && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 inline-block w-fit">
                                  Afspraak gepland
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!(item as PersoneelAanvraag & { replied_at?: string }).replied_at && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setSelectedItem(item);
                                    setDetailType("aanvragen");
                                    setReplyModal(true);
                                    setReplyLoading(true);
                                    setReplyDraft("");
                                    setReplySubject("");
                                    setReplyInquiry(null);
                                    try {
                                      const res = await fetch("/api/inquiries/generate-reply", {
                                        method: "POST",
                                        headers: await getAuthHeaders(),
                                        body: JSON.stringify({ inquiry_id: item.id }),
                                      });
                                      const data = await res.json();
                                      if (data.body) setReplyDraft(data.body);
                                      if (data.subject) setReplySubject(data.subject);
                                      if (data.inquiry) setReplyInquiry(data.inquiry);
                                    } catch {
                                      setReplyDraft("Fout bij genereren.");
                                    } finally {
                                      setReplyLoading(false);
                                    }
                                  }}
                                  className="text-xs px-3 py-1.5 bg-[#F27501] text-white rounded-lg hover:bg-[#d96800] transition-colors font-medium"
                                >
                                  Stuur reactie
                                </button>
                              )}
                              <button
                                onClick={() => { setSelectedItem(item); setDetailType("aanvragen"); }}
                                className="text-[#F27501] hover:text-[#d96800] font-medium text-sm"
                              >
                                Bekijken
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredAanvragen.length === 0 && (
                    <div className="text-center py-12 text-neutral-500">
                      {globalSearch ? `Geen resultaten voor "${globalSearch}"` : "Geen aanvragen gevonden"}
                    </div>
                  )}
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredAanvragen.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}

            {/* Inschrijvingen Tab */}
            {activeTab === "inschrijvingen" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-neutral-900">Inschrijvingen</h2>
                    <div className="flex bg-neutral-100 rounded-xl p-1">
                      <button
                        onClick={() => setInschrijvingView("tabel")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          inschrijvingView === "tabel" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                        }`}
                      >
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        Tabel
                      </button>
                      <button
                        onClick={() => setInschrijvingView("pipeline")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          inschrijvingView === "pipeline" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                        }`}
                      >
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                        Pipeline
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={inschrijvingStatusFilter}
                      onChange={(e) =>
                        setInschrijvingStatusFilter(e.target.value as OnboardingStatus | "all")
                      }
                      className="px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] bg-white text-neutral-900"
                    >
                      <option value="all">Alle onboarding statussen</option>
                      <option value="nieuw">Nieuw</option>
                      <option value="in_beoordeling">In beoordeling</option>
                      <option value="documenten_opvragen">Documenten opvragen</option>
                      <option value="wacht_op_kandidaat">Wacht op kandidaat</option>
                      <option value="goedgekeurd">Goedgekeurd</option>
                      <option value="inzetbaar">Inzetbaar</option>
                      <option value="afgewezen">Afgewezen</option>
                    </select>
                    {selectedIds.size > 0 && (
                      <>
                        <div className="flex items-center gap-2">
                          <select
                            value={bulkOnboardingStatus}
                            onChange={(e) => setBulkOnboardingStatus(e.target.value as OnboardingStatus | "")}
                            className="px-4 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] bg-white text-neutral-900"
                          >
                            <option value="">Bulk actie...</option>
                            <option value="in_beoordeling">→ In beoordeling</option>
                            <option value="documenten_opvragen">→ Documenten opvragen</option>
                            <option value="wacht_op_kandidaat">→ Wacht op kandidaat</option>
                            <option value="goedgekeurd">→ Goedgekeurd</option>
                            <option value="inzetbaar">→ Inzetbaar</option>
                            <option value="afgewezen">→ Afgewezen</option>
                          </select>
                          {bulkOnboardingStatus && (
                            <button
                              onClick={() => bulkUpdateOnboardingStatus(bulkOnboardingStatus)}
                              className="px-4 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] font-medium"
                            >
                              Update ({selectedIds.size})
                            </button>
                          )}
                        </div>
                        <button
                          onClick={bulkSendEmail}
                          disabled={bulkEmailSending}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          {bulkEmailSending ? "Verzenden..." : `Email ({selectedIds.size})`}
                        </button>
                        <button onClick={() => deleteSelected("inschrijvingen")} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Verwijder ({selectedIds.size})
                        </button>
                      </>
                    )}
                    <button onClick={() => exportSelected(filteredInschrijvingen, "inschrijvingen")} className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      {selectedIds.size > 0 ? `Exporteer (${selectedIds.size})` : "Exporteer alle"}
                    </button>
                    <button onClick={exportOnboardingMetrics} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      Metrics rapport
                    </button>
                  </div>
                </div>

                {/* Onboarding Metrics Widget */}
                {(() => {
                  const { metrics, avgProcessingTime } = calculateOnboardingMetrics();
                  const totalActive = Object.entries(metrics)
                    .filter(([status]) => status !== "afgewezen")
                    .reduce((sum, [, count]) => sum + count, 0);

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                      {/* Active Pipeline */}
                      <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl shadow-sm p-6 border border-sky-100">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-sky-900">Actieve Pipeline</h3>
                          <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <p className="text-3xl font-bold text-sky-900">{totalActive}</p>
                        <p className="text-sm text-sky-600 mt-1">Kandidaten in onboarding</p>
                      </div>

                      {/* Phase Breakdown */}
                      <div className="bg-white rounded-2xl shadow-sm p-6 border border-neutral-100 lg:col-span-2">
                        <h3 className="text-sm font-semibold text-neutral-900 mb-4">Per fase</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center justify-between p-3 bg-sky-50 rounded-lg">
                            <span className="text-xs font-medium text-sky-700">Nieuw</span>
                            <span className="text-lg font-bold text-sky-900">{metrics.nieuw}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                            <span className="text-xs font-medium text-amber-700">In beoordeling</span>
                            <span className="text-lg font-bold text-amber-900">{metrics.in_beoordeling}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                            <span className="text-xs font-medium text-orange-700">Documenten</span>
                            <span className="text-lg font-bold text-orange-900">{metrics.documenten_opvragen}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                            <span className="text-xs font-medium text-yellow-700">Wacht op resp.</span>
                            <span className="text-lg font-bold text-yellow-900">{metrics.wacht_op_kandidaat}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                            <span className="text-xs font-medium text-emerald-700">Goedgekeurd</span>
                            <span className="text-lg font-bold text-emerald-900">{metrics.goedgekeurd}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <span className="text-xs font-medium text-green-700">Inzetbaar</span>
                            <span className="text-lg font-bold text-green-900">{metrics.inzetbaar}</span>
                          </div>
                        </div>
                      </div>

                      {/* Average Processing Time */}
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl shadow-sm p-6 border border-emerald-100">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-emerald-900">Gem. doorlooptijd</h3>
                          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-3xl font-bold text-emerald-900">
                          {avgProcessingTime > 0 ? avgProcessingTime.toFixed(1) : "—"}
                        </p>
                        <p className="text-sm text-emerald-600 mt-1">
                          {avgProcessingTime > 0 ? "dagen tot goedkeuring" : "Geen data beschikbaar"}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Pipeline View */}
                {inschrijvingView === "pipeline" && (
                  <OnboardingPipelineView
                    inschrijvingen={filteredInschrijvingen as never[]}
                    onSelectKandidaat={(id) => {
                      const item = filteredInschrijvingen.find((i) => i.id === id);
                      if (item) {
                        setSelectedItem(item);
                        setDetailType("inschrijvingen");
                        setInschrijvingNotitieDraft(item.interne_notitie || "");
                      }
                    }}
                    onRefresh={fetchData}
                  />
                )}

                {/* Tabel View */}
                {inschrijvingView === "tabel" && (<>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-neutral-50 border-b border-neutral-100">
                      <tr>
                        <th className="px-6 py-4"><input type="checkbox" onChange={() => selectAll(filteredInschrijvingen.map(i => i.id))} checked={selectedIds.size === filteredInschrijvingen.length && filteredInschrijvingen.length > 0} className="w-4 h-4 rounded" /></th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Naam</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Contact</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Locatie</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Type</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Datum</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Onboarding</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-neutral-600">Acties</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {paginateItems(filteredInschrijvingen).map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-50">
                          <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="w-4 h-4 rounded" /></td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-neutral-900">
                              {item.voornaam} {item.tussenvoegsel} {item.achternaam}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-neutral-900">{item.email}</p>
                            <p className="text-sm text-neutral-500">{item.telefoon}</p>
                          </td>
                          <td className="px-6 py-4 text-neutral-900">{item.stad}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.uitbetalingswijze === "zzp" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                            }`}>
                              {item.uitbetalingswijze === "zzp" ? "ZZP" : "Loondienst"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-500">
                            {formatDate(item.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-2 items-start">
                              <OnboardingStatusBadge status={getInschrijvingOnboardingStatus(item)} />
                              <div className="flex flex-wrap gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  item.documenten_compleet
                                    ? "bg-green-100 text-green-700"
                                    : "bg-neutral-100 text-neutral-600"
                                }`}>
                                  {item.documenten_compleet ? "Documenten compleet" : "Documenten open"}
                                </span>
                                {item.is_test_candidate && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-fuchsia-100 text-fuchsia-700">
                                    Test
                                  </span>
                                )}
                                {item.inzetbaar_op && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                    Inzetbaar
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setDetailType("inschrijvingen");
                                setInschrijvingNotitieDraft(item.interne_notitie || "");
                              }}
                              className="text-[#F27501] hover:text-[#d96800] font-medium text-sm"
                            >
                              Bekijken
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredInschrijvingen.length === 0 && (
                    <div className="text-center py-12 text-neutral-500">
                      {globalSearch ? `Geen resultaten voor "${globalSearch}"` : "Geen inschrijvingen gevonden"}
                    </div>
                  )}
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredInschrijvingen.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
                </>)}
              </div>
            )}

            {/* Contact Tab */}
            {activeTab === "contact" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-neutral-900">Contact Berichten</h2>
                  <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                      <button onClick={() => deleteSelected("contact_berichten")} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Verwijder ({selectedIds.size})
                      </button>
                    )}
                    <button onClick={() => exportSelected(contactBerichten, "contact_berichten")} className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      {selectedIds.size > 0 ? `Exporteer (${selectedIds.size})` : "Exporteer alle"}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-neutral-50 border-b border-neutral-100">
                      <tr>
                        <th className="px-6 py-4"><input type="checkbox" onChange={() => selectAll(contactBerichten.map(c => c.id))} checked={selectedIds.size === contactBerichten.length && contactBerichten.length > 0} className="w-4 h-4 rounded" /></th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Naam</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Onderwerp</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Bericht</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Datum</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Status</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-neutral-600">Acties</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {contactBerichten.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-50">
                          <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="w-4 h-4 rounded" /></td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-neutral-900">{item.naam}</p>
                            <p className="text-sm text-neutral-500">{item.email}</p>
                          </td>
                          <td className="px-6 py-4 text-neutral-900">{item.onderwerp}</td>
                          <td className="px-6 py-4 text-neutral-500 max-w-xs truncate">
                            {item.bericht}
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-500">
                            {formatDate(item.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => { setSelectedItem(item); setDetailType("contact"); }}
                              className="text-[#F27501] hover:text-[#d96800] font-medium text-sm"
                            >
                              Bekijken
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {contactBerichten.length === 0 && (
                    <div className="text-center py-12 text-neutral-500">
                      Geen berichten gevonden
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Medewerkers Tab */}
            {activeTab === "medewerkers" && <MedewerkersTab />}

            {/* Diensten Tab */}
            {activeTab === "diensten" && <DienstenTab />}

            {/* Uren Tab */}
            {activeTab === "uren" && <UrenTab />}

            {/* Facturen Tab */}
            {activeTab === "facturen" && <FacturenTab />}

            {/* Stats Tab */}
            {activeTab === "stats" && <StatsTab />}

            {/* Matching Tab */}
            {activeTab === "matching" && <MatchingTab />}

            {/* AI Agents Tab */}
            {activeTab === "ai" && <AITab />}

            {/* Acquisitie Tab */}
            {activeTab === "acquisitie" && <AcquisitieTab />}

            {/* Klanten Tab */}
            {activeTab === "klanten" && <KlantenTab />}

            {/* Referrals Tab */}
            {activeTab === "referrals" && <ReferralsTab />}

            {/* Offertes Tab */}
            {activeTab === "offertes" && <OffertesTab />}

            {/* FAQ Tab */}
            {activeTab === "faq" && <FAQTab />}
            {activeTab === "tickets" && <TicketsTab />}

            {/* Pricing Tab */}
            {activeTab === "pricing" && <PricingTab />}

            {/* Content Tab */}
            {activeTab === "content" && <ContentTab />}

            {/* Agenda Tab */}
            {activeTab === "agenda" && <AgendaTab />}

            {/* Berichten Tab */}
            {activeTab === "berichten" && <BerichtenTab />}

            {/* Calculator Leads Tab */}
            {activeTab === "calculator" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-neutral-900">Calculator Leads</h2>
                  <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                      <button onClick={() => deleteSelected("calculator_leads")} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Verwijder ({selectedIds.size})
                      </button>
                    )}
                    <button onClick={() => {
                      const toExport = selectedIds.size > 0 ? calculatorLeads.filter(l => selectedIds.has(l.id)) : calculatorLeads;
                      exportToCSV(toExport.map(lead => ({
                        naam: lead.naam, bedrijfsnaam: lead.bedrijfsnaam, email: lead.email, functie: lead.functie,
                        aantal_medewerkers: lead.aantal_medewerkers, ervaring: lead.ervaring, uren_per_dienst: lead.uren_per_dienst,
                        dagen_per_week: lead.dagen_per_week.length, inzet_type: lead.inzet_type,
                        vast_per_maand: lead.resultaten.vast?.perMaand || '', uitzend_per_maand: lead.resultaten.uitzend?.perMaand || '',
                        zzp_per_maand: lead.resultaten.zzp?.perMaand || '', pdf_downloaded: lead.pdf_downloaded ? 'Ja' : 'Nee',
                        email_sent: lead.email_sent ? 'Ja' : 'Nee', datum: lead.created_at,
                      })), "calculator_leads");
                    }} className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      {selectedIds.size > 0 ? `Exporteer (${selectedIds.size})` : "Exporteer alle"}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-neutral-50 border-b border-neutral-100">
                      <tr>
                        <th className="px-6 py-4"><input type="checkbox" onChange={() => selectAll(calculatorLeads.map(c => c.id))} checked={selectedIds.size === calculatorLeads.length && calculatorLeads.length > 0} className="w-4 h-4 rounded" /></th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Bedrijf</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Contact</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Functie</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Kosten/maand</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Datum</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Status</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-neutral-600">Acties</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {calculatorLeads.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-50">
                          <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="w-4 h-4 rounded" /></td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-neutral-900">{item.bedrijfsnaam}</p>
                            <p className="text-sm text-neutral-500">{item.aantal_medewerkers} medewerker(s)</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-neutral-900">{item.naam}</p>
                            <p className="text-sm text-neutral-500">{item.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-neutral-900 capitalize">{item.functie}</p>
                            <p className="text-sm text-neutral-500">{item.ervaring}</p>
                          </td>
                          <td className="px-6 py-4">
                            {item.resultaten.uitzend && (
                              <p className="text-[#F27501] font-semibold">
                                € {item.resultaten.uitzend.perMaand.toLocaleString("nl-NL")}
                              </p>
                            )}
                            <p className="text-xs text-neutral-500">uitzend</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-500">
                            {formatDate(item.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.email_sent ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                              }`}>
                                {item.email_sent ? "Email verzonden" : "Geen email"}
                              </span>
                              {item.pdf_downloaded && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  PDF gedownload
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => { setSelectedItem(item); setDetailType("calculator"); }}
                              className="text-[#F27501] hover:text-[#d96800] font-medium text-sm"
                            >
                              Bekijken
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {calculatorLeads.length === 0 && (
                    <div className="text-center py-12 text-neutral-500">
                      Geen calculator leads gevonden
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-neutral-900">
                {detailType === "aanvragen" && "Personeel Aanvraag"}
                {detailType === "inschrijvingen" && "Inschrijving"}
                {detailType === "contact" && "Contact Bericht"}
                {detailType === "calculator" && "Calculator Lead"}
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {detailType === "aanvragen" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-neutral-500">Bedrijfsnaam</p>
                      <p className="font-medium">{(selectedItem as PersoneelAanvraag).bedrijfsnaam}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Contactpersoon</p>
                      <p className="font-medium">{(selectedItem as PersoneelAanvraag).contactpersoon}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Email</p>
                      <a href={`mailto:${(selectedItem as PersoneelAanvraag).email}`} className="font-medium text-[#F27501]">
                        {(selectedItem as PersoneelAanvraag).email}
                      </a>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Telefoon</p>
                      <a href={`tel:${(selectedItem as PersoneelAanvraag).telefoon}`} className="font-medium text-[#F27501]">
                        {(selectedItem as PersoneelAanvraag).telefoon}
                      </a>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Type personeel</p>
                      <p className="font-medium">{(selectedItem as PersoneelAanvraag).type_personeel?.join(", ")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Aantal personen</p>
                      <p className="font-medium">{(selectedItem as PersoneelAanvraag).aantal_personen}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Startdatum</p>
                      <p className="font-medium">{(selectedItem as PersoneelAanvraag).start_datum}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Einddatum</p>
                      <p className="font-medium">{(selectedItem as PersoneelAanvraag).eind_datum || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Werkdagen</p>
                      <p className="font-medium">{(selectedItem as PersoneelAanvraag).werkdagen?.join(", ")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Werktijden</p>
                      <p className="font-medium">{(selectedItem as PersoneelAanvraag).werktijden}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Locatie</p>
                      <p className="font-medium">{(selectedItem as PersoneelAanvraag).locatie}</p>
                    </div>
                  </div>
                  {(selectedItem as PersoneelAanvraag).opmerkingen && (
                    <div>
                      <p className="text-sm text-neutral-500">Opmerkingen</p>
                      <p className="font-medium whitespace-pre-wrap">{(selectedItem as PersoneelAanvraag).opmerkingen}</p>
                    </div>
                  )}

                  {/* Lead Tracking Info */}
                  {((selectedItem as PersoneelAanvraag).lead_source || (selectedItem as PersoneelAanvraag).campaign_name) && (
                    <div className="pt-4 border-t border-neutral-100 mt-4">
                      <p className="text-sm font-semibold text-neutral-700 mb-3">📊 Lead Tracking</p>
                      <div className="grid grid-cols-2 gap-4">
                        {(selectedItem as PersoneelAanvraag).lead_source && (
                          <div>
                            <p className="text-sm text-neutral-500">Lead Source</p>
                            <span className="inline-block px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm font-medium">
                              {(selectedItem as PersoneelAanvraag).lead_source}
                            </span>
                          </div>
                        )}
                        {(selectedItem as PersoneelAanvraag).campaign_name && (
                          <div>
                            <p className="text-sm text-neutral-500">Campaign</p>
                            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                              {(selectedItem as PersoneelAanvraag).campaign_name}
                            </span>
                          </div>
                        )}
                        {(selectedItem as PersoneelAanvraag).utm_source && (
                          <div>
                            <p className="text-sm text-neutral-500">UTM Source</p>
                            <p className="font-medium text-neutral-600">{(selectedItem as PersoneelAanvraag).utm_source}</p>
                          </div>
                        )}
                        {(selectedItem as PersoneelAanvraag).utm_medium && (
                          <div>
                            <p className="text-sm text-neutral-500">UTM Medium</p>
                            <p className="font-medium text-neutral-600">{(selectedItem as PersoneelAanvraag).utm_medium}</p>
                          </div>
                        )}
                        {(selectedItem as PersoneelAanvraag).utm_campaign && (
                          <div>
                            <p className="text-sm text-neutral-500">UTM Campaign</p>
                            <p className="font-medium text-neutral-600">{(selectedItem as PersoneelAanvraag).utm_campaign}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {detailType === "inschrijvingen" && (
                <>
                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                    <div className="flex flex-wrap gap-2 items-center mb-3">
                      <OnboardingStatusBadge status={getInschrijvingOnboardingStatus(selectedItem as Inschrijving)} />
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (selectedItem as Inschrijving).documenten_compleet
                          ? "bg-green-100 text-green-700"
                          : "bg-neutral-100 text-neutral-600"
                      }`}>
                        {(selectedItem as Inschrijving).documenten_compleet ? "Documenten compleet" : "Documenten nog open"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-neutral-500">Laatste contact</p>
                        <p className="font-medium text-neutral-900">
                          {(selectedItem as Inschrijving).laatste_contact_op
                            ? formatDate((selectedItem as Inschrijving).laatste_contact_op!)
                            : "Nog niet vastgelegd"}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Goedgekeurd op</p>
                        <p className="font-medium text-neutral-900">
                          {(selectedItem as Inschrijving).goedgekeurd_op
                            ? formatDate((selectedItem as Inschrijving).goedgekeurd_op!)
                            : "Nog niet goedgekeurd"}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Inzetbaar op</p>
                        <p className="font-medium text-neutral-900">
                          {(selectedItem as Inschrijving).inzetbaar_op
                            ? formatDate((selectedItem as Inschrijving).inzetbaar_op!)
                            : "Nog niet inzetbaar"}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Intake bevestiging</p>
                        <p className="font-medium text-neutral-900">
                          {(selectedItem as Inschrijving).intake_bevestiging_verstuurd_op
                            ? formatDate((selectedItem as Inschrijving).intake_bevestiging_verstuurd_op!)
                            : "Nog niet verstuurd"}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Documentenverzoek</p>
                        <p className="font-medium text-neutral-900">
                          {(selectedItem as Inschrijving).documenten_verzoek_verstuurd_op
                            ? formatDate((selectedItem as Inschrijving).documenten_verzoek_verstuurd_op!)
                            : "Nog niet verstuurd"}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Welkomstmail</p>
                        <p className="font-medium text-neutral-900">
                          {(selectedItem as Inschrijving).welkom_mail_verstuurd_op
                            ? formatDate((selectedItem as Inschrijving).welkom_mail_verstuurd_op!)
                            : "Nog niet verstuurd"}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Medewerkerprofiel</p>
                        <p className="font-medium text-neutral-900">
                          {(selectedItem as Inschrijving).medewerker_id || "Nog niet aangemaakt"}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Type kandidaat</p>
                        <p className="font-medium text-neutral-900">
                          {(selectedItem as Inschrijving).is_test_candidate ? "Test kandidaat" : "Normale kandidaat"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-neutral-500">Naam</p>
                      <p className="font-medium">
                        {(selectedItem as Inschrijving).voornaam} {(selectedItem as Inschrijving).tussenvoegsel} {(selectedItem as Inschrijving).achternaam}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Email</p>
                      <a href={`mailto:${(selectedItem as Inschrijving).email}`} className="font-medium text-[#F27501]">
                        {(selectedItem as Inschrijving).email}
                      </a>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Telefoon</p>
                      <a href={`tel:${(selectedItem as Inschrijving).telefoon}`} className="font-medium text-[#F27501]">
                        {(selectedItem as Inschrijving).telefoon}
                      </a>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Stad</p>
                      <p className="font-medium">{(selectedItem as Inschrijving).stad}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Geboortedatum</p>
                      <p className="font-medium">{(selectedItem as Inschrijving).geboortedatum}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Geslacht</p>
                      <p className="font-medium">{(selectedItem as Inschrijving).geslacht}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Horeca-ervaring</p>
                      <p className="font-medium">{(selectedItem as Inschrijving).horeca_ervaring || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Uitbetalingswijze</p>
                      <p className="font-medium">{(selectedItem as Inschrijving).uitbetalingswijze === "zzp" ? "ZZP" : "Loondienst"}</p>
                    </div>
                    {(selectedItem as Inschrijving).kvk_nummer && (
                      <div>
                        <p className="text-sm text-neutral-500">KVK Nummer</p>
                        <p className="font-medium">{(selectedItem as Inschrijving).kvk_nummer}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-neutral-500">Hoe bij ons gekomen</p>
                      <p className="font-medium">{(selectedItem as Inschrijving).hoe_gekomen}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Eigen vervoer</p>
                      <p className="font-medium">{(selectedItem as Inschrijving).eigen_vervoer ? "Ja" : "Nee"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Functies</p>
                      <p className="font-medium">{(selectedItem as Inschrijving).gewenste_functies?.join(", ") || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Talen</p>
                      <p className="font-medium">{(selectedItem as Inschrijving).talen?.join(", ") || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Motivatie</p>
                    <p className="font-medium whitespace-pre-wrap">{(selectedItem as Inschrijving).motivatie}</p>
                  </div>
                  {(selectedItem as Inschrijving).beschikbaarheid && (
                    <div className="mt-4 p-4 bg-neutral-50 rounded-xl">
                      <h4 className="font-semibold mb-2">Beschikbaarheid</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {(selectedItem as Inschrijving).beschikbaar_vanaf && (
                          <div><span className="text-neutral-500">Vanaf:</span> <span className="font-medium">{new Date((selectedItem as Inschrijving).beschikbaar_vanaf!).toLocaleDateString('nl-NL')}</span></div>
                        )}
                        {(selectedItem as Inschrijving).max_uren_per_week && (
                          <div><span className="text-neutral-500">Max uren/week:</span> <span className="font-medium">{(selectedItem as Inschrijving).max_uren_per_week}</span></div>
                        )}
                      </div>
                      {typeof (selectedItem as Inschrijving).beschikbaarheid === "string" ? (
                        <div className="mt-2 text-sm">
                          <span className="text-neutral-500">Patroon:</span>{" "}
                          <span className="font-medium">{String((selectedItem as Inschrijving).beschikbaarheid)}</span>
                        </div>
                      ) : (
                        <div className="mt-2 space-y-1 text-sm">
                          {Object.entries(((selectedItem as Inschrijving).beschikbaarheid as { [key: string]: string[] }) || {}).map(([dag, slots]) =>
                            slots.length > 0 ? (
                              <div key={dag}><span className="font-medium capitalize">{dag}:</span> {slots.join(", ")}</div>
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-4 bg-white border border-neutral-200 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-neutral-500">Kandidaat documenten</p>
                        <p className="text-sm font-medium text-neutral-900">
                          {kandidaatDocumenten.length} document(en) gekoppeld
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <select
                        value={documentTypeDraft}
                        onChange={(e) => setDocumentTypeDraft(e.target.value)}
                        className="px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
                      >
                        {kandidaatDocumentTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="file"
                        onChange={(e) => setDocumentFileDraft(e.target.files?.[0] || null)}
                        className="px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
                      />
                      <button
                        onClick={() => uploadKandidaatDocument(selectedItem as Inschrijving)}
                        disabled={documentUploading}
                        className="px-4 py-3 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 disabled:opacity-60 transition-colors"
                      >
                        {documentUploading ? "Uploaden..." : "Document uploaden"}
                      </button>
                    </div>

                    <textarea
                      value={documentNotitieDraft}
                      onChange={(e) => setDocumentNotitieDraft(e.target.value)}
                      rows={2}
                      className="w-full mb-4 px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] resize-y"
                      placeholder="Optionele notitie bij deze upload..."
                    />

                    {documentenLoading ? (
                      <div className="text-sm text-neutral-500">Documenten laden...</div>
                    ) : kandidaatDocumenten.length === 0 ? (
                      <div className="text-sm text-neutral-500 bg-neutral-50 rounded-xl px-4 py-3">
                        Nog geen documenten gekoppeld aan deze kandidaat.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {kandidaatDocumenten.map((document) => (
                          <div key={document.id} className="p-4 rounded-xl border border-neutral-200 bg-neutral-50">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className="font-medium text-neutral-900">{document.bestandsnaam}</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${kandidaatDocumentStatusColors[document.status]}`}>
                                    {kandidaatDocumentStatusLabels[document.status]}
                                  </span>
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-white border border-neutral-200 text-neutral-600">
                                    {document.type}
                                  </span>
                                </div>
                                <p className="text-sm text-neutral-500">
                                  Geupload op {formatDate(document.uploaded_at)}
                                  {document.bestand_grootte ? ` · ${(document.bestand_grootte / 1024 / 1024).toFixed(2)} MB` : ""}
                                </p>
                                {document.notitie ? (
                                  <p className="text-sm text-neutral-700 mt-2 whitespace-pre-wrap">{document.notitie}</p>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {document.download_url ? (
                                  <a
                                    href={document.download_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                                  >
                                    Openen
                                  </a>
                                ) : null}
                                <button
                                  onClick={() =>
                                    updateKandidaatDocument(selectedItem as Inschrijving, document.id, {
                                      status: "goedgekeurd",
                                      notitie: document.notitie || "",
                                    })
                                  }
                                  className="px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
                                >
                                  Goedkeuren
                                </button>
                                <button
                                  onClick={() =>
                                    updateKandidaatDocument(selectedItem as Inschrijving, document.id, {
                                      status: "afgekeurd",
                                      notitie: document.notitie || "",
                                    })
                                  }
                                  className="px-3 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
                                >
                                  Afkeuren
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Interne notitie</p>
                    <div className="space-y-3">
                      <textarea
                        value={inschrijvingNotitieDraft}
                        onChange={(e) => setInschrijvingNotitieDraft(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] resize-y"
                        placeholder="Voeg interne onboarding-notities toe..."
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            updateInschrijvingFields(selectedItem as Inschrijving, {
                              interne_notitie: inschrijvingNotitieDraft || null,
                            })
                          }
                          className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors"
                        >
                          Notitie opslaan
                        </button>
                        <button
                          onClick={() =>
                            updateInschrijvingFields(selectedItem as Inschrijving, {
                              documenten_compleet: !Boolean((selectedItem as Inschrijving).documenten_compleet),
                            })
                          }
                          className="px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors"
                        >
                          {(selectedItem as Inschrijving).documenten_compleet
                            ? "Markeer documenten als open"
                            : "Markeer documenten als compleet"}
                        </button>
                        <button
                          onClick={() =>
                            updateInschrijvingFields(selectedItem as Inschrijving, {
                              laatste_contact_op: new Date().toISOString(),
                            })
                          }
                          className="px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors"
                        >
                          Laatste contact = nu
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white border border-neutral-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-neutral-500">Onboarding checklist</p>
                        <p className="text-sm font-medium text-neutral-900">
                          {onboardingChecklistItems.filter(
                            (item) => (selectedItem as Inschrijving).onboarding_checklist?.[item.key]
                          ).length}
                          /{onboardingChecklistItems.length} afgerond
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {onboardingChecklistItems.map((item) => {
                        const checked = Boolean((selectedItem as Inschrijving).onboarding_checklist?.[item.key]);

                        return (
                          <button
                            key={item.key}
                            onClick={() => toggleInschrijvingChecklistItem(selectedItem as Inschrijving, item.key)}
                            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                              checked
                                ? "border-green-200 bg-green-50 text-green-800"
                                : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                            }`}
                          >
                            <span className="text-sm font-medium">{item.label}</span>
                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                              checked
                                ? "border-green-500 bg-green-500 text-white"
                                : "border-neutral-300 bg-white text-transparent"
                            }`}>
                              ✓
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <KandidaatWorkflowPanel
                    candidate={selectedItem as Inschrijving}
                    getAuthHeaders={getAuthHeaders}
                    onRefresh={fetchData}
                    onUpdateCandidateFields={(data) => updateInschrijvingFields(selectedItem as Inschrijving, data)}
                    onGeneratePortalLink={() => generateKandidaatPortalLink((selectedItem as Inschrijving).id)}
                  />
                </>
              )}

              {detailType === "contact" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-neutral-500">Naam</p>
                      <p className="font-medium">{(selectedItem as ContactBericht).naam}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Email</p>
                      <a href={`mailto:${(selectedItem as ContactBericht).email}`} className="font-medium text-[#F27501]">
                        {(selectedItem as ContactBericht).email}
                      </a>
                    </div>
                    {(selectedItem as ContactBericht).telefoon && (
                      <div>
                        <p className="text-sm text-neutral-500">Telefoon</p>
                        <a href={`tel:${(selectedItem as ContactBericht).telefoon}`} className="font-medium text-[#F27501]">
                          {(selectedItem as ContactBericht).telefoon}
                        </a>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-neutral-500">Onderwerp</p>
                      <p className="font-medium">{(selectedItem as ContactBericht).onderwerp}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Bericht</p>
                    <p className="font-medium whitespace-pre-wrap">{(selectedItem as ContactBericht).bericht}</p>
                  </div>
                </>
              )}

              {detailType === "calculator" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-neutral-500">Naam</p>
                      <p className="font-medium">{(selectedItem as CalculatorLead).naam}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Bedrijfsnaam</p>
                      <p className="font-medium">{(selectedItem as CalculatorLead).bedrijfsnaam}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Email</p>
                      <a href={`mailto:${(selectedItem as CalculatorLead).email}`} className="font-medium text-[#F27501]">
                        {(selectedItem as CalculatorLead).email}
                      </a>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Functie</p>
                      <p className="font-medium capitalize">{(selectedItem as CalculatorLead).functie}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Aantal medewerkers</p>
                      <p className="font-medium">{(selectedItem as CalculatorLead).aantal_medewerkers}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Ervaring</p>
                      <p className="font-medium">{(selectedItem as CalculatorLead).ervaring}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Uren per dienst</p>
                      <p className="font-medium">{(selectedItem as CalculatorLead).uren_per_dienst}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Dagen per week</p>
                      <p className="font-medium">{(selectedItem as CalculatorLead).dagen_per_week?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Type inzet</p>
                      <p className="font-medium">{(selectedItem as CalculatorLead).inzet_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Aangevraagd op</p>
                      <p className="font-medium">{formatDate((selectedItem as CalculatorLead).created_at)}</p>
                    </div>
                  </div>

                  {/* Kostenvergelijking */}
                  <div className="mt-4 p-4 bg-neutral-50 rounded-xl">
                    <h4 className="font-semibold text-neutral-900 mb-3">Berekende kosten per maand</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {(selectedItem as CalculatorLead).resultaten.vast && (
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-xs text-neutral-500 mb-1">Vast</p>
                          <p className="font-bold text-neutral-900">
                            € {(selectedItem as CalculatorLead).resultaten.vast?.perMaand.toLocaleString("nl-NL")}
                          </p>
                          <p className="text-xs text-neutral-400">
                            € {(selectedItem as CalculatorLead).resultaten.vast?.uurtarief.toFixed(2)}/uur
                          </p>
                        </div>
                      )}
                      {(selectedItem as CalculatorLead).resultaten.uitzend && (
                        <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <p className="text-xs text-orange-600 mb-1">Uitzend</p>
                          <p className="font-bold text-[#F27501]">
                            € {(selectedItem as CalculatorLead).resultaten.uitzend?.perMaand.toLocaleString("nl-NL")}
                          </p>
                          <p className="text-xs text-neutral-400">
                            € {(selectedItem as CalculatorLead).resultaten.uitzend?.uurtarief.toFixed(2)}/uur
                          </p>
                        </div>
                      )}
                      {(selectedItem as CalculatorLead).resultaten.zzp && (
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-xs text-neutral-500 mb-1">ZZP</p>
                          <p className="font-bold text-neutral-900">
                            € {(selectedItem as CalculatorLead).resultaten.zzp?.perMaand.toLocaleString("nl-NL")}
                          </p>
                          <p className="text-xs text-neutral-400">
                            € {(selectedItem as CalculatorLead).resultaten.zzp?.uurtarief.toFixed(2)}/uur
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      (selectedItem as CalculatorLead).email_sent ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {(selectedItem as CalculatorLead).email_sent ? "Email verzonden" : "Geen email verzonden"}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      (selectedItem as CalculatorLead).pdf_downloaded ? "bg-blue-100 text-blue-700" : "bg-neutral-100 text-neutral-600"
                    }`}>
                      {(selectedItem as CalculatorLead).pdf_downloaded ? "PDF gedownload" : "PDF niet gedownload"}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      (selectedItem as CalculatorLead).contacted ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                    }`}>
                      {(selectedItem as CalculatorLead).contacted ? "Gecontacteerd" : "Nog niet gecontacteerd"}
                    </span>
                  </div>

                  {/* Contacted toggle */}
                  <div className="pt-4 border-t border-neutral-100 mt-4">
                    <p className="text-sm text-neutral-500 mb-2">Follow-up emails</p>
                    <button
                      onClick={async () => {
                        const newValue = !(selectedItem as CalculatorLead).contacted;
                        await fetch("/api/admin/data", {
                          method: "POST",
                          headers: await getAuthHeaders(),
                          body: JSON.stringify({
                            action: "update",
                            table: "calculator_leads",
                            id: selectedItem.id,
                            data: { contacted: newValue }
                          }),
                        });
                        fetchData();
                        setSelectedItem({ ...selectedItem, contacted: newValue } as CalculatorLead);
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        (selectedItem as CalculatorLead).contacted
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-orange-500 text-white hover:bg-orange-600"
                      }`}
                    >
                      {(selectedItem as CalculatorLead).contacted
                        ? "✓ Gecontacteerd (follow-ups gestopt)"
                        : "Markeer als gecontacteerd (stop follow-ups)"}
                    </button>
                  </div>
                </>
              )}

              {/* Status Update - not for calculator leads */}
              {detailType !== "calculator" && (
                <div className="pt-4 border-t border-neutral-100">
                  {detailType === "inschrijvingen" ? (
                    <>
                      <p className="text-sm text-neutral-500 mb-2">Onboarding status wijzigen</p>
                      <div className="flex gap-2 flex-wrap mb-4">
                        {([
                          "nieuw",
                          "in_beoordeling",
                          "documenten_opvragen",
                          "wacht_op_kandidaat",
                          "goedgekeurd",
                          "inzetbaar",
                          "afgewezen",
                        ] as OnboardingStatus[]).map((status) => (
                          <button
                            key={status}
                            onClick={() => updateInschrijvingOnboardingStatus(selectedItem as Inschrijving, status)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                              getInschrijvingOnboardingStatus(selectedItem as Inschrijving) === status
                                ? "bg-[#F27501] text-white"
                                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                            }`}
                          >
                            {status === "nieuw" ? "Nieuw" :
                              status === "in_beoordeling" ? "In beoordeling" :
                              status === "documenten_opvragen" ? "Documenten opvragen" :
                              status === "wacht_op_kandidaat" ? "Wacht op kandidaat" :
                              status === "goedgekeurd" ? "Goedgekeurd" :
                              status === "inzetbaar" ? "Inzetbaar" :
                              "Afgewezen"}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => generateKandidaatPortalLink((selectedItem as Inschrijving).id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 font-medium shadow-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Genereer kandidaat portal link (kopiëren)
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Stuur reactie button - alleen voor personeel aanvragen */}
                      {detailType === "aanvragen" && (
                        <div className="mb-4">
                          {!(selectedItem as PersoneelAanvraag & { replied_at?: string }).replied_at ? (
                            <button
                              onClick={async () => {
                                setReplyModal(true);
                                setReplyLoading(true);
                                setReplyDraft("");
                                setReplySubject("");
                                setReplyInquiry(null);
                                try {
                                  const res = await fetch("/api/inquiries/generate-reply", {
                                    method: "POST",
                                    headers: await getAuthHeaders(),
                                    body: JSON.stringify({ inquiry_id: selectedItem.id }),
                                  });
                                  const data = await res.json();
                                  if (data.body) setReplyDraft(data.body);
                                  if (data.subject) setReplySubject(data.subject);
                                  if (data.inquiry) setReplyInquiry(data.inquiry);
                                } catch {
                                  setReplyDraft("Fout bij genereren van reactie.");
                                } finally {
                                  setReplyLoading(false);
                                }
                              }}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#F27501] to-[#d96800] text-white rounded-xl hover:from-[#d96800] hover:to-[#c05e00] font-medium shadow-lg shadow-orange-500/20 transition-all duration-300"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Stuur reactie
                            </button>
                          ) : (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Reactie verstuurd op {new Date((selectedItem as PersoneelAanvraag & { replied_at: string }).replied_at).toLocaleDateString("nl-NL")}
                            </span>
                          )}
                          {(selectedItem as PersoneelAanvraag & { booking_id?: string }).booking_id && (
                            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              Afspraak gepland
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-sm text-neutral-500 mb-2">Status wijzigen</p>
                      <div className="flex gap-2">
                        {(["nieuw", "in_behandeling", "afgehandeld"] as Status[]).map((status) => (
                          <button
                            key={status}
                            onClick={() => updateStatus(
                              detailType === "aanvragen" ? "personeel_aanvragen" : "contact_berichten",
                              selectedItem.id,
                              status
                            )}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                              (selectedItem as PersoneelAanvraag | ContactBericht).status === status
                                ? "bg-[#F27501] text-white"
                                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                            }`}
                          >
                            {status === "nieuw" ? "Nieuw" : status === "in_behandeling" ? "In behandeling" : "Afgehandeld"}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-neutral-100 flex justify-between">
              <button
                onClick={() => deleteItem(
                  detailType === "aanvragen" ? "personeel_aanvragen" :
                  detailType === "inschrijvingen" ? "inschrijvingen" :
                  detailType === "calculator" ? "calculator_leads" : "contact_berichten",
                  selectedItem.id
                )}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                Verwijderen
              </button>
              <button
                onClick={() => setSelectedItem(null)}
                className="px-6 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stuur Reactie Modal */}
      {replyModal && selectedItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setReplyModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Stuur reactie</h3>
                <p className="text-sm text-neutral-500">
                  Naar: {(selectedItem as PersoneelAanvraag).email}
                </p>
              </div>
              <button onClick={() => setReplyModal(false)} className="p-2 hover:bg-neutral-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Aanvraag samenvatting */}
            {replyInquiry && (
              <div className="px-6 pt-4">
                <div className="bg-neutral-50 rounded-xl p-4 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-neutral-500">Bedrijf:</span> <span className="font-medium">{replyInquiry.bedrijfsnaam}</span></div>
                    <div><span className="text-neutral-500">Contact:</span> <span className="font-medium">{replyInquiry.contactpersoon}</span></div>
                    <div><span className="text-neutral-500">Personeel:</span> <span className="font-medium">{replyInquiry.type_personeel?.join(", ")}</span></div>
                    <div><span className="text-neutral-500">Aantal:</span> <span className="font-medium">{replyInquiry.aantal_personen}</span></div>
                    <div><span className="text-neutral-500">Start:</span> <span className="font-medium">{replyInquiry.start_datum}</span></div>
                    <div><span className="text-neutral-500">Locatie:</span> <span className="font-medium">{replyInquiry.locatie}</span></div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 overflow-y-auto max-h-[45vh]">
              {replyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-10 h-10 border-4 border-[#F27501] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-neutral-500 text-sm">Reactie genereren...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Onderwerp</label>
                    <input
                      value={replySubject}
                      onChange={(e) => setReplySubject(e.target.value)}
                      className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Bericht</label>
                    <textarea
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      rows={12}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] outline-none transition-all duration-300 bg-neutral-50 focus:bg-white resize-none text-sm"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t border-neutral-100 flex gap-3 justify-end">
              <button
                onClick={() => setReplyModal(false)}
                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                Annuleren
              </button>
              <button
                disabled={replyLoading || replySending || !replyDraft.trim()}
                onClick={async () => {
                  setReplySending(true);
                  try {
                    const res = await fetch("/api/inquiries/send-reply", {
                      method: "POST",
                      headers: await getAuthHeaders(),
                      body: JSON.stringify({
                        inquiry_id: selectedItem.id,
                        email_body: replyDraft,
                        subject: replySubject,
                      }),
                    });
                    if (!res.ok) {
                      const errorData = await res.json().catch(() => null);
                      const detail = errorData?.error || errorData?.message || `Server fout (${res.status})`;
                      toast.error(`Versturen mislukt: ${detail}`);
                      return;
                    }
                    const data = await res.json();
                    if (data.success) {
                      toast.success(data.message || "Email verstuurd!");
                      setReplyModal(false);
                      fetchData();
                    } else {
                      toast.error(`Versturen mislukt: ${data.error || "Onbekende fout"}`);
                    }
                  } catch (err) {
                    toast.error(`Versturen mislukt: ${err instanceof Error ? err.message : "Netwerkfout — controleer je verbinding"}`);
                  } finally {
                    setReplySending(false);
                  }
                }}
                className="px-6 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
              >
                {replySending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Versturen...
                  </>
                ) : (
                  "Verstuur nu"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
