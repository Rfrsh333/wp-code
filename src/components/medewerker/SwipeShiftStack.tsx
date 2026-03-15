"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import SwipeShiftCard from "./SwipeShiftCard";

interface Aanbieding {
  id: string;
  dienst_id: string;
  status: string;
  notitie: string | null;
  dienst: {
    klant_naam: string;
    locatie: string;
    datum: string;
    start_tijd: string;
    eind_tijd: string;
    functie: string;
    uurtarief: number | null;
  } | null;
}

export default function SwipeShiftStack() {
  const toast = useToast();
  const [aanbiedingen, setAanbiedingen] = useState<Aanbieding[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAanbiedingen();
  }, []);

  const fetchAanbiedingen = async () => {
    try {
      const res = await fetch("/api/medewerker/aanbiedingen");
      const data = await res.json();
      if (!res.ok) throw new Error();
      setAanbiedingen((data.aanbiedingen || []).filter((a: Aanbieding) => a.status === "aangeboden"));
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  const reageer = async (id: string, actie: "geaccepteerd" | "afgewezen") => {
    // Optimistic remove
    setAanbiedingen((prev) => prev.filter((a) => a.id !== id));
    try {
      const res = await fetch("/api/medewerker/aanbiedingen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: actie }),
      });
      if (!res.ok) throw new Error();
      toast.success(actie === "geaccepteerd" ? "Dienst geaccepteerd!" : "Aanbieding afgewezen");
    } catch {
      toast.error("Kon niet reageren op aanbieding");
      fetchAanbiedingen(); // Re-fetch on error
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-3 border-[#F27501] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (aanbiedingen.length === 0) return null;

  // Show at most top 3 cards in stack
  const visibleCards = aanbiedingen.slice(0, 3);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-bold text-[var(--mp-text-primary)]">Shift Aanbiedingen</h3>
        <span className="bg-[#F27501] text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse-glow">
          {aanbiedingen.length}
        </span>
      </div>

      <div className="relative w-full h-[340px] mx-auto max-w-sm">
        <AnimatePresence>
          {visibleCards.map((aanbieding, index) => {
            if (!aanbieding.dienst) return null;
            const isTop = index === 0;
            return (
              <motion.div
                key={aanbieding.id}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{
                  scale: 1 - index * 0.04,
                  y: index * 8,
                  opacity: 1 - index * 0.15,
                  zIndex: visibleCards.length - index,
                }}
                exit={{ x: 300, opacity: 0, rotate: 15 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <SwipeShiftCard
                  shift={{
                    id: aanbieding.id,
                    dienst_id: aanbieding.dienst_id,
                    functie: aanbieding.dienst.functie,
                    klant_naam: aanbieding.dienst.klant_naam,
                    locatie: aanbieding.dienst.locatie,
                    datum: aanbieding.dienst.datum,
                    start_tijd: aanbieding.dienst.start_tijd,
                    eind_tijd: aanbieding.dienst.eind_tijd,
                    uurtarief: aanbieding.dienst.uurtarief,
                    notitie: aanbieding.notitie,
                  }}
                  onAccept={(id) => reageer(id, "geaccepteerd")}
                  onDecline={(id) => reageer(id, "afgewezen")}
                  isTop={isTop}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
