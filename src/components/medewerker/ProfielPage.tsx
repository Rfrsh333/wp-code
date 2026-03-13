"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useToast } from "@/components/ui/Toast";
import StatsBadge from "@/components/ui/StatsBadge";
import VaardighedenSection from "./VaardighedenSection";
import WerkervaringSection from "./WerkervaringSection";
import CertificeringenSection from "./CertificeringenSection";
import ProfielEditModal from "./ProfielEditModal";

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
  badge?: string | null;
  gemiddelde_score?: number | null;
  aantal_beoordelingen?: number | null;
  totaal_diensten?: number | null;
  streak_count?: number | null;
}

interface ProfielStats {
  opkomst_percentage: number;
  op_tijd_percentage: number;
  rating: number;
}

interface BadgeInfo {
  badge: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

const BADGE_CONFIG: Record<string, BadgeInfo> = {
  starter: { badge: "starter", label: "Starter", icon: "🌱", color: "text-neutral-600", bgColor: "bg-neutral-100" },
  rising: { badge: "rising", label: "Rising Star", icon: "📈", color: "text-blue-600", bgColor: "bg-blue-50" },
  star: { badge: "star", label: "Star", icon: "⭐", color: "text-yellow-600", bgColor: "bg-yellow-50" },
  toptalent: { badge: "toptalent", label: "TopTalent", icon: "🏆", color: "text-[#F27501]", bgColor: "bg-[#F27501]/10" },
};

function getNextBadge(current: string, diensten: number, score: number): { label: string; progress: number; hint: string } | null {
  if (current === "toptalent") return null;
  if (current === "star") {
    const dienstenProgress = Math.min(diensten / 50, 1);
    const scoreOk = score >= 4.25;
    return {
      label: "TopTalent",
      progress: Math.round(dienstenProgress * 100),
      hint: `${diensten}/50 diensten${scoreOk ? "" : `, gem. ${score.toFixed(1)}/4.25 nodig`}`,
    };
  }
  if (current === "rising") {
    const dienstenProgress = Math.min(diensten / 20, 1);
    const scoreOk = score >= 4;
    return {
      label: "Star",
      progress: Math.round(dienstenProgress * 100),
      hint: `${diensten}/20 diensten${scoreOk ? "" : `, gem. ${score.toFixed(1)}/4.0 nodig`}`,
    };
  }
  // starter
  const dienstenProgress = Math.min(diensten / 5, 1);
  const scoreOk = score >= 3.5;
  return {
    label: "Rising Star",
    progress: Math.round(dienstenProgress * 100),
    hint: `${diensten}/5 diensten${scoreOk ? "" : `, gem. ${score.toFixed(1)}/3.5 nodig`}`,
  };
}

interface Werkervaring {
  id: string;
  werkgever: string;
  functie: string;
  categorie: string;
  locatie: string | null;
  start_datum: string;
  eind_datum: string | null;
}

interface Vaardigheid {
  id: string;
  categorie: string;
  vaardigheid: string;
}

interface ProfielPageProps {
  medewerker: Medewerker;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhotoDelete: () => void;
  isUploadingPhoto: boolean;
  profilePhoto: string | null;
}

export default function ProfielPage({ medewerker, onPhotoUpload, onPhotoDelete, isUploadingPhoto, profilePhoto }: ProfielPageProps) {
  const toast = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [profielData, setProfielData] = useState<Medewerker>(medewerker);
  const [stats, setStats] = useState<ProfielStats>({ opkomst_percentage: 0, op_tijd_percentage: 0, rating: 0 });
  const [werkervaring, setWerkervaring] = useState<Werkervaring[]>([]);
  const [vaardigheden, setVaardigheden] = useState<Vaardigheid[]>([]);

  const fetchProfileData = useCallback(async () => {
    try {
      const res = await fetch("/api/medewerker/profile");
      const data = await res.json();
      if (res.ok) {
        setProfielData((prev) => ({ ...prev, ...data.profiel }));
        setStats(data.stats || { opkomst_percentage: 0, op_tijd_percentage: 0, rating: 0 });
      }
    } catch {
      // Silently fail - initial data from props is fine
    }
  }, []);

  const fetchWerkervaring = useCallback(async () => {
    try {
      const res = await fetch("/api/medewerker/werkervaring");
      const data = await res.json();
      if (res.ok) setWerkervaring(data.werkervaring || []);
    } catch { /* ignore */ }
  }, []);

  const fetchVaardigheden = useCallback(async () => {
    try {
      const res = await fetch("/api/medewerker/vaardigheden");
      const data = await res.json();
      if (res.ok) setVaardigheden(data.vaardigheden || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchProfileData();
    fetchWerkervaring();
    fetchVaardigheden();
  }, [fetchProfileData, fetchWerkervaring, fetchVaardigheden]);

  const calculateAge = (geboortedatum: string | null | undefined) => {
    if (!geboortedatum) return null;
    const today = new Date();
    const birth = new Date(geboortedatum);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const age = calculateAge(profielData.geboortedatum);

  return (
    <div className="max-w-3xl">
      {/* Header / Profiel Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
        <div className="flex items-start gap-5">
          {/* Photo */}
          <div className="relative flex-shrink-0">
            {profilePhoto ? (
              <Image
                src={profilePhoto}
                alt={medewerker.naam}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover border-3 border-[#F27501]/20"
              />
            ) : (
              <div className="w-20 h-20 bg-[#F27501]/10 rounded-full flex items-center justify-center border-3 border-[#F27501]/20">
                <span className="text-3xl font-bold text-[#F27501]">{medewerker.naam.charAt(0).toUpperCase()}</span>
              </div>
            )}
            {isUploadingPhoto && (
              <div className="absolute inset-0 bg-white/70 rounded-full flex items-center justify-center">
                <div className="animate-spin w-5 h-5 border-2 border-[#F27501] border-t-transparent rounded-full" />
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#F27501] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#d96800] transition-colors shadow-md">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input type="file" accept="image/jpeg,image/png" onChange={onPhotoUpload} className="hidden" disabled={isUploadingPhoto} />
            </label>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">{medewerker.naam}</h2>
                <p className="text-neutral-500 text-sm mt-0.5">
                  {age ? `${age} jaar` : ""}
                  {age && profielData.stad ? ", " : ""}
                  {profielData.stad || ""}
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 text-sm font-medium text-[#F27501] bg-[#F27501]/10 rounded-xl hover:bg-[#F27501]/20 transition-colors"
              >
                Bewerken
              </button>
            </div>
            <div className="mt-3 space-y-1">
              {profielData.bsn_geverifieerd && (
                <p className="text-sm text-green-600 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  BSN geverifieerd
                </p>
              )}
              {medewerker.email && (
                <p className="text-sm text-neutral-500 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {medewerker.email}
                </p>
              )}
              {(medewerker as any).telefoon && (
                <p className="text-sm text-neutral-500 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {(medewerker as any).telefoon}
                </p>
              )}
            </div>
            {profilePhoto && (
              <button onClick={onPhotoDelete} disabled={isUploadingPhoto} className="mt-2 text-xs text-red-500 hover:text-red-700 transition-colors">
                Foto verwijderen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statistieken */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatsBadge label="Opkomst" value={`${stats.opkomst_percentage}%`} color="green" />
        <StatsBadge label="Op tijd" value={`${stats.op_tijd_percentage}%`} color="blue" />
        <StatsBadge label="Rating" value={stats.rating > 0 ? `★ ${stats.rating.toFixed(1)}` : "—"} color="yellow" />
      </div>

      {/* Badge & Gamification */}
      {(() => {
        const currentBadge = BADGE_CONFIG[profielData.badge || "starter"] || BADGE_CONFIG.starter;
        const totaalDiensten = profielData.totaal_diensten || 0;
        const gemScore = profielData.gemiddelde_score || 0;
        const nextBadge = getNextBadge(currentBadge.badge, totaalDiensten, gemScore);

        return (
          <div className={`${currentBadge.bgColor} rounded-2xl p-5 mb-4`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{currentBadge.icon}</span>
              <div>
                <h3 className={`text-lg font-bold ${currentBadge.color}`}>{currentBadge.label}</h3>
                <p className="text-sm text-neutral-500">
                  {totaalDiensten} diensten afgerond
                  {gemScore > 0 ? ` · ★ ${gemScore.toFixed(1)}` : ""}
                </p>
              </div>
            </div>

            {nextBadge && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-neutral-600">Volgende: {nextBadge.label}</span>
                  <span className="text-xs text-neutral-500">{nextBadge.progress}%</span>
                </div>
                <div className="w-full bg-white/60 rounded-full h-2.5">
                  <div
                    className="bg-[#F27501] h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${nextBadge.progress}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1.5">{nextBadge.hint}</p>
              </div>
            )}

            {!nextBadge && (
              <p className="text-sm text-[#F27501] font-medium">
                Je hebt het hoogste niveau bereikt!
              </p>
            )}
          </div>
        );
      })()}

      {/* Vaardigheden */}
      <div className="mb-4">
        <VaardighedenSection vaardigheden={vaardigheden} onRefresh={fetchVaardigheden} />
      </div>

      {/* Werkervaring */}
      <div className="mb-4">
        <WerkervaringSection werkervaring={werkervaring} onRefresh={fetchWerkervaring} />
      </div>

      {/* Certificeringen */}
      <div className="mb-4">
        <CertificeringenSection />
      </div>

      {/* Facturatie & Betaling */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-neutral-900">Facturatie & Betaling</h3>
          <button
            onClick={() => setShowEditModal(true)}
            className="text-sm font-medium text-[#F27501] hover:text-[#d96800] transition-colors"
          >
            Bewerken
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex items-start justify-between py-2">
            <span className="text-sm text-neutral-500">Adres</span>
            <span className="text-sm font-medium text-neutral-900 text-right">
              {profielData.factuur_adres
                ? `${profielData.factuur_adres}, ${profielData.factuur_postcode || ""} ${profielData.factuur_stad || ""}`
                : "Niet ingesteld"}
            </span>
          </div>
          <div className="border-t border-neutral-50" />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-neutral-500">BTW</span>
            <span className="text-sm font-medium text-neutral-900">{profielData.btw_nummer || "Niet ingesteld"}</span>
          </div>
          <div className="border-t border-neutral-50" />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-neutral-500">IBAN</span>
            <span className="text-sm font-medium text-neutral-900">{profielData.iban || "Niet ingesteld"}</span>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <ProfielEditModal
          data={profielData}
          onClose={() => setShowEditModal(false)}
          onSaved={fetchProfileData}
        />
      )}
    </div>
  );
}
