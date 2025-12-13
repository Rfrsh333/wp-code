"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Tab = "overzicht" | "aanvragen" | "inschrijvingen" | "contact";
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
}

interface Stats {
  aanvragen: { total: number; nieuw: number };
  inschrijvingen: { total: number; nieuw: number };
  contact: { total: number; nieuw: number };
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overzicht");
  const [stats, setStats] = useState<Stats>({
    aanvragen: { total: 0, nieuw: 0 },
    inschrijvingen: { total: 0, nieuw: 0 },
    contact: { total: 0, nieuw: 0 },
  });
  const [aanvragen, setAanvragen] = useState<PersoneelAanvraag[]>([]);
  const [inschrijvingen, setInschrijvingen] = useState<Inschrijving[]>([]);
  const [contactBerichten, setContactBerichten] = useState<ContactBericht[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PersoneelAanvraag | Inschrijving | ContactBericht | null>(null);
  const [detailType, setDetailType] = useState<Tab | null>(null);
  const router = useRouter();

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch all data
    const [aanvragenRes, inschrijvingenRes, contactRes] = await Promise.all([
      supabase.from("personeel_aanvragen").select("*").order("created_at", { ascending: false }),
      supabase.from("inschrijvingen").select("*").order("created_at", { ascending: false }),
      supabase.from("contact_berichten").select("*").order("created_at", { ascending: false }),
    ]);

    if (aanvragenRes.data) setAanvragen(aanvragenRes.data);
    if (inschrijvingenRes.data) setInschrijvingen(inschrijvingenRes.data);
    if (contactRes.data) setContactBerichten(contactRes.data);

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
    });

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
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
              onClick={() => setActiveTab(tab.id)}
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
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                  <button
                    onClick={() => exportToCSV(aanvragen, "personeel_aanvragen")}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exporteer CSV
                  </button>
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
                      {aanvragen.map((item) => (
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
                  <button
                    onClick={() => exportToCSV(inschrijvingen, "inschrijvingen")}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exporteer CSV
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-neutral-50 border-b border-neutral-100">
                      <tr>
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
                  <button
                    onClick={() => exportToCSV(contactBerichten, "contact_berichten")}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exporteer CSV
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-neutral-50 border-b border-neutral-100">
                      <tr>
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

              {/* Status Update */}
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
                        selectedItem.status === status
                          ? "bg-[#F27501] text-white"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {status === "nieuw" ? "Nieuw" : status === "in_behandeling" ? "In behandeling" : "Afgehandeld"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-100 flex justify-between">
              <button
                onClick={() => deleteItem(
                  detailType === "aanvragen" ? "personeel_aanvragen" :
                  detailType === "inschrijvingen" ? "inschrijvingen" : "contact_berichten",
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
