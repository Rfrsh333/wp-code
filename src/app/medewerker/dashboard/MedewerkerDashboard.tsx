"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PortalLayout from "@/components/portal/PortalLayout";
import type { PortalTab } from "@/components/portal/PortalLayout";
import BeschikbaarheidForm from "@/components/medewerker/BeschikbaarheidForm";
import DienstenTab from "@/components/medewerker/DienstenTab";
import UrenTab from "@/components/medewerker/UrenTab";
import ProfielPage from "@/components/medewerker/ProfielPage";
import FinancieelOverzicht from "@/components/medewerker/FinancieelOverzicht";
import DocumentenPage from "@/components/medewerker/DocumentenPage";
import { useToast } from "@/components/ui/Toast";

interface Medewerker {
  id: string;
  naam: string;
  email: string;
  telefoon?: string | null;
  functie: string[];
  profile_photo_url?: string | null;
  geboortedatum?: string | null;
  stad?: string | null;
  bsn_geverifieerd?: boolean;
  factuur_adres?: string | null;
  factuur_postcode?: string | null;
  factuur_stad?: string | null;
  btw_nummer?: string | null;
  iban?: string | null;
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

type TabId = "diensten" | "uren" | "beschikbaarheid" | "profiel" | "financieel" | "documenten";

export default function MedewerkerDashboard({ medewerker }: { medewerker: Medewerker }) {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("diensten");

  // Data state
  const [diensten, setDiensten] = useState<Dienst[]>([]);
  const [aanpassingen, setAanpassingen] = useState<KlantAanpassing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(medewerker.profile_photo_url || null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Uren modal state
  const [urenModal, setUrenModal] = useState<Dienst | null>(null);
  const [urenForm, setUrenForm] = useState({ start: "", eind: "", pauze: "0" });

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const dienstenRes = await fetch("/api/medewerker/diensten");
      const dienstenData = await dienstenRes.json();
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Alleen JPG en PNG bestanden zijn toegestaan");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bestand mag maximaal 5MB zijn");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/medewerker/profile", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload mislukt");
      setProfilePhoto(data.profile_photo_url);
      toast.success("Profielfoto geüpload!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload mislukt");
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handlePhotoDelete = async () => {
    setIsUploadingPhoto(true);
    try {
      const res = await fetch("/api/medewerker/profile", { method: "DELETE" });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      setProfilePhoto(null);
      toast.success("Profielfoto verwijderd");
    } catch {
      toast.error("Kon foto niet verwijderen");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/medewerker/logout", { method: "POST" });
    router.push("/medewerker/login");
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });

  const beschikbareDiensten = diensten.filter((d) => !d.aangemeld);

  const tabs: PortalTab[] = [
    {
      id: "diensten",
      label: "Diensten",
      badge: beschikbareDiensten.length,
      group: "WERK",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    },
    {
      id: "uren",
      label: "Uren",
      badge: aanpassingen.length,
      group: "WERK",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      id: "beschikbaarheid",
      label: "Beschikbaarheid",
      group: "WERK",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    },
    {
      id: "profiel",
      label: "Mijn Profiel",
      group: "ACCOUNT",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    },
    {
      id: "financieel",
      label: "Financieel Overzicht",
      group: "ACCOUNT",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      id: "documenten",
      label: "Documenten",
      group: "DOCUMENTEN",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
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
          {activeTab === "diensten" && (
            <DienstenTab
              diensten={diensten}
              onAanmelden={aanmelden}
              onAfmelden={afmelden}
              onUrenInvullen={openUrenModal}
            />
          )}

          {activeTab === "uren" && (
            <UrenTab
              aanpassingen={aanpassingen}
              onAccepteer={accepteerAanpassing}
              onWeiger={weigerAanpassing}
            />
          )}

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

          {activeTab === "profiel" && (
            <ProfielPage
              medewerker={medewerker}
              onPhotoUpload={handlePhotoUpload}
              onPhotoDelete={handlePhotoDelete}
              isUploadingPhoto={isUploadingPhoto}
              profilePhoto={profilePhoto}
            />
          )}

          {activeTab === "financieel" && <FinancieelOverzicht />}

          {activeTab === "documenten" && <DocumentenPage />}
        </>
      )}

      {/* Uren Modal */}
      {urenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-4 sm:p-6">
            <h3 className="text-lg font-bold mb-4">Uren invullen</h3>
            <p className="text-sm text-neutral-500 mb-4">{urenModal.klant_naam} - {formatDate(urenModal.datum)}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Starttijd</label>
                <input type="time" value={urenForm.start} onChange={(e) => setUrenForm({ ...urenForm, start: e.target.value })} className="w-full px-3 py-3 border rounded-lg text-base" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Eindtijd</label>
                <input type="time" value={urenForm.eind} onChange={(e) => setUrenForm({ ...urenForm, eind: e.target.value })} className="w-full px-3 py-3 border rounded-lg text-base" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pauze (minuten)</label>
                <input type="number" value={urenForm.pauze} onChange={(e) => setUrenForm({ ...urenForm, pauze: e.target.value })} className="w-full px-3 py-3 border rounded-lg text-base" min="0" step="5" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setUrenModal(null)} className="flex-1 py-3 border rounded-lg">Annuleren</button>
              <button onClick={submitUren} className="flex-1 py-3 bg-[#F27501] text-white rounded-lg font-medium">Versturen</button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
