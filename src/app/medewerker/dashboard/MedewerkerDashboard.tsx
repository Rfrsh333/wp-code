"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PortalLayout from "@/components/portal/PortalLayout";
import type { PortalTab } from "@/components/portal/PortalLayout";
import EmptyState from "@/components/ui/EmptyState";
import BeschikbaarheidForm from "@/components/medewerker/BeschikbaarheidForm";
import { useToast } from "@/components/ui/Toast";

interface Medewerker {
  id: string;
  naam: string;
  email: string;
  functie: string[];
}

interface Shift {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  wage: number;
  seats: number;
  status: string;
  company?: { name: string; logo_url: string | null };
  has_applied?: boolean;
  application_status?: string;
}

interface Application {
  id: string;
  shift_id: string;
  status: string;
  applied_at: string;
  shift?: Shift;
}

interface Dienst {
  id: string;
  klant_naam: string;
  locatie: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  functie: string;
  uurtarief: number | null;
  afbeelding: string | null;
  status: string;
  aangemeld?: boolean;
  aanmelding_id?: string;
  aanmelding_status?: string;
  uren_status?: string;
}

interface KlantAanpassing {
  id: string;
  start_tijd: string;
  eind_tijd: string;
  pauze_minuten: number;
  gewerkte_uren: number;
  klant_start_tijd: string;
  klant_eind_tijd: string;
  klant_pauze_minuten: number;
  klant_gewerkte_uren: number;
  klant_opmerking: string;
  dienst_datum: string;
  klant_naam: string;
  locatie: string;
}

type TabId = "shifts" | "diensten" | "uren" | "beschikbaarheid" | "profiel";

export default function MedewerkerDashboard({ medewerker }: { medewerker: Medewerker }) {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("shifts");

  // Shifts state
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [coverText, setCoverText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Diensten state
  const [diensten, setDiensten] = useState<Dienst[]>([]);
  const [aanpassingen, setAanpassingen] = useState<KlantAanpassing[]>([]);
  const [urenModal, setUrenModal] = useState<Dienst | null>(null);
  const [urenForm, setUrenForm] = useState({ start: "", eind: "", pauze: "0" });

  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [shiftsRes, dienstenRes] = await Promise.all([
        fetch("/api/medewerker/shifts"),
        fetch("/api/medewerker/diensten"),
      ]);
      const shiftsData = await shiftsRes.json();
      const dienstenData = await dienstenRes.json();
      setShifts(shiftsData.shifts || []);
      setApplications(shiftsData.applications || []);
      setDiensten(dienstenData.diensten || []);
      setAanpassingen(dienstenData.aanpassingen || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Kon data niet laden");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Shifts actions
  const handleApply = async (shiftId: string) => {
    if (!coverText.trim()) {
      toast.warning("Motivatie is verplicht");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/medewerker/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", shift_id: shiftId, cover_text: coverText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sollicitatie mislukt");
      toast.success("Sollicitatie verstuurd!");
      setCoverText("");
      setSelectedShift(null);
      await fetchAllData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Er ging iets mis");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async (applicationId: string) => {
    if (!window.confirm("Weet je zeker dat je je sollicitatie wilt intrekken?")) return;
    try {
      const res = await fetch("/api/medewerker/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw", application_id: applicationId }),
      });
      if (!res.ok) throw new Error("Intrekken mislukt");
      toast.success("Sollicitatie ingetrokken");
      await fetchAllData();
    } catch {
      toast.error("Kon sollicitatie niet intrekken");
    }
  };

  // Diensten actions
  const aanmelden = async (dienstId: string) => {
    await fetch("/api/medewerker/diensten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "aanmelden", dienst_id: dienstId }),
    });
    toast.success("Aangemeld voor dienst");
    fetchAllData();
  };

  const afmelden = async (dienstId: string) => {
    await fetch("/api/medewerker/diensten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "afmelden", dienst_id: dienstId }),
    });
    toast.info("Afgemeld voor dienst");
    fetchAllData();
  };

  const openUrenModal = (dienst: Dienst) => {
    setUrenForm({ start: dienst.start_tijd.slice(0, 5), eind: dienst.eind_tijd.slice(0, 5), pauze: "0" });
    setUrenModal(dienst);
  };

  const submitUren = async () => {
    if (!urenModal?.aanmelding_id) return;
    const start = urenForm.start.split(":").map(Number);
    const eind = urenForm.eind.split(":").map(Number);
    const uren = (eind[0] * 60 + eind[1] - start[0] * 60 - start[1] - parseInt(urenForm.pauze)) / 60;
    await fetch("/api/medewerker/diensten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "uren_indienen",
        aanmelding_id: urenModal.aanmelding_id,
        data: { start: urenForm.start, eind: urenForm.eind, pauze: parseInt(urenForm.pauze), uren: Math.round(uren * 100) / 100 },
      }),
    });
    toast.success("Uren ingediend");
    setUrenModal(null);
    fetchAllData();
  };

  const accepteerAanpassing = async (id: string) => {
    await fetch("/api/medewerker/diensten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accepteer_aanpassing", uren_id: id }),
    });
    toast.success("Aanpassing geaccepteerd");
    fetchAllData();
  };

  const weigerAanpassing = async (id: string) => {
    await fetch("/api/medewerker/diensten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "weiger_aanpassing", uren_id: id }),
    });
    toast.info("Aanpassing geweigerd");
    fetchAllData();
  };

  const handleLogout = async () => {
    await fetch("/api/medewerker/logout", { method: "POST" });
    router.push("/medewerker/login");
  };

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });

  const formatWage = (cents: number) => `€${cents.toFixed(2)}`;

  const availableShifts = shifts.filter((s) => s.status === "open" && !s.has_applied);
  const mijnDiensten = diensten.filter((d) => d.aangemeld);
  const beschikbareDiensten = diensten.filter((d) => !d.aangemeld);

  const tabs: PortalTab[] = [
    {
      id: "shifts",
      label: "Shifts",
      badge: availableShifts.length,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    },
    {
      id: "diensten",
      label: "Diensten",
      badge: beschikbareDiensten.length,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    },
    {
      id: "uren",
      label: "Uren",
      badge: aanpassingen.length,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      id: "beschikbaarheid",
      label: "Beschikbaarheid",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    },
    {
      id: "profiel",
      label: "Profiel",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    },
  ];

  return (
    <PortalLayout
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as TabId)}
      portalType="medewerker"
      userName={medewerker.naam}
      onLogout={handleLogout}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* === SHIFTS TAB === */}
          {activeTab === "shifts" && (
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">Beschikbare Shifts</h2>
              {availableShifts.length === 0 ? (
                <EmptyState
                  title="Geen beschikbare shifts"
                  description="Er zijn op dit moment geen openstaande shifts. Check later opnieuw."
                  icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableShifts.map((shift) => (
                    <div key={shift.id} className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-neutral-900">{shift.title}</h3>
                          <p className="text-sm text-neutral-600">{shift.company?.name}</p>
                        </div>
                        <span className="px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">Open</span>
                      </div>
                      <div className="space-y-2 mb-4 text-sm text-neutral-600">
                        <p>📍 {shift.location || "Locatie volgt"}</p>
                        <p>🕐 {formatDateTime(shift.start_at)}</p>
                        <p>💰 <span className="font-semibold text-neutral-900">{formatWage(shift.wage)}/uur</span></p>
                        <p>👥 {shift.seats} plekken</p>
                      </div>
                      {shift.description && <p className="text-sm text-neutral-600 mb-4 line-clamp-2">{shift.description}</p>}
                      <button onClick={() => setSelectedShift(shift)} className="w-full px-4 py-2 bg-[#F27501] hover:bg-[#d96800] text-white font-semibold rounded-xl transition-colors">
                        Solliciteer
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* My Applications */}
              {applications.length > 0 && (
                <div className="mt-10">
                  <h3 className="text-xl font-bold text-neutral-900 mb-4">Mijn Sollicitaties ({applications.length})</h3>
                  <div className="space-y-4">
                    {applications.map((app) => (
                      <div key={app.id} className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-bold text-neutral-900">{app.shift?.title}</h4>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                app.status === "accepted" ? "bg-green-100 text-green-700" :
                                app.status === "rejected" ? "bg-red-100 text-red-700" :
                                "bg-yellow-100 text-yellow-700"
                              }`}>
                                {app.status === "accepted" ? "Geaccepteerd" : app.status === "rejected" ? "Afgewezen" : "In behandeling"}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-600">{app.shift?.company?.name} · {app.shift?.location}</p>
                          </div>
                          {app.status === "pending" && (
                            <button onClick={() => handleWithdraw(app.id)} className="ml-4 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              Intrekken
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === DIENSTEN TAB === */}
          {activeTab === "diensten" && (
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">Mijn Diensten</h2>
              {diensten.length === 0 ? (
                <EmptyState
                  title="Nog geen diensten"
                  description="Je hebt nog geen diensten. Bekijk beschikbare shifts om je aan te melden."
                  actionLabel="Bekijk shifts"
                  onAction={() => setActiveTab("shifts")}
                  icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {diensten.map((dienst) => (
                    <div key={dienst.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                      <div className="relative aspect-[16/10] bg-neutral-100">
                        {dienst.afbeelding ? (
                          <Image src={dienst.afbeelding} alt={dienst.klant_naam} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50">
                            <svg className="w-16 h-16 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                        )}
                        <span className="absolute top-3 left-3 bg-[#F27501] text-white text-xs font-semibold px-3 py-1 rounded-full capitalize">{dienst.functie}</span>
                        {dienst.aanmelding_status && (
                          <span className={`absolute top-3 right-3 text-xs font-semibold px-3 py-1 rounded-full ${
                            dienst.aanmelding_status === "geaccepteerd" ? "bg-green-500 text-white" :
                            dienst.aanmelding_status === "afgewezen" ? "bg-red-500 text-white" : "bg-yellow-500 text-white"
                          }`}>{dienst.aanmelding_status}</span>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-lg text-neutral-900 mb-1">{dienst.klant_naam}</h3>
                        <p className="text-neutral-500 text-sm mb-3 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {dienst.locatie}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-neutral-600 mb-4">
                          <span>{formatDate(dienst.datum)}</span>
                          <span>{dienst.start_tijd.slice(0, 5)} - {dienst.eind_tijd.slice(0, 5)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          {dienst.uurtarief && <span className="text-[#F27501] font-bold">€{dienst.uurtarief}/uur</span>}
                          <div className="ml-auto">
                            {!dienst.aangemeld ? (
                              <button onClick={() => aanmelden(dienst.id)} className="px-5 py-2 bg-[#F27501] text-white rounded-xl text-sm font-semibold hover:bg-[#d96800] transition-colors">Aanmelden</button>
                            ) : dienst.aanmelding_status === "aangemeld" ? (
                              <button onClick={() => afmelden(dienst.id)} className="px-5 py-2 bg-neutral-200 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-300 transition-colors">Afmelden</button>
                            ) : dienst.aanmelding_status === "geaccepteerd" && !dienst.uren_status && new Date(dienst.datum) <= new Date() ? (
                              <button onClick={() => openUrenModal(dienst)} className="px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">Uren invullen</button>
                            ) : dienst.uren_status ? (
                              <span className={`px-3 py-1.5 rounded-xl text-xs font-medium ${dienst.uren_status === "goedgekeurd" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                Uren {dienst.uren_status}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === UREN TAB === */}
          {activeTab === "uren" && (
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">Uren & Aanpassingen</h2>
              {aanpassingen.length === 0 ? (
                <EmptyState
                  title="Geen openstaande uren-aanpassingen"
                  description="Er zijn geen klant-aanpassingen die je aandacht nodig hebben."
                  icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
              ) : (
                <div className="space-y-4">
                  {aanpassingen.map((a) => (
                    <div key={a.id} className="bg-white rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-neutral-900">{a.klant_naam}</h3>
                          <p className="text-sm text-neutral-500">{a.locatie} • {formatDate(a.dienst_datum)}</p>
                        </div>
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Klant aanpassing</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-neutral-50 rounded-xl p-3">
                          <p className="text-xs text-neutral-500 mb-1">Jouw uren (origineel)</p>
                          <p className="font-medium">{a.start_tijd?.slice(0,5)} - {a.eind_tijd?.slice(0,5)}</p>
                          <p className="text-sm text-neutral-600">{a.pauze_minuten}m pauze = {a.gewerkte_uren} uur</p>
                        </div>
                        <div className="bg-orange-50 rounded-xl p-3 border-2 border-orange-200">
                          <p className="text-xs text-orange-600 mb-1">Klant correctie</p>
                          <p className="font-medium text-orange-700">{a.klant_start_tijd?.slice(0,5)} - {a.klant_eind_tijd?.slice(0,5)}</p>
                          <p className="text-sm text-orange-600">{a.klant_pauze_minuten}m pauze = {a.klant_gewerkte_uren} uur</p>
                        </div>
                      </div>
                      {a.klant_opmerking && (
                        <div className="bg-neutral-50 rounded-xl p-3 mb-4">
                          <p className="text-xs text-neutral-500 mb-1">Reden van klant</p>
                          <p className="text-sm">{a.klant_opmerking}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => accepteerAanpassing(a.id)} className="flex-1 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">Akkoord</button>
                        <button onClick={() => weigerAanpassing(a.id)} className="flex-1 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600">Niet akkoord</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === BESCHIKBAARHEID TAB === */}
          {activeTab === "beschikbaarheid" && (
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">Mijn Beschikbaarheid</h2>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <BeschikbaarheidForm
                  onSave={async (data) => {
                    await fetch("/api/medewerker/beschikbaarheid", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: medewerker.email, ...data }),
                    });
                    toast.success("Beschikbaarheid opgeslagen");
                  }}
                />
              </div>
            </div>
          )}

          {/* === PROFIEL TAB === */}
          {activeTab === "profiel" && (
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">Mijn Profiel</h2>
              <div className="bg-white rounded-2xl p-6 shadow-sm max-w-lg">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-[#F27501]/10 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl font-bold text-[#F27501]">{medewerker.naam.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-neutral-900">{medewerker.naam}</h3>
                    <p className="text-neutral-500">{medewerker.email}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3 border-b border-neutral-100">
                    <span className="text-sm text-neutral-500">Functies</span>
                    <span className="text-sm font-medium text-neutral-900">{medewerker.functie.join(", ") || "Niet ingesteld"}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-neutral-100">
                    <span className="text-sm text-neutral-500">Actieve diensten</span>
                    <span className="text-sm font-medium text-neutral-900">{mijnDiensten.length}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-neutral-500">Sollicitaties</span>
                    <span className="text-sm font-medium text-neutral-900">{applications.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Sollicitatie Modal */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">{selectedShift.title}</h2>
                <p className="text-neutral-600">{selectedShift.company?.name}</p>
              </div>
              <button onClick={() => { setSelectedShift(null); setCoverText(""); }} className="text-neutral-400 hover:text-neutral-600 text-2xl leading-none">×</button>
            </div>
            <div className="space-y-2 mb-6 text-neutral-600">
              <p>📍 {selectedShift.location || "Locatie volgt"}</p>
              <p>🕐 {formatDateTime(selectedShift.start_at)}</p>
              <p>💰 <span className="font-semibold text-neutral-900">{formatWage(selectedShift.wage)} per uur</span></p>
              <p>👥 {selectedShift.seats} plekken beschikbaar</p>
            </div>
            {selectedShift.description && (
              <div className="mb-6 p-4 bg-neutral-50 rounded-xl">
                <p className="text-sm text-neutral-700">{selectedShift.description}</p>
              </div>
            )}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 mb-2">Motivatie *</label>
              <textarea
                value={coverText}
                onChange={(e) => setCoverText(e.target.value)}
                placeholder="Vertel kort waarom je geschikt bent voor deze shift"
                rows={5}
                className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#F27501] focus:border-transparent resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setSelectedShift(null); setCoverText(""); }} className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 font-semibold rounded-xl hover:bg-neutral-50 transition-colors">Annuleren</button>
              <button onClick={() => handleApply(selectedShift.id)} disabled={isSubmitting || !coverText.trim()} className="flex-1 px-6 py-3 bg-[#F27501] hover:bg-[#d96800] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? "Versturen..." : "Solliciteer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uren Modal */}
      {urenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold mb-4">Uren invullen</h3>
            <p className="text-sm text-neutral-500 mb-4">{urenModal.klant_naam} - {formatDate(urenModal.datum)}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Starttijd</label>
                <input type="time" value={urenForm.start} onChange={(e) => setUrenForm({ ...urenForm, start: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Eindtijd</label>
                <input type="time" value={urenForm.eind} onChange={(e) => setUrenForm({ ...urenForm, eind: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pauze (minuten)</label>
                <input type="number" value={urenForm.pauze} onChange={(e) => setUrenForm({ ...urenForm, pauze: e.target.value })} className="w-full px-3 py-2 border rounded-lg" min="0" step="5" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setUrenModal(null)} className="flex-1 py-2 border rounded-lg">Annuleren</button>
              <button onClick={submitUren} className="flex-1 py-2 bg-[#F27501] text-white rounded-lg font-medium">Versturen</button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
