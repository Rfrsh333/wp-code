"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Calendar, Clock, User } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
}

const tabs: Tab[] = [
  { id: "ontdekken", label: "Ontdekken", icon: Home, href: "/medewerker/shifts" },
  { id: "mijn-diensten", label: "Mijn diensten", icon: Calendar, href: "/medewerker/diensten" },
  { id: "uren", label: "Uren", icon: Clock, href: "/medewerker/uren" },
  { id: "account", label: "Account", icon: User, href: "/medewerker/account" },
];

export default function YoungOnesBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isPWA, isIOS } = usePWA();

  const isActive = (href: string) => {
    if (href === "/medewerker/shifts") {
      return pathname === href || pathname === "/medewerker";
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--mp-card)] border-t border-[var(--mp-separator)]"
      style={{
        height: `calc(var(--mp-nav-height) + env(safe-area-inset-bottom, 0px))`,
        paddingBottom: `env(safe-area-inset-bottom, 0px)`,
        // Extra padding voor iOS PWA
        paddingBottom: isPWA && isIOS ? `max(env(safe-area-inset-bottom, 0px), 20px)` : `env(safe-area-inset-bottom, 0px)`,
      }}
    >
      <div className="flex items-stretch h-[var(--mp-nav-height)]">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.href)}
              className="flex-1 flex flex-col items-center justify-center relative group transition-colors"
              aria-label={tab.label}
            >
              {/* Orange indicator line on top */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--mp-accent)] transition-opacity duration-200"
                style={{ opacity: active ? 1 : 0 }}
              />

              {/* Icon */}
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    active
                      ? "text-[var(--mp-accent)]"
                      : "text-[var(--mp-text-secondary)] group-hover:text-[var(--mp-text-primary)]"
                  }`}
                />
                {/* Badge */}
                {tab.badge && tab.badge > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[var(--mp-danger)] rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold px-1">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  </div>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] mt-1 font-medium transition-colors ${
                  active
                    ? "text-[var(--mp-accent)]"
                    : "text-[var(--mp-text-secondary)] group-hover:text-[var(--mp-text-primary)]"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
