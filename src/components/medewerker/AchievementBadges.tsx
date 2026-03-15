"use client";

import { motion } from "framer-motion";

interface AchievementBadgesProps {
  totaalDiensten: number;
  totaalUren: number;
}

const BADGES = [
  { id: "first-shift", label: "Eerste Dienst", icon: "🎉", requirement: 1, type: "diensten" as const, description: "Eerste dienst voltooid" },
  { id: "five-shifts", label: "Op Gang", icon: "🚀", requirement: 5, type: "diensten" as const, description: "5 diensten voltooid" },
  { id: "ten-shifts", label: "Doorzetter", icon: "💪", requirement: 10, type: "diensten" as const, description: "10 diensten voltooid" },
  { id: "twentyfive-shifts", label: "Veteraan", icon: "🏅", requirement: 25, type: "diensten" as const, description: "25 diensten voltooid" },
  { id: "fifty-shifts", label: "Legende", icon: "🏆", requirement: 50, type: "diensten" as const, description: "50 diensten voltooid" },
  { id: "hundred-hours", label: "100 Uur Club", icon: "⏱️", requirement: 100, type: "uren" as const, description: "100 uren gewerkt" },
  { id: "fivehundred-hours", label: "500 Uur Club", icon: "⭐", requirement: 500, type: "uren" as const, description: "500 uren gewerkt" },
];

export default function AchievementBadges({ totaalDiensten, totaalUren }: AchievementBadgesProps) {
  const earned = BADGES.filter((b) =>
    b.type === "diensten" ? totaalDiensten >= b.requirement : totaalUren >= b.requirement
  );
  const locked = BADGES.filter((b) =>
    b.type === "diensten" ? totaalDiensten < b.requirement : totaalUren < b.requirement
  );

  if (earned.length === 0 && locked.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-bold text-[var(--mp-text-tertiary)] uppercase tracking-wider mb-3">Achievements</h3>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
        {earned.map((badge, i) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="flex-shrink-0 w-20 text-center"
          >
            <div className="w-14 h-14 mx-auto bg-[#F27501]/10 dark:bg-[#F27501]/20 rounded-2xl flex items-center justify-center mb-1.5 shadow-sm">
              <span className="text-2xl">{badge.icon}</span>
            </div>
            <p className="text-[10px] font-semibold text-[var(--mp-text-primary)] leading-tight">{badge.label}</p>
          </motion.div>
        ))}
        {locked.slice(0, 2).map((badge) => (
          <div key={badge.id} className="flex-shrink-0 w-20 text-center opacity-40">
            <div className="w-14 h-14 mx-auto bg-[var(--mp-bg)] dark:bg-[var(--mp-card-elevated)] rounded-2xl flex items-center justify-center mb-1.5">
              <span className="text-2xl grayscale">{badge.icon}</span>
            </div>
            <p className="text-[10px] font-medium text-[var(--mp-text-tertiary)] leading-tight">{badge.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
