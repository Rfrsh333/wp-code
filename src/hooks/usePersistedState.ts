import { useState, useEffect, useCallback } from 'react';

/**
 * usePersistedState - Persist state to localStorage
 *
 * Usage:
 * const [value, setValue] = usePersistedState('key', defaultValue);
 *
 * Features:
 * - Automatic JSON serialization
 * - SSR safe (checks for window)
 * - Fallback to default on error
 * - Syncs across tabs
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state from localStorage or default
  const [state, setState] = useState<T>(() => {
    // SSR safe: check if window exists
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error loading persisted state for key "${key}":`, error);
      return defaultValue;
    }
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Error persisting state for key "${key}":`, error);
    }
  }, [key, state]);

  // Sync state across tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error syncing state for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [state, setState];
}

/**
 * Dashboard-specific persisted preferences
 */
export interface DashboardPreferences {
  activityFilter: 'vandaag' | 'week' | 'maand';
  analyticsRange: '7d' | '30d' | '90d';
  sidebarCollapsed: boolean;
  collapsedSections: string[];
  // Last-used operational defaults
  lastUsedTab?: string;
  lastUsedSort?: string;
  lastUsedStatusFilter?: string;
  bulkActionHistory: string[]; // Track frequently used bulk actions
}

const defaultPreferences: DashboardPreferences = {
  activityFilter: 'week',
  analyticsRange: '30d',
  sidebarCollapsed: false,
  collapsedSections: [],
  bulkActionHistory: [],
};

/**
 * useDashboardPreferences - Typed hook for dashboard preferences
 */
export function useDashboardPreferences() {
  return usePersistedState<DashboardPreferences>(
    'toptalent-dashboard-prefs',
    defaultPreferences
  );
}
