import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "positive";
  className?: string;
}

export function CompactEmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: CompactEmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-6 px-4 rounded-lg text-center",
      variant === "default" && "bg-slate-50 border border-slate-200",
      variant === "positive" && "bg-emerald-50 border border-emerald-200",
      className
    )}>
      {Icon && (
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full mb-2",
          variant === "default" && "bg-slate-100",
          variant === "positive" && "bg-emerald-100"
        )}>
          <Icon className={cn(
            "w-[18px] h-[18px]",
            variant === "default" && "text-slate-400",
            variant === "positive" && "text-emerald-600"
          )} />
        </div>
      )}

      <h3 className={cn(
        "text-sm font-semibold",
        variant === "default" && "text-slate-900",
        variant === "positive" && "text-emerald-900"
      )}>
        {title}
      </h3>

      {description && (
        <p className={cn(
          "text-xs max-w-sm mt-1",
          variant === "default" && "text-slate-500",
          variant === "positive" && "text-emerald-700"
        )}>
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 px-3 py-1.5 text-xs font-medium text-white bg-[#F27501] hover:bg-[#d96800] rounded-lg transition-colors duration-200"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
