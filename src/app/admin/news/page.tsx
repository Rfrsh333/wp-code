"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import NewsDashboard from "@/components/admin/NewsDashboard";

export default function AdminNewsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/admin/login");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session }),
      });

      if (!response.ok) {
        await supabase.auth.signOut();
        document.cookie = "sb-access-token=; path=/; max-age=0";
        router.push("/admin/login");
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-neutral-100"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F27501] border-t-transparent" /></div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <NewsDashboard />;
}
