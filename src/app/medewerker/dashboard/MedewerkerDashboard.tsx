"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MedewerkerLayout from "@/components/medewerker/MedewerkerLayout";
import BeschikbaarheidForm from "@/components/medewerker/BeschikbaarheidForm";
import DienstenTab from "@/components/medewerker/DienstenTab";
import UrenTab from "@/components/medewerker/UrenTab";
import ProfielPage from "@/components/medewerker/ProfielPage";
import FinancieelOverzicht from "@/components/medewerker/FinancieelOverzicht";
import DocumentenPage from "@/components/medewerker/DocumentenPage";
import ReferralPage from "@/components/medewerker/ReferralPage";
import SwipeShiftStack from "@/components/medewerker/SwipeShiftStack";
import DashboardHome from "@/components/medewerker/DashboardHome";
import DienstenFilters from "@/components/medewerker/DienstenFilters";
import { useToast } from "@/components/ui/Toast";
import { useMedewerkerDiensten, useDienstAction, usePhotoUpload, usePhotoDelete, useBoeteBetaal, useBeschikbaarheidSave } from "@/hooks/queries/useMedewerkerQueries";
import { useMedewerkerRealtime } from "@/hooks/queries/useMedewerkerRealtime";

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
  check_in_at?: string | null;
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

interface PortalTab {
  id: string;
  label: string;
  group?: string;
  icon?: React.ReactNode;
  badge?: number;
}

type TabId = "home" | "diensten" | "uren" | "beschikbaarheid" | "profiel" | "financieel" | "documenten" | "referral";

export default function MedewerkerDashboard({ medewerker }: { medewerker: Medewerker }) {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [filterQuery, setFilterQuery] = useState<string>('');

  // React Query data fetching
  const { data: dienstenData, isLoading } = useMedewerkerDiensten(filterQuery);
  const diensten: Dienst[] = dienstenData?.diensten ?? [];
  const aanpassingen: KlantAanpassing[] = dienstenData?.aanpassingen ?? [];
  const vervangingVerzoeken = dienstenData?.vervangingVerzoeken ?? [];
  const accountGepauzeerd = dienstenData?.accountGepauzeerd ?? false;

  // Realtime subscriptions
  useMedewerkerRealtime(medewerker.id);

  // Mutations
  const dienstAction = useDienstAction();
  const photoUpload = usePhotoUpload();
  const photoDelete = usePhotoDelete();
  const boeteBetaal = useBoeteBetaal();
  const beschikbaarheidSave = useBeschikbaarheidSave();

  // Profile photo state (local for immediate UI feedback)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(medewerker.profile_photo_url || null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Uren modal state
  const [urenModal, setUrenModal] = useState<Dienst | null>(null);
  const [urenForm, setUrenForm] = useState({ start: "", eind: "", pauze: "0" });

  // Diensten actions
  const aanmelden = async (dienstId: string) => {
    dienstAction.mutate(
      { action: "aanmelden", dienst_id: dienstId },
      { onSuccess: () => toast.success("Aangemeld voor dienst") }
    );
  };

  const afmelden = async (dienstId: string) => {
    dienstAction.mutate(
      { action: "afmelden", dienst_id: dienstId },
      { onSuccess: () => toast.info("Afgemeld voor dienst") }
    );
  };

  const annuleerGeaccepteerd = async (aanmeldingId: string, dienstId: string) => {
    dienstAction.mutate(
      { action: "annuleer_geaccepteerd", aanmelding_id: aanmeldingId, dienst_id: dienstId },
      {
        onSuccess: (result) => {
          if (result.vervanging) {
            toast.info("Vervanging wordt gezocht. De dienst is open voor andere medewerkers.");
          } else {
            toast.success("Dienst geannuleerd");
          }
        },
        onError: (error) => {
          toast.error(error.message || "Kon niet annuleren");
        },
      }
    );
  };

  const acceptVervanging = async (origineleAanmeldingId: string, vervangingAanmeldingId: string) => {
    dienstAction.mutate(
      { action: "accept_vervanging", aanmelding_id: origineleAanmeldingId, data: { vervanging_aanmelding_id: vervangingAanmeldingId } },
      {
        onSuccess: () => toast.success("Vervanging geaccepteerd"),
        onError: (error) => toast.error(error.message || "Kon vervanging niet accepteren"),
      }
    );
  };

  const afwijsVervanging = async (vervangingAanmeldingId: string) => {
    dienstAction.mutate(
      { action: "afwijs_vervanging", data: { vervanging_aanmelding_id: vervangingAanmeldingId } },
      {
        onSuccess: () => toast.info("Vervanging afgewezen"),
        onError: (error) => toast.error(error.message || "Kon vervanging niet afwijzen"),
      }
    );
  };

  const openUrenModal = (dienst: Dienst) => {
    if (!dienst.check_in_at) {
      toast.error("Je moet eerst worden ingecheckt door de klant via QR-scan voordat je uren kunt indienen");
      return;
    }
    setUrenForm({ start: dienst.start_tijd.slice(0, 5), eind: dienst.eind_tijd.slice(0, 5), pauze: "0" });
    setUrenModal(dienst);
  };

  const submitUren = async () => {
    if (!urenModal?.aanmelding_id) return;
    const start = urenForm.start.split(":").map(Number);
    const eind = urenForm.eind.split(":").map(Number);
    const uren = (eind[0] * 60 + eind[1] - start[0] * 60 - start[1] - parseInt(urenForm.pauze)) / 60;
    dienstAction.mutate(
      {
        action: "uren_indienen",
        aanmelding_id: urenModal.aanmelding_id,
        data: { start: urenForm.start, eind: urenForm.eind, pauze: parseInt(urenForm.pauze), uren: Math.round(uren * 100) / 100 },
      },
      {
        onSuccess: () => {
          toast.success("Uren ingediend");
          setUrenModal(null);
        },
      }
    );
  };

  const accepteerAanpassing = async (id: string) => {
    dienstAction.mutate(
      { action: "accepteer_aanpassing", uren_id: id },
      { onSuccess: () => toast.success("Aanpassing geaccepteerd") }
    );
  };

  const weigerAanpassing = async (id: string) => {
    dienstAction.mutate(
      { action: "weiger_aanpassing", uren_id: id },
      { onSuccess: () => toast.info("Aanpassing geweigerd") }
    );
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
    photoUpload.mutate(file, {
      onSuccess: (data) => {
        setProfilePhoto(data.profile_photo_url);
        toast.success("Profielfoto geüpload!");
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Upload mislukt");
      },
      onSettled: () => {
        setIsUploadingPhoto(false);
        e.target.value = "";
      },
    });
  };

  const handlePhotoDelete = async () => {
    setIsUploadingPhoto(true);
    photoDelete.mutate(undefined, {
      onSuccess: () => {
        setProfilePhoto(null);
        toast.success("Profielfoto verwijderd");
      },
      onError: () => {
        toast.error("Kon foto niet verwijderen");
      },
      onSettled: () => {
        setIsUploadingPhoto(false);
      },
    });
  };

  const handleLogout = async () => {
    // Wis SW caches voordat we uitloggen
    const { clearSwCacheOnLogout } = await import("@/lib/sw-utils");
    await clearSwCacheOnLogout();
    await fetch("/api/medewerker/logout", { method: "POST" });
    router.push("/medewerker/login");
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });

  const beschikbareDiensten = diensten.filter((d) => !d.aangemeld);

  const tabs: PortalTab[] = [
    {
      id: "home",
      label: "Home",
      group: "OVERZICHT",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    },
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
    {
      id: "referral",
      label: "Verwijs & Verdien",
      group: "ACCOUNT",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    },
  ];

  return (
    <MedewerkerLayout
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as TabId)}
      userName={medewerker.naam}
      onLogout={handleLogout}
    >
      {/* Account geblokkeerd overlay */}
      {accountGepauzeerd && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-6">
          <div className="bg-[var(--mp-card)] dark:bg-[var(--mp-card-elevated)] rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--mp-text-primary)]">Account gepauzeerd</h2>
            <p className="text-[var(--mp-text-secondary)] text-sm mt-2">
              Je account is gepauzeerd vanwege een openstaande boete van €50.
              Betaal de boete om je account te heractiveren.
            </p>
            <button
              onClick={() => {
                boeteBetaal.mutate(undefined, {
                  onSuccess: (data) => {
                    if (data.checkoutUrl) {
                      window.location.href = data.checkoutUrl;
                    } else {
                      toast.error("Kon betaallink niet aanmaken");
                    }
                  },
                  onError: () => {
                    toast.error("Netwerkfout bij aanmaken betaling");
                  },
                });
              }}
              className="w-full mt-6 py-3.5 rounded-2xl bg-[#F27501] text-white font-semibold shadow-lg hover:bg-[#d96800] active:scale-[0.98] transition-all"
            >
              Betaal €50 boete via iDEAL
            </button>
            <p className="text-xs text-[var(--mp-text-tertiary)] mt-3">
              Vragen? Neem contact op met TopTalent
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {activeTab === "home" && (
            <DashboardHome naam={medewerker.naam} onNavigate={(tab) => setActiveTab(tab as TabId)} />
          )}

          {activeTab === "diensten" && (
            <>
              <SwipeShiftStack />
              <DienstenFilters onQueryChange={setFilterQuery} />
              <div className="mb-4 text-sm text-neutral-600">
                {diensten.length} {diensten.length === 1 ? 'dienst' : 'diensten'} gevonden
              </div>
              <DienstenTab
                diensten={diensten}
                onAanmelden={aanmelden}
                onAfmelden={afmelden}
                onUrenInvullen={openUrenModal}
                onAnnuleerGeaccepteerd={annuleerGeaccepteerd}
                onAcceptVervanging={acceptVervanging}
                onAfwijsVervanging={afwijsVervanging}
                vervangingVerzoeken={vervangingVerzoeken}
                accountGepauzeerd={accountGepauzeerd}
              />
            </>
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
              <h2 className="text-2xl font-bold text-[var(--mp-text-primary)] mb-6">Mijn Beschikbaarheid</h2>
              <div className="bg-[var(--mp-card)] dark:bg-[var(--mp-card)] rounded-2xl p-6 shadow-sm dark:shadow-none dark:border dark:border-[var(--mp-separator)]">
                <BeschikbaarheidForm
                  onSave={async (data) => {
                    beschikbaarheidSave.mutate(
                      { email: medewerker.email, ...data },
                      { onSuccess: () => toast.success("Beschikbaarheid opgeslagen") }
                    );
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
              onProfilePhotoUpdate={setProfilePhoto}
            />
          )}

          {activeTab === "financieel" && <FinancieelOverzicht />}

          {activeTab === "documenten" && <DocumentenPage />}

          {activeTab === "referral" && <ReferralPage />}
        </>
      )}

      {/* Uren Modal */}
      {urenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-[var(--mp-card)] dark:bg-[var(--mp-card-elevated)] rounded-2xl max-w-sm w-full p-4 sm:p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[var(--mp-text-primary)] mb-4">Uren invullen</h3>
            <p className="text-sm text-[var(--mp-text-secondary)] mb-4">{urenModal.klant_naam} - {formatDate(urenModal.datum)}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--mp-text-primary)] mb-1">Starttijd</label>
                <input type="time" value={urenForm.start} onChange={(e) => setUrenForm({ ...urenForm, start: e.target.value })} className="w-full px-3 py-3 border border-[var(--mp-separator)] rounded-xl text-base bg-[var(--mp-bg)] dark:bg-[var(--mp-card)] text-[var(--mp-text-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--mp-text-primary)] mb-1">Eindtijd</label>
                <input type="time" value={urenForm.eind} onChange={(e) => setUrenForm({ ...urenForm, eind: e.target.value })} className="w-full px-3 py-3 border border-[var(--mp-separator)] rounded-xl text-base bg-[var(--mp-bg)] dark:bg-[var(--mp-card)] text-[var(--mp-text-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--mp-text-primary)] mb-1">Pauze (minuten)</label>
                <input type="number" value={urenForm.pauze} onChange={(e) => setUrenForm({ ...urenForm, pauze: e.target.value })} className="w-full px-3 py-3 border border-[var(--mp-separator)] rounded-xl text-base bg-[var(--mp-bg)] dark:bg-[var(--mp-card)] text-[var(--mp-text-primary)]" min="0" step="5" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setUrenModal(null)} className="flex-1 py-3 border border-[var(--mp-separator)] rounded-xl text-[var(--mp-text-primary)]">Annuleren</button>
              <button onClick={submitUren} className="flex-1 py-3 bg-[#F27501] text-white rounded-xl font-medium hover:bg-[#d96800] transition-colors">Versturen</button>
            </div>
          </div>
        </div>
      )}
    </MedewerkerLayout>
  );
}
