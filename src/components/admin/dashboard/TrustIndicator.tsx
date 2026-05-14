import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUpdateTime } from "@/lib/temporal";

interface TrustIndicatorProps {
  lastUpdate?: Date | string;
  isRefreshing?: boolean;
  context?: string;
  className?: string;
}

/**
 * TrustIndicator - Subtle trust/freshness indicator
 *
 * Usage:
 * <TrustIndicator lastUpdate={new Date()} />
 * <TrustIndicator context="Gebaseerd op 5 kandidaten" />
 *
 * Design principles:
 * - Subtle, not distracting
 * - Truthful (no fake realtime claims)
 * - Only show where it adds trust
 */
export function TrustIndicator({
  lastUpdate,
  isRefreshing = false,
  context,
  className,
}: TrustIndicatorProps) {
  if (!lastUpdate && !context && !isRefreshing) return null;

  return (
    <div className={cn("flex items-center gap-1.5 text-[10px] text-slate-500", className)}>
      {isRefreshing && (
        <>
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Bijwerken...</span>
        </>
      )}

      {!isRefreshing && lastUpdate && (
        <span>Bijgewerkt {getUpdateTime(lastUpdate)}</span>
      )}

      {!isRefreshing && !lastUpdate && context && (
        <span>{context}</span>
      )}
    </div>
  );
}
