"use client";

import { useEffect, useState } from "react";
import { Calendar, Check, Clock } from "lucide-react";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import DienstCard from "@/components/medewerker/DienstCard";
import SwipeShiftStack from "@/components/medewerker/SwipeShiftStack";
import { toast } from "sonner";

type SubTab = "aangeboden" | "gepland" | "voltooid";

interface Dienst {
  id: string;
  aanmelding_id?: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  locatie: string;
  omschrijving?: string;
  functie?: string;
  notities?: string;
  uurtarief: number;
  status: string;
  klant: {
    bedrijfsnaam: string;
    bedrijf_foto_url?: string;
  };
}

interface VervangingVerzoek {
  aanmelding_id: string;
  dienst_id: string;
  originele_aanmelding_id: string;
  naam: string;
  functie: string | string[];
  profile_photo_url: string | null;
}

export default function MijnDienstenClient() {
  const [activeTab, setActiveTab] = useState<SubTab>("aangeboden");
  const [diensten, setDiensten] = useState<Dienst[]>([]);
  const [vervangingVerzoeken, setVervangingVerzoeken] = useState<VervangingVerzoek[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiensten();
  }, [activeTab]);

  const fetchDiensten = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/medewerker/diensten/lijst?status=${activeTab}`);
      if (!res.ok) {
        toast.error("Diensten ophalen mislukt");
        return;
      }
      const data = await res.json();
      setDiensten(data.diensten || []);
      setVervangingVerzoeken(data.vervangingVerzoeken || []);
    } catch (err) {
      console.error("Fetch diensten error:", err);
      toast.error("Er ging iets mis");
    } finally {
      setLoading(false);
    }
  };

  const handleAccepteerVervanging = async (vervangingAanmeldingId: string, origineleAanmeldingId: string) => {
    try {
      const res = await fetch("/api/medewerker/diensten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept_vervanging",
          aanmelding_id: origineleAanmeldingId,
          data: { vervanging_aanmelding_id: vervangingAanmeldingId },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Accepteren mislukt");
        return;
      }

      toast.success("Vervanging geaccepteerd!");
      await fetchDiensten();
    } catch (err) {
      console.error("Accept vervanging error:", err);
      toast.error("Er ging iets mis");
    }
  };

  const handleAfwijsVervanging = async (vervangingAanmeldingId: string) => {
    try {
      const res = await fetch("/api/medewerker/diensten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "afwijs_vervanging",
          data: { vervanging_aanmelding_id: vervangingAanmeldingId },
        }),
      });

      if (!res.ok) {
        toast.error("Afwijzen mislukt");
        return;
      }

      toast.success("Vervanging afgewezen");
      await fetchDiensten();
    } catch (err) {
      console.error("Reject vervanging error:", err);
      toast.error("Er ging iets mis");
    }
  };

  const tabs = [
    { id: "aangeboden" as SubTab, label: "Aangeboden", icon: Clock },
    { id: "gepland" as SubTab, label: "Gepland", icon: Calendar },
    { id: "voltooid" as SubTab, label: "Voltooid", icon: Check },
  ];

  return (
    <MedewerkerResponsiveLayout>
    <div className="min-h-screen bg-[var(--mp-bg)]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[var(--mp-card)] border-b border-[var(--mp-separator)]">
        <div className="px-4 pt-3 pb-0">
          <h1 className="text-2xl font-bold text-[var(--mp-text-primary)] mb-4">
            Mijn diensten
          </h1>

          {/* Sub-tabs met oranje indicator */}
          <div className="flex gap-6 relative">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative pb-3 flex items-center gap-2 transition-colors"
                >
                  <Icon
                    className={`w-5 h-5 md:w-4 md:h-4 ${
                      active ? "text-[var(--mp-accent)]" : "text-[var(--mp-text-secondary)]"
                    }`}
                  />
                  <span
                    className={`text-sm font-semibold ${
                      active ? "text-[var(--mp-accent)]" : "text-[var(--mp-text-secondary)]"
                    }`}
                  >
                    {tab.label}
                  </span>

                  {/* Oranje underline indicator */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--mp-accent)] transition-opacity duration-200"
                    style={{ opacity: active ? 1 : 0 }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Vervanging verzoeken */}
      {!loading && vervangingVerzoeken.length > 0 && (
        <div className="px-4 pt-4">
          <div className="bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-400 dark:border-blue-500/30 rounded-[var(--mp-radius)] p-4 mb-4">
            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Vervangers wachten op goedkeuring ({vervangingVerzoeken.length})
            </h3>
            <div className="space-y-3">
              {vervangingVerzoeken.map((verzoek) => {
                const dienst = diensten.find(d => d.id === verzoek.dienst_id);
                return (
                  <div
                    key={verzoek.aanmelding_id}
                    className="bg-white dark:bg-[var(--mp-card)] rounded-xl p-4 border border-[var(--mp-separator)]"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--mp-accent)]/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[var(--mp-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[var(--mp-text-primary)]">
                          {verzoek.naam}
                        </div>
                        <div className="text-xs text-[var(--mp-text-secondary)]">
                          {Array.isArray(verzoek.functie) ? verzoek.functie.join(", ") : verzoek.functie}
                        </div>
                      </div>
                    </div>

                    {dienst && (
                      <div className="text-xs text-[var(--mp-text-secondary)] mb-3 pl-13">
                        <div>{dienst.klant.bedrijfsnaam}</div>
                        <div>{new Date(dienst.datum).toLocaleDateString("nl-NL")} • {dienst.locatie}</div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAfwijsVervanging(verzoek.aanmelding_id)}
                        className="flex-1 py-2 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] font-semibold text-xs transition-all active:scale-[0.98]"
                      >
                        Afwijzen
                      </button>
                      <button
                        onClick={() => handleAccepteerVervanging(verzoek.aanmelding_id, verzoek.originele_aanmelding_id)}
                        className="flex-1 py-2 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-xs transition-all active:scale-[0.98]"
                      >
                        Accepteren
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : diensten.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[var(--mp-bg)] mx-auto mb-4 flex items-center justify-center">
              {activeTab === "aangeboden" && <Clock className="w-8 h-8 text-[var(--mp-text-tertiary)]" />}
              {activeTab === "gepland" && <Calendar className="w-8 h-8 text-[var(--mp-text-tertiary)]" />}
              {activeTab === "voltooid" && <Check className="w-8 h-8 text-[var(--mp-text-tertiary)]" />}
            </div>
            <p className="text-[var(--mp-text-secondary)] text-sm">
              {activeTab === "aangeboden" && "Geen aangeboden diensten"}
              {activeTab === "gepland" && "Geen geplande diensten"}
              {activeTab === "voltooid" && "Geen voltooide diensten"}
            </p>
          </div>
        ) : activeTab === "aangeboden" ? (
          /* Swipe cards voor aangeboden diensten */
          <SwipeShiftStack />
        ) : (
          /* Regular cards voor gepland/voltooid - grid layout zoals Ontdekken */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {diensten.map((dienst) => (
              <DienstCard
                key={dienst.id}
                dienst={dienst}
                type={activeTab}
                onRefresh={fetchDiensten}
              />
            ))}
          </div>
        )}
      </div>

    </div>
    </MedewerkerResponsiveLayout>
  );
}
