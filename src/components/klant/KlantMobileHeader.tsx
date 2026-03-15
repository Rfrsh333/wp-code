"use client";

interface KlantMobileHeaderProps {
  bedrijfsnaam: string;
  contactpersoon: string;
  ongelezen: number;
}

export default function KlantMobileHeader({ bedrijfsnaam, contactpersoon, ongelezen }: KlantMobileHeaderProps) {
  return (
    <header className="md:hidden sticky top-0 z-40 bg-white border-b border-[var(--kp-border)] px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-[10px]">TT</span>
        </div>
        <span className="font-semibold text-[var(--kp-text-primary)] text-sm">{bedrijfsnaam}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Notificatie bell */}
        <button className="relative">
          <svg className="w-5 h-5 text-[var(--kp-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {ongelezen > 0 && (
            <span className="absolute -top-1 -right-1 bg-[var(--kp-accent)] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {ongelezen > 9 ? "9+" : ongelezen}
            </span>
          )}
        </button>

        {/* Avatar */}
        <div className="w-7 h-7 bg-[#1e3a5f] rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-semibold">
            {contactpersoon.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}
