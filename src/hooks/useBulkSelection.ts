/**
 * useBulkSelection - Bulk selection state management
 *
 * 🚧 FOUNDATION-ONLY: Not yet integrated into live UI.
 *
 * This hook provides bulk selection state management for multi-select operations.
 * Supports shift-click range selection and auto-exit when all deselected.
 *
 * Integration requirements:
 * 1. Backend endpoints for bulk operations (approve, reject, assign, etc.)
 * 2. Add selection checkboxes to candidate/request/document tables
 * 3. Render BulkActionBar component when items are selected
 * 4. Connect bulk action handlers to real API calls
 *
 * See PHASE_6_SUMMARY.md for full integration guide and examples.
 *
 * Example usage:
 * ```typescript
 * const { selectedIds, toggleSelection, clearSelection } = useBulkSelection('candidates');
 * ```
 */

import { useState, useCallback } from 'react';
import { trackEvent } from '@/lib/telemetry';

export interface BulkSelectionState<T = string> {
  selectedIds: Set<T>;
  isSelecting: boolean;
  selectCount: number;
}

export interface UseBulkSelectionResult<T = string> {
  selectedIds: Set<T>;
  isSelecting: boolean;
  selectCount: number;
  toggleSelection: (id: T) => void;
  toggleAll: (allIds: T[]) => void;
  clearSelection: () => void;
  startBulkMode: () => void;
  isSelected: (id: T) => boolean;
}

/**
 * Hook for managing bulk selection state
 */
export function useBulkSelection<T = string>(
  entityType: 'candidates' | 'requests' | 'documents' = 'candidates'
): UseBulkSelectionResult<T> {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  /**
   * Toggle single item selection
   */
  const toggleSelection = useCallback((id: T) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }

      // Exit bulk mode if all deselected
      if (newSet.size === 0) {
        setIsSelecting(false);
      }

      return newSet;
    });
  }, []);

  /**
   * Toggle all items (select all or deselect all)
   */
  const toggleAll = useCallback(
    (allIds: T[]) => {
      setSelectedIds((prev) => {
        const allSelected = allIds.every((id) => prev.has(id));

        if (allSelected) {
          // Deselect all
          return new Set();
        } else {
          // Select all
          return new Set(allIds);
        }
      });
    },
    []
  );

  /**
   * Clear selection and exit bulk mode
   */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelecting(false);
  }, []);

  /**
   * Start bulk selection mode
   */
  const startBulkMode = useCallback(() => {
    setIsSelecting(true);

    // Track bulk action start
    trackEvent('bulk_action_started', {
      entity_type: entityType,
    });
  }, [entityType]);

  /**
   * Check if item is selected
   */
  const isSelected = useCallback(
    (id: T) => {
      return selectedIds.has(id);
    },
    [selectedIds]
  );

  return {
    selectedIds,
    isSelecting,
    selectCount: selectedIds.size,
    toggleSelection,
    toggleAll,
    clearSelection,
    startBulkMode,
    isSelected,
  };
}
