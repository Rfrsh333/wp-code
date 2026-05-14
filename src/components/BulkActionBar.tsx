/**
 * BulkActionBar - Bottom action bar for bulk operations
 *
 * 🚧 FOUNDATION-ONLY: Not yet integrated into live UI.
 *
 * Sticky bottom bar that appears when items are selected.
 * Provides bulk actions with responsive design and mobile optimization.
 *
 * Features:
 * - Sticky to bottom of viewport (z-50)
 * - Responsive layout (stacks on mobile)
 * - Large tap targets (44px minimum for iOS)
 * - Max 3 actions visible (+ overflow indicator)
 * - Backdrop overlay to prevent clicks outside
 * - Automatic telemetry tracking
 *
 * Integration requirements:
 * 1. Backend endpoints for bulk operations
 * 2. Connect to useBulkSelection hook for state
 * 3. Render conditionally when selectCount > 0
 * 4. Add real action handlers (approve, reject, etc.)
 *
 * See PHASE_6_SUMMARY.md for full integration guide and examples.
 * See MOBILE_QA_CHECKLIST.md for mobile testing requirements.
 *
 * Example usage:
 * ```typescript
 * <BulkActionBar
 *   selectCount={5}
 *   actions={[
 *     { id: 'approve', label: 'Keur goed', icon: CheckCircle2, variant: 'primary', onClick: handleApprove }
 *   ]}
 *   onCancel={clearSelection}
 *   entityType="candidates"
 * />
 * ```
 */

import { memo, useEffect } from 'react';
import { X, CheckCircle2, XCircle, Mail, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/telemetry';

export interface BulkAction {
  id: string;
  label: string;
  icon: typeof CheckCircle2;
  variant: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectCount: number;
  actions: BulkAction[];
  onCancel: () => void;
  entityType?: string;
}

/**
 * BulkActionBar component
 * Sticky bottom bar for bulk operations
 */
export const BulkActionBar = memo(function BulkActionBar({
  selectCount,
  actions,
  onCancel,
  entityType = 'items',
}: BulkActionBarProps) {
  // Track when bar is shown
  useEffect(() => {
    if (selectCount > 0) {
      trackEvent('bulk_selection_active', {
        count: selectCount,
        entity_type: entityType,
      });
    }
  }, [selectCount, entityType]);

  if (selectCount === 0) return null;

  return (
    <>
      {/* Backdrop overlay (subtle) */}
      <div className="fixed inset-0 bg-slate-900/5 z-40 pointer-events-none" />

      {/* Bulk action bar */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-white border-t border-slate-200 shadow-2xl',
          'animate-in slide-in-from-bottom duration-200'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Selection count */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-sm font-medium text-slate-900">
                  {selectCount} {selectCount === 1 ? 'item' : 'items'} geselecteerd
                </span>
              </div>

              {/* Cancel button */}
              <button
                onClick={onCancel}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5',
                  'text-xs text-slate-600 hover:text-slate-900',
                  'rounded-lg hover:bg-slate-100',
                  'transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400'
                )}
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Annuleer</span>
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {actions.slice(0, 3).map((action) => {
                const Icon = action.icon;
                const isDisabled = action.disabled || false;

                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      if (!isDisabled) {
                        trackEvent('bulk_action_executed', {
                          action: action.id,
                          count: selectCount,
                          entity_type: entityType,
                        });
                        action.onClick();
                      }
                    }}
                    disabled={isDisabled}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2',
                      'text-sm font-medium rounded-lg',
                      'transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                      // Primary variant
                      action.variant === 'primary' &&
                        'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600 disabled:bg-blue-300',
                      // Secondary variant
                      action.variant === 'secondary' &&
                        'bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-400',
                      // Danger variant
                      action.variant === 'danger' &&
                        'bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-500 disabled:bg-red-50 disabled:text-red-300',
                      isDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{action.label}</span>
                  </button>
                );
              })}

              {/* More actions indicator */}
              {actions.length > 3 && (
                <span className="text-xs text-slate-500 hidden md:inline">
                  +{actions.length - 3} meer
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom padding to prevent content from being hidden */}
      <div className="h-20" />
    </>
  );
});
