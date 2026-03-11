"use client";

import { useState, useRef, useEffect } from "react";

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

interface DropdownMenuProps {
  trigger?: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
}

export default function DropdownMenu({ trigger, items, align = "right" }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
      >
        {trigger || (
          <>
            Meer acties
            <svg className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 w-56 bg-white rounded-xl shadow-lg border border-neutral-100 py-1 animate-fade-in ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  setOpen(false);
                }
              }}
              disabled={item.disabled}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                item.disabled
                  ? "text-neutral-300 cursor-not-allowed"
                  : item.variant === "danger"
                    ? "text-red-600 hover:bg-red-50"
                    : "text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {item.icon && <span className="flex-shrink-0 w-4 h-4">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
