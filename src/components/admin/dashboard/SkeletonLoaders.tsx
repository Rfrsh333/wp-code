import { cn } from "@/lib/utils";

/**
 * Skeleton Loaders for Dashboard
 *
 * Performance principles:
 * - Exact same dimensions as real components (no layout shift)
 * - Subtle pulse animation (calm, not flashy)
 * - Fast loading feel
 */

interface SkeletonProps {
  className?: string;
}

/**
 * Base Skeleton - reusable animated div
 */
function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-slate-200/60 rounded",
        className
      )}
      style={{ animationDuration: '1.5s' }}
    />
  );
}

/**
 * SkeletonMetricCard - matches MetricCard dimensions
 */
export function SkeletonMetricCard() {
  return (
    <div className="relative flex flex-col gap-2 p-4 bg-white rounded-lg border border-slate-200">
      {/* Icon placeholder */}
      <div className="flex items-start justify-between -mb-1">
        <Skeleton className="w-10 h-10 rounded-lg" />
      </div>

      {/* Content */}
      <div className="flex flex-col space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/**
 * SkeletonInsightCard - matches InsightCard dimensions
 */
export function SkeletonInsightCard() {
  return (
    <div className="relative flex items-start gap-3 p-4 rounded-lg border border-slate-200 bg-white">
      {/* Icon */}
      <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-full max-w-md" />
        <Skeleton className="h-7 w-32 mt-2 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * SkeletonActivityRow - matches activity feed row
 */
export function SkeletonActivityRow() {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <Skeleton className="h-7 w-7 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

/**
 * SkeletonActivityFeed - full activity section skeleton
 */
export function SkeletonActivityFeed() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-40 rounded" />
      </div>
      <div className="space-y-2">
        <SkeletonActivityRow />
        <SkeletonActivityRow />
        <SkeletonActivityRow />
      </div>
    </div>
  );
}

/**
 * SkeletonCompactSummary - matches CompactSummary
 */
export function SkeletonCompactSummary() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <Skeleton className="h-4 w-24 mb-3" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-2.5">
            <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
            <div className="flex flex-col space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonOperationsSection - Vandaag & Operationeel
 */
export function SkeletonOperationsSection() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="w-[18px] h-[18px] rounded" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-start gap-2.5">
            <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
            <div className="flex flex-col space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonDashboard - Full page skeleton
 * Useful for initial load
 */
export function SkeletonDashboard() {
  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <SkeletonMetricCard />
        <SkeletonMetricCard />
        <SkeletonMetricCard />
        <SkeletonMetricCard />
      </div>

      {/* Insights */}
      <div className="space-y-2">
        <SkeletonInsightCard />
      </div>

      {/* Operations */}
      <SkeletonOperationsSection />

      {/* Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SkeletonCompactSummary />
        <SkeletonCompactSummary />
      </div>

      {/* Activity */}
      <SkeletonActivityFeed />
    </div>
  );
}
