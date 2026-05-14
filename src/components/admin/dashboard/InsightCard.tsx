import { memo } from 'react';
import { LucideIcon, AlertCircle, Info, AlertTriangle, CheckCircle2, Eye, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot } from "./StatusDot";
import { getUpdateTime } from "@/lib/temporal";

type InsightSeverity = 'critical' | 'high' | 'medium' | 'low';
type InsightType = 'action' | 'warning' | 'info' | 'success';

interface QuickAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface InsightCardProps {
  title: string;
  description: string;
  severity: InsightSeverity;
  type: InsightType;
  ctaLabel?: string;
  ctaAction?: () => void;
  metric?: number;
  timestamp?: Date | string;
  showLiveIndicator?: boolean;
  quickActions?: QuickAction[];
}

/**
 * Severity color semantics (elite operational UX):
 * - Critical (orange): Operational risks, needs immediate attention
 * - High (amber): Important follow-up, blocking progress
 * - Medium (slate): Optimization opportunities
 * - Low (emerald): Positive states, all clear
 *
 * RED is reserved for: system failures, destructive actions, errors only
 */
const severityStyles = {
  critical: {
    container: "border-orange-200/80 bg-orange-50/30",
    icon: "text-orange-600",
    iconBg: "bg-orange-100",
    title: "text-orange-900",
    description: "text-orange-800/90",
    cta: "bg-orange-600 hover:bg-orange-700 text-white",
    statusDot: 'live' as const,
  },
  high: {
    container: "border-amber-200/80 bg-amber-50/30",
    icon: "text-amber-600",
    iconBg: "bg-amber-100",
    title: "text-amber-900",
    description: "text-amber-800/90",
    cta: "bg-amber-600 hover:bg-amber-700 text-white",
    statusDot: 'warning' as const,
  },
  medium: {
    container: "border-slate-200/80 bg-slate-50/30",
    icon: "text-slate-600",
    iconBg: "bg-slate-100",
    title: "text-slate-900",
    description: "text-slate-700/90",
    cta: "bg-slate-600 hover:bg-slate-700 text-white",
    statusDot: 'neutral' as const,
  },
  low: {
    container: "border-emerald-200/80 bg-emerald-50/30",
    icon: "text-emerald-600",
    iconBg: "bg-emerald-100",
    title: "text-emerald-900",
    description: "text-emerald-800/90",
    cta: "bg-emerald-600 hover:bg-emerald-700 text-white",
    statusDot: 'success' as const,
  },
};

const typeIcons: Record<InsightType, LucideIcon> = {
  action: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};

/**
 * InsightCard component with React.memo for performance
 * Prevents unnecessary rerenders when props haven't changed
 */
export const InsightCard = memo(function InsightCard({
  title,
  description,
  severity,
  type,
  ctaLabel,
  ctaAction,
  metric,
  timestamp,
  showLiveIndicator = false,
  quickActions,
}: InsightCardProps) {
  const styles = severityStyles[severity];
  const Icon = typeIcons[type];

  return (
    <div className={cn(
      "relative flex items-start gap-3 p-4 rounded-lg border transition-colors duration-200",
      styles.container
    )}>
      {/* Icon with optional live indicator */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg",
          styles.iconBg
        )}>
          <Icon className={cn("w-[18px] h-[18px]", styles.icon)} />
        </div>
        {showLiveIndicator && (severity === 'critical' || severity === 'high') && (
          <div className="absolute -top-0.5 -right-0.5">
            <StatusDot variant={styles.statusDot} pulse={severity === 'critical'} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <h4 className={cn("text-sm font-semibold leading-tight", styles.title)}>
              {title}
            </h4>
            {timestamp && (
              <p className="text-[10px] text-slate-500 mt-0.5">
                {getUpdateTime(timestamp)}
              </p>
            )}
          </div>
          {metric !== undefined && (
            <span className={cn(
              "px-2 py-0.5 text-[10px] font-semibold rounded tabular-nums flex-shrink-0",
              styles.icon
            )}>
              {metric}
            </span>
          )}
        </div>

        <p className={cn("text-xs leading-relaxed", styles.description)}>
          {description}
        </p>

        {/* Quick Actions */}
        {quickActions && quickActions.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            {quickActions.slice(0, 2).map((action, index) => {
              const ActionIcon = action.icon;
              const isPrimary = action.variant === 'primary' || index === 0;

              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-900",
                    isPrimary
                      ? cn(styles.cta)
                      : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                  )}
                >
                  {ActionIcon && <ActionIcon className="w-3.5 h-3.5" />}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Legacy CTA (if no quick actions) */}
        {!quickActions && ctaLabel && ctaAction && (
          <button
            onClick={ctaAction}
            className={cn(
              "mt-3 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-900",
              styles.cta
            )}
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
});
