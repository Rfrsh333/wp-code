"use client";

import NewsDashboard from "@/components/admin/NewsDashboard";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function AdminNewsPage() {
  const { isLoading, isAuthenticated } = useAdminAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-neutral-100"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F27501] border-t-transparent" /></div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <NewsDashboard />;
}
