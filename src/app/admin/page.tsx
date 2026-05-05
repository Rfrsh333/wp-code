"use client";

import dynamic from "next/dynamic";
import QueryProvider from "@/components/QueryProvider";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const AdminDashboard = dynamic(() => import("@/components/admin/AdminDashboard"), {
  loading: () => (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
    </div>
  ),
  ssr: false,
});

export default function AdminPage() {
  const { isLoading, isAuthenticated } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <QueryProvider><AdminDashboard /></QueryProvider>;
}
