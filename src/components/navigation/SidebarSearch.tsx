"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarSearchProps {
  collapsed: boolean;
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function SidebarSearch({
  collapsed,
  value,
  onChange,
  inputRef,
}: SidebarSearchProps) {
  if (collapsed) {
    return null;
  }

  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input
        ref={inputRef}
        aria-label="Zoek in navigatie"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Zoek pagina..."
        className={cn(
          "h-11 w-full rounded-2xl border border-neutral-200/80 bg-white pl-10 pr-11 text-sm text-neutral-800 shadow-sm outline-none transition",
          "placeholder:text-neutral-400 focus:border-[#F27501]/50 focus:ring-4 focus:ring-[#F27501]/10"
        )}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
        /
      </span>
    </label>
  );
}
