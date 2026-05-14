import { LucideIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: "default" | "accent";
  onClick?: () => void;
  isEmpty?: boolean;
  isInsufficient?: boolean;
  tooltip?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  onClick,
  isEmpty = false,
  isInsufficient = false,
  tooltip,
}: MetricCardProps) {
  const isClickable = !!onClick;
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      onMouseEnter={() => tooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={cn(
        "relative flex flex-col gap-2 p-4 bg-white rounded-lg border transition-colors duration-200 text-left w-full",
        variant === "default" && "border-slate-200",
        variant === "accent" && "border-orange-200/80 bg-gradient-to-br from-orange-50/40 to-white",
        isClickable && "hover:bg-slate-50 hover:border-slate-300 cursor-pointer",
        !isClickable && "cursor-default",
        (isEmpty || isInsufficient) && "opacity-75"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between -mb-1">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg",
          variant === "default" && "bg-slate-100",
          variant === "accent" && "bg-orange-100/80"
        )}>
          <Icon className={cn(
            "w-[18px] h-[18px]",
            variant === "default" && "text-slate-600",
            variant === "accent" && "text-[#F27501]"
          )} />
        </div>

        {trend && (
          <span className={cn(
            "px-1.5 py-0.5 text-[10px] font-semibold rounded tabular-nums",
            trend.value >= 0
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          )}>
            {trend.value >= 0 ? "+" : ""}{trend.value}%
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-[11px] uppercase tracking-wide font-medium text-slate-500">{title}</p>
          {tooltip && (
            <Info className="w-3 h-3 text-slate-400" />
          )}
        </div>
        <p className={cn(
          "text-3xl font-semibold tabular-nums tracking-tight leading-none mb-1",
          isEmpty || isInsufficient ? "text-slate-400" : "text-slate-950"
        )}>
          {value}
        </p>
        {subtitle && (
          <p className={cn(
            "text-xs",
            isEmpty || isInsufficient ? "text-slate-400" : "text-slate-400"
          )}>{subtitle}</p>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg max-w-xs whitespace-normal z-10">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-slate-900" />
          </div>
        </div>
      )}
    </button>
  );
}
