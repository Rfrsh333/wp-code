/**
 * Automation Helpers
 *
 * Helper utilities for integrating workflow automation into components.
 */

import {
  Eye,
  FileCheck,
  type LucideIcon,
} from 'lucide-react';
import type { SuggestedAction } from './workflow-automation';

/**
 * Map suggested action icon names to Lucide icons
 * Only includes icons actually used by real actions
 */
export function getSuggestedActionIcon(iconName?: string): LucideIcon | undefined {
  if (!iconName) return undefined;

  const iconMap: Record<string, LucideIcon> = {
    Eye,        // view_candidate
    FileCheck,  // view_documents
  };

  return iconMap[iconName];
}

/**
 * Convert suggested actions to InsightCard quick actions format
 */
export function convertToQuickActions(
  suggestedActions?: SuggestedAction[],
  onActionClick?: (actionType: string) => void
): Array<{
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant: 'primary' | 'secondary';
}> {
  if (!suggestedActions || suggestedActions.length === 0) return [];

  return suggestedActions.map((action) => ({
    label: action.label,
    icon: getSuggestedActionIcon(action.icon),
    onClick: () => {
      onActionClick?.(action.type);
    },
    variant: action.priority,
  }));
}

/**
 * Format aging label for display
 */
export function formatAgingLabel(severity: string): string {
  const labels: Record<string, string> = {
    critical: 'Urgent',
    high: 'Te laat',
    medium: 'Opvolgen',
    normal: 'Recent',
  };

  return labels[severity] || '';
}

/**
 * Get aging color for badges/indicators
 */
export function getAgingColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'text-orange-700 bg-orange-100',
    high: 'text-amber-700 bg-amber-100',
    medium: 'text-slate-700 bg-slate-100',
    normal: 'text-emerald-700 bg-emerald-100',
  };

  return colors[severity] || colors.normal;
}
