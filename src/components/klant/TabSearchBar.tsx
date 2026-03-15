"use client";

import { Search, X } from "lucide-react";
import { useState, useEffect } from "react";

interface TabSearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
}

export default function TabSearchBar({
  placeholder = "Zoeken...",
  onSearch,
}: TabSearchBarProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => onSearch(query), 250);
    return () => clearTimeout(t);
  }, [query, onSearch]);

  return (
    <div className="relative mb-4">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--kp-text-tertiary)]" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-10 pr-10 bg-white border border-[var(--kp-border)] rounded-xl text-[var(--kp-text-primary)] text-sm placeholder-[var(--kp-text-tertiary)] focus:outline-none focus:border-[#F27501] focus:ring-2 focus:ring-[#F27501]/20 transition-all"
      />
      {query && (
        <button
          onClick={() => setQuery("")}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <X className="w-4 h-4 text-[var(--kp-text-tertiary)]" />
        </button>
      )}
    </div>
  );
}
