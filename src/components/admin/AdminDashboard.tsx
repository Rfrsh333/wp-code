"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MedewerkersTab from "./MedewerkersTab";
import DienstenTab from "./DienstenTab";
import UrenTab from "./UrenTab";
import FacturenTab from "./FacturenTab";
import StatsTab from "./StatsTab";

type Tab = "overzicht" | "stats" | "aanvragen" | "inschrijvingen" | "contact" | "calculator" | "medewerkers" | "diensten" | "uren" | "facturen";
type Status = "nieuw" | "in_behandeling" | "afgehandeld";

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
  beschikbaarheid?: { [key: string]: string[] };
  beschikbaar_vanaf?: string;
  max_uren_per_week?: number;
  // Lead tracking
  lead_source?: string;
  campaign_name?: string;
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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overzicht");
  const [zoekQuery, setZoekQuery] = useState("");
  const [zoekResultaten, setZoekResultaten] = useState<{ medewerkers: any[]; diensten: any[]; klanten: any[] } | null>(null);
  const [zoekOpen, setZoekOpen] = useState(false);
  const [leadSourceFilter, setLeadSourceFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PersoneelAanvraag | Inschrijving | ContactBericht | CalculatorLead | null>(null);
  const [detailType, setDetailType] = useState<Tab | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

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
      await supabase.from(table).delete().in("id", Array.from(selectedIds));
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

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch all data
    const [aanvragenRes, inschrijvingenRes, contactRes, calculatorRes] = await Promise.all([
      supabase.from("personeel_aanvragen").select("*").order("created_at", { ascending: false }),
      supabase.from("inschrijvingen").select("*").order("created_at", { ascending: false }),
      supabase.from("contact_berichten").select("*").order("created_at", { ascending: false }),
      supabase.from("calculator_leads").select("*").order("created_at", { ascending: false }),
    ]);

    if (aanvragenRes.data) setAanvragen(aanvragenRes.data);
    if (inschrijvingenRes.data) setInschrijvingen(inschrijvingenRes.data);
    if (contactRes.data) setContactBerichten(contactRes.data);
    if (calculatorRes.data) setCalculatorLeads(calculatorRes.data);

    // Calculate stats
    setStats({
      aanvragen: {
        total: aanvragenRes.data?.length || 0,
        nieuw: aanvragenRes.data?.filter((a) => a.status === "nieuw").length || 0,
      },
      inschrijvingen: {
        total: inschrijvingenRes.data?.length || 0,
        nieuw: inschrijvingenRes.data?.filter((i) => i.status === "nieuw").length || 0,
      },
      contact: {
        total: contactRes.data?.length || 0,
        nieuw: contactRes.data?.filter((c) => c.status === "nieuw").length || 0,
      },
      calculator: {
        total: calculatorRes.data?.length || 0,
        downloaded: calculatorRes.data?.filter((c) => c.pdf_downloaded).length || 0,
      },
    });

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh elke 30 seconden
    const interval = setInterval(() => {
      fetchData();
    }, 30000); // 30 seconden

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const updateStatus = async (table: string, id: string, status: Status) => {
    await supabase.from(table).update({ status }).eq("id", id);
    fetchData();
    setSelectedItem(null);
  };

  const deleteItem = async (table: string, id: string) => {
    if (confirm("Weet je zeker dat je dit item wilt verwijderen?")) {
      await supabase.from(table).delete().eq("id", id);
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
      label: "Uren",
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
              onClick={() => { setActiveTab(tab.id); setSelectedIds(new Set()); }}
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
          <Link
            href="/admin/leads"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm font-medium">Leads Import</span>
          </Link>
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
      <main className="flex-1 p-8 overflow-auto relative">
        {/* Refresh Button - Floating */}
        <button
          onClick={() => {
            fetchData();
            alert("Dashboard vernieuwd! ✅");
          }}
          className="fixed bottom-8 right-8 bg-[#F27501] text-white p-4 rounded-full shadow-lg hover:bg-[#EA580C] transition-all duration-300 hover:scale-110 z-50 group"
          title="Ververs dashboard"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-neutral-900 text-white text-xs px-3 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Ververs data
          </span>
        </button>

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

                {/* Recent Activity */}
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

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full">
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
                      {aanvragen
                        .filter(a =>
                          (leadSourceFilter === "all" || a.lead_source === leadSourceFilter) &&
                          (campaignFilter === "all" || a.campaign_name === campaignFilter)
                        )
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
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => { setSelectedItem(item); setDetailType("aanvragen"); }}
                              className="text-[#F27501] hover:text-[#d96800] font-medium text-sm"
                            >
                              Bekijken
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {aanvragen.length === 0 && (
                    <div className="text-center py-12 text-neutral-500">
                      Geen aanvragen gevonden
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inschrijvingen Tab */}
            {activeTab === "inschrijvingen" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-neutral-900">Inschrijvingen</h2>
                  <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                      <button onClick={() => deleteSelected("inschrijvingen")} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Verwijder ({selectedIds.size})
                      </button>
                    )}
                    <button onClick={() => exportSelected(inschrijvingen, "inschrijvingen")} className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      {selectedIds.size > 0 ? `Exporteer (${selectedIds.size})` : "Exporteer alle"}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-neutral-50 border-b border-neutral-100">
                      <tr>
                        <th className="px-6 py-4"><input type="checkbox" onChange={() => selectAll(inschrijvingen.map(i => i.id))} checked={selectedIds.size === inschrijvingen.length && inschrijvingen.length > 0} className="w-4 h-4 rounded" /></th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Naam</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Contact</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Locatie</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Type</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Datum</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Status</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-neutral-600">Acties</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {inschrijvingen.map((item) => (
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
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => { setSelectedItem(item); setDetailType("inschrijvingen"); }}
                              className="text-[#F27501] hover:text-[#d96800] font-medium text-sm"
                            >
                              Bekijken
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {inschrijvingen.length === 0 && (
                    <div className="text-center py-12 text-neutral-500">
                      Geen inschrijvingen gevonden
                    </div>
                  )}
                </div>
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

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full">
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

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full">
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
                </>
              )}

              {detailType === "inschrijvingen" && (
                <>
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
                      <div className="mt-2 space-y-1 text-sm">
                        {Object.entries((selectedItem as Inschrijving).beschikbaarheid || {}).map(([dag, slots]) =>
                          slots.length > 0 && (
                            <div key={dag}><span className="font-medium capitalize">{dag}:</span> {slots.join(', ')}</div>
                          )
                        )}
                      </div>
                    </div>
                  )}
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
                        await supabase
                          .from("calculator_leads")
                          .update({ contacted: newValue })
                          .eq("id", selectedItem.id);
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
                  <p className="text-sm text-neutral-500 mb-2">Status wijzigen</p>
                  <div className="flex gap-2">
                    {(["nieuw", "in_behandeling", "afgehandeld"] as Status[]).map((status) => (
                      <button
                        key={status}
                        onClick={() => updateStatus(
                          detailType === "aanvragen" ? "personeel_aanvragen" :
                          detailType === "inschrijvingen" ? "inschrijvingen" : "contact_berichten",
                          selectedItem.id,
                          status
                        )}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                          (selectedItem as PersoneelAanvraag | Inschrijving | ContactBericht).status === status
                            ? "bg-[#F27501] text-white"
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        }`}
                      >
                        {status === "nieuw" ? "Nieuw" : status === "in_behandeling" ? "In behandeling" : "Afgehandeld"}
                      </button>
                    ))}
                  </div>
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
    </div>
  );
}
