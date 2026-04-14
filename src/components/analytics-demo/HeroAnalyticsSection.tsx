"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import LiveStatusBadge from "./LiveStatusBadge";
import SegmentedTabs from "./SegmentedTabs";
import DataPanel from "./DataPanel";
import type { TabId } from "@/lib/data/analytics-mock-data";

const GlobeVisualization = dynamic(() => import("./GlobeVisualization"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto flex aspect-square w-full max-w-[520px] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-700 border-t-orange-500" />
    </div>
  ),
});

export default function HeroAnalyticsSection() {
  const [activeTab, setActiveTab] = useState<TabId>("pages");

  return (
    <section className="relative min-h-screen bg-[#0a0a0a]">
      <div className="relative mx-auto max-w-lg px-4 pb-8 pt-6">
        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-4"
        >
          <LiveStatusBadge />
        </motion.div>

        {/* Globe */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
        >
          <GlobeVisualization />
        </motion.div>

        {/* Bottom section: tabs + data */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-6 flex flex-col items-center gap-5"
        >
          <SegmentedTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="w-full">
            <DataPanel activeTab={activeTab} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
