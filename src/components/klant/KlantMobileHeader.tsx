"use client";

import { useState } from "react";
import Image from "next/image";

interface KlantMobileHeaderProps {
  bedrijfsnaam: string;
  contactpersoon: string;
  ongelezen: number;
  /** Bel: naar de plek waar actie nodig is (uren, beoordelingen) of het overzicht. */
  onBellClick: () => void;
  onInstellingen?: () => void;
  onLogout: () => void;
}

export default function KlantMobileHeader({
  bedrijfsnaam,
  contactpersoon,
  ongelezen,
  onBellClick,
  onInstellingen,
  onLogout,
}: KlantMobileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="md:hidden sticky top-0 z-40 bg-white border-b border-[var(--kp-border)] px-4 pb-3 flex items-center justify-between"
      style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 bg-[#1e3a5f] rounded-lg flex items-center justify-center flex-shrink-0">
          <Image src="/favicon-icon.png" alt="TopTalent" width={16} height={16} />
        </div>
        <span className="font-semibold text-[var(--kp-text-primary)] text-sm truncate">{bedrijfsnaam}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Notificatie bell */}
        <button
          type="button"
          onClick={onBellClick}
          className="relative p-1"
          aria-label={ongelezen > 0 ? `${ongelezen} openstaande acties` : "Meldingen"}
        >
          <svg className="w-5 h-5 text-[var(--kp-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {ongelezen > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-[var(--kp-accent)] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {ongelezen > 9 ? "9+" : ongelezen}
            </span>
          )}
        </button>

        {/* Avatar → accountmenu (uitloggen was op mobiel nergens bereikbaar) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="w-7 h-7 bg-[#1e3a5f] rounded-full flex items-center justify-center"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Accountmenu"
          >
            <span className="text-white text-xs font-semibold">
              {(contactpersoon || bedrijfsnaam || "?").charAt(0).toUpperCase()}
            </span>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div role="menu" className="absolute right-0 mt-2 w-48 rounded-xl border border-[var(--kp-border)] bg-white shadow-lg z-50 py-1">
                <p className="px-4 py-2 text-xs text-[var(--kp-text-tertiary)] truncate">{contactpersoon}</p>
                {onInstellingen && (
                  <button
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); onInstellingen(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[var(--kp-text-secondary)] hover:bg-neutral-50"
                  >
                    Instellingen
                  </button>
                )}
                <button
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onLogout(); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  Uitloggen
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
