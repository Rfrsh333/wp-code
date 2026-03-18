"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import QueryProvider from "@/components/QueryProvider";

const MarketingDashboard = dynamic(() => import("@/components/marketing/MarketingDashboard"), {
  loading: () => (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
    </div>
  ),
  ssr: false,
});

export default function MarketingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/admin/login"); // Reuse admin login for now
        setIsLoading(false);
        return;
      }

      // Verify user has marketing/admin access
      try {
        const response = await fetch("/api/admin/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session }),
        });

        if (!response.ok) {
          console.error("Marketing verificatie mislukt");
          await supabase.auth.signOut();
          await fetch("/api/admin/logout", { method: "POST" });
          router.push("/admin/login");
          setIsLoading(false);
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error("Marketing verificatie error:", error);
        await supabase.auth.signOut();
        router.push("/admin/login");
      }

      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setIsAuthenticated(false);
        router.push("/admin/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

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

  return <QueryProvider><MarketingDashboard /></QueryProvider>;
}
