"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function getCity(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "locaties" || !segments[1]) {
    return null;
  }
  return segments[1];
}

export default function LocatieSubNav() {
  const pathname = usePathname() || "/";
  const city = getCity(pathname);

  if (!city) {
    return null;
  }

  const base = `/locaties/${city}`;
  const items = [
    { label: "Overzicht", href: base },
    { label: "Uitzenden", href: `${base}/uitzenden` },
    { label: "Detachering", href: `${base}/detachering` },
  ];

  return (
    <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={[
              "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-[#F97316] bg-[#F97316] text-white shadow-sm"
                : "border-neutral-200 bg-neutral-100 text-neutral-700 hover:border-[#F97316] hover:text-[#F97316]",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
