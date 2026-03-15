"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Calendar,
  Clock,
  CalendarCheck,
  User,
  Euro,
  FileText,
  Users,
  LogOut,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
}

const menuSections = [
  {
    title: "Hoofdmenu",
    items: [
      { id: "dashboard", label: "Dashboard", icon: Home, href: "/medewerker/dashboard" },
      { id: "ontdekken", label: "Ontdekken", icon: Home, href: "/medewerker/shifts" },
      { id: "diensten", label: "Mijn diensten", icon: Calendar, href: "/medewerker/diensten" },
      { id: "uren", label: "Uren", icon: Clock, href: "/medewerker/uren" },
    ] as MenuItem[],
  },
  {
    title: "Planning",
    items: [
      { id: "beschikbaarheid", label: "Beschikbaarheid", icon: CalendarCheck, href: "/medewerker/beschikbaarheid" },
    ] as MenuItem[],
  },
  {
    title: "Profiel & Info",
    items: [
      { id: "profiel", label: "Mijn profiel", icon: User, href: "/medewerker/account" },
      { id: "financieel", label: "Financieel", icon: Euro, href: "/medewerker/financieel" },
      { id: "documenten", label: "Documenten", icon: FileText, href: "/medewerker/documenten" },
      { id: "referral", label: "Vrienden werven", icon: Users, href: "/medewerker/referral" },
    ] as MenuItem[],
  },
];

interface DesktopSidebarProps {
  medewerkerNaam?: string;
  medewerkerEmail?: string;
  profilePhotoUrl?: string | null;
}

export default function DesktopSidebar({
  medewerkerNaam = "Medewerker",
  medewerkerEmail,
  profilePhotoUrl,
}: DesktopSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/medewerker/shifts") {
      return pathname === href || pathname === "/medewerker";
    }
    return pathname?.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/medewerker/logout", { method: "POST" });
      if (res.ok) {
        router.push("/medewerker/login");
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <aside
      className={`hidden md:flex md:flex-col fixed left-0 top-0 h-screen bg-[var(--mp-card)] border-r border-[var(--mp-separator)] transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-72"
      } z-50`}
    >
      {/* Header met profiel */}
      <div className="p-6 border-b border-[var(--mp-separator)]">
        <div className="flex items-center gap-3 mb-4">
          {/* Profile photo */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--mp-bg)] overflow-hidden flex items-center justify-center">
            {profilePhotoUrl ? (
              <Image
                src={profilePhotoUrl}
                alt={medewerkerNaam}
                width={48}
                height={48}
                className="object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-[var(--mp-text-tertiary)]" />
            )}
          </div>

          {/* Name & email */}
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-[var(--mp-text-primary)] truncate">
                {medewerkerNaam}
              </h2>
              {medewerkerEmail && (
                <p className="text-xs text-[var(--mp-text-tertiary)] truncate">
                  {medewerkerEmail}
                </p>
              )}
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-[var(--mp-bg)] flex items-center justify-center transition-colors"
            aria-label={isCollapsed ? "Uitklappen" : "Inklappen"}
          >
            <ChevronRight
              className={`w-5 h-5 text-[var(--mp-text-tertiary)] transition-transform ${
                isCollapsed ? "" : "rotate-180"
              }`}
            />
          </button>
        </div>

        {/* Theme Toggle */}
        {!isCollapsed && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--mp-text-secondary)]">
              Thema
            </span>
            <ThemeToggle />
          </div>
        )}
      </div>

      {/* Menu secties */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {menuSections.map((section, idx) => (
          <div key={idx}>
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase tracking-wider mb-2 px-3">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      active
                        ? "bg-[var(--mp-accent)] text-white shadow-lg shadow-[var(--mp-accent)]/20"
                        : "text-[var(--mp-text-secondary)] hover:bg-[var(--mp-bg)] hover:text-[var(--mp-text-primary)]"
                    } ${isCollapsed ? "justify-center" : ""}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left text-sm font-medium">
                          {item.label}
                        </span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--mp-danger)] text-white text-xs font-bold flex items-center justify-center">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--mp-danger)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout button onderaan */}
      <div className="p-4 border-t border-[var(--mp-separator)]">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--mp-danger)] hover:bg-[var(--mp-danger)]/10 transition-all ${
            isCollapsed ? "justify-center" : ""
          }`}
          title={isCollapsed ? "Uitloggen" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Uitloggen</span>}
        </button>
      </div>
    </aside>
  );
}
