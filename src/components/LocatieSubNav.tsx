"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface LocatieSubNavProps {
  city: string;
}

export default function LocatieSubNav({ city }: LocatieSubNavProps) {
  const pathname = usePathname();

  const links = [
    {
      label: "Horeca uitzenden",
      href: "/diensten/uitzenden",
    },
    {
      label: "Detachering",
      href: "/diensten/detachering",
    },
  ];

  return (
    <div className="mt-4 mb-8 flex flex-wrap gap-2">
      {links.map((link) => {
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`
              inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition
              ${
                isActive
                  ? "bg-orange-50 border-[#F97316] text-[#EA580C]"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-[#F97316] hover:text-[#F97316] hover:shadow-sm"
              }
            `}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
