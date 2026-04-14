"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  pagesData,
  countriesData,
  devicesData,
  type TabId,
} from "@/lib/data/analytics-mock-data";
import { Monitor, Smartphone, Tablet } from "lucide-react";

function PagesPanel() {
  return (
    <div className="space-y-2">
      {pagesData.map((page, i) => (
        <motion.div
          key={page.page}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3 }}
          className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
        >
          <span className="text-sm text-gray-300">{page.page}</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">
              {page.visitors}
            </span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-orange-500"
                initial={{ width: 0 }}
                animate={{ width: `${page.percentage}%` }}
                transition={{ delay: 0.3, duration: 0.5 }}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function CountriesPanel() {
  return (
    <div className="space-y-2">
      {countriesData.map((country, i) => (
        <motion.div
          key={country.country}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3 }}
          className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">{country.flag}</span>
            <span className="text-sm text-gray-300">{country.country}</span>
          </div>
          <span className="text-sm font-medium text-white">
            {country.visitors} visitor{country.visitors !== 1 ? "s" : ""}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

const deviceIcons = {
  monitor: Monitor,
  smartphone: Smartphone,
  tablet: Tablet,
} as const;

function DevicesPanel() {
  return (
    <div className="space-y-2">
      {devicesData.map((device, i) => {
        const Icon = deviceIcons[device.icon];
        return (
          <motion.div
            key={device.device}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
          >
            <div className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-300">{device.device}</span>
            </div>
            <span className="text-sm font-medium text-white">
              {device.percentage}%
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function DataPanel({ activeTab }: { activeTab: TabId }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "pages" && <PagesPanel />}
        {activeTab === "countries" && <CountriesPanel />}
        {activeTab === "devices" && <DevicesPanel />}
      </motion.div>
    </AnimatePresence>
  );
}
