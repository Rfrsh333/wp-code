"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

interface UseAdminAuthReturn {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
}

export function useAdminAuth(): UseAdminAuthReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      router.push("/admin/login");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session }),
      });

      if (!response.ok) {
        await supabase.auth.signOut();
        await fetch("/api/admin/logout", { method: "POST" });
        router.push("/admin/login");
        setIsLoading(false);
        return;
      }

      setSession(session);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Admin verificatie error:", error);
      await supabase.auth.signOut();
      router.push("/admin/login");
    }

    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setIsAuthenticated(false);
        setSession(null);
        router.push("/admin/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAuth, router]);

  return { isLoading, isAuthenticated, session };
}
