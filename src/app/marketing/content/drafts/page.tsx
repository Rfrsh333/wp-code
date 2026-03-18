"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect to main content page (news dashboard has tabs for drafts)
export default function MarketingDraftsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/marketing/content");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F27501] border-t-transparent" />
    </div>
  );
}
