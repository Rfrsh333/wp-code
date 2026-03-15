"use client";

import { useEffect, useState } from "react";
import {
  User,
  Settings,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Camera,
  Star,
  Award,
  Euro,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import ThemeToggle from "@/components/medewerker/ThemeToggle";

interface MedewerkerProfile {
  naam: string;
  email: string;
  profile_photo_url?: string;
  functie?: string | string[];
  rating?: number;
  totaal_diensten?: number;
}

export default function AccountClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<MedewerkerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/medewerker/profile");
      if (!res.ok) {
        toast.error("Profiel ophalen mislukt");
        return;
      }
      const data = await res.json();
      setProfile(data.profile);
    } catch (err) {
      console.error("Fetch profile error:", err);
      toast.error("Er ging iets mis");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/medewerker/logout", { method: "POST" });
      if (res.ok) {
        toast.success("Uitgelogd");
        router.push("/medewerker/login");
      } else {
        toast.error("Uitloggen mislukt");
      }
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Er ging iets mis");
    }
  };

  const menuSections = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Persoonlijke gegevens", onClick: () => router.push("/medewerker/profiel") },
        { icon: Settings, label: "Instellingen", onClick: () => router.push("/medewerker/instellingen") },
      ],
    },
    {
      title: "Financieel & Extra",
      items: [
        { icon: Euro, label: "Financieel overzicht", onClick: () => router.push("/medewerker/financieel") },
        { icon: Users, label: "Vrienden werven", onClick: () => router.push("/medewerker/referral") },
        { icon: FileText, label: "Documenten", onClick: () => router.push("/medewerker/documenten") },
      ],
    },
    {
      title: "Info & Support",
      items: [
        { icon: Award, label: "Badges & Prestaties", onClick: () => router.push("/medewerker/badges") },
        { icon: HelpCircle, label: "Help & Support", onClick: () => router.push("/medewerker/help") },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--mp-bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const functies = profile?.functie
    ? Array.isArray(profile.functie)
      ? profile.functie.join(", ")
      : profile.functie
    : "Medewerker";

  return (
    <MedewerkerResponsiveLayout>
    <div className="min-h-screen bg-[var(--mp-bg)]">
      {/* Orange Gradient Header */}
      <div className="relative bg-gradient-to-br from-[var(--mp-accent)] to-[var(--mp-accent-dark)] pt-12 pb-24 px-4">
        <div className="relative z-10 flex flex-col items-center">
          {/* Profile Photo Flip Card */}
          <div className="relative mb-4 perspective-1000">
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className={`relative w-32 h-32 cursor-pointer transition-transform duration-700 transform-style-3d ${
                isFlipped ? "rotate-y-180" : ""
              }`}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Front: Profile Photo */}
              <div
                className="absolute inset-0 w-full h-full rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden backface-hidden shadow-xl"
                style={{ backfaceVisibility: "hidden" }}
              >
                {profile?.profile_photo_url ? (
                  <Image
                    src={profile.profile_photo_url}
                    alt={profile.naam}
                    width={128}
                    height={128}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <User className="w-16 h-16 text-white" />
                )}

                {/* Tap hint */}
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="text-xs text-white/90 bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm">
                    Tik voor QR
                  </span>
                </div>
              </div>

              {/* Back: QR Code */}
              <div
                className="absolute inset-0 w-full h-full rounded-3xl bg-white flex items-center justify-center overflow-hidden backface-hidden shadow-xl rotate-y-180"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <div className="p-3 flex flex-col items-center justify-center h-full">
                  {/* QR Code - scannable met medewerker email */}
                  <div className="w-20 h-20 bg-white p-1 rounded-lg mb-2">
                    <QRCode
                      value={profile?.email || "medewerker@toptalent.nl"}
                      size={76}
                      level="M"
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>
                  <span className="text-[8px] font-bold text-[var(--mp-accent)] text-center">
                    SCAN VOOR CHECK-IN
                  </span>
                  <span className="text-[7px] text-gray-600 mt-0.5">
                    ID: {profile?.email?.split('@')[0] || 'XXXX'}
                  </span>
                </div>

                {/* Tap hint */}
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                    Tik terug
                  </span>
                </div>
              </div>
            </div>

            {/* Camera button - alleen zichtbaar wanneer niet geflipped */}
            {!isFlipped && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toast.info("Foto wijzigen...");
                }}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white text-[var(--mp-accent)] flex items-center justify-center shadow-lg transition-transform active:scale-95 z-10"
                aria-label="Foto wijzigen"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Name */}
          <h1 className="text-2xl font-bold text-white mb-1">
            {profile?.naam || "Medewerker"}
          </h1>

          {/* Function */}
          <p className="text-white/80 text-sm mb-3">{functies}</p>

          {/* Stats */}
          <div className="flex gap-6">
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center mb-1">
                <Star className="w-4 h-4 fill-white text-white" />
                <span className="text-lg font-bold text-white">
                  {profile?.rating?.toFixed(1) || "5.0"}
                </span>
              </div>
              <span className="text-white/70 text-xs">Rating</span>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <div className="text-lg font-bold text-white mb-1">
                {profile?.totaal_diensten || 0}
              </div>
              <span className="text-white/70 text-xs">Diensten</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="px-4 -mt-16 relative z-20 space-y-4">
        {/* Theme Toggle Card */}
        <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] shadow-[var(--mp-shadow)] px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--mp-bg)] flex items-center justify-center">
              <Settings className="w-5 h-5 text-[var(--mp-text-secondary)]" />
            </div>
            <span className="font-medium text-[var(--mp-text-primary)]">
              Thema
            </span>
          </div>
          <ThemeToggle />
        </div>

        {menuSections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] overflow-hidden shadow-[var(--mp-shadow)]">
            <div className="px-4 py-3 border-b border-[var(--mp-separator)]">
              <h2 className="text-sm font-semibold text-[var(--mp-text-secondary)]">
                {section.title}
              </h2>
            </div>
            <div className="divide-y divide-[var(--mp-separator)]">
              {section.items.map((item, itemIdx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={itemIdx}
                    onClick={item.onClick}
                    className="w-full px-4 py-4 flex items-center gap-3 transition-colors active:bg-[var(--mp-bg)]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--mp-bg)] flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[var(--mp-text-secondary)]" />
                    </div>
                    <span className="flex-1 text-left text-[var(--mp-text-primary)] font-medium">
                      {item.label}
                    </span>
                    <ChevronRight className="w-5 h-5 text-[var(--mp-text-tertiary)]" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-[var(--mp-card)] rounded-[var(--mp-radius)] shadow-[var(--mp-shadow)] px-4 py-4 flex items-center gap-3 transition-colors active:bg-[var(--mp-bg)]"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--mp-danger)]/10 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-[var(--mp-danger)]" />
          </div>
          <span className="flex-1 text-left text-[var(--mp-danger)] font-medium">
            Uitloggen
          </span>
        </button>
      </div>

    </div>
    </MedewerkerResponsiveLayout>
  );
}
