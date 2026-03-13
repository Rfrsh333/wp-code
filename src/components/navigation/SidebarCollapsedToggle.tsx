"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarCollapsedToggleProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function SidebarCollapsedToggle({
  collapsed,
  onToggle,
}: SidebarCollapsedToggleProps) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? "Sidebar uitklappen" : "Sidebar inklappen"}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-500 shadow-sm transition",
        "hover:border-neutral-300 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F27501]/10"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
