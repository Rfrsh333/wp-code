"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BASE_URL = "https://toptalentjobs.nl";

const LABELS: Record<string, string> = {
  locaties: "Locaties",
  uitzenden: "Uitzenden",
  detachering: "Detachering",
};

function toTitleCase(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildCrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { name: string; href: string }[] = [
    { name: "Home", href: "/" },
  ];

  if (segments.length === 0 || segments[0] !== "locaties") {
    return crumbs;
  }

  crumbs.push({ name: LABELS.locaties, href: "/locaties" });

  if (segments[1]) {
    const city = segments[1];
    crumbs.push({ name: toTitleCase(city), href: `/locaties/${city}` });
  }

  if (segments[2]) {
    const leaf = segments[2];
    crumbs.push({ name: LABELS[leaf] || toTitleCase(leaf), href: pathname });
  }

  return crumbs;
}

function buildJsonLd(pathname: string) {
  const crumbs = buildCrumbs(pathname);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.href === "/" ? BASE_URL : `${BASE_URL}${crumb.href}`,
    })),
  };
}

export default function Breadcrumbs() {
  const pathname = usePathname() || "/";
  const crumbs = buildCrumbs(pathname);
  const breadcrumbSchema = buildJsonLd(pathname);

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-xs sm:text-sm text-neutral-600">
        <ol className="flex flex-wrap items-center gap-2">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-2">
                {isLast ? (
                  <span className="text-[#F97316] font-semibold">{crumb.name}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-[#F97316] transition-colors">
                    {crumb.name}
                  </Link>
                )}
                {!isLast && <span className="text-neutral-400">›</span>}
              </li>
            );
          })}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
