/**
 * useKeyboardShortcuts - Global keyboard shortcuts
 *
 * 🚧 FOUNDATION-ONLY: Not yet integrated into live UI.
 *
 * Implements vim-style keyboard navigation:
 * - / or CMD+K: Open command palette
 * - g d: Go to dashboard
 * - g a: Go to aanvragen
 * - g i: Go to inschrijvingen
 * - g p: Go to planning
 * - ESC: Cancel/close
 *
 * Tracks shortcut usage for analytics.
 *
 * Integration requirements:
 * 1. Import this hook in main dashboard layout component
 * 2. Wire up navigation handlers (onGoToDashboard, onGoToAanvragen, etc.)
 * 3. Connect command palette toggle handler
 * 4. Test keyboard shortcuts on mobile with physical keyboards
 *
 * See PHASE_6_SUMMARY.md for full integration guide and examples.
 *
 * Example usage:
 * ```typescript
 * useKeyboardShortcuts({
 *   onOpenCommandPalette: () => setCommandPaletteOpen(true),
 *   onGoToDashboard: () => navigate('/admin'),
 *   onEscape: () => closeModals(),
 * });
 * ```
 */

import { useEffect, useRef, useCallback } from 'react';
import { trackEvent } from '@/lib/telemetry';

type ShortcutHandler = () => void;

interface KeyboardShortcuts {
  // Command palette
  onOpenCommandPalette?: ShortcutHandler;

  // Navigation shortcuts (g + key)
  onGoToDashboard?: ShortcutHandler;
  onGoToAanvragen?: ShortcutHandler;
  onGoToInschrijvingen?: ShortcutHandler;
  onGoToPlanning?: ShortcutHandler;

  // Escape
  onEscape?: ShortcutHandler;
}

/**
 * Hook for global keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts): void {
  const lastKeyRef = useRef<string | null>(null);
  const lastKeyTimeRef = useRef<number>(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Don't intercept shortcuts when typing in input fields
      // Exception: / and ESC work everywhere
      if (isInput && e.key !== '/' && e.key !== 'Escape') {
        return;
      }

      // CMD+K or CTRL+K: Open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        shortcuts.onOpenCommandPalette?.();
        trackEvent('shortcut_used', { shortcut: 'cmd+k', action: 'open_palette' });
        return;
      }

      // /: Open command palette (unless typing in input)
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        shortcuts.onOpenCommandPalette?.();
        trackEvent('shortcut_used', { shortcut: '/', action: 'open_palette' });
        return;
      }

      // ESC: Close/cancel
      if (e.key === 'Escape') {
        shortcuts.onEscape?.();
        // Don't track - too noisy
        return;
      }

      // g + key shortcuts (vim-style navigation)
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      // Reset if more than 1 second since last key
      if (timeSinceLastKey > 1000) {
        lastKeyRef.current = null;
      }

      // If last key was 'g' and within 1 second, check for navigation shortcuts
      if (lastKeyRef.current === 'g' && timeSinceLastKey < 1000) {
        e.preventDefault();

        switch (e.key) {
          case 'd':
            shortcuts.onGoToDashboard?.();
            trackEvent('shortcut_used', { shortcut: 'g+d', action: 'go_to_dashboard' });
            break;
          case 'a':
            shortcuts.onGoToAanvragen?.();
            trackEvent('shortcut_used', { shortcut: 'g+a', action: 'go_to_aanvragen' });
            break;
          case 'i':
            shortcuts.onGoToInschrijvingen?.();
            trackEvent('shortcut_used', { shortcut: 'g+i', action: 'go_to_inschrijvingen' });
            break;
          case 'p':
            shortcuts.onGoToPlanning?.();
            trackEvent('shortcut_used', { shortcut: 'g+p', action: 'go_to_planning' });
            break;
        }

        lastKeyRef.current = null;
        return;
      }

      // Track 'g' key press
      if (e.key === 'g' && !isInput) {
        lastKeyRef.current = 'g';
        lastKeyTimeRef.current = now;
        return;
      }

      // Reset if any other key
      lastKeyRef.current = null;
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for shortcut hints in UI
 */
export function useShortcutHints() {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return {
    commandKey: isMac ? '⌘' : 'Ctrl',
    openPalette: isMac ? '⌘K or /' : 'Ctrl+K or /',
    shortcuts: [
      { keys: ['g', 'd'], description: 'Dashboard' },
      { keys: ['g', 'a'], description: 'Aanvragen' },
      { keys: ['g', 'i'], description: 'Inschrijvingen' },
      { keys: ['g', 'p'], description: 'Planning' },
    ],
  };
}
