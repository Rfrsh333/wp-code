"use client";

import { Plus, Download } from "lucide-react";
import { motion } from "framer-motion";

interface QuickActionsProps {
  onTabChange: (tab: string) => void;
}

export default function QuickActions({ onTabChange }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onTabChange("aanvragen")}
        className="flex flex-col items-center gap-2 bg-[#F27501] text-white rounded-2xl p-4 font-semibold text-xs text-center shadow-lg shadow-orange-200/50"
      >
        <Plus className="w-6 h-6" />
        <span>Personeel aanvragen</span>
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onTabChange("facturen")}
        className="flex flex-col items-center gap-2 bg-white text-[#1e3a5f] rounded-2xl p-4 font-semibold text-xs text-center border border-[var(--kp-border)]"
      >
        <Download className="w-6 h-6" />
        <span>Download factuur</span>
      </motion.button>
    </div>
  );
}
