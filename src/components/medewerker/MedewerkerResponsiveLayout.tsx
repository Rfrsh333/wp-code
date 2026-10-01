"use client";

import { useEffect, useState } from "react";
import DesktopSidebar from "./DesktopSidebar";
import YoungOnesBottomNav from "./YoungOnesBottomNav";
import { AlertTriangle } from "lucide-react";

interface MedewerkerResponsiveLayoutProps {
  children: React.ReactNode;
  medewerkerNaam?: string;
  medewerkerEmail?: string;
  profilePhotoUrl?: string | null;
}

export default function MedewerkerResponsiveLayout({
  children,
  medewerkerNaam,
  medewerkerEmail,
  profilePhotoUrl,
}: MedewerkerResponsiveLayoutProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [accountGepauzeerd, setAccountGepauzeerd] = useState(false);
  const [openBoete, setOpenBoete] = useState<{ bedrag: number; reden: string | null } | null>(null);
  const [betalen, setBetalen] = useState(false);
  const [betaalFout, setBetaalFout] = useState("");

  const checkAccountStatus = async () => {
    try {
      const res = await fetch("/api/medewerker/status");
      if (res.ok) {
        const data = await res.json();
        setAccountGepauzeerd(data.gepauzeerd || false);
        setOpenBoete(data.openstaande_boete ?? null);
      }
    } catch (err) {
      console.error("Check status error:", err);
    }
  };

  // Boete betalen via de bestaande Mollie-route; na betaling heft de webhook de pauze op.
  const betaalBoete = async () => {
    setBetalen(true);
    setBetaalFout("");
    try {
      const res = await fetch("/api/medewerker/betaal-boete", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        setBetaalFout(data.error || "Betaling starten mislukt. Neem contact op met TopTalent.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error("Boete betalen error:", err);
      setBetaalFout("Betaling starten mislukt. Neem contact op met TopTalent.");
    } finally {
      setBetalen(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      setIsMounted(true);
      checkAccountStatus();
    });
  }, []);

  if (!isMounted) {
    // Prevent hydration mismatch
    return <div className="min-h-screen bg-[var(--mp-bg)]">{children}</div>;
  }

  return (
    <>
      {/* Desktop Sidebar - alleen op desktop */}
      <DesktopSidebar
        medewerkerNaam={medewerkerNaam}
        medewerkerEmail={medewerkerEmail}
        profilePhotoUrl={profilePhotoUrl}
      />

      {/* Main content area */}
      <div className="min-h-screen bg-[var(--mp-bg)]">
        {/* Desktop: padding-left voor sidebar */}
        {/* Mobile: safe area top voor notch */}
        <div className="md:pl-72 safe-top">
          {/* Account gepauzeerd warning */}
          {accountGepauzeerd && (
            <div className="bg-red-500 text-white px-4 py-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <strong className="font-semibold">Account gepauzeerd</strong>
                <p className="text-white/90 mt-0.5">
                  {openBoete
                    ? `Je account is gepauzeerd vanwege een openstaande boete van €${openBoete.bedrag.toFixed(2)}${openBoete.reden ? ` (${openBoete.reden})` : ""}.`
                    : "Je account is tijdelijk gepauzeerd. Neem contact op met TopTalent voor meer informatie."}
                </p>
                {betaalFout && <p className="text-white mt-1 font-medium">{betaalFout}</p>}
              </div>
              {openBoete && (
                <button
                  onClick={betaalBoete}
                  disabled={betalen}
                  className="flex-shrink-0 px-3 py-2 rounded-lg bg-white text-red-600 text-sm font-semibold disabled:opacity-60"
                >
                  {betalen ? "Bezig..." : "Boete betalen"}
                </button>
              )}
            </div>
          )}

          {/* Content met padding voor bottom nav op mobiel */}
          <div className="pb-[calc(var(--mp-nav-height)+env(safe-area-inset-bottom,0px)+1rem)] md:pb-0">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - alleen op mobiel */}
      <div className="md:hidden">
        <YoungOnesBottomNav />
      </div>
    </>
  );
}
