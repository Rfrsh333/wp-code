"use client";

import { motion } from "framer-motion";
import { FileText, Globe, Monitor } from "lucide-react";
import { tabs, type TabId } from "@/lib/data/analytics-mock-data";

interface SegmentedTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const iconMap = {
  "file-text": FileText,
  globe: Globe,
  monitor: Monitor,
} as const;

export default function SegmentedTabs({ activeTab, onTabChange }: SegmentedTabsProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-gray-900 p-1.5">
      {tabs.map((tab) => {
        const Icon = iconMap[tab.icon];
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors"
          >
            {isActive && (
              <motion.span
                layoutId="activeTab"
                className="absolute inset-0 rounded-full bg-white/10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Icon
              className={`relative z-10 h-4 w-4 ${
                isActive ? "text-white" : "text-gray-500"
              }`}
            />
            <span
              className={`relative z-10 ${
                isActive ? "text-white" : "text-gray-500"
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
