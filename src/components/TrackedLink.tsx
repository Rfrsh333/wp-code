"use client";

import Link from "next/link";

interface TrackedLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
  eventName?: string;
  label?: string;
  pageVariant?: string;
}

export default function TrackedLink({
  href,
  className = "",
  children,
  eventName = "cta_click",
  label,
  pageVariant,
}: TrackedLinkProps) {
  const handleClick = () => {
    if (typeof window === "undefined") return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      cta_label: label,
      page_variant: pageVariant,
      href,
    });
  };

  const isExternal = href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:");

  if (isExternal) {
    return (
      <a href={href} className={className} onClick={handleClick}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
