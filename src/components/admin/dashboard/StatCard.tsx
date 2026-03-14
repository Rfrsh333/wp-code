"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  badge?: { count: number; label: string; color: string };
  trend?: { value: number; label: string; positive: boolean };
  onClick?: () => void;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  badge,
  trend,
  onClick,
}: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl bg-white p-5 shadow-sm text-left transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        {badge && badge.count > 0 && (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", badge.color)}>
            {badge.count} {badge.label}
          </span>
        )}
      </div>
      <h3 className="text-3xl font-bold text-neutral-900 tabular-nums">{value}</h3>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-sm text-neutral-500">{title}</p>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              trend.positive ? "text-green-600" : "text-red-500"
            )}
          >
            {trend.positive ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </button>
  );
}
