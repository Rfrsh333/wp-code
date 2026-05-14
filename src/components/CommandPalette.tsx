"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { measureSearchLatency } from '@/lib/performance';
import {
  Search,
  Users,
  BriefcaseBusiness,
  FileText,
  Calendar,
  Settings,
  Home,
  Euro,
  MessageSquare,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: typeof Home;
  category: 'navigation' | 'actions' | 'search';
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  onTabChange?: (tab: string) => void;
}

/**
 * CommandPalette - CMD+K command palette
 *
 * Keyboard shortcuts:
 * - CMD+K / CTRL+K: Open
 * - ESC: Close
 * - ↑↓: Navigate
 * - Enter: Execute
 *
 * Features:
 * - Fast navigation
 * - Fuzzy search
 * - Keyboard-first UX
 * - Grouped results
 */
export function CommandPalette({ onTabChange }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Define available commands
  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-overview',
      label: 'Dashboard',
      description: 'Overzicht',
      icon: Home,
      category: 'navigation',
      action: () => onTabChange?.('overzicht'),
      keywords: ['home', 'dashboard', 'overzicht'],
    },
    {
      id: 'nav-requests',
      label: 'Aanvragen',
      description: 'Personeel aanvragen',
      icon: BriefcaseBusiness,
      category: 'navigation',
      action: () => onTabChange?.('aanvragen'),
      keywords: ['requests', 'aanvragen', 'personeel'],
    },
    {
      id: 'nav-candidates',
      label: 'Inschrijvingen',
      description: 'Kandidaten',
      icon: Users,
      category: 'navigation',
      action: () => onTabChange?.('inschrijvingen'),
      keywords: ['candidates', 'inschrijvingen', 'kandidaten'],
    },
    {
      id: 'nav-planning',
      label: 'Planning',
      description: 'Diensten roosteren',
      icon: Calendar,
      category: 'navigation',
      action: () => onTabChange?.('planning'),
      keywords: ['planning', 'diensten', 'roosteren', 'schedule'],
    },
    {
      id: 'nav-finance',
      label: 'Financieel',
      description: 'Facturen & omzet',
      icon: Euro,
      category: 'navigation',
      action: () => onTabChange?.('financieel'),
      keywords: ['finance', 'financieel', 'facturen', 'omzet'],
    },
    {
      id: 'nav-contact',
      label: 'Contact',
      description: 'Berichten',
      icon: MessageSquare,
      category: 'navigation',
      action: () => onTabChange?.('contact'),
      keywords: ['contact', 'berichten', 'messages'],
    },
    {
      id: 'nav-analytics',
      label: 'Analytics',
      description: 'Rapporten & statistieken',
      icon: TrendingUp,
      category: 'navigation',
      action: () => onTabChange?.('analytics'),
      keywords: ['analytics', 'rapporten', 'statistieken', 'reports'],
    },
    {
      id: 'nav-settings',
      label: 'Instellingen',
      description: 'Configuratie',
      icon: Settings,
      category: 'navigation',
      action: () => onTabChange?.('instellingen'),
      keywords: ['settings', 'instellingen', 'config'],
    },

    // Quick actions
    {
      id: 'action-new-request',
      label: 'Nieuwe aanvraag',
      description: 'Personeel aanvraag aanmaken',
      icon: BriefcaseBusiness,
      category: 'actions',
      action: () => {
        onTabChange?.('aanvragen');
        // Future: open new request modal
      },
      keywords: ['nieuwe', 'aanvraag', 'create', 'new'],
    },
    {
      id: 'action-review-candidates',
      label: 'Kandidaten reviewen',
      description: 'Documenten controleren',
      icon: FileText,
      category: 'actions',
      action: () => onTabChange?.('inschrijvingen'),
      keywords: ['review', 'kandidaten', 'documenten', 'check'],
    },
  ];

  // Filter commands based on query (memoized for performance)
  const filteredCommands = useMemo(() => {
    const startTime = performance.now();

    const trimmedQuery = query.trim();
    const results = trimmedQuery
      ? commands.filter((cmd) => {
          const searchText = trimmedQuery.toLowerCase();
          return (
            cmd.label.toLowerCase().includes(searchText) ||
            cmd.description?.toLowerCase().includes(searchText) ||
            cmd.keywords?.some((k) => k.includes(searchText))
          );
        })
      : commands;

    const duration = performance.now() - startTime;
    measureSearchLatency(trimmedQuery, results.length, duration);

    return results;
  }, [query, commands]);

  // Group filtered commands (memoized)
  const groupedCommands = useMemo(
    () => ({
      navigation: filteredCommands.filter((cmd) => cmd.category === 'navigation'),
      actions: filteredCommands.filter((cmd) => cmd.category === 'actions'),
    }),
    [filteredCommands]
  );

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard shortcut to open (CMD+K, CTRL+K, or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // CMD+K or CTRL+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }

      // / (unless typing in input)
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        setIsOpen(true);
      }

      // ESC to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation within palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const allCommands = filteredCommands;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allCommands.length) % allCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedCommand = allCommands[selectedIndex];
        if (selectedCommand) {
          selectedCommand.action();
          setIsOpen(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    },
    [filteredCommands, selectedIndex]
  );

  // Execute command
  const executeCommand = (cmd: CommandItem) => {
    cmd.action();
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Palette */}
      <div className="fixed inset-x-4 top-[20vh] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Zoek commando's, pagina's..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-400"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 bg-slate-100 rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-slate-500">Geen resultaten gevonden</p>
                <p className="text-xs text-slate-400 mt-1">Probeer een andere zoekterm</p>
              </div>
            ) : (
              <div className="py-2">
                {/* Navigation group */}
                {groupedCommands.navigation.length > 0 && (
                  <div className="mb-2">
                    <div className="px-4 py-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Navigatie
                      </p>
                    </div>
                    {groupedCommands.navigation.map((cmd, index) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      const Icon = cmd.icon;
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => executeCommand(cmd)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150',
                            globalIndex === selectedIndex
                              ? 'bg-slate-100'
                              : 'hover:bg-slate-50'
                          )}
                        >
                          <div
                            className={cn(
                              'flex items-center justify-center w-8 h-8 rounded-lg',
                              globalIndex === selectedIndex ? 'bg-white' : 'bg-slate-100'
                            )}
                          >
                            <Icon className="w-[15px] h-[15px] text-slate-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">{cmd.label}</p>
                            {cmd.description && (
                              <p className="text-xs text-slate-500">{cmd.description}</p>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Actions group */}
                {groupedCommands.actions.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Acties
                      </p>
                    </div>
                    {groupedCommands.actions.map((cmd) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      const Icon = cmd.icon;
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => executeCommand(cmd)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150',
                            globalIndex === selectedIndex
                              ? 'bg-slate-100'
                              : 'hover:bg-slate-50'
                          )}
                        >
                          <div
                            className={cn(
                              'flex items-center justify-center w-8 h-8 rounded-lg',
                              globalIndex === selectedIndex ? 'bg-white' : 'bg-slate-100'
                            )}
                          >
                            <Icon className="w-[15px] h-[15px] text-slate-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">{cmd.label}</p>
                            {cmd.description && (
                              <p className="text-xs text-slate-500">{cmd.description}</p>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center gap-4 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↑↓</kbd>
                Navigeren
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↵</kbd>
                Selecteer
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              Druk <kbd className="font-mono">ESC</kbd> om te sluiten
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * CommandPaletteTrigger - Visual trigger button for mobile
 */
export function CommandPaletteTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-200"
    >
      <Search className="w-4 h-4" />
      <span className="hidden sm:inline">Zoeken...</span>
      <div className="hidden sm:flex items-center gap-1">
        <kbd className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-500 bg-white border border-slate-200 rounded">
          ⌘K
        </kbd>
        <span className="text-[10px] text-slate-400">of</span>
        <kbd className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-500 bg-white border border-slate-200 rounded">
          /
        </kbd>
      </div>
    </button>
  );
}
