"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

interface RatingsData {
  algemeen: number;
  punctualiteit: number;
  professionaliteit: number;
  vaardigheden: number;
  communicatie: number;
  aanwezigheid: number;
  noShows: number;
  aantalBeoordelingen: number;
  totaalDiensten: number;
}

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className="w-5 h-5"
          fill={i <= Math.floor(score) ? "#F27501" : i - 0.5 <= score ? "#F27501" : "none"}
          stroke="#F27501"
          strokeWidth={1.5}
          opacity={i - 0.5 <= score ? 1 : 0.3}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      ))}
    </div>
  );
}

function ScoreBalk({ label, score, delay }: { label: string; score: number; delay: number }) {
  const getKleur = (s: number) => {
    if (s >= 4.5) return "bg-green-500";
    if (s >= 3.5) return "bg-[#F27501]";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[var(--mp-text-secondary)] w-36 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(score / 5) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay }}
          className={`h-full rounded-full ${getKleur(score)}`}
        />
      </div>
      <span className="text-sm font-semibold text-[var(--mp-text-primary)] w-8 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

export default function RatingsCard() {
  const [data, setData] = useState<RatingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRatings = useCallback(async () => {
    try {
      const res = await fetch("/api/medewerker/ratings");
      if (res.ok) {
        const ratings = await res.json();
        setData(ratings);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  if (isLoading) {
    return (
      <div className="bg-[var(--mp-card)] dark:bg-[var(--mp-card)] rounded-2xl p-6 shadow-sm dark:shadow-none dark:border dark:border-[var(--mp-separator)] mb-4 animate-pulse">
        <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-700 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.aantalBeoordelingen === 0) {
    return (
      <div className="bg-[var(--mp-card)] dark:bg-[var(--mp-card)] rounded-2xl p-6 shadow-sm dark:shadow-none dark:border dark:border-[var(--mp-separator)] mb-4">
        <h3 className="text-lg font-bold text-[var(--mp-text-primary)] mb-2">Jouw Beoordelingen</h3>
        <p className="text-sm text-[var(--mp-text-tertiary)]">
          Nog geen beoordelingen ontvangen. Na je eerste dienst kun je hier je scores bekijken.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--mp-card)] dark:bg-[var(--mp-card)] rounded-2xl p-6 shadow-sm dark:shadow-none dark:border dark:border-[var(--mp-separator)] mb-4">
      <h3 className="text-lg font-bold text-[var(--mp-text-primary)] mb-4">Jouw Beoordelingen</h3>

      {/* Algehele score */}
      <div className="flex items-center gap-4 mb-6 pb-5 border-b border-[var(--mp-separator)]">
        <div className="flex items-center gap-3">
          <StarRating score={data.algemeen} />
          <span className="text-2xl font-bold text-[var(--mp-text-primary)]">{data.algemeen.toFixed(1)}</span>
        </div>
        <span className="text-sm text-[var(--mp-text-tertiary)]">
          ({data.aantalBeoordelingen} beoordeling{data.aantalBeoordelingen !== 1 ? "en" : ""})
        </span>
      </div>

      {/* Per categorie */}
      <div className="space-y-3 mb-6">
        <ScoreBalk label="Punctualiteit" score={data.punctualiteit} delay={0} />
        <ScoreBalk label="Professionaliteit" score={data.professionaliteit} delay={0.1} />
        <ScoreBalk label="Vaardigheden" score={data.vaardigheden} delay={0.2} />
        <ScoreBalk label="Communicatie" score={data.communicatie} delay={0.3} />
      </div>

      {/* Aanwezigheid */}
      <div className="pt-5 border-t border-[var(--mp-separator)]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--mp-text-secondary)]">Aanwezigheid</span>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${data.aanwezigheid >= 95 ? "text-green-600" : data.aanwezigheid >= 80 ? "text-[#F27501]" : "text-red-600"}`}>
              {data.aanwezigheid}%
            </span>
            {data.noShows > 0 && (
              <span className="text-xs text-[var(--mp-text-tertiary)]">
                ({data.noShows} no-show{data.noShows !== 1 ? "s" : ""} van {data.totaalDiensten} diensten)
              </span>
            )}
          </div>
        </div>
        <div className="mt-2 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${data.aanwezigheid}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
            className={`h-full rounded-full ${data.aanwezigheid >= 95 ? "bg-green-500" : data.aanwezigheid >= 80 ? "bg-[#F27501]" : "bg-red-500"}`}
          />
        </div>
      </div>
    </div>
  );
}
