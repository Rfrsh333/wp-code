import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RequestState } from '@/lib/reliability';
import { getUpdateTime } from '@/lib/temporal';

interface ReliabilityIndicatorProps {
  state: RequestState;
  trustMessage?: string | null;
  onRetry?: () => void;
  className?: string;
  variant?: 'inline' | 'banner' | 'badge';
}

/**
 * ReliabilityIndicator - Subtle trust & error states
 *
 * Shows:
 * - Loading states
 * - Stale data indicators
 * - Network errors with retry
 * - Last sync time
 *
 * Design principles:
 * - Subtle, not alarming
 * - Actionable when possible
 * - Calm professional feel
 * - Only show when relevant
 */
export function ReliabilityIndicator({
  state,
  trustMessage,
  onRetry,
  className,
  variant = 'inline',
}: ReliabilityIndicatorProps) {
  // Loading state
  if (state.isLoading) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5',
          variant === 'inline' && 'text-[10px] text-slate-500',
          variant === 'badge' && 'px-2 py-1 rounded-md bg-slate-50 text-xs text-slate-600',
          variant === 'banner' && 'px-3 py-2 rounded-lg bg-slate-50 text-sm text-slate-700',
          className
        )}
      >
        <RefreshCw className={cn('animate-spin', variant === 'inline' ? 'w-3 h-3' : 'w-4 h-4')} />
        <span>Laden...</span>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div
        className={cn(
          'flex items-center gap-2',
          variant === 'inline' && 'text-[10px] text-amber-700',
          variant === 'badge' && 'px-2 py-1 rounded-md bg-amber-50 text-xs text-amber-700',
          variant === 'banner' &&
            'px-3 py-2 rounded-lg bg-amber-50 border border-amber-200/50 text-sm text-amber-800',
          className
        )}
      >
        {state.error.type === 'network' ? (
          <WifiOff className={cn(variant === 'inline' ? 'w-3 h-3' : 'w-4 h-4')} />
        ) : (
          <AlertCircle className={cn(variant === 'inline' ? 'w-3 h-3' : 'w-4 h-4')} />
        )}

        <span className="flex-1">{trustMessage || 'Data tijdelijk niet beschikbaar'}</span>

        {state.error.retryable && onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              'font-medium hover:underline transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded px-1',
              variant === 'inline' && 'text-[10px]',
              variant === 'badge' && 'text-xs',
              variant === 'banner' && 'text-sm'
            )}
          >
            Opnieuw proberen
          </button>
        )}
      </div>
    );
  }

  // Stale data indicator
  if (state.isStale && state.lastSuccess) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5',
          variant === 'inline' && 'text-[10px] text-slate-500',
          variant === 'badge' && 'px-2 py-1 rounded-md bg-slate-100 text-xs text-slate-600',
          variant === 'banner' && 'px-3 py-2 rounded-lg bg-slate-50 text-sm text-slate-700',
          className
        )}
      >
        <Wifi className={cn('opacity-50', variant === 'inline' ? 'w-3 h-3' : 'w-4 h-4')} />
        <span>{trustMessage || `Data van ${getUpdateTime(state.lastSuccess)}`}</span>

        {onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              'ml-1 font-medium hover:underline transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 rounded px-1',
              variant === 'inline' && 'text-[10px]',
              variant === 'badge' && 'text-xs',
              variant === 'banner' && 'text-sm'
            )}
          >
            Vernieuwen
          </button>
        )}
      </div>
    );
  }

  // Success state with last update (subtle)
  if (state.lastSuccess && !state.isStale) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5',
          variant === 'inline' && 'text-[10px] text-slate-400',
          variant === 'badge' && 'px-2 py-1 rounded-md bg-slate-50 text-xs text-slate-500',
          variant === 'banner' && 'px-3 py-2 rounded-lg bg-slate-50 text-sm text-slate-600',
          className
        )}
      >
        <span>Bijgewerkt {getUpdateTime(state.lastSuccess)}</span>
      </div>
    );
  }

  return null;
}

/**
 * Compact variant for cards
 */
export function ReliabilityBadge({
  state,
  trustMessage,
  onRetry,
  className,
}: Omit<ReliabilityIndicatorProps, 'variant'>) {
  return (
    <ReliabilityIndicator
      state={state}
      trustMessage={trustMessage}
      onRetry={onRetry}
      variant="badge"
      className={className}
    />
  );
}

/**
 * Full-width banner for prominent sections
 */
export function ReliabilityBanner({
  state,
  trustMessage,
  onRetry,
  className,
}: Omit<ReliabilityIndicatorProps, 'variant'>) {
  // Only show banner for errors or stale data
  if (!state.error && !state.isStale) {
    return null;
  }

  return (
    <ReliabilityIndicator
      state={state}
      trustMessage={trustMessage}
      onRetry={onRetry}
      variant="banner"
      className={className}
    />
  );
}
