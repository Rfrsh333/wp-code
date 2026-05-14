import { cn } from "@/lib/utils";

type StatusDotVariant = 'live' | 'active' | 'warning' | 'success' | 'neutral';

interface StatusDotProps {
  variant: StatusDotVariant;
  pulse?: boolean;
  className?: string;
}

const variantStyles = {
  live: {
    dot: "bg-orange-500",
    ring: "ring-orange-500/20",
  },
  active: {
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/20",
  },
  warning: {
    dot: "bg-amber-500",
    ring: "ring-amber-500/20",
  },
  success: {
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/20",
  },
  neutral: {
    dot: "bg-slate-400",
    ring: "ring-slate-400/20",
  },
};

/**
 * StatusDot - Subtle status indicator
 *
 * Operational guidelines:
 * - Use sparingly (only for truly important states)
 * - Pulse animation only for critical/live states
 * - Keep subtle (no flashy animations)
 */
export function StatusDot({ variant, pulse = false, className }: StatusDotProps) {
  const styles = variantStyles[variant];

  return (
    <span className={cn("relative flex h-2 w-2", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75",
            "animate-ping",
            styles.dot
          )}
          style={{ animationDuration: '2s' }}
        />
      )}
      <span className={cn(
        "relative inline-flex rounded-full h-2 w-2",
        styles.dot,
        pulse && cn("ring-2", styles.ring)
      )} />
    </span>
  );
}
